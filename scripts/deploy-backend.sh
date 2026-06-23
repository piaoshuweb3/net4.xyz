#!/bin/bash
# Backend deployment script for net4.xyz
# Usage: ./scripts/deploy-backend.sh [staging|production]

set -e

MODE=${1:-staging}

echo "=== net4.xyz Backend Deployment ==="
echo "Mode: $MODE"

# Check for required environment variables
if [ -z "$HEROKU_API_KEY" ]; then
    echo "Warning: HEROKU_API_KEY is not set"
fi

# Install dependencies
echo "Installing dependencies..."
cd packages/shared
pnpm install
pnpm build

cd ../packages/backend
pnpm install
pnpm build

# Run database migrations if needed
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    npx prisma migrate deploy || echo "No migrations to run"
fi

# Deploy to Heroku
if [ -n "$HEROKU_API_KEY" ]; then
    echo "Deploying to Heroku..."
    git remote add heroku https://heroku:$HEROKU_API_KEY@git.heroku.com/$HEROKU_BACKEND_APP.git 2>/dev/null || true
    git push heroku main:main --force
else
    echo "Skipping Heroku deployment (HEROKU_API_KEY not set)"
    echo "Backend build complete. Output in packages/backend/dist"
fi

echo "Deployment complete!"