import { ethers, network, run } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

/**
 * Liquidity Manager Deployment Script for net4.xyz
 * 
 * Deploys liquidity management for mainnet:
 * 1. LiquidityManager - Manages LP injection and NFT liquidation
 * 
 * Configuration:
 * - Reserves 10-15% of tokens for liquidity (default 12%)
 * - Integrates with Uniswap V3 on Base
 * - Supports market maker rebalancing
 * - Enables NFT holder liquidation
 */

interface LiquidityConfig {
  afcToken: string;
  usdtToken: string;
  marketMaker: string;
  liquidityRatio: number; // in basis points (1000 = 10%, 1500 = 15%)
}

async function getLiquidityConfig(): Promise<LiquidityConfig> {
  return {
    afcToken: process.env.AFC_TOKEN_ADDRESS || "",
    usdtToken: process.env.USDT_TOKEN_ADDRESS || "",
    marketMaker: process.env.MARKET_MAKER_ADDRESS || "",
    liquidityRatio: parseInt(process.env.LIQUIDITY_RATIO || "1200"),
  };
}

async function validateConfig(config: LiquidityConfig): Promise<void> {
  if (!config.afcToken || config.afcToken === "0x...") {
    throw new Error("AFC_TOKEN_ADDRESS not configured in .env");
  }
  if (!config.usdtToken || config.usdtToken === "0x...") {
    throw new Error("USDT_TOKEN_ADDRESS not configured in .env");
  }
  if (!config.marketMaker || config.marketMaker === "0x...") {
    console.warn("⚠️  Warning: MARKET_MAKER_ADDRESS not configured. Using deployer address as fallback.");
    const [deployer] = await ethers.getSigners();
    config.marketMaker = deployer.address;
  }
  if (config.liquidityRatio < 1000 || config.liquidityRatio > 1500) {
    throw new Error("LIQUIDITY_RATIO must be between 1000 (10%) and 1500 (15%)");
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("net4.xyz Liquidity Manager Deployment");
  console.log("=".repeat(60));

  // Load configuration
  const config = await getLiquidityConfig();
  await validateConfig(config);
  
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("");
  console.log("Configuration:");
  console.log(`  AFC Token: ${config.afcToken}`);
  console.log(`  USDT Token: ${config.usdtToken}`);
  console.log(`  Market Maker: ${config.marketMaker}`);
  console.log(`  Liquidity Ratio: ${config.liquidityRatio / 100}%`);
  console.log("=".repeat(60));

  const deployedAddresses: Record<string, string> = {};

  try {
    // Deploy LiquidityManager
    console.log("\n[1/1] Deploying LiquidityManager...");
    
    const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
    const liquidityManager = await LiquidityManager.deploy(
      config.afcToken,
      config.usdtToken,
      config.marketMaker
    );
    
    await liquidityManager.waitForDeployment();
    const liquidityManagerAddress = await liquidityManager.getAddress();
    deployedAddresses["LiquidityManager"] = liquidityManagerAddress;
    
    console.log(`   LiquidityManager deployed at: ${liquidityManagerAddress}`);
    
    // Set liquidity ratio
    if (config.liquidityRatio !== 1200) {
      await liquidityManager.setLiquidityRatio(config.liquidityRatio);
      console.log(`   Liquidity ratio set to ${config.liquidityRatio / 100}%`);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Deployment Summary");
    console.log("=".repeat(60));
    console.log(`Network: ${network.name}`);
    console.log(`Chain ID: ${chainId}`);
    console.log("");
    for (const [name, address] of Object.entries(deployedAddresses)) {
      console.log(`${name}: ${address}`);
    }
    console.log("=".repeat(60));

    // Verify contract on Basescan
    if (network.name === "base") {
      console.log("\nVerifying contract on Basescan...");
      
      const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
      if (etherscanApiKey && etherscanApiKey !== "your-etherscan-api-key") {
        try {
          console.log("   Waiting for contract to be indexed...");
          await new Promise(resolve => setTimeout(resolve, 30000));

          console.log("   Verifying LiquidityManager...");
          await run("verify:verify", {
            address: liquidityManagerAddress,
            constructorArguments: [
              config.afcToken,
              config.usdtToken,
              config.marketMaker
            ],
          });

          console.log("\n✅ Contract verified on Basescan!");
        } catch (error) {
          console.log("\n⚠️  Contract verification failed:", error);
          console.log("   You can verify manually on Basescan.");
        }
      } else {
        console.log("   Skipping verification - ETHERSCAN_API_KEY not configured");
      }
    }

    // Save deployment addresses
    const fs = require("fs");
    const deploymentInfo = {
      network: network.name,
      chainId: chainId.toString(),
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      config: config,
      contracts: deployedAddresses
    };
    
    const deploymentPath = `./deployments/${network.name}-liquidity-${Date.now()}.json`;
    fs.mkdirSync("./deployments", { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${deploymentPath}`);

    // Post-deployment instructions
    console.log("\n" + "=".repeat(60));
    console.log("Post-Deployment Steps");
    console.log("=".repeat(60));
    console.log("1. Update frontend environment variables:");
    console.log(`   NEXT_PUBLIC_LIQUIDITY_MANAGER=${liquidityManagerAddress}`);
    console.log("");
    console.log("2. Reserve liquidity tokens (10-15% of supply):");
    console.log(`   await liquidityManager.reserveLiquidity(afcAmount, usdtAmount)`);
    console.log("");
    console.log("3. Add liquidity to Uniswap V3:");
    console.log(`   await liquidityManager.addLiquidity(poolAddress, afcAmount, usdtAmount, minLiquidity)`);
    console.log("");
    console.log("4. Enable market maker (optional):");
    console.log(`   await liquidityManager.setMarketMakerEnabled(true)`);
    console.log("");
    console.log("5. Monitor liquidity status:");
    console.log(`   await liquidityManager.getLiquidityStatus()`);
    console.log("=".repeat(60));

    console.log("\n✅ Liquidity Manager deployment completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });