# net4.xyz 服务诊断脚本 (PowerShell)
# 用于逐个启动和测试各个服务

param(
    [switch]$SkipDocker = $false,
    [switch]$SkipAI = $false,
    [switch]$OnlyDocker = $false
)

# 颜色定义
$Colors = @{
    Info    = 'Cyan'
    Success = 'Green'
    Warning = 'Yellow'
    Error   = 'Red'
}

# 日志函数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = 'Info'
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = $Colors[$Level]
    
    switch ($Level) {
        'Info'    { Write-Host "[$timestamp] [INFO]    $Message" -ForegroundColor $color }
        'Success' { Write-Host "[$timestamp] [SUCCESS] $Message" -ForegroundColor $color }
        'Warning' { Write-Host "[$timestamp] [WARNING] $Message" -ForegroundColor $color }
        'Error'   { Write-Host "[$timestamp] [ERROR]   $Message" -ForegroundColor $color }
    }
}

# 检查命令是否存在
function Test-Command {
    param([string]$Command)
    
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
}

# 检查端口是否开放
function Test-Port {
    param(
        [int]$Port,
        [string]$Service
    )
    
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        Write-Log "$Service is running on port $Port" -Level Success
        return $true
    }
    catch {
        Write-Log "$Service is not responding on port $Port" -Level Warning
        return $false
    }
}

# 环境检查
function Test-Environment {
    Write-Log "Checking development environment..." -Level Info
    
    if (-not (Test-Command node)) {
        Write-Log "Node.js is not installed" -Level Error
        exit 1
    }
    $nodeVersion = node --version
    Write-Log "Node.js $nodeVersion" -Level Success
    
    if (-not (Test-Command pnpm)) {
        Write-Log "pnpm is not installed" -Level Error
        exit 1
    }
    $pnpmVersion = pnpm --version
    Write-Log "pnpm $pnpmVersion" -Level Success
    
    if (-not (Test-Command docker)) {
        Write-Log "Docker is not installed - Docker services will not be available" -Level Warning
    }
    else {
        $dockerVersion = docker --version
        Write-Log "$dockerVersion" -Level Success
    }
    
    if (-not (Test-Command python)) {
        Write-Log "Python is not installed - AI engine will not be available" -Level Warning
    }
    else {
        $pythonVersion = python --version
        Write-Log "$pythonVersion" -Level Success
    }
}

# 启动 Docker 服务
function Start-DockerServices {
    Write-Log "Starting Docker services..." -Level Info
    
    if (-not (Test-Command docker)) {
        Write-Log "Docker is not installed, skipping Docker services" -Level Warning
        return $false
    }
    
    try {
        Push-Location docker
        docker-compose -f docker-compose.dev.yml up -d
        Pop-Location
        
        Write-Log "Waiting for Docker services to be ready..." -Level Info
        Start-Sleep -Seconds 10
        
        # 检查 MongoDB
        if (Test-Port 27017 "MongoDB") {
            Write-Log "MongoDB is ready" -Level Success
        }
        else {
            Write-Log "MongoDB failed to start" -Level Error
            return $false
        }
        
        # 检查 Redis
        if (Test-Port 6379 "Redis") {
            Write-Log "Redis is ready" -Level Success
        }
        else {
            Write-Log "Redis failed to start" -Level Error
            return $false
        }
        
        # 检查 IPFS
        if (Test-Port 5001 "IPFS") {
            Write-Log "IPFS is ready" -Level Success
        }
        else {
            Write-Log "IPFS failed to start" -Level Error
            return $false
        }
        
        return $true
    }
    catch {
        Write-Log "Failed to start Docker services: $_" -Level Error
        return $false
    }
}

