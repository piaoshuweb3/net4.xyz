// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AFC_Token
 * @dev net4.xyz 生态代币 - 用于 Gas 费和生态激励
 * 
 * 功能特性：
 * - ERC-20 标准实现
 * - 代币锁定与释放机制
 * - 治理投票功能
 * - 代币燃烧机制
 * - 定期释放机制（Vesting）
 */
contract AFC_Token is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    // ============ 常量定义 ============
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 10 亿代币
    uint256 public constant MAX_VESTING_SCHEDULES = 1000;
    
    // ============ 锁定状态 ============
    struct LockInfo {
        uint256 amount;
        uint256 startTime;
        uint256 duration;
        uint256 released;
        uint256 cliff;
    }
    
    mapping(address => LockInfo[]) public vestingSchedules;
    mapping(address => uint256) public totalLocked;
    mapping(address => uint256) public lastUnlockTime;
    
    // ============ 治理投票状态 ============
    struct Proposal {
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool cancelled;
        address proposer;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voteAmount;
    }
    
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    
    // 治理参数
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant PROPOSAL_THRESHOLD = 1000 * 10**18; // 1000 AFC 需要发起提案
    uint256 public constant QUORUM_THRESHOLD = 5_000_000 * 10**18; // 500万 AFC 需要达到法定人数
    
    // ============ 事件 ============
    event TokensLocked(address indexed user, uint256 amount, uint256 unlockTime);
    event TokensUnlocked(address indexed user, uint256 amount);
    event VestingScheduleCreated(
        address indexed user, 
        uint256 amount, 
        uint256 startTime, 
        uint256 duration,
        uint256 cliff
    );
    event TokensReleased(address indexed user, uint256 amount);
    
    // 治理事件
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description
    );
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        bool support,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    
    // ============ 构造函数 ============
    constructor() ERC20("AFC Token", "AFC") Ownable() {
        _mint(msg.sender, MAX_SUPPLY);
    }

    // ============ 代币锁定与释放功能 ============
    
    /**
     * @dev 锁定代币（简单锁定模式）
     * @param user 用户地址
     * @param amount 锁定数量
     * @param duration 锁定时长（秒）
     */
    function lockTokens(
        address user, 
        uint256 amount, 
        uint256 duration
    ) external onlyOwner {
        require(balanceOf(user) >= amount, "Insufficient balance");
        require(totalLocked[user] == 0, "Already locked");
        require(amount > 0, "Amount must be > 0");
        require(duration > 0, "Duration must be > 0");

        // 记录锁定信息
        uint256 unlockTime = block.timestamp + duration;
        vestingSchedules[user].push(LockInfo({
            amount: amount,
            startTime: block.timestamp,
            duration: duration,
            released: 0,
            cliff: 0
        }));
        
        totalLocked[user] += amount;
        
        // 将代币转移到合约
        _transfer(user, address(this), amount);
        
        emit TokensLocked(user, amount, unlockTime);
    }

    /**
     * @dev 解锁代币（简单锁定模式）
     * @param user 用户地址
     */
    function unlockTokens(address user) external onlyOwner {
        require(totalLocked[user] > 0, "No locked tokens");
        
        LockInfo[] storage schedules = vestingSchedules[user];
        require(schedules.length > 0, "No vesting schedules");
        
        // 检查所有锁定期是否都已结束
        for (uint256 i = 0; i < schedules.length; i++) {
            require(
                block.timestamp >= schedules[i].startTime + schedules[i].duration,
                "Tokens still locked"
            );
        }
        
        uint256 amount = totalLocked[user];
        totalLocked[user] = 0;
        delete vestingSchedules[user];
        
        _transfer(address(this), user, amount);
        emit TokensUnlocked(user, amount);
    }

    /**
     * @dev 创建定期释放计划（Vesting Schedule）
     * @param beneficiary 受益人地址
     * @param totalAmount 总释放数量
     * @param duration 释放总时长
     * @param cliff 锁定期（cliff 期间不可释放）
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 duration,
        uint256 cliff
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Amount must be > 0");
        require(duration > 0, "Duration must be > 0");
        require(cliff <= duration, "Cliff > duration");
        require(
            vestingSchedules[beneficiary].length < MAX_VESTING_SCHEDULES,
            "Max schedules reached"
        );
        require(
            balanceOf(msg.sender) >= totalAmount,
            "Insufficient balance"
        );

        // 记录释放计划
        vestingSchedules[beneficiary].push(LockInfo({
            amount: totalAmount,
            startTime: block.timestamp,
            duration: duration,
            released: 0,
            cliff: cliff
        }));
        
        totalLocked[beneficiary] += totalAmount;
        
        // 将代币转移到合约
        _transfer(msg.sender, address(this), totalAmount);
        
        emit VestingScheduleCreated(
            beneficiary, 
            totalAmount, 
            block.timestamp, 
            duration,
            cliff
        );
    }

    /**
     * @dev 释放可释放的代币
     * @param beneficiary 受益人地址
     */
    function release(address beneficiary) external nonReentrant {
        LockInfo[] storage schedules = vestingSchedules[beneficiary];
        require(schedules.length > 0, "No vesting schedules");
        
        uint256 releasable = 0;
        
        for (uint256 i = 0; i < schedules.length; i++) {
            LockInfo storage schedule = schedules[i];
            
            // 检查 cliff 是否已过
            if (block.timestamp < schedule.startTime + schedule.cliff) {
                continue;
            }
            
            // 计算已释放数量
            uint256 vestedAmount = _vestedAmount(schedule);
            uint256 unreleased = vestedAmount - schedule.released;
            
            if (unreleased > 0) {
                schedule.released += unreleased;
                releasable += unreleased;
            }
        }
        
        require(releasable > 0, "No tokens to release");
        
        totalLocked[beneficiary] -= releasable;
        _transfer(address(this), beneficiary, releasable);
        
        emit TokensReleased(beneficiary, releasable);
    }

    /**
     * @dev 计算已释放数量
     */
    function _vestedAmount(LockInfo storage schedule) internal view returns (uint256) {
        if (block.timestamp < schedule.startTime) {
            return 0;
        }
        
        // 检查 cliff
        if (block.timestamp < schedule.startTime + schedule.cliff) {
            return 0;
        }
        
        if (block.timestamp >= schedule.startTime + schedule.duration) {
            return schedule.amount;
        }
        
        // 线性释放
        uint256 timePassed = block.timestamp - schedule.startTime;
        return (schedule.amount * timePassed) / schedule.duration;
    }

    /**
     * @dev 获取用户的锁定余额
     */
    function getLockedBalance(address user) external view returns (uint256) {
        return totalLocked[user];
    }

    /**
     * @dev 获取用户的可释放余额
     */
    function getReleasableAmount(address user) external view returns (uint256) {
        LockInfo[] storage schedules = vestingSchedules[user];
        uint256 releasable = 0;
        
        for (uint256 i = 0; i < schedules.length; i++) {
            LockInfo storage schedule = schedules[i];
            uint256 vestedAmount = _vestedAmount(schedule);
            if (vestedAmount > schedule.released) {
                releasable += (vestedAmount - schedule.released);
            }
        }
        
        return releasable;
    }

    // ============ 治理投票功能 ============
    
    /**
     * @dev 创建治理提案
     * @param description 提案描述
     */
    function createProposal(string calldata description) external {
        require(
            balanceOf(msg.sender) >= PROPOSAL_THRESHOLD,
            "Insufficient tokens to propose"
        );
        
        uint256 proposalId = ++proposalCount;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.description = description;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        proposal.proposer = msg.sender;
        
        emit ProposalCreated(proposalId, msg.sender, description);
    }

    /**
     * @dev 投票
     * @param proposalId 提案ID
     * @param support 是否支持
     * @param weight 投票权重（代币数量）
     */
    function vote(
        uint256 proposalId,
        bool support,
        uint256 weight
    ) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        require(weight > 0, "Vote weight must be > 0");
        require(balanceOf(msg.sender) >= weight, "Insufficient balance");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.executed, "Proposal executed");
        require(!proposal.cancelled, "Proposal cancelled");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        // 记录投票
        proposal.hasVoted[msg.sender] = true;
        proposal.voteAmount[msg.sender] = weight;
        
        if (support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }
        
        emit VoteCast(msg.sender, proposalId, support, weight);
    }

    /**
     * @dev 执行提案
     * @param proposalId 提案ID
     */
    function executeProposal(uint256 proposalId) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        
        // 检查是否通过
        require(
            proposal.votesFor > proposal.votesAgainst,
            "Proposal rejected"
        );
        require(
            proposal.votesFor >= QUORUM_THRESHOLD,
            "Quorum not reached"
        );
        
        proposal.executed = true;
        
        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev 取消提案（仅提案人可取消）
     * @param proposalId 提案ID
     */
    function cancelProposal(uint256 proposalId) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(msg.sender == proposal.proposer, "Not proposer");
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Already cancelled");
        
        proposal.cancelled = true;
        
        emit ProposalCancelled(proposalId);
    }

    /**
     * @dev 获取提案详情
     */
    function getProposal(
        uint256 proposalId
    ) external view returns (
        string memory description,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 startTime,
        uint256 endTime,
        bool executed,
        bool cancelled,
        address proposer
    ) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        return (
            proposal.description,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.cancelled,
            proposal.proposer
        );
    }

    /**
     * @dev 检查用户是否已投票
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        return proposals[proposalId].hasVoted[voter];
    }

    // ============ 代币燃烧功能 ============
    
    /**
     * @dev 燃烧代币（任何人可调用）
     * @param amount 燃烧数量
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
    }

    /**
     * @dev 从指定地址燃烧代币（仅所有者）
     * @param account 地址
     * @param amount 燃烧数量
     */
    function burnFrom(address account, uint256 amount) public override onlyOwner {
        require(balanceOf(account) >= amount, "Insufficient balance");
        
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    // ============ 代币分发功能 ============
    
    /**
     * @dev 批量分发代币
     * @param recipients 接收者数组
     * @param amounts 数量数组
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length > 0, "Empty array");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(balanceOf(msg.sender) >= totalAmount, "Insufficient balance");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }

    /**
     * @dev 紧急提取代币（仅所有者）
     * @param token 代币地址
     * @param to 接收地址
     * @param amount 数量
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Invalid address");
        
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).transfer(to, amount);
        }
    }

    // 接收 ETH
    receive() external payable {}
}