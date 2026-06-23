#!/bin/bash
# Frontend deployment script for net4.xyz
# Usage: ./scripts/deploy-frontend.sh [preview|production]

set -e

MODE=${1:-preview}

echo "=== net4.xyz Frontend Deployment ==="
echo "Mode: $MODE"

# Check for required environment variables
if [ -z "$VERCEL_TOKEN" ] && [ "$MODE" != "local" ]; then
    echo "Error: VERCEL_TOKEN is not set"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
cd packages/frontend
pnpm install

# Build
echo "Building frontend..."
pnpm build

if [ "$MODE" = "local" ]; then
    echo "Local build complete. Output in packages/frontend/.next"
    exit 0
fi

# Deploy to Vercel
echo "Deploying to Vercel..."
if [ "$MODE" = "preview" ]; then
    npx vercel --prebuilt
elif [ "$MODE" = "production" ]; then
    npx vercel --prebuilt --prod
fi

echo "Deployment complete!"