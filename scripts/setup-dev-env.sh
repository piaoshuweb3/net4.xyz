#!/bin/bash
# net4.xyz Development Environment Setup Script
# This script sets up the complete development environment

set -e

echo "=========================================="
echo "  net4.xyz Development Environment Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

echo -e "\n${BLUE}=== Checking Prerequisites ===${NC}"

# Check Node.js
if check_command node; then
    NODE_VERSION=$(node --version)
    echo "  Node.js version: $NODE_VERSION"
fi

# Check pnpm
if check_command pnpm; then
    PNPM_VERSION=$(pnpm --version)
    echo "  pnpm version: $PNPM_VERSION"
fi

# Check Python
if check_command python3; then
    PYTHON_VERSION=$(python3 --version)
    echo "  Python version: $PYTHON_VERSION"
fi

# Check Docker
if check_command docker; then
    DOCKER_VERSION=$(docker --version)
    echo "  Docker version: $DOCKER_VERSION"
fi

# Check Docker Compose
if check_command docker-compose || command -v docker &> /dev/null && docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_VERSION=$(docker-compose --version)
    else
        DOCKER_COMPOSE_VERSION=$(docker compose version)
    fi
    echo "  Docker Compose version: $DOCKER_COMPOSE_VERSION"
fi

echo -e "\n${BLUE}=== Setting Up Node.js Environment ===${NC}"

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
pnpm install

echo -e "\n${BLUE}=== Setting Up Python Environment ===${NC}"

# Create Python virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r packages/ai-engine/requirements.txt

echo -e "\n${BLUE}=== Setting Up Smart Contract Development ===${NC}"

# Install Foundry (if not present)
if [ ! -d "$HOME/.foundry" ]; then
    echo "Installing Foundry..."
    curl -L https://foundry.paradigm.xyz | bash
    export PATH="$HOME/.foundry/bin:$PATH"
    foundryup
fi

# Add Foundry to PATH in shell profile
FOUNDRY_PATH='export PATH="$HOME/.foundry/bin:$PATH"'
if ! grep -q "$FOUNDRY_PATH" ~/.bashrc 2>/dev/null; then
    echo "$FOUNDRY_PATH" >> ~/.bashrc
fi

if ! grep -q "$FOUNDRY_PATH" ~/.zshrc 2>/dev/null; then
    echo "$FOUNDRY_PATH" >> ~/.zshrc
fi

echo -e "\n${BLUE}=== Setting Up Docker Services ===${NC}"

# Create necessary Docker directories
mkdir -p docker/mongodb docker/ipfs docker/prometheus docker/grafana

echo -e "\n${BLUE}=== Copying Environment Variables ===${NC}"

# Copy .env.example to .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env file with your actual configuration${NC}"
fi

echo -e "\n${BLUE}=== Verifying Smart Contract Setup ===${NC}"

# Compile contracts to verify setup
cd packages/contracts
pnpm run build
cd ../..

echo -e "\n${BLUE}=== Setup Complete! ===${NC}"
echo -e "${GREEN}You can now start development with:${NC}"
echo "  - pnpm dev              # Start all services in development mode"
echo "  - pnpm run node         # Start local Hardhat node"
echo "  - docker-compose up     # Start Docker services"
echo ""
echo -e "${YELLOW}Don't forget to:${NC}"
echo "  1. Edit .env with your actual configuration"
echo "  2. Set up your IDE (VS Code recommended)"
echo "  3. Install recommended VS Code extensions"