# Changelog

All notable changes to net4.xyz will be documented in this file.

## [1.1.0] - 2026-06-24

### Added
- Comprehensive architecture audit report (`ARCHITECTURE_AUDIT_REPORT.md`)
- OpenAPI 3.0 specification (`docs/openapi.yaml`) with 11 API endpoints
- GitHub Actions CI workflow (lint, typecheck, build, test, contract-test)
- AP2 protocol smart contracts from ap2-mvp-base (ShadowAFC, BudgetFence, AP2Escrow, TDPO_Pool)
- Contract deployment data for Base Sepolia
- Frontend TypeScript types for AP2 protocol (`src/types/ap2.ts`)
- llms.txt for AI discovery
- Contract ABIs in integration package

### Changed
- Enabled ESLint and TypeScript build checks in `next.config.js`
- Updated contract addresses from placeholders to real Base Sepolia deployed addresses
- Redesigned Tailwind design system with premium color palette (Space, Gold, Quantum, Consciousness)
- Rewrote HeroSection with adaptive performance, WebGL context loss handling, refined animations
- Rewrote globals.css with streamlined design system, removed excessive neon effects
- Improved layout.tsx with full OpenGraph/Twitter metadata for SEO
- Rewrote README.md as concise professional project overview
- Enhanced .gitignore for Python, runtime data, and archives
- Strengthened .env and .env.example security (removed weak default passwords)

### Removed
- 136+ noise files moved to `docs/archive/` (debug logs, status reports, temp scripts)
- Frontend backup files (page-backup.tsx, page-complex.tsx, page-minimal.tsx, globals.css.backup)
- Debug routes (/demo, /simple, /test) from production
- Excessive cyberpunk visual effects (replaced with refined premium design language)

## [1.0.0] - 2026-06-14

### Initial Release
- Monorepo structure with pnpm workspaces
- Frontend: Next.js 14, React 18, Three.js, Wagmi, RainbowKit, i18next, Framer Motion
- Backend: NestJS, GraphQL Apollo, Prisma
- AI Engine: Python-based LLM router with DeepSeek/Anthropic/OpenAI/Ollama support
- Contracts: Solidity (Hardhat + Foundry) with AFC_Token, Spark_NFT, EconomyModel, LiquidityManager
- Shared: TypeScript types, ABIs, config, constants, utils
- Docker + Kubernetes configuration
