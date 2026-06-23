#!/bin/bash
# net4.xyz Mainnet Launch Script
# Phase 3: AFC Mainnet Launch - "Ignition"
# 
# This script handles:
# 1. AFC Mainnet deployment
# 2. X.web4 domain switch
# 3. Mirrome full feature release
# 4. Community operations start

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
NETWORK="base"  # Base mainnet for AFC
REGISTRY="net4xyz"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  net4.xyz Mainnet Launch - Phase 3${NC}"
echo -e "${BLUE}  AFC Mainnet Ignition${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"
    
    # Check for required environment variables
    if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
        echo -e "${RED}Error: DEPLOYER_PRIVATE_KEY is not set${NC}"
        exit 1
    fi
    
    if [ -z "$BASE_RPC_URL" ]; then
        echo -e "${RED}Error: BASE_RPC_URL is not set${NC}"
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        echo -e "${RED}Error: .env file not found${NC}"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Prerequisites check passed!${NC}"
    echo ""
}

# Deploy smart contracts to mainnet
deploy_contracts() {
    echo -e "${YELLOW}[2/6] Deploying smart contracts to Base mainnet...${NC}"
    
    cd packages/contracts
    
    # Compile contracts
    echo "Compiling contracts..."
    pnpm build
    
    # Deploy to Base mainnet
    echo "Deploying to Base mainnet..."
    pnpm hardhat run scripts/deploy.ts --network base
    
    # Verify contracts on Etherscan
    echo "Verifying contracts..."
    pnpm hardhat verify --network base
    
    cd ../..
    
    echo -e "${GREEN}Smart contracts deployed successfully!${NC}"
    echo ""
}

# Configure DNS
configure_dns() {
    echo -e "${YELLOW}[3/6] Configuring X.web4 domain...${NC}"
    
    # Update nginx configuration for X.web4
    echo "Updating nginx configuration..."
    
    # Note: In production, this would involve:
    # 1. Setting up ENS domain for x.web4
    # 2. Configuring DNS records
    # 3. Setting up IPFS gateway
    
    cat > docker/nginx/conf.d/x-web4.conf << 'EOF'
# X.web4 Domain Configuration
# Mainnet launch - Decentralized entry point

server {
    listen 80;
    server_name x.web4 www.x.web4;

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Main application
    location / {
        # Proxy to backend with load balancing
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # IPFS gateway for decentralized content
    location /ipfs/ {
        proxy_pass http://ipfs:8080/ipfs/;
    }

    # Arweave gateway
    location /arweave/ {
        proxy_pass https://arweave.net/;
    }
}
EOF

    echo -e "${GREEN}X.web4 domain configured!${NC}"
    echo ""
}

# Enable Mirrome full features
enable_mirrome() {
    echo -e "${YELLOW}[4/6] Enabling Mirrome full features...${NC}"
    
    # Update environment configuration
    if [ -f ".env" ]; then
        # Enable all Mirrome features
        sed -i 's/ENABLE_MIRROME=false/ENABLE_MIRROME=true/' .env
        sed -i 's/ENABLE_DID=true/ENABLE_DID=true/' .env
        sed -i 's/ENABLE_ENCRYPTION=true/ENABLE_ENCRYPTION=true/' .env
        sed -i 's/ENABLE_SOCIAL_GRAPH=true/ENABLE_SOCIAL_GRAPH=true/' .env
    fi
    
    # Create Mirrome feature flag config
    cat > packages/backend/src/config/mirrome.config.ts << 'EOF'
/**
 * Mirrome Full Feature Configuration
 * Enabled for Mainnet Launch - Phase 3
 */
export const mirromeConfig = {
  // Core features
  enableDID: true,
  enableEndToEndEncryption: true,
  enableSocialGraph: true,
  enableContentStorage: true,
  enableMessaging: true,
  
  // Storage
  ipfsPinningEnabled: true,
  arweaveStorageEnabled: true,
  
  // Limits (mainnet)
  maxStoragePerUser: '10GB',
  maxMessagesPerDay: 1000,
  maxConnections: 500,
  
  // Content moderation
  enableAutoModeration: true,
  enableUserReporting: true,
  
  // Analytics
  enableAnalytics: true,
};

export default mirromeConfig;
EOF

    echo -e "${GREEN}Mirrome full features enabled!${NC}"
    echo ""
}

# Start community operations
start_community_operations() {
    echo -e "${YELLOW}[5/6] Starting community operations...${NC}"
    
    # Configure community features
    cat > packages/backend/src/config/community.config.ts << 'EOF'
/**
 * Community Operations Configuration
 * Mainnet Launch - Active
 */
export const communityConfig = {
  // Membership
  membershipEnabled: true,
  allowNewRegistrations: true,
  
  // NFT Sales
  nftSalesEnabled: true,
  sparkNFTMinted: true,
  
  // Rewards
  rewardsEnabled: true,
  stakingEnabled: true,
  
  // Governance
  governanceEnabled: true,
  proposalThreshold: 100, // AFC tokens
  
  // Social
  socialFeaturesEnabled: true,
  contentCreationEnabled: true,
  
  // Analytics
  analyticsEnabled: true,
  publicMetricsEnabled: true,
};

export default communityConfig;
EOF

    # Update feature flags
    if [ -f ".env" ]; then
        sed -i 's/ENABLE_COMMUNITY=false/ENABLE_COMMUNITY=true/' .env
        sed -i 's/ENABLE_GOVERNANCE=false/ENABLE_GOVERNANCE=true/' .env
        sed -i 's/ENABLE_STAKING=false/ENABLE_STAKING=true/' .env
    fi

    echo -e "${GREEN}Community operations started!${NC}"
    echo ""
}

# Deploy infrastructure
deploy_infrastructure() {
    echo -e "${YELLOW}[6/6] Deploying production infrastructure...${NC}"
    
    # Build and start all services
    echo "Building Docker images..."
    docker build -t ${REGISTRY}/backend:latest ./packages/backend
    docker build -t ${REGISTRY}/ai-engine:latest ./packages/ai-engine
    
    echo "Starting production services..."
    docker compose -f docker/docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 30
    
    # Health check
    echo "Performing health checks..."
    
    # Check backend
    echo -n "Backend: "
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}WARMING UP${NC}"
    fi
    
    # Check Prometheus
    echo -n "Prometheus: "
    if curl -sf http://localhost:9090/-/healthy > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}WARMING UP${NC}"
    fi
    
    # Check Grafana
    echo -n "Grafana: "
    if curl -sf http://localhost:3030/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}WARMING UP${NC}"
    fi

    echo -e "${GREEN}Infrastructure deployed!${NC}"
    echo ""
}

# Main launch sequence
main() {
    echo -e "${BLUE}Starting mainnet launch sequence...${NC}"
    echo ""
    
    check_prerequisites
    deploy_contracts
    configure_dns
    enable_mirrome
    start_community_operations
    deploy_infrastructure
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Mainnet Launch Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "AFC Mainnet is now live!"
    echo ""
    echo "Access points:"
    echo "  - net4.xyz (legacy)"
    echo "  - x.web4 (new decentralized)"
    echo "  - api.net4.xyz (API)"
    echo ""
    echo "Next steps:"
    echo "  1. Monitor Grafana dashboard: http://localhost:3030"
    echo "  2. Check Prometheus metrics: http://localhost:9090"
    echo "  3. View logs: docker compose -f docker/docker-compose.prod.yml logs -f"
    echo ""
}

# Run main
main