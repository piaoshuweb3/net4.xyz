# ============================================================
# net4.xyz AI 引擎测试脚本 (Windows PowerShell)
# ============================================================
# 用法: .\scripts\test-ai-engine.ps1 [-Cov] [-Verbose] [-File <test_file>]
#
# 参数:
#   -Cov          显示测试覆盖率报告
#   -Verbose      详细输出模式 (-vv)
#   -File <path>  运行指定测试文件
#
# 说明:
#   1. 检查 Python 环境
#   2. 激活虚拟环境 (如存在)
#   3. 运行 pytest 测试
#   4. (可选) 显示覆盖率报告
# ============================================================

param(
    [switch]$Cov,
    [switch]$Verbose,
    [string]$File
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AiEngineDir = Join-Path $ProjectRoot "packages\ai-engine"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         net4.xyz AI 引擎测试脚本 (Windows)                 " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ---- 检查 Python 环境 ----
Write-Host "[1/3] 检查 Python 环境..." -ForegroundColor Yellow

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

# ---- 激活虚拟环境 ----
Write-Host "[2/3] 配置 Python 环境..." -ForegroundColor Yellow

$venvDir = Join-Path $AiEngineDir "venv"
$venvActivate = Join-Path $venvDir "Scripts\Activate.ps1"

if (Test-Path $venvActivate) {
    . $venvActivate
}

Set-Location $AiEngineDir

# ---- 运行测试 ----
Write-Host "[3/3] 运行测试..." -ForegroundColor Yellow
Write-Host ""

$pytestArgs = ""
if ($Verbose) { $pytestArgs += "-vv " }

if ($File) {
    $pytestArgs += $File
} else {
    $pytestArgs += "tests/"
}

if ($Cov) {
    Write-Host "运行测试并生成覆盖率报告..." -ForegroundColor Cyan
    & $pythonCmd -m pytest $pytestArgs --cov=src --cov-report=term-missing --cov-report=html
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "HTML 覆盖率报告: $AiEngineDir\htmlcov\index.html" -ForegroundColor Green
    }
} else {
    & $pythonCmd -m pytest $pytestArgs
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "测试失败，请检查输出" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "所有测试通过！" -ForegroundColor Green
