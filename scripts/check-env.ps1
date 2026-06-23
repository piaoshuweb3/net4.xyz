# ============================================================
# net4.xyz 环境检查脚本 (Windows PowerShell)
# ============================================================
# 用法: .\scripts\check-env.ps1
#
# 说明:
#   检查开发环境所有必要工具和配置是否就绪:
#   - Python 3.10+
#   - Node.js 18+
#   - pnpm
#   - Docker
#   - .env 配置文件
#   - 项目依赖
# ============================================================

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         net4.xyz 开发环境检查 (Windows)                    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$script:errors = 0
$script:warnings = 0

function Check-Pass {
    param([string]$Message)
    Write-Host "  [PASS] $Message" -ForegroundColor Green
}

function Check-Fail {
    param([string]$Message)
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
    $script:errors++
}

function Check-Warn {
    param([string]$Message)
    Write-Host "  [WARN] $Message" -ForegroundColor Yellow
    $script:warnings++
}

# ---- Python ----
Write-Host "[Python]" -ForegroundColor Yellow

$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pythonCmd = $cmd
            break
        }
    } catch { }
}

if ($pythonCmd) {
    $pyVer = & $pythonCmd --version 2>&1
    $parts = ($pyVer -replace "Python ", "") -split "\."
    $major = [int]$parts[0]; $minor = [int]$parts[1]
    if ($major -ge 3 -and $minor -ge 10) {
        Check-Pass "$pyVer (>= 3.10)"
    } else {
        Check-Fail "$pyVer (需要 >= 3.10)"
    }
} else {
    Check-Fail "未安装 Python"
}

# Python venv
$venvDir = Join-Path $ProjectRoot "packages\ai-engine\venv"
if (Test-Path $venvDir) {
    Check-Pass "虚拟环境存在 ($venvDir)"
} else {
    Check-Warn "虚拟环境不存在，建议创建: python -m venv packages\ai-engine\venv"
}

# ---- Node.js ----
Write-Host ""
Write-Host "[Node.js]" -ForegroundColor Yellow

try {
    $nodeVer = & node --version 2>&1
    $major = [int]($nodeVer -replace "^v", "" -split "\.")[0]
    if ($major -ge 18) {
        Check-Pass "$nodeVer (>= 18)"
    } else {
        Check-Fail "$nodeVer (需要 >= 18)"
    }
} catch {
    Check-Fail "未安装 Node.js"
}

# ---- pnpm ----
Write-Host ""
Write-Host "[pnpm]" -ForegroundColor Yellow

try {
    $pnpmVer = & pnpm --version 2>&1
    Check-Pass "pnpm $pnpmVer"
} catch {
    Check-Fail "未安装 pnpm (npm install -g pnpm)"
}

# ---- Docker ----
Write-Host ""
Write-Host "[Docker]" -ForegroundColor Yellow

try {
    $dockerVer = & docker --version 2>&1
    $dockerRunning = $false
    try {
        & docker ps *> $null
        if ($LASTEXITCODE -eq 0) { $dockerRunning = $true }
    } catch { }

    if ($dockerRunning) {
        Check-Pass "$dockerVer (运行中)"
    } else {
        Check-Warn "$dockerVer (未运行，请启动 Docker Desktop)"
    }
} catch {
    Check-Warn "未安装 Docker (可选)"
}

try {
    $dcVer = & docker-compose --version 2>&1
    Check-Pass "$dcVer"
} catch {
    try {
        & docker compose version *> $null
        if ($LASTEXITCODE -eq 0) {
            $dcVer = & docker compose version --short 2>&1
            Check-Pass "docker compose $dcVer"
        }
    } catch {
        Check-Warn "未安装 docker-compose (可选)"
    }
}

# ---- 项目配置 ----
Write-Host ""
Write-Host "[项目配置]" -ForegroundColor Yellow

$envFile = Join-Path $ProjectRoot ".env"
if (Test-Path $envFile) {
    Check-Pass ".env 文件存在"
} else {
    Check-Warn ".env 文件不存在，请参考 .env.example 创建"
}

$workspaceFile = Join-Path $ProjectRoot "pnpm-workspace.yaml"
if (Test-Path $workspaceFile) {
    Check-Pass "pnpm workspace 配置存在"
} else {
    Check-Fail "pnpm-workspace.yaml 不存在"
}

$nodeModules = Join-Path $ProjectRoot "node_modules"
if (Test-Path $nodeModules) {
    Check-Pass "node_modules 已安装"
} else {
    Check-Warn "node_modules 不存在，请运行 pnpm install"
}

$aiReq = Join-Path $ProjectRoot "packages\ai-engine\requirements.txt"
if (Test-Path $aiReq) {
    Check-Pass "AI 引擎 requirements.txt 存在"
} else {
    Check-Fail "AI 引擎 requirements.txt 不存在"
}

# ---- 总结 ----
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                         检查结果                             " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($script:errors -eq 0 -and $script:warnings -eq 0) {
    Write-Host "所有检查通过，环境已就绪！" -ForegroundColor Green
} elseif ($script:errors -eq 0) {
    Write-Host "$($script:warnings) 个警告，建议处理后再开发" -ForegroundColor Yellow
} else {
    Write-Host "$($script:errors) 个错误，$($script:warnings) 个警告" -ForegroundColor Red
    Write-Host "请先修复错误项" -ForegroundColor Red
    exit 1
}
