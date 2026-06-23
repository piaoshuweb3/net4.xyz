import { ethers, network } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

/**
 * Liquidity Injection Script for net4.xyz
 * 
 * This script:
 * 1. Reserves liquidity tokens (10-15% of supply)
 * 2. Injects liquidity into Uniswap V3
 * 3. Configures market maker
 * 4. Verifies NFT liquidation capability
 * 
 * Requirements: 11.4
 */

interface DeploymentInfo {
  network: string;
  chainId: string;
  deployer: string;
  contracts: Record<string, string>;
}

interface LiquidityInjectionConfig {
  afcReservePercent: number;  // Percentage of AFC supply for liquidity (10-15)
  usdtReserveAmount: number;  // USDT amount for initial liquidity
  marketMakerEnabled: boolean;
  targetPoolRatio: number;    // Target AFC/USDT ratio for rebalancing
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

async function getInjectionConfig(): Promise<LiquidityInjectionConfig> {
  return {
    afcReservePercent: parseInt(process.env.AFC_RESERVE_PERCENT || "12"),
    usdtReserveAmount: parseFloat(process.env.USDT_RESERVE_AMOUNT || "100000"),
    marketMakerEnabled: process.env.MARKET_MAKER_ENABLED === "true",
    targetPoolRatio: parseInt(process.env.TARGET_POOL_RATIO || "10000"), // 1:1
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("net4.xyz Liquidity Injection");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);

  // Load deployment info
  const deployment = await loadDeploymentInfo();
  
  if (!deployment) {
    console.error("❌ No deployment found. Please run deploy-mainnet.ts first.");
    process.exit(1);
  }

  const config = await getInjectionConfig();
  const { contracts } = deployment;
  
  console.log("\nLoaded deployment addresses:");
  for (const [name, address] of Object.entries(contracts)) {
    console.log(`  ${name}: ${address}`);
  }

  console.log("\nInjection Configuration:");
  console.log(`  AFC Reserve: ${config.afcReservePercent}% of supply`);
  console.log(`  USDT Reserve: $${config.usdtReserveAmount}`);
  console.log(`  Market Maker: ${config.marketMakerEnabled ? "Enabled" : "Disabled"}`);
  console.log(`  Target Pool Ratio: ${config.targetPoolRatio / 10000}:1`);

  const [deployer] = await ethers.getSigners();
  console.log(`\nDeployer: ${deployer.address}`);

  try {
    // Get token contracts
    const AFC_Token = await ethers.getContractFactory("AFC_Token");
    const afcToken = AFC_Token.attach(contracts.AFC_Token);
    
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdtToken = MockUSDT.attach(contracts.MockUSDT);
    
    // Get LiquidityManager
    const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
    const liquidityManager = LiquidityManager.attach(contracts.LiquidityManager);

    // 1. Check token balances
    console.log("\n[1/5] Checking Token Balances...");
    
    const afcTotalSupply = await afcToken.totalSupply();
    const afcDeployerBalance = await afcToken.balanceOf(deployer.address);
    const usdtDeployerBalance = await usdtToken.balanceOf(deployer.address);
    
    console.log(`   AFC Total Supply: ${ethers.formatUnits(afcTotalSupply, 18)}`);
    console.log(`   Deployer AFC Balance: ${ethers.formatUnits(afcDeployerBalance, 18)}`);
    console.log(`   Deployer USDT Balance: ${ethers.formatUnits(usdtDeployerBalance, 18)}`);

    // Calculate liquidity amounts
    const afcLiquidityAmount = (afcTotalSupply * BigInt(config.afcReservePercent)) / BigInt(100);
    const usdtLiquidityAmount = ethers.parseUnits(config.usdtReserveAmount.toString(), 18);
    
    console.log(`\n   Liquidity to reserve:`);
    console.log(`   AFC: ${ethers.formatUnits(afcLiquidityAmount, 18)} (${config.afcReservePercent}%)`);
    console.log(`   USDT: ${ethers.formatUnits(usdtLiquidityAmount, 18)}`);

    // 2. Approve tokens for LiquidityManager
    console.log("\n[2/5] Approving Tokens...");
    
    const afcApproveTx = await afcToken.approve(contracts.LiquidityManager, afcLiquidityAmount);
    await afcApproveTx.wait();
    console.log("   ✅ AFC approved");
    
    const usdtApproveTx = await usdtToken.approve(contracts.LiquidityManager, usdtLiquidityAmount);
    await usdtApproveTx.wait();
    console.log("   ✅ USDT approved");

    // 3. Reserve liquidity
    console.log("\n[3/5] Reserving Liquidity...");
    
    const reserveTx = await liquidityManager.reserveLiquidity(afcLiquidityAmount, usdtLiquidityAmount);
    await reserveTx.wait();
    console.log("   ✅ Liquidity reserved");
    
    // Verify reservation
    const liquidityStatus = await liquidityManager.getLiquidityStatus();
    console.log(`   Reserved AFC: ${ethers.formatUnits(liquidityStatus.totalAfcLiquidity, 18)}`);
    console.log(`   Reserved USDT: ${ethers.formatUnits(liquidityStatus.totalUsdtLiquidity, 18)}`);

    // 4. Add liquidity to Uniswap V3 (simulated)
    console.log("\n[4/5] Adding Liquidity to Uniswap V3...");
    
    // Note: In production, this would use the actual Uniswap V3 router
    // For now, we'll simulate the pool address
    const uniswapPoolAddress = process.env.UNISWAP_POOL_ADDRESS || "0x...";
    
    if (uniswapPoolAddress !== "0x...") {
      const minLiquidity = 0;
      const addLiquidityTx = await liquidityManager.addLiquidity(
        uniswapPoolAddress,
        afcLiquidityAmount,
        usdtLiquidityAmount,
        minLiquidity
      );
      await addLiquidityTx.wait();
      console.log("   ✅ Liquidity added to Uniswap V3");
    } else {
      console.log("   ⚠️  UNISWAP_POOL_ADDRESS not configured - skipping LP injection");
      console.log("   Note: Run this script with UNISWAP_POOL_ADDRESS set after pool creation");
    }

    // 5. Configure market maker
    console.log("\n[5/5] Configuring Market Maker...");
    
    if (config.marketMakerEnabled) {
      await liquidityManager.setMarketMakerEnabled(true);
      console.log("   ✅ Market maker enabled");
      
      // Set target ratio for rebalancing
      // Note: This would be done by the market maker service
      console.log(`   Target pool ratio: ${config.targetPoolRatio / 10000}:1`);
    } else {
      console.log("   ℹ️  Market maker disabled (set MARKET_MAKER_ENABLED=true to enable)");
    }

    // Verify NFT liquidation capability
    console.log("\n" + "=".repeat(60));
    console.log("NFT Liquidation Capability");
    console.log("=".repeat(60));
    
    const availableAfc = await afcToken.balanceOf(contracts.LiquidityManager);
    const availableUsdt = await usdtToken.balanceOf(contracts.LiquidityManager);
    
    console.log(`   Available for NFT holders to purchase:`);
    console.log(`   AFC: ${ethers.formatUnits(availableAfc, 18)}`);
    console.log(`   USDT: ${ethers.formatUnits(availableUsdt, 18)}`);
    console.log("");
    console.log("   NFT holders can now:`);
    console.log("   - Purchase AFC using USDT: purchaseAFCFromLiquidity()");
    console.log("   - Sell AFC for USDT: sellAFCToLiquidity()");
    console.log("=".repeat(60));

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Liquidity Injection Complete!");
    console.log("=".repeat(60));
    console.log("\n📋 Summary:");
    console.log(`   AFC Reserved: ${ethers.formatUnits(afcLiquidityAmount, 18)} (${config.afcReservePercent}%)`);
    console.log(`   USDT Reserved: $${config.usdtReserveAmount}`);
    console.log(`   Liquidity Manager: ${contracts.LiquidityManager}`);
    console.log("");
    console.log("📊 Next Steps:");
    console.log("1. Monitor liquidity pool on Uniswap");
    console.log("2. Configure market maker bot for automated rebalancing");
    console.log("3. Announce liquidity to community");
    console.log("4. Track NFT holder liquidation activity");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Liquidity injection failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });