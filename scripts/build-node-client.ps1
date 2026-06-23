# ============================================================
# net4.xyz Node Client 构建脚本 (Windows PowerShell)
# ============================================================
# 用法: .\scripts\build-node-client.ps1 [-Platform <win|mac|linux>]
#
# 参数:
#   -Platform <win|mac|linux>   指定构建平台 (默认: 当前系统)
#
# 说明:
#   1. 检查 Node.js 环境
#   2. 检查 pnpm
#   3. 安装依赖 (如需要)
#   4. TypeScript 编译
#   5. Electron 构建
#
# 构建产物输出到: packages\node-client\release\
# ============================================================

param(
    [ValidateSet("win", "mac", "linux")]
    [string]$Platform
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$NodeClientDir = Join-Path $ProjectRoot "packages\node-client"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         net4.xyz Node Client 构建脚本 (Windows)             " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ---- 检查 Node.js ----
Write-Host "[1/4] 检查 Node.js 环境..." -ForegroundColor Yellow

try {
    $nodeVersion = & node --version 2>&1
    Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "未找到 Node.js，请安装 Node.js 18+" -ForegroundColor Red
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

if (-not (Test-Path "node_modules")) {
    Write-Host "安装项目依赖..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "依赖安装失败" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "依赖已就绪" -ForegroundColor Green
}

# ---- 构建项目 ----
Write-Host "[4/4] 构建 Node Client..." -ForegroundColor Yellow
Write-Host ""

Set-Location $NodeClientDir

# 清理旧的构建产物
if (Test-Path "dist") {
    Write-Host "清理旧构建..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force dist
}

# 根据平台选择构建命令
switch ($Platform) {
    "win" {
        Write-Host "构建 Windows 版本..." -ForegroundColor Cyan
        pnpm build:win
    }
    "mac" {
        Write-Host "构建 macOS 版本..." -ForegroundColor Cyan
        pnpm build:mac
    }
    "linux" {
        Write-Host "构建 Linux 版本..." -ForegroundColor Cyan
        pnpm build:linux
    }
    default {
        Write-Host "构建当前平台版本..." -ForegroundColor Cyan
        pnpm build
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "构建失败，请检查错误输出" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "构建完成！" -ForegroundColor Green
Write-Host "输出目录: $NodeClientDir\release\" -ForegroundColor Green
