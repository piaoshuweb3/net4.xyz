// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BudgetFence is Ownable {
    struct Policy {
        uint256 dailyCap;
        uint256 spentToday;
        uint256 dayStart;
        bool enabled;
    }

    mapping(address => Policy) public policies;
    mapping(address => mapping(bytes32 => bool)) public allowedScopes;

    event PolicyUpdated(address indexed payer, uint256 dailyCap, bool enabled);
    event ScopeUpdated(address indexed payer, bytes32 indexed scopeHash, bool allowed);
    event BudgetConsumed(address indexed payer, bytes32 indexed scopeHash, uint256 amount, uint256 spentToday);

    constructor() Ownable(msg.sender) {}

    function setPolicy(address payer, uint256 dailyCap, bool enabled) external onlyOwner {
        require(payer != address(0), "Invalid payer");
        policies[payer].dailyCap = dailyCap;
        policies[payer].enabled = enabled;

        emit PolicyUpdated(payer, dailyCap, enabled);
    }

    function setScope(address payer, bytes32 scopeHash, bool allowed) external onlyOwner {
        require(payer != address(0), "Invalid payer");
        require(scopeHash != bytes32(0), "Invalid scope");
        allowedScopes[payer][scopeHash] = allowed;

        emit ScopeUpdated(payer, scopeHash, allowed);
    }

    function checkAndConsume(address payer, uint256 amount, bytes32 scopeHash) external returns (bool) {
        Policy storage policy = policies[payer];
        if (!policy.enabled || !allowedScopes[payer][scopeHash]) {
            return false;
        }

        if (block.timestamp >= policy.dayStart + 1 days) {
            policy.dayStart = block.timestamp;
            policy.spentToday = 0;
        }

        if (policy.spentToday + amount > policy.dailyCap) {
            return false;
        }

        policy.spentToday += amount;
        emit BudgetConsumed(payer, scopeHash, amount, policy.spentToday);

        return true;
    }
}
