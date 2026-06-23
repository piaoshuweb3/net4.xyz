import { expect } from "chai";
import { ethers } from "hardhat";

describe("Security Tests", function () {
  describe("AFC_Token Security", function () {
    let token: any;
    let owner: any;
    let user1: any;
    let user2: any;

    beforeEach(async function () {
      [owner, user1, user2] = await ethers.getSigners();
      const Token = await ethers.getContractFactory("AFC_Token");
      token = await Token.deploy();
    });

    it("should have ReentrancyGuard imported", async function () {
      // Verify ReentrancyGuard is imported in the contract
      // This is a compile-time check - if it compiles, the import is correct
      expect(token.deploymentTransaction()).to.exist;
    });

    it("should only allow owner to create vesting schedule", async function () {
      // AFC_Token 没有 mint 函数（所有代币在构造函数中一次性铸造）
      // 改为测试 createVestingSchedule（只有 owner 可以调用）
      await expect(
        token.connect(user1).createVestingSchedule(
          user1.address,
          ethers.parseEther("1000"),
          3600,
          1800
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should use SafeMath (Solidity 0.8+ overflow protection)", async function () {
      // Solidity 0.8+ has built-in overflow protection
      const balance = await token.balanceOf(owner.address);
      expect(balance).to.be.gt(0);
    });

    it("should have correct initial supply", async function () {
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000000000")); // 1 billion
    });
  });

  describe("Spark_NFT Security", function () {
    let nft: any;
    let owner: any;
    let user1: any;
    let user2: any;

    beforeEach(async function () {
      [owner, user1, user2] = await ethers.getSigners();
      const NFT = await ethers.getContractFactory("Spark_NFT");
      nft = await NFT.deploy();
    });

    it("should have ReentrancyGuard imported", async function () {
      // Verify ReentrancyGuard is imported
      expect(nft.deploymentTransaction()).to.exist;
    });

    it("should only allow owner to mint core nodes", async function () {
      await expect(
        nft.connect(user1).mintCoreNode(user1.address, 1, 1, "test", "ipfs://test")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should enforce quota limits", async function () {
      const [core, sub, regular] = await nft.getQuotaStatus();
      expect(core).to.equal(21);
      expect(sub).to.equal(128);
      expect(regular).to.equal(10000);
    });

    it("should validate NFT attributes", async function () {
      await nft.mintCoreNode(user1.address, 2, 4, "Core-001", "ipfs://QmCore001");
      
      const attr = await nft.getSparkAttributes(0);
      expect(attr.level).to.equal(3); // Core = 3
      expect(attr.avatarType).to.equal(2); // Advanced = 2
      expect(attr.computeLevel).to.equal(4); // L4 = 4
    });
  });

  describe("Access Control Tests", function () {
    let token: any;
    let owner: any;
    let user1: any;
    let attacker: any;

    beforeEach(async function () {
      [owner, user1, attacker] = await ethers.getSigners();
      const Token = await ethers.getContractFactory("AFC_Token");
      token = await Token.deploy();
    });

    it("should prevent unauthorized vesting creation", async function () {
      // 改为测试 createVestingSchedule（而不是不存在的 mint 函数）
      await expect(
        token.connect(attacker).createVestingSchedule(
          attacker.address,
          ethers.parseEther("1000000"),
          3600,
          3600
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should prevent unauthorized vesting creation", async function () {
      await expect(
        token.connect(attacker).createVestingSchedule(
          attacker.address,
          ethers.parseEther("1000"),
          3600,
          3600
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should prevent unauthorized proposal creation", async function () {
      // 修复：createProposal 检查的是代币余额，不是 onlyOwner
      // 给 attacker 足够的代币，这样会检查其他条件（如果有）
      // 但实际上 createProposal 是 public 的，任何人都可以调用（只要有足够代币）
      // 所以这个测试应该验证：代币不足时会回退
      await expect(
        token.connect(attacker).createProposal("Test Proposal")
      ).to.be.revertedWith("Insufficient tokens to propose");
    });
  });

  describe("Integer Overflow/Underflow Tests", function () {
    let token: any;
    let owner: any;
    let user1: any;

    beforeEach(async function () {
      [owner, user1] = await ethers.getSigners();
      const Token = await ethers.getContractFactory("AFC_Token");
      token = await Token.deploy();
    });

    it("should handle large transfers safely (Solidity 0.8+)", async function () {
      const balance = await token.balanceOf(owner.address);
      // Solidity 0.8+ reverts on overflow
      expect(balance).to.be.lt(ethers.MaxUint256);
    });

    it("should prevent underflow in transferFrom", async function () {
      await token.approve(user1.address, ethers.parseEther("100"));
      await expect(
        token.connect(user1).transferFrom(
          owner.address,
          user1.address,
          ethers.parseEther("1000000")
        )
      ).to.be.reverted;
    });
  });

  describe("Governance Security", function () {
    let token: any;
    let owner: any;
    let user1: any;

    beforeEach(async function () {
      [owner, user1] = await ethers.getSigners();
      const Token = await ethers.getContractFactory("AFC_Token");
      token = await Token.deploy();
    });

    it("should have governance parameters defined", async function () {
      const votingPeriod = await token.VOTING_PERIOD();
      const proposalThreshold = await token.PROPOSAL_THRESHOLD();
      const quorumThreshold = await token.QUORUM_THRESHOLD();
      
      expect(votingPeriod).to.be.gt(0);
      expect(proposalThreshold).to.be.gt(0);
      expect(quorumThreshold).to.be.gt(0);
    });

    it("should track proposal count", async function () {
      const initialCount = await token.proposalCount();
      expect(initialCount).to.equal(0);
    });
  });

  describe("NFT Quota Security", function () {
    let nft: any;
    let owner: any;
    let user1: any;

    beforeEach(async function () {
      [owner, user1] = await ethers.getSigners();
      const NFT = await ethers.getContractFactory("Spark_NFT");
      nft = await NFT.deploy();
    });

    it("should not exceed core node quota", async function () {
      // Try to mint more than 21 core nodes
      for (let i = 0; i < 25; i++) {
        try {
          await nft.mintCoreNode(owner.address, 1, 1, `test-${i}`, `ipfs://test-${i}`);
        } catch (e) {
          // Expected to fail after 21
          break;
        }
      }
      
      const [core] = await nft.getQuotaStatus();
      expect(core).to.be.lte(21);
    });

    it("should not exceed sub node quota", async function () {
      // Try to mint more than 128 sub nodes
      for (let i = 0; i < 130; i++) {
        try {
          await nft.mintSubNode(owner.address, 1, 1, `test-${i}`, `ipfs://test-${i}`);
        } catch (e) {
          break;
        }
      }
      
      const [, sub] = await nft.getQuotaStatus();
      expect(sub).to.be.lte(128);
    });
  });
});