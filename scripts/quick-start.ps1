# net4.xyz 快速启动脚本 (Windows PowerShell)
# 用法: .\scripts\quick-start.ps1

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         net4.xyz 快速启动脚本 - Windows PowerShell        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否运行
Write-Host "🔍 检查 Docker 状态..." -ForegroundColor Yellow
$dockerStatus = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker 未运行，请先启动 Docker Desktop" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker 已运行" -ForegroundColor Green
Write-Host ""

# 启动 Docker 服务
Write-Host "🚀 启动 Docker 服务..." -ForegroundColor Yellow
docker-compose -f docker/docker-compose.dev.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker 服务启动失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker 服务已启动" -ForegroundColor Green
Write-Host ""

# 等待 MongoDB 启动
Write-Host "⏳ 等待 MongoDB 启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "✅ MongoDB 已启动" -ForegroundColor Green
Write-Host ""

# 显示启动选项
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    选择启动方式                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  启动后端 (Backend) - 端口 3000" -ForegroundColor Green
Write-Host "2️⃣  启动前端 (Frontend) - 端口 3001" -ForegroundColor Green
Write-Host "3️⃣  同时启动前端和后端" -ForegroundColor Green
Write-Host "4️⃣  查看服务状态" -ForegroundColor Green
Write-Host "5️⃣  停止所有服务" -ForegroundColor Green
Write-Host "0️⃣  退出" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "请选择 (0-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 启动后端服务..." -ForegroundColor Yellow
        Write-Host "📍 后端地址: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "📍 GraphQL: http://localhost:3000/graphql" -ForegroundColor Cyan
        Write-Host ""
        Set-Location packages/backend
        pnpm dev
    }
    "2" {
        Write-Host ""
        Write-Host "🚀 启动前端服务..." -ForegroundColor Yellow
        Write-Host "📍 前端地址: http://localhost:3001" -ForegroundColor Cyan
        Write-Host ""
        Set-Location packages/frontend
        pnpm dev
    }
    "3" {
        Write-Host ""
        Write-Host "🚀 启动前端和后端..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📍 后端地址: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "📍 GraphQL: http://localhost:3000/graphql" -ForegroundColor Cyan
        Write-Host "📍 前端地址: http://localhost:3001" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  需要两个终端窗口，请按照以下步骤操作:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "终端 1 - 启动后端:" -ForegroundColor Cyan
        Write-Host "  cd packages/backend" -ForegroundColor Gray
        Write-Host "  pnpm dev" -ForegroundColor Gray
        Write-Host ""
        Write-Host "终端 2 - 启动前端:" -ForegroundColor Cyan
        Write-Host "  cd packages/frontend" -ForegroundColor Gray
        Write-Host "  pnpm dev" -ForegroundColor Gray
        Write-Host ""
        Write-Host "按 Enter 打开新终端窗口..." -ForegroundColor Yellow
        Read-Host
        
        # 打开新 PowerShell 窗口启动后端
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\packages\backend'; pnpm dev"
        
        # 打开新 PowerShell 窗口启动前端
        Start-Sleep -Seconds 3
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\packages\frontend'; pnpm dev"
        
        Write-Host "✅ 已打开两个新终端窗口" -ForegroundColor Green
    }
    "4" {
        Write-Host ""
        Write-Host "📊 服务状态:" -ForegroundColor Yellow
        Write-Host ""
        docker-compose -f docker/docker-compose.dev.yml ps
        Write-Host ""
        Write-Host "🔍 检查端口占用:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "后端 (3000):" -ForegroundColor Cyan
        netstat -ano | findstr :3000 | ForEach-Object { Write-Host "  $_" }
        Write-Host ""
        Write-Host "前端 (3001):" -ForegroundColor Cyan
        netstat -ano | findstr :3001 | ForEach-Object { Write-Host "  $_" }
    }
    "5" {
        Write-Host ""
        Write-Host "🛑 停止所有 Docker 服务..." -ForegroundColor Yellow
        docker-compose -f docker/docker-compose.dev.yml down
        Write-Host "✅ 所有服务已停止" -ForegroundColor Green
    }
    "0" {
        Write-Host ""
        Write-Host "👋 再见！" -ForegroundColor Cyan
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "❌ 无效选择" -ForegroundColor Red
        exit 1
    }
}
