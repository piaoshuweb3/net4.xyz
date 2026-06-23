import { ethers, network } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

/**
 * Stress Testing Script for net4.xyz Smart Contracts
 * Tests high-volume transactions and edge cases
 */

interface DeployedContracts {
  MockUSDT: string;
  AFC_Token: string;
  Spark_NFT: string;
  EconomyModel: string;
}

function getDeployedAddresses(): DeployedContracts | null {
  const addresses = {
    MockUSDT: process.env.NEXT_PUBLIC_MOCK_USDT_SEPOLIA,
    AFC_Token: process.env.NEXT_PUBLIC_AFC_TOKEN_SEPOLIA,
    Spark_NFT: process.env.NEXT_PUBLIC_SPARK_NFT_SEPOLIA,
    EconomyModel: process.env.NEXT_PUBLIC_ECONOMY_MODEL_SEPOLIA,
  };

  if (!addresses.MockUSDT || !addresses.AFC_Token || !addresses.Spark_NFT || !addresses.EconomyModel) {
    return null;
  }

  return addresses as DeployedContracts;
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
}

async function runStressTest() {
  console.log("=".repeat(60));
  console.log("Stress Testing - Base Sepolia Testnet");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("");

  const addresses = getDeployedAddresses();
  
  if (!addresses) {
    console.error("ERROR: Contract addresses not configured");
    process.exit(1);
  }

  const results: TestResult[] = [];
  const [deployer, ...users] = await ethers.getSigners();
  
  // Get test accounts
  const testAccounts = users.slice(0, 10);
  console.log(`Testing with ${testAccounts.length} test accounts`);
  console.log("");

  const afcToken = await ethers.getContractAt("AFC_Token", addresses.AFC_Token);
  const sparkNFT = await ethers.getContractAt("Spark_NFT", addresses.Spark_NFT);
  const economyModel = await ethers.getContractAt("EconomyModel", addresses.EconomyModel);
  const mockUSDT = await ethers.getContractAt("MockUSDT", addresses.MockUSDT);

  // Fund test accounts with AFC tokens
  console.log("Setting up test accounts...");
  const fundAmount = ethers.parseEther("10000");
  
  for (const account of testAccounts) {
    const balance = await afcToken.balanceOf(account.address);
    if (balance < fundAmount) {
      const tx = await afcToken.transfer(account.address, fundAmount);
      await tx.wait();
    }
  }
  
  // Fund test accounts with USDT
  const usdtAmount = ethers.parseEther("50000");
  for (const account of testAccounts) {
    const balance = await mockUSDT.balanceOf(account.address);
    if (balance < usdtAmount) {
      const tx = await mockUSDT.mint(account.address, usdtAmount);
      await tx.wait();
    }
  }
  console.log("Test accounts funded\n");

  // Test 1: High Volume Token Transfers
  console.log("[Test 1] High Volume Token Transfers...");
  const transferStartTime = Date.now();
  let transferCount = 0;
  const targetTransfers = 50;
  
  try {
    const transferPromises = testAccounts.slice(0, 10).map((account, i) => {
      return afcToken.transfer(testAccounts[(i + 1) % 10].address, ethers.parseEther("1"));
    });
    
    const receipts = await Promise.all(transferPromises);
    await Promise.all(receipts.map(r => r.wait()));
    transferCount = receipts.length;
    
    const transferDuration = Date.now() - transferStartTime;
    results.push({
      name: "High Volume Token Transfers",
      passed: transferCount === targetTransfers,
      duration: transferDuration,
      details: `Completed ${transferCount} transfers in ${transferDuration}ms`
    });
    console.log(`   ✅ Completed ${transferCount} transfers in ${transferDuration}ms`);
  } catch (error) {
    results.push({
      name: "High Volume Token Transfers",
      passed: false,
      duration: Date.now() - transferStartTime,
      details: `Error: ${error}`
    });
    console.log(`   ❌ FAILED: ${error}`);
  }

  // Test 2: Concurrent NFT Minting
  console.log("\n[Test 2] Concurrent NFT Minting...");
  const mintStartTime = Date.now();
  
  try {
    const mintPromises = testAccounts.slice(0, 5).map((account) => {
      return sparkNFT.mintRegularNode(
        account.address,
        0, // Light avatar
        0, // L1 compute
        "StressTest",
        "ipfs://stresstest"
      );
    });
    
    const mintReceipts = await Promise.all(mintPromises);
    await Promise.all(mintReceipts.map(r => r.wait()));
    
    const mintDuration = Date.now() - mintStartTime;
    results.push({
      name: "Concurrent NFT Minting",
      passed: true,
      duration: mintDuration,
      details: `Minted ${mintReceipts.length} NFTs in ${mintDuration}ms`
    });
    console.log(`   ✅ Minted ${mintReceipts.length} NFTs in ${mintDuration}ms`);
  } catch (error) {
    results.push({
      name: "Concurrent NFT Minting",
      passed: false,
      duration: Date.now() - mintStartTime,
      details: `Error: ${error}`
    });
    console.log(`   ❌ FAILED: ${error}`);
  }

  // Test 3: NFT Staking
  console.log("\n[Test 3] NFT Staking...");
  const stakeStartTime = Date.now();
  
  try {
    // Get token IDs owned by test accounts
    const tokenIds: number[] = [];
    for (const account of testAccounts.slice(0, 3)) {
      const balance = await sparkNFT.balanceOf(account.address);
      if (balance > 0n) {
        // Get first token
        const tokenId = await sparkNFT.tokenOfOwnerByIndex(account.address, 0);
        tokenIds.push(Number(tokenId));
      }
    }

    if (tokenIds.length > 0) {
      const stakePromises = tokenIds.slice(0, 2).map((tokenId) => {
        return sparkNFT.stake(tokenId, false);
      });
      
      const stakeReceipts = await Promise.all(stakePromises);
      await Promise.all(stakeReceipts.map(r => r.wait()));
      
      const stakeDuration = Date.now() - stakeStartTime;
      results.push({
        name: "NFT Staking",
        passed: true,
        duration: stakeDuration,
        details: `Staked ${stakeReceipts.length} NFTs in ${stakeDuration}ms`
      });
      console.log(`   ✅ Staked ${stakeReceipts.length} NFTs in ${stakeDuration}ms`);
    } else {
      results.push({
        name: "NFT Staking",
        passed: false,
        duration: Date.now() - stakeStartTime,
        details: "No NFTs available for staking"
      });
      console.log(`   ⚠️  SKIPPED: No NFTs available`);
    }
  } catch (error) {
    results.push({
      name: "NFT Staking",
      passed: false,
      duration: Date.now() - stakeStartTime,
      details: `Error: ${error}`
    });
    console.log(`   ❌ FAILED: ${error}`);
  }

  // Test 4: Gas Usage Analysis
  console.log("\n[Test 4] Gas Usage Analysis...");
  
  try {
    // Measure gas for different operations
    const tokenTransferGas = await afcToken.transfer.estimateGas(
      testAccounts[0].address,
      ethers.parseEther("1")
    );
    
    const nftMintGas = await sparkNFT.mintRegularNode.estimateGas(
      testAccounts[0].address,
      0, 0, "Test", "ipfs://test"
    );
    
    results.push({
      name: "Gas Usage Analysis",
      passed: true,
      duration: 0,
      details: `Token Transfer: ${tokenTransferGas} gas, NFT Mint: ${nftMintGas} gas`
    });
    console.log(`   ✅ Token Transfer: ${tokenTransferGas} gas`);
    console.log(`   ✅ NFT Mint: ${nftMintGas} gas`);
  } catch (error) {
    results.push({
      name: "Gas Usage Analysis",
      passed: false,
      duration: 0,
      details: `Error: ${error}`
    });
    console.log(`   ❌ FAILED: ${error}`);
  }

  // Test 5: Edge Cases - Zero Amount
  console.log("\n[Test 5] Edge Case Testing...");
  
  try {
    // Test zero transfer (should fail)
    try {
      await afcToken.transfer(testAccounts[0].address, 0);
      results.push({
        name: "Zero Transfer Prevention",
        passed: false,
        duration: 0,
        details: "Zero transfer was accepted (should fail)"
      });
      console.log(`   ❌ FAILED: Zero transfer was accepted`);
    } catch {
      results.push({
        name: "Zero Transfer Prevention",
        passed: true,
        duration: 0,
        details: "Zero transfer correctly rejected"
      });
      console.log(`   ✅ Zero transfer correctly rejected`);
    }
  } catch (error) {
    results.push({
      name: "Edge Case Testing",
      passed: false,
      duration: 0,
      details: `Error: ${error}`
    });
    console.log(`   ❌ FAILED: ${error}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Stress Test Summary");
  console.log("=".repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("");
  
  for (const result of results) {
    const status = result.passed ? "✅" : "❌";
    console.log(`${status} ${result.name}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
  }
  
  console.log("=".repeat(60));
  console.log(`Completed at: ${new Date().toISOString()}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runStressTest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });