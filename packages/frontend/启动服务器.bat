@echo off
echo ========================================
echo 正在启动 net4.xyz 前端服务器
echo ========================================
echo.

echo [1/3] 停止所有 Node 进程...
taskkill /F /IM node.exe >nul 2>&1

echo [2/3] 清除缓存...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo [3/3] 启动服务器（端口 4000）...
echo.
echo ========================================
echo 服务器将在 http://localhost:4000 启动
echo ========================================
echo.

pnpm run dev -- -p 4000
