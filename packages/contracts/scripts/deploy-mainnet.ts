import { ethers, network, run } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

/**
 * Mainnet Deployment Script for net4.xyz
 * 
 * Deploys to Base Mainnet:
 * 1. MockUSDT - USDT mock (or use real USDT on mainnet)
 * 2. AFC_Token - Main ERC-20 token
 * 3. Spark_NFT - Node NFT contract
 * 4. EconomyModel - Economic model for NFT sales
 * 
 * Multi-sig Configuration:
 * - Uses Gnosis Safe for team wallet
 * - Separate wallets for ecosystem, buyback, and reserve
 */

interface MultiSigConfig {
  teamWallet: string;
  ecosystemWallet: string;
  buybackWallet: string;
  reserveWallet: string;
}

async function getMultiSigConfig(): Promise<MultiSigConfig> {
  // Load from environment or use placeholders
  return {
    teamWallet: process.env.TEAM_WALLET || process.env.DEPLOYER_ADDRESS || "",
    ecosystemWallet: process.env.ECOSYSTEM_WALLET || "",
    buybackWallet: process.env.BUYBACK_WALLET || "",
    reserveWallet: process.env.RESERVE_WALLET || "",
  };
}

async function validateConfig(): Promise<void> {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey || privateKey === "0x...") {
    throw new Error("DEPLOYER_PRIVATE_KEY not configured in .env");
  }

  const rpcUrl = process.env.BASE_RPC_URL;
  if (!rpcUrl) {
    throw new Error("BASE_RPC_URL not configured in .env");
  }

  const config = await getMultiSigConfig();
  if (!config.teamWallet) {
    throw new Error("TEAM_WALLET not configured in .env");
  }
  if (!config.ecosystemWallet || !config.buybackWallet || !config.reserveWallet) {
    console.warn("⚠️  Warning: Some wallet addresses not configured. Using deployer address as fallback.");
    config.ecosystemWallet = config.ecosystemWallet || config.teamWallet;
    config.buybackWallet = config.buybackWallet || config.teamWallet;
    config.reserveWallet = config.reserveWallet || config.teamWallet;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("net4.xyz Mainnet Deployment");
  console.log("=".repeat(60));

  // Validate configuration
  await validateConfig();
  
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("=".repeat(60));

  const deployedAddresses: Record<string, string> = {};
  const config = await getMultiSigConfig();

  try {
    // 1. Deploy MockUSDT (for testing - on mainnet use real USDT)
    console.log("\n[1/4] Deploying MockUSDT...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    const mockUSDTAddress = await mockUSDT.getAddress();
    deployedAddresses["MockUSDT"] = mockUSDTAddress;
    console.log(`   MockUSDT deployed at: ${mockUSDTAddress}`);

    // 2. Deploy AFC_Token
    console.log("\n[2/4] Deploying AFC_Token...");
    const AFC_Token = await ethers.getContractFactory("AFC_Token");
    const afcToken = await AFC_Token.deploy();
    await afcToken.waitForDeployment();
    const afcTokenAddress = await afcToken.getAddress();
    deployedAddresses["AFC_Token"] = afcTokenAddress;
    console.log(`   AFC_Token deployed at: ${afcTokenAddress}`);

    // 3. Deploy Spark_NFT
    console.log("\n[3/4] Deploying Spark_NFT...");
    const Spark_NFT = await ethers.getContractFactory("Spark_NFT");
    const sparkNFT = await Spark_NFT.deploy();
    await sparkNFT.waitForDeployment();
    const sparkNFTAddress = await sparkNFT.getAddress();
    deployedAddresses["Spark_NFT"] = sparkNFTAddress;
    console.log(`   Spark_NFT deployed at: ${sparkNFTAddress}`);

    // Set AFC Token address in Spark NFT
    await sparkNFT.setAFCTokenAddress(afcTokenAddress);
    console.log("   AFC Token address set in Spark_NFT");

    // 4. Deploy EconomyModel with multi-sig wallets
    console.log("\n[4/4] Deploying EconomyModel...");
    const EconomyModel = await ethers.getContractFactory("EconomyModel");
    const economyModel = await EconomyModel.deploy(
      mockUSDTAddress,      // USDT token
      sparkNFTAddress,      // Spark NFT
      config.teamWallet,    // Team wallet (multi-sig)
      config.ecosystemWallet, // Ecosystem wallet
      config.buybackWallet,   // Buyback wallet
      config.reserveWallet    // Reserve wallet
    );
    await economyModel.waitForDeployment();
    const economyModelAddress = await economyModel.getAddress();
    deployedAddresses["EconomyModel"] = economyModelAddress;
    console.log(`   EconomyModel deployed at: ${economyModelAddress}`);

    // 5. Deploy LiquidityManager for LP injection
    console.log("\n[5/5] Deploying LiquidityManager...");
    const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
    const liquidityManager = await LiquidityManager.deploy(
      afcTokenAddress,      // AFC token
      mockUSDTAddress,      // USDT token
      config.reserveWallet  // Use reserve wallet as initial market maker
    );
    await liquidityManager.waitForDeployment();
    const liquidityManagerAddress = await liquidityManager.getAddress();
    deployedAddresses["LiquidityManager"] = liquidityManagerAddress;
    console.log(`   LiquidityManager deployed at: ${liquidityManagerAddress}`);

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
    console.log("");
    console.log("Multi-sig Configuration:");
    console.log(`  Team Wallet: ${config.teamWallet}`);
    console.log(`  Ecosystem Wallet: ${config.ecosystemWallet}`);
    console.log(`  Buyback Wallet: ${config.buybackWallet}`);
    console.log(`  Reserve Wallet: ${config.reserveWallet}`);
    console.log("=".repeat(60));

    // Verify contracts on Basescan
    if (network.name === "base") {
      console.log("\nVerifying contracts on Basescan...");
      
      const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
      if (etherscanApiKey && etherscanApiKey !== "your-etherscan-api-key") {
        try {
          console.log("   Waiting for contracts to be indexed...");
          await new Promise(resolve => setTimeout(resolve, 30000));

          console.log("   Verifying MockUSDT...");
          await run("verify:verify", {
            address: mockUSDTAddress,
            constructorArguments: [],
          });

          console.log("   Verifying AFC_Token...");
          await run("verify:verify", {
            address: afcTokenAddress,
            constructorArguments: [],
          });

          console.log("   Verifying Spark_NFT...");
          await run("verify:verify", {
            address: sparkNFTAddress,
            constructorArguments: [],
          });

          console.log("   Verifying EconomyModel...");
          await run("verify:verify", {
            address: economyModelAddress,
            constructorArguments: [
              mockUSDTAddress,
              sparkNFTAddress,
              config.teamWallet,
              config.ecosystemWallet,
              config.buybackWallet,
              config.reserveWallet
            ],
          });

          console.log("   Verifying LiquidityManager...");
          await run("verify:verify", {
            address: liquidityManagerAddress,
            constructorArguments: [
              afcTokenAddress,
              mockUSDTAddress,
              config.reserveWallet
            ],
          });

          console.log("\n✅ All contracts verified on Basescan!");
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
      multiSigConfig: config,
      contracts: deployedAddresses
    };
    
    const deploymentPath = `./deployments/${network.name}-${Date.now()}.json`;
    fs.mkdirSync("./deployments", { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${deploymentPath}`);

    // Post-deployment instructions
    console.log("\n" + "=".repeat(60));
    console.log("Post-Deployment Steps");
    console.log("=".repeat(60));
    console.log("1. Update frontend environment variables:");
    console.log(`   NEXT_PUBLIC_AFC_TOKEN_BASE=${afcTokenAddress}`);
    console.log(`   NEXT_PUBLIC_SPARK_NFT_BASE=${sparkNFTAddress}`);
    console.log(`   NEXT_PUBLIC_ECONOMY_MODEL_BASE=${economyModelAddress}`);
    console.log(`   NEXT_PUBLIC_LIQUIDITY_MANAGER=${liquidityManagerAddress}`);
    console.log("");
    console.log("2. Enable Spark NFT sales:");
    console.log(`   Call EconomyModel.startSale(SalePhase.PublicSale)`);
    console.log("");
    console.log("3. Configure liquidity (Requirement 11.4):");
    console.log(`   - Reserve 10-15% of AFC tokens for liquidity`);
    console.log(`   - Create Uniswap V3 pool (AFC/USDT)`);
    console.log(`   - Inject liquidity: npx hardhat run scripts/liquidity-injection.ts`);
    console.log("");
    console.log("4. Configure multi-sig permissions in Gnosis Safe");
    console.log("=".repeat(60));

    console.log("\n✅ Mainnet deployment completed successfully!");
    
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