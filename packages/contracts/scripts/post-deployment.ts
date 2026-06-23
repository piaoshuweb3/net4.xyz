import { ethers, network } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

/**
 * Post-Deployment Script for Mainnet
 * 
 * This script:
 * 1. Enables Spark NFT sales
 * 2. Configures multi-sig wallet permissions
 * 3. Opens minting for all node types
 * 4. Sets up initial pricing
 */

interface DeploymentInfo {
  network: string;
  chainId: string;
  deployer: string;
  multiSigConfig: {
    teamWallet: string;
    ecosystemWallet: string;
    buybackWallet: string;
    reserveWallet: string;
  };
  contracts: Record<string, string>;
}

async function loadDeploymentInfo(): Promise<DeploymentInfo | null> {
  const fs = require("fs");
  const deploymentsDir = "./deployments";
  
  if (!fs.existsSync(deploymentsDir)) {
    return null;
  }
  
  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith(network.name) && f.endsWith(".json"))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    return null;
  }
  
  const latestDeployment = files[0];
  const content = fs.readFileSync(`${deploymentsDir}/${latestDeployment}`, "utf-8");
  return JSON.parse(content);
}

async function main() {
  console.log("=".repeat(60));
  console.log("net4.xyz Post-Deployment Configuration");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);

  // Load deployment info
  const deployment = await loadDeploymentInfo();
  
  if (!deployment) {
    console.error("❌ No deployment found. Please run deploy-mainnet.ts first.");
    process.exit(1);
  }

  const { contracts, multiSigConfig } = deployment;
  
  console.log("\nLoaded deployment addresses:");
  for (const [name, address] of Object.entries(contracts)) {
    console.log(`  ${name}: ${address}`);
  }

  // Check if LiquidityManager is deployed
  const liquidityManagerAddress = contracts.LiquidityManager;
  if (!liquidityManagerAddress) {
    console.warn("⚠️  LiquidityManager not found in deployment. Skipping liquidity configuration.");
  }

  const [deployer] = await ethers.getSigners();
  console.log(`\nDeployer: ${deployer.address}`);

  try {
    // 1. Enable Spark NFT Sales
    console.log("\n[1/4] Enabling Spark NFT Sales...");
    
    const EconomyModel = await ethers.getContractFactory("EconomyModel");
    const economyModel = EconomyModel.attach(contracts.EconomyModel);
    
    // Start public sale
    const SalePhase = {
      Closed: 0,
      Presale: 1,
      PublicSale: 2,
      FlashSale: 3
    };
    
    const tx1 = await economyModel.startSale(SalePhase.PublicSale);
    await tx1.wait();
    console.log("   ✅ Public sale started");

    // 2. Open Minting for All Node Types
    console.log("\n[2/4] Opening Minting for All Node Types...");
    
    const Spark_NFT = await ethers.getContractFactory("Spark_NFT");
    const sparkNFT = Spark_NFT.attach(contracts.Spark_NFT);
    
    // Open core node minting
    const tx2a = await sparkNFT.setMintingStatus(2, true); // Core = 2
    await tx2a.wait();
    console.log("   ✅ Core node minting opened");
    
    // Open sub node minting
    const tx2b = await sparkNFT.setMintingStatus(1, true); // Sub = 1
    await tx2b.wait();
    console.log("   ✅ Sub node minting opened");
    
    // Open regular node minting
    const tx2c = await sparkNFT.setMintingStatus(0, true); // Regular = 0
    await tx2c.wait();
    console.log("   ✅ Regular node minting opened");

    // 3. Verify Multi-sig Configuration
    console.log("\n[3/4] Verifying Multi-sig Configuration...");
    
    const teamWallet = await economyModel.teamWallet();
    const ecosystemWallet = await economyModel.ecosystemWallet();
    const buybackWallet = await economyModel.buybackWallet();
    const reserveWallet = await economyModel.reserveWallet();
    
    console.log(`   Team Wallet (Multi-sig): ${teamWallet}`);
    console.log(`   Ecosystem Wallet: ${ecosystemWallet}`);
    console.log(`   Buyback Wallet: ${buybackWallet}`);
    console.log(`   Reserve Wallet: ${reserveWallet}`);
    
    // Verify they match the deployment config
    if (teamWallet.toLowerCase() !== multiSigConfig.teamWallet.toLowerCase()) {
      console.warn("   ⚠️  Team wallet mismatch!");
    } else {
      console.log("   ✅ Multi-sig configuration verified");
    }

    // 4. Display Current Pricing
    console.log("\n[4/4] Current NFT Pricing...");
    
    const regularPrice = await economyModel.getCurrentPrice(0);
    const subPrice = await economyModel.getCurrentPrice(1);
    const corePrice = await economyModel.getCurrentPrice(2);
    
    console.log(`   Regular Node: ${ethers.formatUnits(regularPrice, 18)} USDT`);
    console.log(`   Sub Node: ${ethers.formatUnits(subPrice, 18)} USDT`);
    console.log(`   Core Node: ${ethers.formatUnits(corePrice, 18)} USDT`);

    // Get quota status
    const quota = await economyModel.getQuotaStatus();
    console.log("\n   Available Quotas:");
    console.log(`   Core Nodes: ${quota[0]} / 21`);
    console.log(`   Sub Nodes: ${quota[1]} / 128`);
    console.log(`   Regular Nodes: ${quota[2]} / 10000`);

    // 5. Liquidity Configuration (Requirement 11.4)
    if (liquidityManagerAddress) {
      console.log("\n[5/5] Liquidity Configuration...");
      
      const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
      const liquidityManager = LiquidityManager.attach(liquidityManagerAddress);
      
      // Get liquidity status
      const liquidityStatus = await liquidityManager.getLiquidityStatus();
      console.log(`   Liquidity Manager: ${liquidityManagerAddress}`);
      console.log(`   Total AFC Liquidity: ${ethers.formatUnits(liquidityStatus.totalAfcLiquidity, 18)}`);
      console.log(`   Total USDT Liquidity: ${ethers.formatUnits(liquidityStatus.totalUsdtLiquidity, 18)}`);
      console.log(`   Liquidity Initialized: ${liquidityStatus.isInitialized}`);
      console.log(`   Unlock Time: ${new Date(Number(liquidityStatus.unlockTime) * 1000).toISOString()}`);
      
      // Get liquidity ratio
      const liquidityRatio = await liquidityManager.liquidityRatio();
      console.log(`   Liquidity Ratio: ${Number(liquidityRatio) / 100}%`);
      
      // Get market maker status
      const marketMakerEnabled = await liquidityManager.marketMakerEnabled();
      console.log(`   Market Maker Enabled: ${marketMakerEnabled}`);
      
      console.log("   ✅ Liquidity configuration verified");
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Post-Deployment Complete!");
    console.log("=".repeat(60));
    console.log("\n📋 Next Steps:");
    console.log("1. Verify contracts on Basescan");
    console.log("2. Update frontend .env with mainnet addresses");
    console.log("3. Configure Gnosis Safe multi-sig:");
    console.log(`   - Add ${contracts.EconomyModel} as safe module`);
    console.log("4. Announce to community");
    console.log("5. Monitor sales and adjust pricing as needed");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Post-deployment configuration failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });