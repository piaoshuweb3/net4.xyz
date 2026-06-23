#!/bin/bash

# net4.xyz 服务诊断脚本
# 用于逐个启动和测试各个服务

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

# 环境检查
check_environment() {
    log_info "Checking development environment..."
    
    if ! command_exists node; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js $(node --version)"
    
    if ! command_exists pnpm; then
        log_error "pnpm is not installed"
        exit 1
    fi
    log_success "pnpm $(pnpm --version)"
    
    if ! command_exists docker; then
        log_warning "Docker is not installed - Docker services will not be available"
    else
        log_success "Docker $(docker --version)"
    fi
    
    if ! command_exists python3; then
        log_warning "Python3 is not installed - AI engine will not be available"
    else
        log_success "Python3 $(python3 --version)"
    fi
}

# 启动 Docker 服务
start_docker_services() {
    log_info "Starting Docker services..."
    
    if ! command_exists docker; then
        log_warning "Docker is not installed, skipping Docker services"
        return 1
    fi
    
    cd docker
    docker-compose -f docker-compose.dev.yml up -d
    cd ..
    
    log_info "Waiting for Docker services to be ready..."
    sleep 10
    
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

# 启动后端服务
start_backend() {
    log_info "Starting backend service..."
    
    cd packages/backend
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log_info "Installing backend dependencies..."
        pnpm install
    fi
    
    # 构建
    log_info "Building backend..."
    pnpm run build
    
    # 启动
    log_info "Starting backend on port 3001..."
    pnpm run dev &
    BACKEND_PID=$!
    
    cd ../..
    
    sleep 5
    
    if check_port 3001 "Backend"; then
        log_success "Backend is running (PID: $BACKEND_PID)"
        return 0
    else
        log_error "Backend failed to start"
        kill $BACKEND_PID 2>/dev/null || true
        return 1
    fi
}

# 启动前端服务
start_frontend() {
    log_info "Starting frontend service..."
    
    cd packages/frontend
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        pnpm install
    fi
    
    # 启动
    log_info "Starting frontend on port 3000..."
    pnpm run dev &
    FRONTEND_PID=$!
    
    cd ../..
    
    sleep 5
    
    if check_port 3000 "Frontend"; then
        log_success "Frontend is running (PID: $FRONTEND_PID)"
        return 0
    else
        log_error "Frontend failed to start"
        kill $FRONTEND_PID 2>/dev/null || true
        return 1
    fi
}

# 启动 AI 引擎
start_ai_engine() {
    log_info "Starting AI engine service..."
    
    if ! command_exists python3; then
        log_warning "Python3 is not installed, skipping AI engine"
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
        log_info "Installing AI engine dependencies..."
        pip install -r requirements.txt
    fi
    
    # 启动
    log_info "Starting AI engine on port 8000..."
    python -m uvicorn src.main:app --reload &
    AI_PID=$!
    
    cd ../..
    
    sleep 5
    
    if check_port 8000 "AI Engine"; then
        log_success "AI Engine is running (PID: $AI_PID)"
        return 0
    else
        log_error "AI Engine failed to start"
        kill $AI_PID 2>/dev/null || true
        return 1
    fi
}

# 启动智能合约节点
start_contracts() {
    log_info "Starting Hardhat node..."
    
    cd packages/contracts
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log_info "Installing contract dependencies..."
        pnpm install
    fi
    
    # 启动
    log_info "Starting Hardhat node on port 8545..."
    pnpm run node &
    CONTRACTS_PID=$!
    
    cd ../..
    
    sleep 5
    
    if check_port 8545 "Hardhat"; then
        log_success "Hardhat node is running (PID: $CONTRACTS_PID)"
        return 0
    else
        log_error "Hardhat node failed to start"
        kill $CONTRACTS_PID 2>/dev/null || true
        return 1
    fi
}

# 主函数
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  net4.xyz Service Diagnostic Tool     ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    # 检查环境
    check_environment
    echo ""
    
    # 启动各个服务
    FAILED_SERVICES=()
    RUNNING_SERVICES=()
    
    log_info "Starting services..."
    echo ""
    
    # 1. Docker 服务
    if start_docker_services; then
        RUNNING_SERVICES+=("Docker Services")
    else
        FAILED_SERVICES+=("Docker Services")
    fi
    echo ""
    
    # 2. 后端
    if start_backend; then
        RUNNING_SERVICES+=("Backend")
    else
        FAILED_SERVICES+=("Backend")
    fi
    echo ""
    
    # 3. 前端
    if start_frontend; then
        RUNNING_SERVICES+=("Frontend")
    else
        FAILED_SERVICES+=("Frontend")
    fi
    echo ""
    
    # 4. AI 引擎
    if start_ai_engine; then
        RUNNING_SERVICES+=("AI Engine")
    else
        FAILED_SERVICES+=("AI Engine")
    fi
    echo ""
    
    # 5. 智能合约
    if start_contracts; then
        RUNNING_SERVICES+=("Hardhat Node")
    else
        FAILED_SERVICES+=("Hardhat Node")
    fi
    echo ""
    
    # 总结
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Diagnostic Summary                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ ${#RUNNING_SERVICES[@]} -gt 0 ]; then
        echo -e "${GREEN}Running Services:${NC}"
        for service in "${RUNNING_SERVICES[@]}"; do
            echo -e "  ${GREEN}✓${NC} $service"
        done
        echo ""
    fi
    
    if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
        echo -e "${RED}Failed Services:${NC}"
        for service in "${FAILED_SERVICES[@]}"; do
            echo -e "  ${RED}✗${NC} $service"
        done
        echo ""
    fi
    
    echo -e "${BLUE}Service URLs:${NC}"
    echo "  Frontend:    http://localhost:3000"
    echo "  Backend:     http://localhost:3001/graphql"
    echo "  AI Engine:   http://localhost:8000/docs"
    echo "  Hardhat:     http://localhost:8545"
    echo "  MongoDB:     mongodb://localhost:27017"
    echo "  Redis:       redis://localhost:6379"
    echo "  IPFS:        http://localhost:5001"
    echo ""
    
    if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
        log_success "All services started successfully!"
        echo ""
        echo "Press Ctrl+C to stop all services"
        wait
    else
        log_warning "Some services failed to start. Check the logs above for details."
        exit 1
    fi
}

# 清理函数
cleanup() {
    log_info "Stopping all services..."
    
    # 杀死所有后台进程
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # 停止 Docker 服务
    if command_exists docker; then
        cd docker
        docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
        cd ..
    fi
    
    log_success "All services stopped"
}

# 捕获 Ctrl+C
trap cleanup EXIT INT TERM

# 运行主函数
main
