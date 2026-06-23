import { ethers, network, run } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

/**
 * Deployment script for net4.xyz smart contracts to Base Sepolia testnet
 * 
 * Deploys:
 * 1. AFC_Token - Main ERC-20 token
 * 2. Spark_NFT - Node NFT contract
 * 3. EconomyModel - Economic model for NFT sales
 * 4. MockUSDT - USDT mock for testing
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log("=".repeat(60));
  console.log("net4.xyz Smart Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("=".repeat(60));

  const deployedAddresses: Record<string, string> = {};

  // Check if we have a deployer private key
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey || privateKey === "0x...") {
    console.error("ERROR: DEPLOYER_PRIVATE_KEY not configured in .env");
    process.exit(1);
  }

  // Check RPC URL
  const rpcUrl = network.name === "baseSepolia" 
    ? process.env.BASE_SEPOLIA_RPC_URL 
    : process.env.BASE_RPC_URL;
    
  if (!rpcUrl) {
    console.error(`ERROR: ${network.name.toUpperCase()}_RPC_URL not configured in .env`);
    process.exit(1);
  }

  try {
    // 1. Deploy MockUSDT (for testing)
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

    // 4. Deploy EconomyModel
    console.log("\n[4/4] Deploying EconomyModel...");
    const EconomyModel = await ethers.getContractFactory("EconomyModel");
    const economyModel = await EconomyModel.deploy(
      mockUSDTAddress,  // USDT token
      sparkNFTAddress,  // Spark NFT
      deployer.address, // Team wallet
      deployer.address, // Ecosystem wallet
      deployer.address, // Buyback wallet
      deployer.address  // Reserve wallet
    );
    await economyModel.waitForDeployment();
    const economyModelAddress = await economyModel.getAddress();
    deployedAddresses["EconomyModel"] = economyModelAddress;
    console.log(`   EconomyModel deployed at: ${economyModelAddress}`);

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

    // Verify contracts on Basescan (if on testnet)
    if (network.name === "baseSepolia" || network.name === "base") {
      console.log("\nVerifying contracts on Basescan...");
      
      const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
      if (etherscanApiKey && etherscanApiKey !== "your-etherscan-api-key") {
        try {
          // Wait for a few blocks to ensure the contracts are indexed
          console.log("   Waiting for contracts to be indexed...");
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

          // Verify MockUSDT
          console.log("   Verifying MockUSDT...");
          await run("verify:verify", {
            address: mockUSDTAddress,
            constructorArguments: [],
          });

          // Verify AFC_Token
          console.log("   Verifying AFC_Token...");
          await run("verify:verify", {
            address: afcTokenAddress,
            constructorArguments: [],
          });

          // Verify Spark_NFT
          console.log("   Verifying Spark_NFT...");
          await run("verify:verify", {
            address: sparkNFTAddress,
            constructorArguments: [],
          });

          // Verify EconomyModel
          console.log("   Verifying EconomyModel...");
          await run("verify:verify", {
            address: economyModelAddress,
            constructorArguments: [
              mockUSDTAddress,
              sparkNFTAddress,
              deployer.address,
              deployer.address,
              deployer.address,
              deployer.address
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

    // Save deployment addresses to file
    const fs = require("fs");
    const deploymentInfo = {
      network: network.name,
      chainId: chainId.toString(),
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: deployedAddresses
    };
    
    const deploymentPath = `./deployments/${network.name}-${Date.now()}.json`;
    fs.mkdirSync("./deployments", { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${deploymentPath}`);

    console.log("\n✅ Deployment completed successfully!");
    
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