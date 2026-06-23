# ============================================================
# net4.xyz Node Client 启动脚本 (Windows PowerShell)
# ============================================================
# 用法: .\scripts\start-node-client.ps1
#
# 说明:
#   1. 检查 Node.js 18+ 环境
#   2. 检查 pnpm
#   3. 安装依赖 (如需要)
#   4. 启动 Electron 开发模式
# ============================================================

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$NodeClientDir = Join-Path $ProjectRoot "packages\node-client"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         net4.xyz Node Client 启动脚本 (Windows)             " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ---- 检查 Node.js ----
Write-Host "[1/4] 检查 Node.js 环境..." -ForegroundColor Yellow

try {
    $nodeVersion = & node --version 2>&1
    Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "未找到 Node.js，请安装 Node.js 18+" -ForegroundColor Red
    Write-Host "推荐: https://nodejs.org/" -ForegroundColor Gray
    exit 1
}

$major = [int]($nodeVersion -replace "^v", "" -split "\.")[0]
if ($major -lt 18) {
    Write-Host "需要 Node.js 18+，当前版本: $nodeVersion" -ForegroundColor Red
    exit 1
}

# ---- 检查 pnpm ----
Write-Host "[2/4] 检查 pnpm..." -ForegroundColor Yellow

try {
    $pnpmVersion = & pnpm --version 2>&1
    Write-Host "pnpm 版本: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "未找到 pnpm，正在安装..." -ForegroundColor Yellow
    npm install -g pnpm
    $pnpmVersion = & pnpm --version 2>&1
    Write-Host "pnpm 版本: $pnpmVersion" -ForegroundColor Green
}

# ---- 安装依赖 ----
Write-Host "[3/4] 检查依赖..." -ForegroundColor Yellow

Set-Location $ProjectRoot

if (-not (Test-Path "node_modules") -or -not (Test-Path (Join-Path $NodeClientDir "node_modules"))) {
    Write-Host "安装项目依赖 (pnpm install)..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "依赖安装失败" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "依赖已就绪" -ForegroundColor Green
}

# ---- 启动 Electron ----
Write-Host "[4/4] 启动 Node Client (Electron 开发模式)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "net4.xyz 节点客户端正在启动..." -ForegroundColor Cyan
Write-Host ""

Set-Location $NodeClientDir
pnpm dev