# 启动后端服务
function Start-Backend {
    Write-Log "Starting backend service..." -Level Info
    
    try {
        Push-Location packages/backend
        
        # 检查依赖
        if (-not (Test-Path node_modules)) {
            Write-Log "Installing backend dependencies..." -Level Info
            pnpm install
        }
        
        # 构建
        Write-Log "Building backend..." -Level Info
        pnpm run build
        
        # 启动
        Write-Log "Starting backend on port 3001..." -Level Info
        $process = Start-Process -FilePath "pnpm" -ArgumentList "run dev" -PassThru -NoNewWindow
        
        Pop-Location
        
        Start-Sleep -Seconds 5
        
        if (Test-Port 3001 "Backend") {
            Write-Log "Backend is running (PID: $($process.Id))" -Level Success
            return $true
        }
        else {
            Write-Log "Backend failed to start" -Level Error
            Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
            return $false
        }
    }
    catch {
        Write-Log "Failed to start backend: $_" -Level Error
        Pop-Location
        return $false
    }
}

# 启动前端服务
function Start-Frontend {
    Write-Log "Starting frontend service..." -Level Info
    
    try {
        Push-Location packages/frontend
        
        # 检查依赖
        if (-not (Test-Path node_modules)) {
            Write-Log "Installing frontend dependencies..." -Level Info
            pnpm install
        }
        
        # 启动
        Write-Log "Starting frontend on port 3000..." -Level Info
        $process = Start-Process -FilePath "pnpm" -ArgumentList "run dev" -PassThru -NoNewWindow
        
        Pop-Location
        
        Start-Sleep -Seconds 5
        
        if (Test-Port 3000 "Frontend") {
            Write-Log "Frontend is running (PID: $($process.Id))" -Level Success
            return $true
        }
        else {
            Write-Log "Frontend failed to start" -Level Error
            Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
            return $false
        }
    }
    catch {
        Write-Log "Failed to start frontend: $_" -Level Error
        Pop-Location
        return $false
    }
}

# 启动 AI 引擎
function Start-AIEngine {
    Write-Log "Starting AI engine service..." -Level Info
    
    if (-not (Test-Command python)) {
        Write-Log "Python is not installed, skipping AI engine" -Level Warning
        return $false
    }
    
    try {
        Push-Location packages/ai-engine
        
        # 检查虚拟环境
        if (-not (Test-Path venv)) {
            Write-Log "Creating Python virtual environment..." -Level Info
            python -m venv venv
        }
        
        # 激活虚拟环境
        & ".\venv\Scripts\Activate.ps1"
        
        # 安装依赖
        if (Test-Path requirements.txt) {
            Write-Log "Installing AI engine dependencies..." -Level Info
            pip install -r requirements.txt
        }
        
        # 启动
        Write-Log "Starting AI engine on port 8000..." -Level Info
        $process = Start-Process -FilePath "python" -ArgumentList "-m uvicorn src.main:app --reload" -PassThru -NoNewWindow
        
        Pop-Location
        
        Start-Sleep -Seconds 5
        
        if (Test-Port 8000 "AI Engine") {
            Write-Log "AI Engine is running (PID: $($process.Id))" -Level Success
            return $true
        }
        else {
            Write-Log "AI Engine failed to start" -Level Error
            Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
            return $false
        }
    }
    catch {
        Write-Log "Failed to start AI engine: $_" -Level Error
        Pop-Location
        return $false
    }
}

# 启动智能合约节点
function Start-Contracts {
    Write-Log "Starting Hardhat node..." -Level Info
    
    try {
        Push-Location packages/contracts
        
        # 检查依赖
        if (-not (Test-Path node_modules)) {
            Write-Log "Installing contract dependencies..." -Level Info
            pnpm install
        }
        
        # 启动
        Write-Log "Starting Hardhat node on port 8545..." -Level Info
        $process = Start-Process -FilePath "pnpm" -ArgumentList "run node" -PassThru -NoNewWindow
        
        Pop-Location
        
        Start-Sleep -Seconds 5
        
        if (Test-Port 8545 "Hardhat") {
            Write-Log "Hardhat node is running (PID: $($process.Id))" -Level Success
            return $true
        }
        else {
            Write-Log "Hardhat node failed to start" -Level Error
            Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
            return $false
        }
    }
    catch {
        Write-Log "Failed to start Hardhat node: $_" -Level Error
        Pop-Location
        return $false
    }
}

