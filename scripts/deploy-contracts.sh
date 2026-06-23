#!/bin/bash
# Smart contracts deployment script for net4.xyz
# Usage: ./scripts/deploy-contracts.sh [sepolia|base|mainnet]

set -e

NETWORK=${1:-sepolia}

echo "=== net4.xyz Contracts Deployment ==="
echo "Network: $NETWORK"

# Check for required environment variables
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "Error: DEPLOYER_PRIVATE_KEY is not set"
    exit 1
fi

cd packages/contracts

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Compile contracts
echo "Compiling contracts..."
pnpm build

# Deploy based on network
echo "Deploying to $NETWORK..."
case $NETWORK in
    sepolia)
        pnpm run deploy:sepolia
        ;;
    base)
        pnpm run deploy:base
        ;;
    mainnet)
        echo "Warning: Deploying to mainnet!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Deployment cancelled"
            exit 0
        fi
        pnpm hardhat run scripts/deploy.ts --network base
        ;;
    *)
        echo "Error: Unknown network $NETWORK"
        echo "Supported networks: sepolia, base, mainnet"
        exit 1
        ;;
esac

echo "Deployment complete!"