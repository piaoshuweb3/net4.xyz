param(
    [switch]$ForceRestart
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogsDir = Join-Path $ProjectRoot 'logs'
$FrontendDir = Join-Path $ProjectRoot 'packages\frontend'
$BackendDir = Join-Path $ProjectRoot 'packages\backend'
$AiDir = Join-Path $ProjectRoot 'packages\ai-engine'

if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}

function Write-Banner {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  net4.xyz 开发环境一键启动 (4100)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step($message) {
    Write-Host $message -ForegroundColor Magenta
}

function Write-Info($message) {
    Write-Host "  $message" -ForegroundColor Gray
}

function Write-Ok($message) {
    Write-Host "  $message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "  $message" -ForegroundColor Yellow
}

function Get-ListeningPids([int]$Port) {
    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $connections) {
        return @()
    }

    return $connections |
        Select-Object -ExpandProperty OwningProcess -Unique
}

function Test-PortListening([int]$Port) {
    return (Get-ListeningPids -Port $Port).Count -gt 0
}

function Test-HttpReady([string]$Url, [int]$TimeoutSeconds = 3) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSeconds
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Stop-PortProcess([int]$Port) {
    $pids = Get-ListeningPids -Port $Port
    if (-not $pids -or $pids.Count -eq 0) {
        return
    }

    foreach ($processId in $pids) {
        try {
            $proc = Get-Process -Id $processId -ErrorAction Stop
            Write-Warn "端口 $Port 被 $($proc.ProcessName)($processId) 占用，正在停止..."
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
            Write-Warn "停止占用端口 $Port 的进程失败: $($_.Exception.Message)"
        }
    }

    Start-Sleep -Seconds 1
}

function Wait-ForService([string]$Name, [string]$Url, [int]$TimeoutSeconds = 120) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HttpReady -Url $Url -TimeoutSeconds 5) {
            Write-Ok "$Name 就绪: $Url"
            return $true
        }

        Start-Sleep -Seconds 2
    }

    return $false
}

function Start-BackgroundProcess {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$StdoutLog,
        [string]$StderrLog
    )

    Write-Info "启动 $Name..."
    Start-Process `
        -WindowStyle Hidden `
        -WorkingDirectory $WorkingDirectory `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -RedirectStandardOutput $StdoutLog `
        -RedirectStandardError $StderrLog | Out-Null
}

function Ensure-Service {
    param(
        [string]$Name,
        [int]$Port,
        [string]$HealthUrl,
        [int]$TimeoutSeconds,
        [switch]$AllowPortOnlyReady,
        [scriptblock]$StartAction
    )

    if (-not $ForceRestart -and (Test-HttpReady -Url $HealthUrl -TimeoutSeconds 5)) {
        Write-Ok "$Name 已在运行，直接复用: $HealthUrl"
        return
    }

    if (-not $ForceRestart -and $AllowPortOnlyReady -and (Test-PortListening -Port $Port)) {
        Write-Warn "$Name 端口 $Port 已在监听，先复用当前进程。"
        return
    }

    $existingPids = Get-ListeningPids -Port $Port
    if ($existingPids.Count -gt 0) {
        Stop-PortProcess -Port $Port
    }

    & $StartAction

    if (-not (Wait-ForService -Name $Name -Url $HealthUrl -TimeoutSeconds $TimeoutSeconds)) {
        if ($AllowPortOnlyReady -and (Test-PortListening -Port $Port)) {
            Write-Warn "$Name 端口 $Port 已监听，但健康检查暂未通过。可先继续使用，并查看日志确认。"
            return
        }

        throw "$Name 启动失败，请检查日志。"
    }
}

Write-Banner

Write-Step "[1/4] 检查项目目录"
foreach ($path in @($FrontendDir, $BackendDir, $AiDir)) {
    if (-not (Test-Path $path)) {
        throw "缺少目录: $path"
    }
    Write-Ok "已找到: $path"
}

Write-Step "[2/4] 启动或复用后端服务"
Ensure-Service `
    -Name '后端' `
    -Port 3001 `
    -HealthUrl 'http://localhost:3001/health' `
    -TimeoutSeconds 90 `
    -AllowPortOnlyReady `
    -StartAction {
        Start-BackgroundProcess `
            -Name '后端' `
            -WorkingDirectory $BackendDir `
            -FilePath 'powershell.exe' `
            -ArgumentList @(
                '-NoProfile',
                '-Command',
                '$env:PORT=''3001''; pnpm.cmd run dev'
            ) `
            -StdoutLog (Join-Path $LogsDir 'backend-3001.log') `
            -StderrLog (Join-Path $LogsDir 'backend-3001-err.log')
    }

Write-Step "[3/4] 启动或复用 AI 服务"
Ensure-Service `
    -Name 'AI 服务' `
    -Port 8000 `
    -HealthUrl 'http://localhost:8000/health' `
    -TimeoutSeconds 60 `
    -StartAction {
        Start-BackgroundProcess `
            -Name 'AI 服务' `
            -WorkingDirectory $AiDir `
            -FilePath 'python' `
            -ArgumentList @(
                '-m',
                'uvicorn',
                'src.main:app',
                '--host',
                '0.0.0.0',
                '--port',
                '8000',
                '--reload'
            ) `
            -StdoutLog (Join-Path $LogsDir 'ai-8000.log') `
            -StderrLog (Join-Path $LogsDir 'ai-8000-err.log')
    }

Write-Step "[4/4] 启动或复用前端服务"
Ensure-Service `
    -Name '前端' `
    -Port 4100 `
    -HealthUrl 'http://localhost:4100/' `
    -TimeoutSeconds 150 `
    -StartAction {
        Start-BackgroundProcess `
            -Name '前端' `
            -WorkingDirectory $FrontendDir `
            -FilePath 'pnpm.cmd' `
            -ArgumentList @(
                'run',
                'dev',
                '--',
                '--port',
                '4100'
            ) `
            -StdoutLog (Join-Path $LogsDir 'frontend-4100.log') `
            -StderrLog (Join-Path $LogsDir 'frontend-4100-err.log')
    }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  开发环境已就绪" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  前端:   http://localhost:4100/" -ForegroundColor Green
Write-Host "  后端:   http://localhost:3001/health" -ForegroundColor Green
Write-Host "  AI:     http://localhost:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "  日志目录: $LogsDir" -ForegroundColor Yellow
Write-Host "  如需强制重启全部服务: .\一键启动-开发环境-4100.ps1 -ForceRestart" -ForegroundColor Yellow
