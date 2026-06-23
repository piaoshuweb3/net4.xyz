# net4.xyz 快速启动指南

本指南帮助你快速启动 net4.xyz 的各个服务进行开发和测试。

## 前置要求

### 必需

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0

### 可选

- **Docker** & **Docker Compose** (用于数据库和存储服务)
- **Python** >= 3.10 (用于 AI 引擎)

### 安装

```bash
# 检查 Node.js
node --version

# 检查 pnpm
pnpm --version

# 如果没有 pnpm，安装它
npm install -g pnpm@8.15.0
```

## 快速启动

### 当前已验证可用的启动方式（2026-06-09）

本仓库这次排查后，已经确认下面这组组合可以正常启动并访问：

- 前端：`http://localhost:4100/`
- 后端：`http://localhost:3001/`
- AI / Python 服务：`http://localhost:8000/`

推荐按这个顺序检查：

```powershell
# 1. 检查端口占用
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 3001,4000,4100,8000 } |
  Select-Object LocalAddress,LocalPort,OwningProcess,State

# 2. 如需启动前端，优先使用 packages/frontend 下的 Next dev
cd packages/frontend
pnpm run dev -- --port 4100

# 3. 验证前端
Invoke-WebRequest -UseBasicParsing http://localhost:4100
```

如果 `4000` 已经被旧进程占用，不要反复并行再起一个新的 `4000` 实例，否则很容易出现“一个端口报冲突、另一个端口实际可用”的混乱状态。当前建议统一以前端 `4100` 为准进行开发验证。

### 一键启动入口

为了减少手动排错，仓库根目录新增了：

```powershell
.\一键启动-开发环境-4100.ps1
```

这个脚本会做几件事：

- 检查并复用已经健康的 `4100 / 3001 / 8000` 服务
- 只有在端口被坏进程占用或服务确实不可用时，才停止并重启对应服务
- 把前端、后端、AI 服务日志统一写到 `logs/`

如需强制全部重启：

```powershell
.\一键启动-开发环境-4100.ps1 -ForceRestart
```

### 本次问题复盘与硬性规则

这次启动后能访问，但前端出现了两类典型 React/Web3 运行时错误。后续改动必须遵守下面规则：

1. `WagmiProvider` 不能在首屏渲染时缺席。
   - 根布局内的页面内容，不能先裸渲染 `children`，再等 `mounted` 后补包 `WagmiProvider`。
   - 正确做法：`WagmiProvider` / `RainbowKitProvider` 在客户端组件树里始终存在。

2. React hooks 不能放在条件 `return` 后面。
   - 例如 `useEffect`、`useAccount`、`useDisconnect` 等必须在组件顶层稳定调用。
   - 允许在 hooks 内部用条件提前 `return`，不允许在 JSX 分支后再声明新的 hooks。

3. 文案展示统一从同一个数据源读取。
   - 如果卡片页和详情页共用文章数据，首页不能再读取已经移除的旧字段，必须和详情页使用同一套 i18n 或同一份结构化内容。

本次已验证修复的文件：

- `packages/frontend/src/components/Web3Provider/ClientOnlyWeb3Provider.tsx`
- `packages/frontend/src/components/Wallet/WalletConnectButton.tsx`
- `packages/frontend/src/app/blockchain/page.tsx`
- `packages/frontend/src/components/Features/FeaturesSection.tsx`

### 方式 1：使用快速启动菜单（推荐）

#### Windows (PowerShell)

```powershell
# 运行快速启动菜单
.\quick-start.ps1
```

然后选择要启动的服务：
```
1. Docker 服务 (MongoDB, Redis, IPFS)
2. 后端服务 (NestJS + GraphQL)
3. 前端服务 (Next.js)
4. 智能合约节点 (Hardhat)
5. AI 引擎 (FastAPI)
6. 启动所有服务
7. 完整诊断
8. 查看诊断指南
0. 退出
```

#### Linux/macOS (Bash)

```bash
bash scripts/quick-start.sh
```

### 方式 2：使用启动脚本

#### Windows (PowerShell)

```powershell
# 启动 Docker 服务
.\scripts\start-service.ps1 -Service docker

# 启动后端（在新窗口）
.\scripts\start-service.ps1 -Service backend

# 启动前端（在新窗口）
.\scripts\start-service.ps1 -Service frontend

# 启动智能合约（在新窗口）
.\scripts\start-service.ps1 -Service contracts

# 启动所有服务（在单独的窗口中）
.\scripts\start-service.ps1 -Service all
```

#### Linux/macOS (Bash)

```bash
# 启动 Docker 服务
bash scripts/start-service.sh docker

# 启动后端
bash scripts/start-service.sh backend

# 启动前端
bash scripts/start-service.sh frontend

# 启动智能合约
bash scripts/start-service.sh contracts

# 启动所有服务
bash scripts/start-service.sh all
```

### 方式 3：使用 Makefile

```bash
# 启动所有服务
make dev

# 启动 Docker 服务
make docker:up

# 启动后端
make dev:node

# 运行诊断
make diagnose
```

## 服务启动顺序

建议按以下顺序启动服务：

1. **Docker 服务** (MongoDB, Redis, IPFS)
   - 等待 15-20 秒让服务完全启动
   - 检查所有服务是否健康

2. **后端服务** (NestJS)
   - 依赖 Docker 服务
   - 运行在 http://localhost:3001

