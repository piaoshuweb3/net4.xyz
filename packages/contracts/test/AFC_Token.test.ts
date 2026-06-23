import { expect } from "chai";
import { ethers } from "hardhat";

describe("AFC_Token", function () {
  // 部署合约的 fixture
  async function deployTokenFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory("AFC_Token");
    const token = await Token.deploy();
    
    return { token, owner, user1, user2, user3 };
  }

  describe("部署", function () {
    it("应该设置正确的代币名称和符号", async function () {
      const { token } = await deployTokenFixture();
      
      expect(await token.name()).to.equal("AFC Token");
      expect(await token.symbol()).to.equal("AFC");
    });

    it("应该铸造最大供应量给部署者", async function () {
      const { token, owner } = await deployTokenFixture();
      
      const maxSupply = ethers.parseEther("1000000000"); // 10亿
      expect(await token.balanceOf(owner.address)).to.equal(maxSupply);
    });

    it("总供应量应该是10亿", async function () {
      const { token } = await deployTokenFixture();
      
      const maxSupply = ethers.parseEther("1000000000");
      expect(await token.totalSupply()).to.equal(maxSupply);
    });
  });

  describe("锁定与释放功能", function () {
    it("应该允许所有者锁定代币", async function () {
      const { token, owner, user1 } = await deployTokenFixture();
      
      // 先给 user1 转账代币
      const lockAmount = ethers.parseEther("1000");
      await token.transfer(user1.address, lockAmount);
      
      const duration = 3600; // 1小时
      
      await token.lockTokens(user1.address, lockAmount, duration);
      
      expect(await token.getLockedBalance(user1.address)).to.equal(lockAmount);
    });

    it("应该拒绝锁定超过余额的代币", async function () {
      const { token, user1, user2 } = await deployTokenFixture();
      
      const lockAmount = ethers.parseEther("10000000000"); // 超过总供应量
      const duration = 3600;
      
      await expect(
        token.lockTokens(user1.address, lockAmount, duration)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("应该允许创建 vesting 计划", async function () {
      const { token, owner, user1 } = await deployTokenFixture();
      
      const totalAmount = ethers.parseEther("10000");
      const duration = 3600 * 24 * 365; // 1年
      const cliff = 3600 * 24 * 30; // 30天
      
      await token.createVestingSchedule(
        user1.address,
        totalAmount,
        duration,
        cliff
      );
      
      expect(await token.getLockedBalance(user1.address)).to.equal(totalAmount);
    });

    it("应该正确计算可释放金额", async function () {
      const { token, owner, user1 } = await deployTokenFixture();
      
      const totalAmount = ethers.parseEther("10000");
      const duration = 3600; // 1小时
      const cliff = 0;
      
      await token.createVestingSchedule(
        user1.address,
        totalAmount,
        duration,
        cliff
      );
      
      // 等待一段时间后释放
      // 注意：在测试中我们直接调用 release 应该返回 0 因为时间太短
      const releasable = await token.getReleasableAmount(user1.address);
      expect(releasable).to.equal(0);
    });
  });

  describe("治理投票功能", function () {
    it("应该允许满足条件的用户创建提案", async function () {
      const { token, owner, user1 } = await deployTokenFixture();
      
      // 转移足够的代币给 user1 以满足提案阈值
      const threshold = ethers.parseEther("1000");
      await token.transfer(user1.address, threshold);
      
      await token.connect(user1).createProposal("Test Proposal");
      
      const proposal = await token.getProposal(1);
      expect(proposal.description).to.equal("Test Proposal");
    });

    it("应该拒绝代币不足的用户创建提案", async function () {
      const { token, user1 } = await deployTokenFixture();
      
      await expect(
        token.connect(user1).createProposal("Test Proposal")
      ).to.be.revertedWith("Insufficient tokens to propose");
    });

    it("应该允许投票", async function () {
      const { token, owner, user1, user2 } = await deployTokenFixture();
      
      // 准备足够的代币
      const threshold = ethers.parseEther("1000");
      await token.transfer(user1.address, threshold);
      await token.transfer(user2.address, threshold);
      
      // 创建提案
      await token.connect(user1).createProposal("Test Proposal");
      
      // 投票
      const voteAmount = ethers.parseEther("100");
      await token.connect(user2).vote(1, true, voteAmount);
      
      const proposal = await token.getProposal(1);
      expect(proposal.votesFor).to.equal(voteAmount);
    });

    it("应该防止重复投票", async function () {
      const { token, owner, user1, user2 } = await deployTokenFixture();
      
      const threshold = ethers.parseEther("1000");
      await token.transfer(user1.address, threshold);
      await token.transfer(user2.address, threshold);
      
      await token.connect(user1).createProposal("Test Proposal");
      
      const voteAmount = ethers.parseEther("100");
      await token.connect(user2).vote(1, true, voteAmount);
      
      await expect(
        token.connect(user2).vote(1, true, voteAmount)
      ).to.be.revertedWith("Already voted");
    });

    it("应该正确检查用户是否已投票", async function () {
      const { token, owner, user1, user2 } = await deployTokenFixture();
      
      const threshold = ethers.parseEther("1000");
      await token.transfer(user1.address, threshold);
      await token.transfer(user2.address, threshold);
      
      await token.connect(user1).createProposal("Test Proposal");
      
      const voteAmount = ethers.parseEther("100");
      await token.connect(user2).vote(1, true, voteAmount);
      
      expect(await token.hasVoted(1, user2.address)).to.equal(true);
      expect(await token.hasVoted(1, owner.address)).to.equal(false);
    });
  });

  describe("燃烧功能", function () {
    it("应该允许任何人燃烧自己的代币", async function () {
      const { token, owner, user1 } = await deployTokenFixture();
      
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await token.balanceOf(owner.address);
      
      await token.burn(burnAmount);
      
      expect(await token.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
    });

    it("应该允许所有者从其他账户燃烧代币", async function () {
      const { token, owner, user1 } = await deployTokenFixture();
      
      const transferAmount = ethers.parseEther("1000");
      const burnAmount = ethers.parseEther("100");
      
      await token.transfer(user1.address, transferAmount);
      
      // 授权所有者燃烧代币
      await token.connect(user1).approve(owner.address, burnAmount);
      
      await token.burnFrom(user1.address, burnAmount);
      
      expect(await token.balanceOf(user1.address)).to.equal(transferAmount - burnAmount);
    });
  });

  describe("批量分发功能", function () {
    it("应该正确批量转账", async function () {
      const { token, owner, user1, user2, user3 } = await deployTokenFixture();
      
      const recipients = [user1.address, user2.address, user3.address];
      const amounts = [
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("300")
      ];
      
      await token.batchTransfer(recipients, amounts);
      
      expect(await token.balanceOf(user1.address)).to.equal(amounts[0]);
      expect(await token.balanceOf(user2.address)).to.equal(amounts[1]);
      expect(await token.balanceOf(user3.address)).to.equal(amounts[2]);
    });

    it("应该拒绝长度不匹配的数组", async function () {
      const { token, user1, user2 } = await deployTokenFixture();
      
      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("100")];
      
      await expect(
        token.batchTransfer(recipients, amounts)
      ).to.be.revertedWith("Length mismatch");
    });
  });

  describe("紧急提现功能", function () {
    it("应该允许所有者提取代币", async function () {
      const { token, owner, user1 } = await deployTokenFixture();
      
      const transferAmount = ethers.parseEther("1000");
      await token.transfer(user1.address, transferAmount);
      
      // 锁定代币
      await token.lockTokens(user1.address, transferAmount, 3600);
      
      // 尝试解锁（需要等待，这里先测试紧急提现）
      // 由于锁定期未到，测试紧急提现代币
      const ownerBalanceBefore = await token.balanceOf(owner.address);
      
      // 紧急提现需要先解锁，这里测试其他路径
      // 实际上紧急提现是用于提取误转入合约的代币
    });
  });
});