# 主函数
function Main {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  net4.xyz Service Diagnostic Tool     ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # 检查环境
    Test-Environment
    Write-Host ""
    
    # 启动各个服务
    $runningServices = @()
    $failedServices = @()
    
    Write-Log "Starting services..." -Level Info
    Write-Host ""
    
    # 1. Docker 服务
    if (-not $SkipDocker) {
        if (Start-DockerServices) {
            $runningServices += "Docker Services"
        }
        else {
            $failedServices += "Docker Services"
        }
        Write-Host ""
    }
    
    # 2. 后端
    if (-not $OnlyDocker) {
        if (Start-Backend) {
            $runningServices += "Backend"
        }
        else {
            $failedServices += "Backend"
        }
        Write-Host ""
    }
    
    # 3. 前端
    if (-not $OnlyDocker) {
        if (Start-Frontend) {
            $runningServices += "Frontend"
        }
        else {
            $failedServices += "Frontend"
        }
        Write-Host ""
    }
    
    # 4. AI 引擎
    if (-not $SkipAI -and -not $OnlyDocker) {
        if (Start-AIEngine) {
            $runningServices += "AI Engine"
        }
        else {
            $failedServices += "AI Engine"
        }
        Write-Host ""
    }
    
    # 5. 智能合约
    if (-not $OnlyDocker) {
        if (Start-Contracts) {
            $runningServices += "Hardhat Node"
        }
        else {
            $failedServices += "Hardhat Node"
        }
        Write-Host ""
    }
    
    # 总结
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Diagnostic Summary                    ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    if ($runningServices.Count -gt 0) {
        Write-Host "Running Services:" -ForegroundColor Green
        foreach ($service in $runningServices) {
            Write-Host "  ✓ $service" -ForegroundColor Green
        }
        Write-Host ""
    }
    
    if ($failedServices.Count -gt 0) {
        Write-Host "Failed Services:" -ForegroundColor Red
        foreach ($service in $failedServices) {
            Write-Host "  ✗ $service" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    Write-Host "Service URLs:" -ForegroundColor Cyan
    Write-Host "  Frontend:    http://localhost:3000"
    Write-Host "  Backend:     http://localhost:3001/graphql"
    Write-Host "  AI Engine:   http://localhost:8000/docs"
    Write-Host "  Hardhat:     http://localhost:8545"
    Write-Host "  MongoDB:     mongodb://localhost:27017"
    Write-Host "  Redis:       redis://localhost:6379"
    Write-Host "  IPFS:        http://localhost:5001"
    Write-Host ""
    
    if ($failedServices.Count -eq 0) {
        Write-Log "All services started successfully!" -Level Success
        Write-Host ""
        Write-Host "Press Ctrl+C to stop all services"
        
        # 保持脚本运行
        while ($true) {
            Start-Sleep -Seconds 1
        }
    }
    else {
        Write-Log "Some services failed to start. Check the logs above for details." -Level Warning
        exit 1
    }
}

# 清理函数
function Cleanup {
    Write-Log "Stopping all services..." -Level Info
    
    # 停止所有后台进程
    Get-Process | Where-Object { $_.ProcessName -match "node|python|pnpm" } | Stop-Process -ErrorAction SilentlyContinue
    
    # 停止 Docker 服务
    if (Test-Command docker) {
        try {
            Push-Location docker
            docker-compose -f docker-compose.dev.yml down
            Pop-Location
        }
        catch {
            # 忽略错误
        }
    }
    
    Write-Log "All services stopped" -Level Success
}

# 捕获 Ctrl+C
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }

# 运行主函数
Main
