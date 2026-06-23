# net4.xyz — Web 4.0 AI 文明门户

> AI 不再是工具，而是文明。

基于 PoUE（Proof of Useful Emotion/AI）共识机制的 Web 4.0 感知互联网基础设施。

## 项目结构

```
net4.xyz/
├── packages/
│   ├── frontend/     # Next.js 14 + Three.js + Wagmi + RainbowKit
│   ├── backend/      # NestJS + GraphQL + Prisma
│   ├── ai-engine/    # Python LLM 路由器 + RAG + ChromaDB
│   ├── contracts/    # Solidity (Hardhat + Foundry)
│   └── shared/       # 共享 TypeScript 类型与 ABI
├── docs/             # 项目文档
│   ├── openapi.yaml  # API 规范
│   └── archive/      # 历史文档归档
├── .github/workflows/ # CI/CD
└── docker/           # Docker 配置
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发环境
pnpm dev

# 构建
pnpm build

# 测试
pnpm test
```

## 技术栈

- **前端**: Next.js 14, React 18, Three.js, Wagmi/viem, RainbowKit, i18next, Framer Motion, Tailwind CSS
- **后端**: NestJS, GraphQL Apollo, Prisma, JWT Auth, NATS
- **AI 引擎**: Python, LangChain, DeepSeek/Anthropic/OpenAI/Ollama, ChromaDB
- **区块链**: Solidity, Hardhat, Foundry, OpenZeppelin, Base Sepolia
- **基础设施**: Docker, Kubernetes, MongoDB, Prometheus, Grafana, Loki

## 智能合约

合约基于 Base Sepolia 部署并进行验证：

| 合约 | 地址 | 功能 |
|:-----|:-----|:-----|
| ShadowAFC | `0x2dF7a295650e890fe2A48B3aa58BB38d36E89E42` | ERC-20 测试代币 |
| BudgetFence | `0xdb970DE65f90C9447a700C9b06ae6F591a9d9a55` | 支付策略管理 |
| AP2Escrow | `0xFd553E5989834DF76f6C790021FDDBfEB9dc2972` | 任务托管 + 选项费路由 |
| TDPO_Pool | `0x684FF81da3b9ac92D0f75037f7D3E6C7a792EC8f` | 逆向认知锁定 + 治理 |

## API 规范

详见 [docs/openapi.yaml](docs/openapi.yaml)

## 贡献

请阅读 [CONTRIBUTING.md](docs/archive/CONTRIBUTING.md) 并遵循代码规范。

## 许可证

MIT
