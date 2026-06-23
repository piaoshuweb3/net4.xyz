#!/bin/bash
# net4.xyz Production Deployment Script
# Usage: ./scripts/deploy-production.sh [environment]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker/docker-compose.prod.yml"
REGISTRY="net4xyz"

echo -e "${BLUE}=== net4.xyz Production Deployment ===${NC}"
echo "Environment: $ENVIRONMENT"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo "Error: Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "Error: Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        echo "Error: .env file not found. Copy .env.production.example to .env and configure it."
        exit 1
    fi
    
    echo -e "${GREEN}Prerequisites check passed!${NC}"
}

# Build images
build_images() {
    echo -e "${YELLOW}Building Docker images...${NC}"
    
    # Build backend
    echo "Building backend image..."
    docker build -t ${REGISTRY}/backend:latest ./packages/backend
    
    # Build AI engine
    echo "Building AI engine image..."
    docker build -t ${REGISTRY}/ai-engine:latest ./packages/ai-engine
    
    echo -e "${GREEN}Images built successfully!${NC}"
}

# Push images to registry
push_images() {
    echo -e "${YELLOW}Pushing images to registry...${NC}"
    
    docker push ${REGISTRY}/backend:latest
    docker push ${REGISTRY}/ai-engine:latest
    
    echo -e "${GREEN}Images pushed successfully!${NC}"
}

# Start services
start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    
    # Use docker compose v2
    docker compose -f ${COMPOSE_FILE} up -d
    
    echo -e "${GREEN}Services started!${NC}"
}

# Stop services
stop_services() {
    echo -e "${YELLOW}Stopping services...${NC}"
    
    docker compose -f ${COMPOSE_FILE} down
    
    echo -e "${GREEN}Services stopped!${NC}"
}

# View logs
logs() {
    echo -e "${YELLOW}Viewing logs...${NC}"
    
    docker compose -f ${COMPOSE_FILE} logs -f
}

# View status
status() {
    echo -e "${YELLOW}Service status:${NC}"
    
    docker compose -f ${COMPOSE_FILE} ps
}

# Health check
health_check() {
    echo -e "${YELLOW}Performing health checks...${NC}"
    
    # Check backend
    echo -n "Backend: "
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi
    
    # Check Prometheus
    echo -n "Prometheus: "
    if curl -sf http://localhost:9090/-/healthy > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi
    
    # Check Grafana
    echo -n "Grafana: "
    if curl -sf http://localhost:3030/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi
    
    # Check Loki
    echo -n "Loki: "
    if curl -sf http://localhost:3100/ready > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build         Build Docker images"
    echo "  push          Push images to registry"
    echo "  start         Start all services"
    echo "  stop          Stop all services"
    echo "  restart       Restart all services"
    echo "  logs          View logs"
    echo "  status        Show service status"
    echo "  health        Perform health checks"
    echo "  deploy        Full deployment (build + start)"
}

# Main
case "$1" in
    build)
        check_prerequisites
        build_images
        ;;
    push)
        check_prerequisites
        push_images
        ;;
    start)
        check_prerequisites
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    health)
        health_check
        ;;
    deploy)
        check_prerequisites
        build_images
        start_services
        health_check
        ;;
    *)
        usage
        ;;
esac