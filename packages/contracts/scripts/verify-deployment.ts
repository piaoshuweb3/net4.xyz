import { ethers, network } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

/**
 * Verification script for deployed contracts on Base Sepolia
 * Validates contract functionality after deployment
 */

interface DeployedContracts {
  MockUSDT: string;
  AFC_Token: string;
  Spark_NFT: string;
  EconomyModel: string;
}

// Load deployment addresses from environment or latest deployment file
function getDeployedAddresses(): DeployedContracts | null {
  const addresses = {
    MockUSDT: process.env.NEXT_PUBLIC_MOCK_USDT_SEPOLIA,
    AFC_Token: process.env.NEXT_PUBLIC_AFC_TOKEN_SEPOLIA,
    Spark_NFT: process.env.NEXT_PUBLIC_SPARK_NFT_SEPOLIA,
    EconomyModel: process.env.NEXT_PUBLIC_ECONOMY_MODEL_SEPOLIA,
  };

  // Check if all addresses are configured
  if (!addresses.MockUSDT || !addresses.AFC_Token || !addresses.Spark_NFT || !addresses.EconomyModel) {
    return null;
  }

  return addresses as DeployedContracts;
}

async function verifyContracts() {
  console.log("=".repeat(60));
  console.log("Contract Verification - Base Sepolia Testnet");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);
  console.log("");

  const addresses = getDeployedAddresses();
  
  if (!addresses) {
    console.error("ERROR: Contract addresses not configured in .env");
    console.log("Please set the following environment variables:");
    console.log("  NEXT_PUBLIC_MOCK_USDT_SEPOLIA");
    console.log("  NEXT_PUBLIC_AFC_TOKEN_SEPOLIA");
    console.log("  NEXT_PUBLIC_SPARK_NFT_SEPOLIA");
    console.log("  NEXT_PUBLIC_ECONOMY_MODEL_SEPOLIA");
    process.exit(1);
  }

  const [deployer, user1, user2] = await ethers.getSigners();
  console.log(`Testing with accounts:`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  User1: ${user1.address}`);
  console.log(`  User2: ${user2.address}`);
  console.log("");

  let allPassed = true;

  try {
    // 1. Verify AFC_Token
    console.log("[1/4] Verifying AFC_Token...");
    const afcToken = await ethers.getContractAt("AFC_Token", addresses.AFC_Token);
    
    const tokenName = await afcToken.name();
    const tokenSymbol = await afcToken.symbol();
    const totalSupply = await afcToken.totalSupply();
    const deployerBalance = await afcToken.balanceOf(deployer.address);
    
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} AFC`);
    console.log(`   Deployer Balance: ${ethers.formatEther(deployerBalance)} AFC`);
    
    if (tokenName !== "AFC Token" || tokenSymbol !== "AFC") {
      console.log("   ❌ FAILED: Token metadata incorrect");
      allPassed = false;
    } else {
      console.log("   ✅ PASSED");
    }

    // 2. Verify Spark_NFT
    console.log("\n[2/4] Verifying Spark_NFT...");
    const sparkNFT = await ethers.getContractAt("Spark_NFT", addresses.Spark_NFT);
    
    const nftName = await sparkNFT.name();
    const nftSymbol = await sparkNFT.symbol();
    const quotaStatus = await sparkNFT.getQuotaStatus();
    
    console.log(`   Name: ${nftName}`);
    console.log(`   Symbol: ${nftSymbol}`);
    console.log(`   Core Nodes Available: ${quotaStatus[0]}`);
    console.log(`   Sub Nodes Available: ${quotaStatus[1]}`);
    console.log(`   Regular Nodes Available: ${quotaStatus[2]}`);
    
    if (nftName !== "Spark NFT" || nftSymbol !== "SPARK") {
      console.log("   ❌ FAILED: NFT metadata incorrect");
      allPassed = false;
    } else {
      console.log("   ✅ PASSED");
    }

    // 3. Verify EconomyModel
    console.log("\n[3/4] Verifying EconomyModel...");
    const economyModel = await ethers.getContractAt("EconomyModel", addresses.EconomyModel);
    
    const usdtToken = await economyModel.usdtToken();
    const sparkNFTAddress = await economyModel.sparkNFTAddress();
    const currentPhase = await economyModel.currentPhase();
    const prices = await economyModel.getAllPrices();
    
    console.log(`   USDT Token: ${usdtToken}`);
    console.log(`   Spark NFT: ${sparkNFTAddress}`);
    console.log(`   Current Phase: ${currentPhase}`);
    console.log(`   Regular Price: ${ethers.formatEther(prices[0])} USDT`);
    console.log(`   Sub Price: ${ethers.formatEther(prices[1])} USDT`);
    console.log(`   Core Price: ${ethers.formatEther(prices[2])} USDT`);
    
    if (usdtToken !== addresses.MockUSDT || sparkNFTAddress !== addresses.Spark_NFT) {
      console.log("   ❌ FAILED: Contract addresses not linked correctly");
      allPassed = false;
    } else {
      console.log("   ✅ PASSED");
    }

    // 4. Test Basic Functionality
    console.log("\n[4/4] Testing Basic Functionality...");
    
    // Test AFC Token transfer
    const transferAmount = ethers.parseEther("1000");
    await afcToken.transfer(user1.address, transferAmount);
    const user1Balance = await afcToken.balanceOf(user1.address);
    
    if (user1Balance !== transferAmount) {
      console.log("   ❌ FAILED: Token transfer failed");
      allPassed = false;
    } else {
      console.log("   ✅ Token transfer works");
    }

    // Test NFT minting (by owner)
    const mintTx = await sparkNFT.mintRegularNode(
      user1.address,
      0, // Light avatar
      0, // L1 compute
      "TestAI",
      "ipfs://test"
    );
    await mintTx.wait();
    
    const user1NFTBalance = await sparkNFT.balanceOf(user1.address);
    if (user1NFTBalance > 0n) {
      console.log("   ✅ NFT minting works");
    } else {
      console.log("   ❌ FAILED: NFT minting failed");
      allPassed = false;
    }

    console.log("\n" + "=".repeat(60));
    if (allPassed) {
      console.log("✅ All verifications PASSED!");
    } else {
      console.log("❌ Some verifications FAILED!");
      process.exit(1);
    }
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Verification failed with error:", error);
    process.exit(1);
  }
}

verifyContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });