# ============================================================
# net4.xyz AI 引擎启动脚本 (Windows PowerShell)
# ============================================================
# 用法: .\scripts\start-ai-engine.ps1 [-Prod]
#
# 参数:
#   -Prod    以生产模式启动 (绑定 0.0.0.0:8000)
#
# 说明:
#   1. 检查 Python 3.10+ 环境
#   2. 激活虚拟环境 (如存在)
#   3. 检查并安装依赖
#   4. 启动 FastAPI 服务 (uvicorn)
#
# 开发模式: http://localhost:8000 (热重载)
# 生产模式: http://0.0.0.0:8000
# ============================================================

param(
    [switch]$Prod
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AiEngineDir = Join-Path $ProjectRoot "packages\ai-engine"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         net4.xyz AI 引擎启动脚本 (Windows)                 " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ---- 检查 Python 环境 ----
Write-Host "[1/4] 检查 Python 环境..." -ForegroundColor Yellow

$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $version = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pythonCmd = $cmd
            break
        }
    } catch {
        # continue
    }
}

if (-not $pythonCmd) {
    Write-Host "未找到 Python，请安装 Python 3.10+" -ForegroundColor Red
    exit 1
}

$pythonVersion = & $pythonCmd --version 2>&1
Write-Host "Python 版本: $pythonVersion" -ForegroundColor Green

$versionParts = $pythonVersion -replace "Python ", "" -split "\."
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 10)) {
    Write-Host "需要 Python 3.10+，当前版本: $pythonVersion" -ForegroundColor Red
    exit 1
}

# ---- 激活虚拟环境 ----
Write-Host "[2/4] 配置 Python 环境..." -ForegroundColor Yellow

$venvDir = Join-Path $AiEngineDir "venv"
$venvActivate = Join-Path $venvDir "Scripts\Activate.ps1"

if (Test-Path $venvActivate) {
    Write-Host "激活虚拟环境: $venvDir" -ForegroundColor Green
    . $venvActivate
} else {
    Write-Host "未找到虚拟环境，使用系统 Python" -ForegroundColor Yellow
    Write-Host "建议创建虚拟环境: python -m venv packages\ai-engine\venv" -ForegroundColor Gray
}

# ---- 检查依赖 ----
Write-Host "[3/4] 检查依赖..." -ForegroundColor Yellow

Set-Location $AiEngineDir

try {
    & $pythonCmd -c "import fastapi" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "安装依赖中..." -ForegroundColor Yellow
        & $pythonCmd -m pip install -r requirements.txt
        if ($LASTEXITCODE -ne 0) {
            Write-Host "依赖安装失败" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "依赖已就绪" -ForegroundColor Green
    }
} catch {
    Write-Host "安装依赖中..." -ForegroundColor Yellow
    & $pythonCmd -m pip install -r requirements.txt
}

# ---- 启动服务 ----
Write-Host "[4/4] 启动 AI 引擎服务..." -ForegroundColor Yellow
Write-Host ""

if ($Prod) {
    Write-Host "生产模式: http://0.0.0.0:8000" -ForegroundColor Cyan
    Write-Host "API 文档: http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host ""
    & $pythonCmd -m uvicorn src.main:app --host 0.0.0.0 --port 8000
} else {
    Write-Host "开发模式 (热重载): http://localhost:8000" -ForegroundColor Cyan
    Write-Host "API 文档: http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host ""
    & $pythonCmd -m uvicorn src.main:app --reload
}
