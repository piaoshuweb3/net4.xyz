Write-Host "========================================" -ForegroundColor Cyan
Write-Host "net4.xyz 前端诊断工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 1: Node.js 版本
Write-Host "[检查 1] Node.js 版本" -ForegroundColor Yellow
node --version
Write-Host ""

# 检查 2: pnpm 版本
Write-Host "[检查 2] pnpm 版本" -ForegroundColor Yellow
pnpm --version
Write-Host ""

# 检查 3: 当前目录
Write-Host "[检查 3] 当前目录" -ForegroundColor Yellow
Write-Host (Get-Location)
Write-Host ""

# 检查 4: package.json 是否存在
Write-Host "[检查 4] package.json" -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "✓ package.json 存在" -ForegroundColor Green
} else {
    Write-Host "✗ package.json 不存在！" -ForegroundColor Red
}
Write-Host ""

# 检查 5: src/app/page.tsx 是否存在
Write-Host "[检查 5] src/app/page.tsx" -ForegroundColor Yellow
if (Test-Path "src/app/page.tsx") {
    Write-Host "✓ page.tsx 存在" -ForegroundColor Green
    Write-Host "文件大小: $((Get-Item 'src/app/page.tsx').Length) 字节"
} else {
    Write-Host "✗ page.tsx 不存在！" -ForegroundColor Red
}
Write-Host ""

# 检查 6: src/app/layout.tsx 是否存在
Write-Host "[检查 6] src/app/layout.tsx" -ForegroundColor Yellow
if (Test-Path "src/app/layout.tsx") {
    Write-Host "✓ layout.tsx 存在" -ForegroundColor Green
} else {
    Write-Host "✗ layout.tsx 不存在！" -ForegroundColor Red
}
Write-Host ""

# 检查 7: node_modules 是否存在
Write-Host "[检查 7] node_modules" -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✓ node_modules 存在" -ForegroundColor Green
} else {
    Write-Host "✗ node_modules 不存在！需要运行 pnpm install" -ForegroundColor Red
}
Write-Host ""

# 检查 8: 端口占用情况
Write-Host "[检查 8] 端口占用情况" -ForegroundColor Yellow
$ports = @(3000, 3001, 3002, 3003, 4000)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "✗ 端口 $port 被占用" -ForegroundColor Red
    } else {
        Write-Host "✓ 端口 $port 可用" -ForegroundColor Green
    }
}
Write-Host ""

# 检查 9: Node 进程
Write-Host "[检查 9] Node 进程" -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "发现 $($nodeProcesses.Count) 个 Node 进程:" -ForegroundColor Yellow
    $nodeProcesses | Format-Table Id, ProcessName, CPU -AutoSize
} else {
    Write-Host "✓ 没有运行中的 Node 进程" -ForegroundColor Green
}
Write-Host ""

# 检查 10: .next 缓存
Write-Host "[检查 10] .next 缓存" -ForegroundColor Yellow
if (Test-Path ".next") {
    Write-Host "✗ .next 缓存存在（可能需要清除）" -ForegroundColor Yellow
} else {
    Write-Host "✓ 没有 .next 缓存" -ForegroundColor Green
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "诊断完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
