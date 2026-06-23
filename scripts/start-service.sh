#!/bin/bash

# net4.xyz 单个服务启动脚本
# 用法: bash scripts/start-service.sh <service>

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查端口是否开放
check_port() {
    local port=$1
    local service=$2
    
    if command_exists nc; then
        if nc -z localhost "$port" 2>/dev/null; then
            log_success "$service is running on port $port"
            return 0
        fi
    elif command_exists curl; then
        if curl -s http://localhost:"$port" >/dev/null 2>&1; then
            log_success "$service is running on port $port"
            return 0
        fi
    fi
    
    log_warning "$service is not responding on port $port"
    return 1
}

# 启动 Docker 服务
start_docker() {
    log_info "Starting Docker services..."
    
    if ! command_exists docker; then
        log_error "Docker is not installed"
        return 1
    fi
    
    cd docker
    docker-compose -f docker-compose.dev.yml up -d
    cd ..
    
    log_info "Waiting for Docker services to be ready..."
    sleep 15
    
    # 检查 MongoDB
    if check_port 27017 "MongoDB"; then
        log_success "MongoDB is ready"
    else
        log_error "MongoDB failed to start"
        return 1
    fi
    
    # 检查 Redis
    if check_port 6379 "Redis"; then
        log_success "Redis is ready"
    else
        log_error "Redis failed to start"
        return 1
    fi
    
    # 检查 IPFS
    if check_port 5001 "IPFS"; then
        log_success "IPFS is ready"
    else
        log_error "IPFS failed to start"
        return 1
    fi
    
    return 0
}

# 启动后端
start_backend() {
    log_info "Starting backend service..."
    
    if ! command_exists pnpm; then
        log_error "pnpm is not installed"
        return 1
    fi
    
    cd packages/backend
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        pnpm install
    fi
    
    # 构建
    log_info "Building backend..."
    pnpm run build
    
    # 启动
    log_info "Starting backend on port 3001..."
    log_info "Running: pnpm run dev"
    pnpm run dev
    
    cd ../..
    return 0
}

# 启动前端
start_frontend() {
    log_info "Starting frontend service..."
    
    if ! command_exists pnpm; then
        log_error "pnpm is not installed"
        return 1
    fi
    
    cd packages/frontend
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        pnpm install
    fi
    
    # 启动
    log_info "Starting frontend on port 3000..."
    log_info "Running: pnpm run dev"
    pnpm run dev
    
    cd ../..
    return 0
}

# 启动 AI 引擎
start_ai() {
    log_info "Starting AI engine service..."
    
    if ! command_exists python3; then
        log_error "Python3 is not installed"
        return 1
    fi
    
    cd packages/ai-engine
    
    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 安装依赖
    if [ -f "requirements.txt" ]; then
        log_info "Installing dependencies..."
        pip install -r requirements.txt
    fi
    
    # 启动
    log_info "Starting AI engine on port 8000..."
    log_info "Running: python -m uvicorn src.main:app --reload"
    python -m uvicorn src.main:app --reload
    
    cd ../..
    return 0
}

# 启动智能合约
start_contracts() {
    log_info "Starting Hardhat node..."
    
    if ! command_exists pnpm; then
        log_error "pnpm is not installed"
        return 1
    fi
    
    cd packages/contracts
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        pnpm install
    fi
    
    # 启动
    log_info "Starting Hardhat node on port 8545..."
    log_info "Running: pnpm run node"
    pnpm run node
    
    cd ../..
    return 0
}

# 启动所有服务
start_all() {
    log_info "Starting all services..."
    log_warning "Note: Services will be started in separate terminals"
    
    # 启动 Docker
    gnome-terminal -- bash -c "cd $(pwd) && bash scripts/start-service.sh docker; bash" 2>/dev/null || \
    xterm -e "cd $(pwd) && bash scripts/start-service.sh docker" 2>/dev/null || \
    open -a Terminal "$(pwd)/scripts/start-service.sh docker" 2>/dev/null || \
    log_warning "Could not open new terminal for Docker services"
    
    sleep 5
    
    # 启动后端
    gnome-terminal -- bash -c "cd $(pwd) && bash scripts/start-service.sh backend; bash" 2>/dev/null || \
    xterm -e "cd $(pwd) && bash scripts/start-service.sh backend" 2>/dev/null || \
    open -a Terminal "$(pwd)/scripts/start-service.sh backend" 2>/dev/null || \
    log_warning "Could not open new terminal for backend"
    
    sleep 3
    
    # 启动前端
    gnome-terminal -- bash -c "cd $(pwd) && bash scripts/start-service.sh frontend; bash" 2>/dev/null || \
    xterm -e "cd $(pwd) && bash scripts/start-service.sh frontend" 2>/dev/null || \
    open -a Terminal "$(pwd)/scripts/start-service.sh frontend" 2>/dev/null || \
    log_warning "Could not open new terminal for frontend"
    
    sleep 3
    
    # 启动智能合约
    gnome-terminal -- bash -c "cd $(pwd) && bash scripts/start-service.sh contracts; bash" 2>/dev/null || \
    xterm -e "cd $(pwd) && bash scripts/start-service.sh contracts" 2>/dev/null || \
    open -a Terminal "$(pwd)/scripts/start-service.sh contracts" 2>/dev/null || \
    log_warning "Could not open new terminal for contracts"
    
    log_success "All services started in separate terminals"
}

# 主函数
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  net4.xyz Service Starter             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    local service="${1:-all}"
    
    case $service in
        docker)
            start_docker
            ;;
        backend)
            start_backend
            ;;
        frontend)
            start_frontend
            ;;
        ai)
            start_ai
            ;;
        contracts)
            start_contracts
            ;;
        all)
            start_all
            ;;
        *)
            log_error "Unknown service: $service"
            echo ""
            echo "Usage: bash scripts/start-service.sh <service>"
            echo ""
            echo "Available services:"
            echo "  docker    - Start Docker services (MongoDB, Redis, IPFS)"
            echo "  backend   - Start backend service (NestJS)"
            echo "  frontend  - Start frontend service (Next.js)"
            echo "  ai        - Start AI engine (FastAPI)"
            echo "  contracts - Start Hardhat node"
            echo "  all       - Start all services in separate terminals"
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
