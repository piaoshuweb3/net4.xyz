# net4.xyz Service Starter Script
# Usage: .\scripts\start-service.ps1 -Service <service_name>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('docker', 'backend', 'frontend', 'ai', 'contracts', 'all')]
    [string]$Service,
    
    [switch]$Build = $false
)

# Color definitions
$Colors = @{
    Info    = 'Cyan'
    Success = 'Green'
    Warning = 'Yellow'
    Error   = 'Red'
}

# Logging function
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

# Check if command exists
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

# Check if port is open
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

# Start Docker services
function Start-Docker {
    Write-Log "Starting Docker services..." -Level Info
    
    if (-not (Test-Command docker)) {
        Write-Log "Docker is not installed" -Level Error
        return $false
    }
    
    try {
        Push-Location docker
        Write-Log "Running: docker-compose -f docker-compose.dev.yml up -d" -Level Info
        docker-compose -f docker-compose.dev.yml up -d
        Pop-Location
        
        Write-Log "Waiting for services to be ready..." -Level Info
        Start-Sleep -Seconds 15
        
        # Check services
        $services = @(
            @{ Port = 27017; Name = "MongoDB" },
            @{ Port = 6379; Name = "Redis" },
            @{ Port = 5001; Name = "IPFS" }
        )
        
        $allReady = $true
        foreach ($svc in $services) {
            if (-not (Test-Port $svc.Port $svc.Name)) {
                $allReady = $false
            }
        }
        
        if ($allReady) {
            Write-Log "All Docker services are ready" -Level Success
            return $true
        }
        else {
            Write-Log "Some Docker services failed to start" -Level Error
            return $false
        }
    }
    catch {
        Write-Log "Failed to start Docker services: $_" -Level Error
        Pop-Location
        return $false
    }
}

# Start Backend
function Start-Backend {
    Write-Log "Starting backend service..." -Level Info
    
    if (-not (Test-Command pnpm)) {
        Write-Log "pnpm is not installed" -Level Error
        return $false
    }
    
    try {
        Push-Location packages/backend
        
        # Check dependencies
        if (-not (Test-Path node_modules)) {
            Write-Log "Installing dependencies..." -Level Info
            pnpm install
        }
        
        # Build
        if ($Build) {
            Write-Log "Building backend..." -Level Info
            pnpm run build
        }
        
        # Start
        Write-Log "Starting backend on port 3001..." -Level Info
        Write-Log "Running: pnpm run dev" -Level Info
        pnpm run dev
        
        Pop-Location
        return $true
    }
    catch {
        Write-Log "Failed to start backend: $_" -Level Error
        Pop-Location
        return $false
    }
}

# Start Frontend
function Start-Frontend {
    Write-Log "Starting frontend service..." -Level Info
    
    if (-not (Test-Command pnpm)) {
        Write-Log "pnpm is not installed" -Level Error
        return $false
    }
    
    try {
        Push-Location packages/frontend
        
        # Check dependencies
        if (-not (Test-Path node_modules)) {
            Write-Log "Installing dependencies..." -Level Info
            pnpm install
        }
        
        # Start
        Write-Log "Starting frontend on port 3000..." -Level Info
        Write-Log "Running: pnpm run dev" -Level Info
        pnpm run dev
        
        Pop-Location
        return $true
    }
    catch {
        Write-Log "Failed to start frontend: $_" -Level Error
        Pop-Location
        return $false
    }
}

# Start AI Engine
function Start-AI {
    Write-Log "Starting AI engine service..." -Level Info
    
    if (-not (Test-Command python)) {
        Write-Log "Python is not installed" -Level Error
        return $false
    }
    
    try {
        Push-Location packages/ai-engine
        
        # Check virtual environment
        if (-not (Test-Path venv)) {
            Write-Log "Creating Python virtual environment..." -Level Info
            python -m venv venv
        }
        
        # Activate virtual environment
        & ".\venv\Scripts\Activate.ps1"
        
        # Install dependencies
        if (Test-Path requirements.txt) {
            Write-Log "Installing dependencies..." -Level Info
            pip install -r requirements.txt
        }
        
        # Start
        Write-Log "Starting AI engine on port 8000..." -Level Info
        Write-Log "Running: python -m uvicorn src.main:app --reload" -Level Info
        python -m uvicorn src.main:app --reload
        
        Pop-Location
        return $true
    }
    catch {
        Write-Log "Failed to start AI engine: $_" -Level Error
        Pop-Location
        return $false
    }
}

# Start Smart Contracts
function Start-Contracts {
    Write-Log "Starting Hardhat node..." -Level Info
    
    if (-not (Test-Command pnpm)) {
        Write-Log "pnpm is not installed" -Level Error
        return $false
    }
    
    try {
        Push-Location packages/contracts
        
        # Check dependencies
        if (-not (Test-Path node_modules)) {
            Write-Log "Installing dependencies..." -Level Info
            pnpm install
        }
        
        # Start
        Write-Log "Starting Hardhat node on port 8545..." -Level Info
        Write-Log "Running: pnpm run node" -Level Info
        pnpm run node
        
        Pop-Location
        return $true
    }
    catch {
        Write-Log "Failed to start Hardhat node: $_" -Level Error
        Pop-Location
        return $false
    }
}

# Start All Services
function Start-All {
    Write-Log "Starting all services..." -Level Info
    Write-Log "Note: Services will be started in separate windows" -Level Warning
    
    # Start Docker
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { . '$PSScriptRoot\start-service.ps1' -Service docker }"
    Start-Sleep -Seconds 5
    
    # Start Backend
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { . '$PSScriptRoot\start-service.ps1' -Service backend }"
    Start-Sleep -Seconds 3
    
    # Start Frontend
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { . '$PSScriptRoot\start-service.ps1' -Service frontend }"
    Start-Sleep -Seconds 3
    
    # Start Contracts
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { . '$PSScriptRoot\start-service.ps1' -Service contracts }"
    
    Write-Log "All services started in separate windows" -Level Success
}

# Main function
function Main {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  net4.xyz Service Starter             ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    switch ($Service) {
        'docker' {
            Start-Docker
        }
        'backend' {
            Start-Backend
        }
        'frontend' {
            Start-Frontend
        }
        'ai' {
            Start-AI
        }
        'contracts' {
            Start-Contracts
        }
        'all' {
            Start-All
        }
    }
}

# Run main function
Main
