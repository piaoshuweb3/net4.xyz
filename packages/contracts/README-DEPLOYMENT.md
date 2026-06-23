# net4.xyz Smart Contract Deployment Guide

## Overview

This guide covers the deployment of net4.xyz smart contracts to Base Sepolia testnet for testing and community testing purposes.

## Deployed Contracts

| Contract | Description | Status |
|----------|-------------|--------|
| MockUSDT | Test USDT token for development | ✅ Ready |
| AFC_Token | Main ERC-20 token (1B supply) | ✅ Ready |
| Spark_NFT | Node NFT (Core/Sub/Regular) | ✅ Ready |
| EconomyModel | NFT sales & revenue distribution | ✅ Ready |

## Prerequisites

1. **Node.js** v18+ installed
2. **pnpm** installed
3. **Base Sepolia** testnet ETH in your wallet
4. **Basescan** API key (free, for contract verification)

## Setup

### 1. Install Dependencies

```bash
cd packages/contracts
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
# Required for deployment
DEPLOYER_PRIVATE_KEY=0x...your-private-key...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ETHERSCAN_API_KEY=your-basescan-api-key
```

**Get testnet ETH:**
- Visit [Base Sepolia Faucet](https://bridge.base.org/deposit) to get testnet ETH
- Or use [Coinbase Wallet Faucet](https://www Coinbase.com/en-fi/wallet)

**Get Basescan API Key:**
1. Visit [Basescan](https://basescan.org/)
2. Register an account
3. Go to API-Keys section
4. Create a new API key

## Deployment Commands

### Deploy to Base Sepolia

```bash
pnpm run deploy:baseSepolia
```

This will:
1. Deploy all 4 contracts to Base Sepolia
2. Link contract addresses
3. Verify contracts on Basescan (if API key provided)
4. Save deployment info to `deployments/` folder

### Verify Deployment

```bash
npx hardhat run scripts/verify-deployment.ts --network baseSepolia
```

### Run Stress Tests

```bash
npx hardhat run scripts/stress-test.ts --network baseSepolia
```

## Post-Deployment

### Update Frontend Environment

After deployment, update your `.env` with the deployed contract addresses:

```
NEXT_PUBLIC_MOCK_USDT_SEPOLIA=0x...
NEXT_PUBLIC_AFC_TOKEN_SEPOLIA=0x...
NEXT_PUBLIC_SPARK_NFT_SEPOLIA=0x...
NEXT_PUBLIC_ECONOMY_MODEL_SEPOLIA=0x...
```

### Community Testing

Share the following with the community:

1. **Basescan Links:**
   - AFC Token: `https://basescan.org/address/{AFC_TOKEN_ADDRESS}`
   - Spark NFT: `https://basescan.org/address/{SPARK_NFT_ADDRESS}`
   - EconomyModel: `https://basescan.org/address/{ECONOMY_MODEL_ADDRESS}`

2. **Testnet Faucet:** https://bridge.base.org/deposit

3. **Test Cases:**
   - Token transfers
   - NFT minting (Core/Sub/Regular)
   - NFT staking
   - Economy model purchases

## Contract Details

### AFC_Token
- **Symbol:** AFC
- **Total Supply:** 1,000,000,000 AFC
- **Features:** ERC-20, Vesting, Governance, Burning

### Spark_NFT
- **Symbol:** SPARK
- **Node Tiers:**
  - Core: 21 max, 10,000 USDT
  - Sub: 128 max, 1,000 USDT
  - Regular: 10,000 max, 100 USDT

### EconomyModel
- **Revenue Split:**
  - Team: 20%
  - Ecosystem: 30%
  - Buyback: 20%
  - Reserve: 30%

## Troubleshooting

### "Insufficient funds"
Get more testnet ETH from the faucet.

### "Contract verification failed"
Wait 30 seconds and try again, or verify manually on Basescan.

### "Nonce too low"
Reset your wallet nonce or use a fresh deployer address.

## Security Notes

- Never commit your private key to version control
- Use a dedicated deployer wallet with minimal funds
- Verify all contract addresses on Basescan before use
- Review contract code before mainnet deployment

## Next Steps

After successful testnet deployment:
1. ✅ Complete community testing
2. ✅ Run stress tests
3. 🔄 Security audit (P9.3)
4. ⏳ Mainnet deployment (P9.4)
## Mainnet Deployment (P9.4)

### ⚠️  Pre-deployment Checklist

Before deploying to mainnet, ensure:

- [ ] Security audit completed (P9.3)
- [ ] All high-severity issues resolved
- [ ] Testnet deployment verified and stable
- [ ] Community testing completed
- [ ] Multi-sig wallet configured
- [ ] Sufficient mainnet ETH for gas fees
- [ ] Sufficient mainnet USDT for NFT purchases

### Multi-sig Wallet Configuration

For mainnet, you should use a Gnosis Safe multi-sig wallet for the team wallet. Configure the following addresses in your `.env`:

```bash
# Multi-sig wallets (REQUIRED for mainnet)
TEAM_WALLET=0x...  # Gnosis Safe address
ECOSYSTEM_WALLET=0x...
BUYBACK_WALLET=0x...
RESERVE_WALLET=0x...

# Mainnet RPC and API
BASE_RPC_URL=https://mainnet.base.org
ETHERSCAN_API_KEY=your-basescan-api-key
```

### Deploy to Base Mainnet

```bash
cd packages/contracts
pnpm run deploy:mainnet
```

This will:
1. Deploy all 4 contracts to Base mainnet
2. Configure multi-sig wallets
3. Verify contracts on Basescan
4. Save deployment info to `deployments/` folder

### Post-Deployment Configuration

After deployment, run the post-deployment script to enable sales:

```bash
pnpm run postdeploy:mainnet
```

This will:
1. Enable Spark NFT public sale
2. Open minting for all node types
3. Verify multi-sig configuration
4. Display current pricing and quotas

### Manual Post-Deployment Steps

1. **Update Frontend Environment**:
   Update your `.env` with the deployed contract addresses:
   ```
   NEXT_PUBLIC_AFC_TOKEN_BASE=0x...
   NEXT_PUBLIC_SPARK_NFT_BASE=0x...
   NEXT_PUBLIC_ECONOMY_MODEL_BASE=0x...
   ```

2. **Configure Gnosis Safe**:
   - Import the deployed contracts as modules
   - Set up transaction signing requirements (e.g., 2/3 multi-sig)
   - Configure the team wallet as the Gnosis Safe address

3. **Verify on Basescan**:
   - Visit https://basescan.org/
   - Search for your contract addresses
   - Verify the source code matches

4. **Announce to Community**:
   - Share Basescan links
   - Announce NFT sales opening
   - Provide purchase instructions

### Mainnet Contract Addresses

After deployment, contracts will be available at:

| Contract | Address |
|----------|---------|
| MockUSDT | (deployed address) |
| AFC_Token | (deployed address) |
| Spark_NFT | (deployed address) |
| EconomyModel | (deployed address) |

### Monitoring

- Use Basescan to monitor transactions
- Set up alerts for large transfers
- Monitor NFT sales and revenue distribution
- Track gas costs and optimize when needed

### Emergency Procedures

If issues arise:

1. **Pause Sales**: Call `EconomyModel.endSale()`
2. **Emergency Withdraw**: Use `emergencyWithdraw` functions
3. **Transfer Ownership**: Use `transferOwnership` if needed

### Revenue Distribution

The EconomyModel distributes revenue as follows:
- Team (Gnosis Safe): 20%
- Ecosystem: 30%
- Buyback: 20%
- Reserve: 30%

Call `distributeRevenue()` periodically to distribute accumulated fees to the configured wallets.