3. **前端服务** (Next.js)
   - 依赖后端服务
   - 运行在 http://localhost:3000

4. **智能合约节点** (Hardhat)
   - 独立运行
   - 运行在 http://localhost:8545

5. **AI 引擎** (FastAPI) - 可选
   - 可独立运行
   - 运行在 http://localhost:8000

## 访问服务

启动所有服务后，可以访问：

| 服务 | URL | 说明 |
|------|-----|------|
| 前端 | http://localhost:3000 | Next.js 应用 |
| 后端 GraphQL | http://localhost:3001/graphql | GraphQL Playground |
| 后端 Swagger | http://localhost:3001/api | API 文档 |
| AI 引擎 | http://localhost:8000/docs | FastAPI 文档 |
| Hardhat RPC | http://localhost:8545 | Ethereum RPC |
| IPFS 网关 | http://localhost:8080/ipfs/ | IPFS 网关 |
| Prometheus | http://localhost:9090 | 监控指标 |
| Grafana | http://localhost:3002 | 监控仪表板 (admin/admin) |

## 常见问题

### Q: 如何检查服务是否正常运行？

A: 使用诊断脚本：

```powershell
# Windows
.\scripts\diagnose-services.ps1

# Linux/macOS
bash scripts/diagnose-services.sh
```

### Q: 端口已被占用怎么办？

A: 查找并杀死占用端口的进程：

```powershell
# Windows - 查找占用 3001 端口的进程
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess
Get-Process -Id <PID>
Stop-Process -Id <PID> -Force

# Linux/macOS
lsof -i :3001
kill -9 <PID>
```

### Q: 依赖安装失败怎么办？

A: 清理并重新安装：

```bash
# 清理所有构建产物
pnpm -r clean

# 重新安装依赖
pnpm install

# 或针对特定包
cd packages/backend
pnpm install
```

### Q: 如何查看服务日志？

A: 日志会在启动窗口中显示。对于 Docker 服务：

```bash
# 查看所有 Docker 日志
docker-compose -f docker/docker-compose.dev.yml logs -f

# 查看特定服务日志
docker-compose -f docker/docker-compose.dev.yml logs -f mongodb
docker-compose -f docker/docker-compose.dev.yml logs -f redis
```

### Q: 如何停止所有服务？

A: 按 `Ctrl+C` 停止当前服务，然后：

```bash
# 停止 Docker 服务
docker-compose -f docker/docker-compose.dev.yml down

# 杀死所有 Node.js 进程
pkill -f "node|pnpm"

# Windows PowerShell
Get-Process | Where-Object { $_.ProcessName -match "node|pnpm" } | Stop-Process
```

### Q: 如何重置数据库？

A: 删除 Docker 卷：

```bash
# 停止并删除所有卷
docker-compose -f docker/docker-compose.dev.yml down -v

# 重新启动
docker-compose -f docker/docker-compose.dev.yml up -d
```

### Q: 如何更新依赖？

A: 使用 pnpm：

```bash
# 更新所有依赖
pnpm -r update

# 更新特定包
pnpm -r update @nestjs/core

# 检查过期的依赖
pnpm -r outdated
```

## 开发工作流

### 1. 启动开发环境

```powershell
# 启动所有服务
.\scripts\start-service.ps1 -Service all
```

### 2. 开发代码

- 前端代码在 `packages/frontend/src`
- 后端代码在 `packages/backend/src`
- 共享代码在 `packages/shared/src`

### 3. 热重载

所有服务都配置了热重载：
- 前端：修改文件后自动刷新
- 后端：修改文件后自动重启
- AI 引擎：修改文件后自动重启

### 4. 测试

```bash
# 运行所有测试
pnpm -r test

# 运行特定包的测试
cd packages/backend
pnpm test

# 监视模式
pnpm test:watch
```

### 5. 构建

```bash
# 构建所有包
pnpm -r build

# 构建特定包
cd packages/frontend
pnpm build
```

## 性能优化

### 减少启动时间

```bash
# 只启动必要的服务
.\scripts\start-service.ps1 -Service docker
.\scripts\start-service.ps1 -Service backend
.\scripts\start-service.ps1 -Service frontend
```

### 监控资源使用

```bash
# 查看 Docker 容器资源使用
docker stats

# Windows - 查看进程资源使用
Get-Process | Where-Object { $_.ProcessName -match "node|python" } | Format-Table Name, CPU, Memory
```

## 故障排除

详细的故障排除指南请查看 [DIAGNOSTIC_GUIDE.md](DIAGNOSTIC_GUIDE.md)

## 获取帮助

- 查看 [README.md](README.md) - 项目概述
- 查看 [CONTRIBUTING.md](CONTRIBUTING.md) - 贡献指南
- 查看 [DIAGNOSTIC_GUIDE.md](DIAGNOSTIC_GUIDE.md) - 详细诊断指南
- 查看 [net4.xyz-技术架构与实现标准.md](net4.xyz-技术架构与实现标准.md) - 技术架构

## 下一步

启动服务后，你可以：

1. **访问前端**: http://localhost:3000
2. **查看 GraphQL API**: http://localhost:3001/graphql
3. **阅读 API 文档**: http://localhost:3001/api
4. **开始开发**: 修改代码，享受热重载
5. **运行测试**: `pnpm -r test`
6. **构建生产版本**: `pnpm -r build`

祝你开发愉快！🚀
