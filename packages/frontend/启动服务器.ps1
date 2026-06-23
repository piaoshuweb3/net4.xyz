Write-Host "========================================" -ForegroundColor Cyan
Write-Host "正在启动 net4.xyz 前端服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] 停止所有 Node 进程..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Write-Host "[2/3] 清除缓存..." -ForegroundColor Yellow
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }

Write-Host "[3/3] 启动服务器（端口 4000）..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "服务器将在 http://localhost:4000 启动" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

pnpm run dev -- -p 4000
