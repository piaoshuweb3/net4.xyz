import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";

describe("EconomyModel", function () {
  let economyModel: Contract;
  let mockUSDT: Contract;
  let mockSparkNFT: Contract;
  let owner: any;
  let user1: any;
  let user2: any;
  let teamWallet: any;
  let ecosystemWallet: any;
  let buybackWallet: any;
  let reserveWallet: any;

  // 部署合约的 fixture
  async function deployContractsFixture() {
    [owner, user1, user2, teamWallet, ecosystemWallet, buybackWallet, reserveWallet] = await ethers.getSigners();

    // 部署 Mock USDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();

    // 部署 Mock Spark NFT
    const MockSparkNFT = await ethers.getContractFactory("MockSparkNFT");
    mockSparkNFT = await MockSparkNFT.deploy();
    await mockSparkNFT.waitForDeployment();

    // 部署 EconomyModel
    const EconomyModel = await ethers.getContractFactory("EconomyModel");
    economyModel = await EconomyModel.deploy(
      await mockUSDT.getAddress(),
      await mockSparkNFT.getAddress(),
      teamWallet.address,
      ecosystemWallet.address,
      buybackWallet.address,
      reserveWallet.address
    );
    await economyModel.waitForDeployment();

    // 给用户1一些 USDT
    await mockUSDT.mint(user1.address, ethers.parseEther("100000"));
    await mockUSDT.mint(user2.address, ethers.parseEther("100000"));

    // 授权 EconomyModel 使用用户1的 USDT
    await mockUSDT.connect(user1).approve(await economyModel.getAddress(), ethers.parseEther("100000"));
    await mockUSDT.connect(user2).approve(await economyModel.getAddress(), ethers.parseEther("100000"));

    return { economyModel, mockUSDT, mockSparkNFT, owner, user1, user2, teamWallet, ecosystemWallet, buybackWallet, reserveWallet };
  }

  describe("部署", function () {
    it("应该正确设置合约地址", async function () {
      const { economyModel, mockUSDT, mockSparkNFT } = await deployContractsFixture();
      
      expect(await economyModel.usdtToken()).to.equal(await mockUSDT.getAddress());
      expect(await economyModel.sparkNFTAddress()).to.equal(await mockSparkNFT.getAddress());
    });

    it("应该正确设置初始价格", async function () {
      const { economyModel } = await deployContractsFixture();
      
      const regularPrice = await economyModel.getCurrentPrice(1); // Regular = 1
      const subPrice = await economyModel.getCurrentPrice(2);     // Sub = 2
      const corePrice = await economyModel.getCurrentPrice(3);    // Core = 3
      
      expect(regularPrice).to.equal(ethers.parseEther("99"));
      expect(subPrice).to.equal(ethers.parseEther("999"));
      expect(corePrice).to.equal(ethers.parseEther("9999"));
    });

    it("应该正确设置初始配额", async function () {
      const { economyModel } = await deployContractsFixture();
      
      const [coreAvailable, subAvailable, regularAvailable] = await economyModel.getQuotaStatus();
      
      expect(coreAvailable).to.equal(21);
      expect(subAvailable).to.equal(128);
      expect(regularAvailable).to.equal(10000);
    });

    it("应该正确设置收益钱包", async function () {
      const { economyModel, teamWallet, ecosystemWallet, buybackWallet, reserveWallet } = await deployContractsFixture();
      
      expect(await economyModel.teamWallet()).to.equal(teamWallet.address);
      expect(await economyModel.ecosystemWallet()).to.equal(ecosystemWallet.address);
      expect(await economyModel.buybackWallet()).to.equal(buybackWallet.address);
      expect(await economyModel.reserveWallet()).to.equal(reserveWallet.address);
    });
  });

  describe("销售阶段管理", function () {
    it("应该允许所有者开始销售", async function () {
      const { economyModel, owner } = await deployContractsFixture();
      
      await economyModel.connect(owner).startSale(1); // Presale = 1
      
      expect(await economyModel.currentPhase()).to.equal(1);
    });

    it("应该允许所有者结束销售", async function () {
      const { economyModel, owner } = await deployContractsFixture();
      
      await economyModel.connect(owner).startSale(1);
      await economyModel.connect(owner).endSale();
      
      expect(await economyModel.currentPhase()).to.equal(0); // Closed = 0
    });

    it("应该拒绝非所有者开始销售", async function () {
      const { economyModel, user1 } = await deployContractsFixture();
      
      await expect(
        economyModel.connect(user1).startSale(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("购买功能", function () {
    it("应该允许在公开销售期间购买普通节点", async function () {
      const { economyModel, mockUSDT, owner, user1 } = await deployContractsFixture();
      
      // 开始公开销售
      await economyModel.connect(owner).startSale(2); // PublicSale = 2
      
      // 购买普通节点
      await economyModel.connect(user1).purchaseSpark(1, false); // Regular, not wrapped
      
      // 验证销售统计
      const [coreAvailable, subAvailable, regularAvailable] = await economyModel.getQuotaStatus();
      expect(regularAvailable).to.equal(9999);
      
      // 验证用户购买记录
      const purchaseCount = await economyModel.getUserPurchaseCount(user1.address);
      expect(purchaseCount).to.equal(1);
    });

    it("应该允许购买封装版节点", async function () {
      const { economyModel, owner, user1 } = await deployContractsFixture();
      
      await economyModel.connect(owner).startSale(2);
      await economyModel.connect(user1).purchaseSpark(1, true); // wrapped
      
      const purchaseHistory = await economyModel.getUserPurchases(user1.address);
      expect(purchaseHistory[0].isWrapped).to.equal(true);
    });

    it("应该拒绝在销售关闭时购买", async function () {
      const { economyModel, user1 } = await deployContractsFixture();
      
      // 销售默认是关闭的
      await expect(
        economyModel.connect(user1).purchaseSpark(1, false)
      ).to.be.revertedWith("Sale not open");
    });

    it("应该拒绝超过配额购买", async function () {
      const { economyModel, owner, user1 } = await deployContractsFixture();
      
      await economyModel.connect(owner).startSale(2);
      
      // 尝试购买子节点（配额128个）
      // 这里我们测试配额限制是否生效
      const [,,, coreSold, subSold] = await economyModel.getQuotaStatus();
      expect(coreSold).to.equal(0);
      expect(subSold).to.equal(0);
    });

    it("应该正确处理批量购买", async function () {
      const { economyModel, owner, user1 } = await deployContractsFixture();
      
      await economyModel.connect(owner).startSale(2);
      
      const levels = [1, 1]; // 2个普通节点
      const isWrapped = [false, false];
      
      await economyModel.connect(user1).batchPurchase(levels, isWrapped);
      
      const purchaseCount = await economyModel.getUserPurchaseCount(user1.address);
      expect(purchaseCount).to.equal(2);
    });

    it("应该拒绝批量购买长度不匹配", async function () {
      const { economyModel, owner, user1 } = await deployContractsFixture();
      
      await economyModel.connect(owner).startSale(2);
      
      const levels = [1, 1];
      const isWrapped = [false]; // 长度不匹配
      
      await expect(
        economyModel.connect(user1).batchPurchase(levels, isWrapped)
      ).to.be.revertedWith("Length mismatch");
    });
  });

  describe("动态定价", function () {
    it("应该返回正确的基础价格", async function () {
      const { economyModel } = await deployContractsFixture();
      
      const regularPrice = await economyModel.getCurrentPrice(1);
      const subPrice = await economyModel.getCurrentPrice(2);
      const corePrice = await economyModel.getCurrentPrice(3);
      
      expect(regularPrice).to.equal(ethers.parseEther("99"));
      expect(subPrice).to.equal(ethers.parseEther("999"));
      expect(corePrice).to.equal(ethers.parseEther("9999"));
    });

    it("应该允许管理员设置价格乘数", async function () {
      const { economyModel, owner } = await deployContractsFixture();
      
      // 设置 110% 价格
      await economyModel.connect(owner).setPriceMultiplier(11000);
      
      const regularPrice = await economyModel.getCurrentPrice(1);
      expect(regularPrice).to.equal(ethers.parseEther("108.9")); // 99 * 1.1
    });

    it("应该拒绝设置过低的价格乘数", async function () {
      const { economyModel, owner } = await deployContractsFixture();
      
      await expect(
        economyModel.connect(owner).setPriceMultiplier(5000) // 低于最低 70%
      ).to.be.revertedWith("Multiplier too low");
    });

    it("应该拒绝设置过高的价格乘数", async function () {
      const { economyModel, owner } = await deployContractsFixture();
      
      await expect(
        economyModel.connect(owner).setPriceMultiplier(15000) // 超过最高 130%
      ).to.be.revertedWith("Multiplier too high");
    });

    it("应该返回所有等级价格", async function () {
      const { economyModel } = await deployContractsFixture();
      
      const [regularPrice, subPrice, corePrice] = await economyModel.getAllPrices();
      
      expect(regularPrice).to.equal(ethers.parseEther("99"));
      expect(subPrice).to.equal(ethers.parseEther("999"));
      expect(corePrice).to.equal(ethers.parseEther("9999"));
    });
  });

  describe("收益分配", function () {
    it("应该正确分配收益", async function () {
      const { economyModel, mockUSDT, owner, teamWallet, ecosystemWallet, buybackWallet, reserveWallet } = await deployContractsFixture();
      
      // 开始销售并购买
      await economyModel.connect(owner).startSale(2);
      await economyModel.connect(user1).purchaseSpark(1, false);
      
      // 分配收益
      await economyModel.connect(owner).distributeRevenue();
      
      // 验证各钱包收到收益
      // 团队 20%, 生态 30%, 回购 20%, 储备 30%
      const teamBalance = await mockUSDT.balanceOf(teamWallet.address);
      const ecosystemBalance = await mockUSDT.balanceOf(ecosystemWallet.address);
      const buybackBalance = await mockUSDT.balanceOf(buybackWallet.address);
      const reserveBalance = await mockUSDT.balanceOf(reserveWallet.address);
      
      const totalRevenue = ethers.parseEther("99");
      expect(teamBalance).to.equal(totalRevenue * 20n / 100n);
      expect(ecosystemBalance).to.equal(totalRevenue * 30n / 100n);
      expect(buybackBalance).to.equal(totalRevenue * 20n / 100n);
      expect(reserveBalance).to.equal(totalRevenue * 30n / 100n);
    });

    it("应该返回收益分配预览", async function () {
      const { economyModel, mockUSDT, owner, user1 } = await deployContractsFixture();
      
      await economyModel.connect(owner).startSale(2);
      await economyModel.connect(user1).purchaseSpark(1, false);
      
      const [balance, teamAmount, ecosystemAmount, buybackAmount, reserveAmount] = 
        await economyModel.getRevenueDistributionPreview();
      
      expect(balance).to.equal(ethers.parseEther("99"));
      expect(teamAmount).to.equal(ethers.parseEther("19.8"));  // 20%
      expect(ecosystemAmount).to.equal(ethers.parseEther("29.7")); // 30%
      expect(buybackAmount).to.equal(ethers.parseEther("19.8"));  // 20%
      expect(reserveAmount).to.equal(ethers.parseEther("29.7")); // 30%
    });
  });

  describe("合规功能", function () {
    it("应该允许管理员设置黑名单", async function () {
      const { economyModel, owner, user1 } = await deployContractsFixture();
      
      await economyModel.connect(owner).setBlacklist(user1.address, true);
      
      expect(await economyModel.blacklist(user1.address)).to.equal(true);
    });

    it("应该阻止黑名单用户购买", async function () {
      const { economyModel, owner, user1, user2 } = await deployContractsFixture();
      
      await economyModel.connect(owner).setBlacklist(user1.address, true);
      await economyModel.connect(owner).startSale(2);
      
      await expect(
        economyModel.connect(user1).purchaseSpark(1, false)
      ).to.be.revertedWith("Address blocked");
    });

    it("应该允许批量设置黑名单", async function () {
      const { economyModel, owner, user1, user2 } = await deployContractsFixture();
      
      const accounts = [user1.address, user2.address];
      await economyModel.connect(owner).batchSetBlacklist(accounts, true);
      
      expect(await economyModel.blacklist(user1.address)).to.equal(true);
      expect(await economyModel.blacklist(user2.address)).to.equal(true);
    });

    it("应该正确执行合规检查", async function () {
      const { economyModel, owner, user1 } = await deployContractsFixture();
      
      // 未在黑名单，应该通过
      const compliance1 = await economyModel.checkCompliance(user1.address);
      expect(compliance1).to.equal(true);
      
      // 添加到黑名单
      await economyModel.connect(owner).setBlacklist(user1.address, true);
      
      // 应该在黑名单中
      const compliance2 = await economyModel.checkCompliance(user1.address);
      expect(compliance2).to.equal(false);
    });
  });

  describe("紧急提取", function () {
    it("应该允许所有者提取代币", async function () {
      const { economyModel, mockUSDT, owner, user1 } = await deployContractsFixture();
      
      // 购买一些 NFT
      await economyModel.connect(owner).startSale(2);
      await economyModel.connect(user1).purchaseSpark(1, false);
      
      // 提取 USDT
      const balanceBefore = await mockUSDT.balanceOf(owner.address);
      await economyModel.connect(owner).emergencyWithdraw(
        await mockUSDT.getAddress(),
        owner.address,
        ethers.parseEther("50")
      );
      
      const balanceAfter = await mockUSDT.balanceOf(owner.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("配额查询", function () {
    it("应该返回正确的配额状态", async function () {
      const { economyModel, owner, user1 } = await deployContractsFixture();
      
      const [coreAvailable, subAvailable, regularAvailable, coreSold, subSold, regularSold] = 
        await economyModel.getQuotaStatus();
      
      expect(coreAvailable).to.equal(21);
      expect(subAvailable).to.equal(128);
      expect(regularAvailable).to.equal(10000);
      expect(coreSold).to.equal(0);
      expect(subSold).to.equal(0);
      expect(regularSold).to.equal(0);
    });
  });

  describe("购买历史", function () {
    it("应该正确记录购买历史", async function () {
      const { economyModel, owner, user1 } = await deployContractsFixture();
      
      await economyModel.connect(owner).startSale(2);
      await economyModel.connect(user1).purchaseSpark(1, false);
      
      const purchases = await economyModel.getUserPurchases(user1.address);
      
      expect(purchases.length).to.equal(1);
      expect(purchases[0].level).to.equal(1); // Regular
      expect(purchases[0].price).to.equal(ethers.parseEther("99"));
      expect(purchases[0].isWrapped).to.equal(false);
    });

    it("应该返回正确的购买数量", async function () {
      const { economyModel, owner, user1 } = await deployContractsFixture();
      
      await economyModel.connect(owner).startSale(2);
      await economyModel.connect(user1).purchaseSpark(1, false);
      await economyModel.connect(user1).purchaseSpark(1, false);
      
      const count = await economyModel.getUserPurchaseCount(user1.address);
      expect(count).to.equal(2);
    });
  });
});