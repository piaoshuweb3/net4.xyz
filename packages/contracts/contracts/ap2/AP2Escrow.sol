// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITDPOPool {
    function depositOptionFee(bytes32 cognitiveHash, uint256 amount) external;
}

interface IBudgetFence {
    function checkAndConsume(address payer, uint256 amount, bytes32 scopeHash) external returns (bool);
}

contract AP2Escrow is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable sAFC;
    ITDPOPool public tdpoPool;
    IBudgetFence public budgetFence;
    address public oracle;

    enum TaskStatus {
        Active,
        Completed,
        Cancelled
    }

    struct Task {
        address payer;
        address payee;
        uint256 baseAmount;
        uint256 optionAmount;
        uint256 startTime;
        uint256 duration;
        uint256 withdrawn;
        bytes32 targetHash;
        bytes32 scopeHash;
        TaskStatus status;
    }

    mapping(uint256 => Task) public tasks;
    uint256 public nextTaskId;

    event TaskCreated(uint256 indexed taskId, address payer, address payee, bytes32 targetHash, bytes32 scopeHash);
    event StreamWithdrawn(uint256 indexed taskId, address payee, uint256 amount);
    event TaskSettled(uint256 indexed taskId, uint256 optionFeeRouted);
    event TaskCancelled(uint256 indexed taskId, address indexed payer, uint256 refundAmount);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event TDPOPoolUpdated(address indexed pool);

    constructor(address _sAFC, address _oracle, address _budgetFence) Ownable(msg.sender) {
        require(_sAFC != address(0), "Invalid sAFC");
        require(_oracle != address(0), "Invalid oracle");
        sAFC = IERC20(_sAFC);
        oracle = _oracle;
        budgetFence = IBudgetFence(_budgetFence);
    }

    function setTDPOPool(address _pool) external onlyOwner {
        require(_pool != address(0), "Invalid pool");
        require(address(tdpoPool) == address(0), "Already set");
        tdpoPool = ITDPOPool(_pool);

        emit TDPOPoolUpdated(_pool);
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        address oldOracle = oracle;
        oracle = _oracle;

        emit OracleUpdated(oldOracle, _oracle);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function createTask(
        address _payee,
        uint256 _baseAmount,
        uint256 _optionAmount,
        uint256 _duration,
        bytes32 _targetHash,
        bytes32 _scopeHash
    ) external whenNotPaused nonReentrant returns (uint256 taskId) {
        require(_payee != address(0), "Invalid payee");
        require(_baseAmount > 0 && _duration > 0, "Invalid amounts");

        uint256 totalAmount = _baseAmount + _optionAmount;
        if (address(budgetFence) != address(0)) {
            require(budgetFence.checkAndConsume(msg.sender, totalAmount, _scopeHash), "BudgetFence rejected");
        }

        taskId = nextTaskId++;
        tasks[taskId] = Task({
            payer: msg.sender,
            payee: _payee,
            baseAmount: _baseAmount,
            optionAmount: _optionAmount,
            startTime: block.timestamp,
            duration: _duration,
            withdrawn: 0,
            targetHash: _targetHash,
            scopeHash: _scopeHash,
            status: TaskStatus.Active
        });

        sAFC.safeTransferFrom(msg.sender, address(this), totalAmount);

        emit TaskCreated(taskId, msg.sender, _payee, _targetHash, _scopeHash);
    }

    function withdrawStream(uint256 _taskId) external whenNotPaused nonReentrant {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Active, "Task not active");
        require(msg.sender == task.payee, "Not payee");

        uint256 elapsed = block.timestamp - task.startTime;
        if (elapsed > task.duration) {
            elapsed = task.duration;
        }

        uint256 vested = (task.baseAmount * elapsed) / task.duration;
        uint256 withdrawable = vested - task.withdrawn;

        require(withdrawable > 0, "Nothing to withdraw");
        task.withdrawn += withdrawable;

        sAFC.safeTransfer(task.payee, withdrawable);

        emit StreamWithdrawn(_taskId, task.payee, withdrawable);
    }

    function settleTask(uint256 _taskId, uint256 _qualityScore) external whenNotPaused nonReentrant {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Active, "Task not active");
        require(msg.sender == task.payer || msg.sender == oracle, "Unauthorized");

        task.status = TaskStatus.Completed;

        uint256 remainingBase = task.baseAmount - task.withdrawn;
        if (remainingBase > 0) {
            sAFC.safeTransfer(task.payee, remainingBase);
        }

        if (task.optionAmount > 0 && _qualityScore >= 80) {
            sAFC.forceApprove(address(tdpoPool), task.optionAmount);
            tdpoPool.depositOptionFee(task.targetHash, task.optionAmount);

            emit TaskSettled(_taskId, task.optionAmount);
        } else {
            sAFC.safeTransfer(task.payer, task.optionAmount);
        }
    }

    function cancelTask(uint256 _taskId) external whenNotPaused nonReentrant {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Active, "Task not active");
        require(msg.sender == task.payer || msg.sender == oracle, "Unauthorized");

        task.status = TaskStatus.Cancelled;

        uint256 remainingBase = task.baseAmount - task.withdrawn;
        uint256 refundAmount = remainingBase + task.optionAmount;
        if (refundAmount > 0) {
            sAFC.safeTransfer(task.payer, refundAmount);
        }

        emit TaskCancelled(_taskId, task.payer, refundAmount);
    }
}
