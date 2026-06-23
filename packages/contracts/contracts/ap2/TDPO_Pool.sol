// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TDPO_Pool is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable sAFC;
    address public escrow;
    address public oracle;
    address public fdeac;

    uint256 public constant CHALLENGE_PERIOD = 7 days;
    uint256 public constant MIN_LOCK_DURATION = 30 days;

    struct CognitiveLock {
        address creator;
        uint256 lockTime;
        uint256 unlockTime;
        uint256 evolutionFactor;
        bool claimed;
    }

    mapping(bytes32 => CognitiveLock) public locks;
    mapping(bytes32 => uint256) public hashDeposits;
    mapping(bytes32 => uint256) public challengeEndTimes;
    mapping(bytes32 => bool) public isVetoed;

    event OptionFeeDeposited(bytes32 indexed hash, uint256 amount);
    event FactorInjected(bytes32 indexed hash, uint256 factor, uint256 challengeEnd);
    event EvolutionVetoed(bytes32 indexed hash, address indexed fdeacCaller);
    event RewardClaimed(bytes32 indexed hash, address indexed creator, uint256 amount);
    event EscrowUpdated(address indexed oldEscrow, address indexed newEscrow);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event FDEACUpdated(address indexed oldFDEAC, address indexed newFDEAC);

    modifier onlyEscrow() {
        require(msg.sender == escrow, "Only Escrow");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only Oracle");
        _;
    }

    modifier onlyFDEAC() {
        require(msg.sender == fdeac, "Only FDEAC");
        _;
    }

    constructor(address _sAFC) Ownable(msg.sender) {
        sAFC = IERC20(_sAFC);
    }

    function setEscrow(address _escrow) external onlyOwner {
        require(_escrow != address(0), "Invalid escrow");
        address oldEscrow = escrow;
        escrow = _escrow;

        emit EscrowUpdated(oldEscrow, _escrow);
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        address oldOracle = oracle;
        oracle = _oracle;

        emit OracleUpdated(oldOracle, _oracle);
    }

    function setFDEAC(address _fdeac) external onlyOwner {
        require(_fdeac != address(0), "Invalid FDEAC");
        address oldFDEAC = fdeac;
        fdeac = _fdeac;

        emit FDEACUpdated(oldFDEAC, _fdeac);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function depositOptionFee(bytes32 _cognitiveHash, uint256 _amount) external whenNotPaused onlyEscrow {
        sAFC.safeTransferFrom(msg.sender, address(this), _amount);
        hashDeposits[_cognitiveHash] += _amount;

        emit OptionFeeDeposited(_cognitiveHash, _amount);
    }

    function lockContrarianCognition(bytes32 _cognitiveHash, uint256 _duration) external whenNotPaused {
        require(locks[_cognitiveHash].creator == address(0), "Already locked");
        require(_duration >= MIN_LOCK_DURATION, "Duration too short");

        locks[_cognitiveHash] = CognitiveLock({
            creator: msg.sender,
            lockTime: block.timestamp,
            unlockTime: block.timestamp + _duration,
            evolutionFactor: 0,
            claimed: false
        });
    }

    function injectEvolutionFactor(bytes32 _cognitiveHash, uint256 _factor) external whenNotPaused onlyOracle {
        require(locks[_cognitiveHash].creator != address(0), "Not locked");
        require(locks[_cognitiveHash].evolutionFactor == 0, "Already injected");
        require(!isVetoed[_cognitiveHash], "Already vetoed");

        locks[_cognitiveHash].evolutionFactor = _factor;
        challengeEndTimes[_cognitiveHash] = block.timestamp + CHALLENGE_PERIOD;

        emit FactorInjected(_cognitiveHash, _factor, block.timestamp + CHALLENGE_PERIOD);
    }

    function vetoEvolution(bytes32 _cognitiveHash) external whenNotPaused onlyFDEAC {
        require(block.timestamp < challengeEndTimes[_cognitiveHash], "Challenge period ended");
        require(!isVetoed[_cognitiveHash], "Already vetoed");

        isVetoed[_cognitiveHash] = true;
        locks[_cognitiveHash].evolutionFactor = 0;

        emit EvolutionVetoed(_cognitiveHash, msg.sender);
    }

    function claimRetroactiveReward(bytes32 _cognitiveHash) external whenNotPaused nonReentrant {
        CognitiveLock storage lock = locks[_cognitiveHash];
        require(lock.creator == msg.sender, "Not creator");
        require(block.timestamp >= lock.unlockTime, "Time lock active");
        require(block.timestamp >= challengeEndTimes[_cognitiveHash], "Still in challenge period");
        require(!isVetoed[_cognitiveHash], "Vetoed by FDEAC");
        require(lock.evolutionFactor > 0, "Factor is zero or not injected");
        require(!lock.claimed, "Already claimed");

        lock.claimed = true;

        uint256 baseDeposit = hashDeposits[_cognitiveHash];
        if (baseDeposit == 0) {
            return;
        }

        uint256 reward = baseDeposit * lock.evolutionFactor;
        uint256 poolBalance = sAFC.balanceOf(address(this));
        if (reward > poolBalance) {
            reward = poolBalance;
        }

        sAFC.safeTransfer(msg.sender, reward);

        emit RewardClaimed(_cognitiveHash, msg.sender, reward);
    }
}
