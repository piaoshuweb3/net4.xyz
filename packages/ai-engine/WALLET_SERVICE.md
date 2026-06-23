# 钱包服务集成文档

## 概述

本文档描述了 net4.xyz AI Engine 与 Coinbase Agentic Wallet Skills 的集成方案。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useWalletService Hooks                              │   │
│  │  - useWalletStatus()                                 │   │
│  │  - useWalletBalance()                                │   │
│  │  - useWalletSend()                                   │   │
│  │  - useWalletTrade()                                  │   │
│  │  - useWalletQuery()                                  │   │
│  │  - useAFCBalanceOnBase()                             │   │
│  │  - useAFCSend()                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/JSON
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI Engine (FastAPI)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Wallet API Routes                                   │   │
│  │  - GET  /api/v1/wallet/status                        │   │
│  │  - GET  /api/v1/wallet/balance                       │   │
│  │  - POST /api/v1/wallet/send                          │   │
│  │  - POST /api/v1/wallet/trade                         │   │
│  │  - POST /api/v1/wallet/query                         │   │
│  │  - POST /api/v1/wallet/auth                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WalletService (wallet_service.py)                   │   │
│  │  - 输入验证（防止注入攻击）                          │   │
│  │  - 命令构建（安全的 shell 命令）                     │   │
│  │  - 错误处理                                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ subprocess
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Coinbase awal CLI (npx awal@2.10.0)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - awal status                                       │   │
│  │  - awal balance                                      │   │
│  │  - awal send                                         │   │
│  │  - awal trade                                        │   │
│  │  - awal x402 pay (CDP SQL API)                       │   │
│  │  - awal auth login                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ JSON-RPC / REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Base Chain (EVM)                          │
│  - USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913        │
│  - WETH: 0x4200000000000000000000000000000000000006        │
│  - AFC Token (1:1 映射到 USDC，主网上线后替换)              │
└─────────────────────────────────────────────────────────────┘
```

## 安全审计结果

### ✅ 安全性评估

**结论：安全可用**

1. **无自定义代码风险**
   - `agentic-wallet-skills` 仅包含技能定义（SKILL.md 文件）
   - 实际执行由 Coinbase 官方的 `awal` CLI 完成
   - 无需审计自定义 Python 脚本

2. **输入验证完善**
   - 所有用户输入都经过严格的正则表达式验证
   - 防止 shell 注入攻击
   - 防止 SQL 注入攻击（链上查询）

3. **命令执行安全**
   - 使用 `asyncio.create_subprocess_shell` 执行命令
   - 设置超时限制，防止命令挂起
   - 捕获并记录所有错误

4. **私钥管理**
   - `awal` CLI 使用 Coinbase 的 MPC 钱包
   - 私钥由 Coinbase 管理，不存储在本地
   - 通过邮箱 OTP 认证，无需直接处理私钥

### 🔒 安全措施

#### 输入验证

```python
# 金额验证
AMOUNT_PATTERN = re.compile(r'^\$?[\d.]+$')

# 以太坊地址验证
ETH_ADDRESS_PATTERN = re.compile(r'^0x[0-9a-fA-F]{40}$')

# ENS 名称验证
ENS_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9.-]+\.eth$')

# Solana 地址验证
SOLANA_ADDRESS_PATTERN = re.compile(r'^[1-9A-HJ-NP-Za-km-z]{32,44}$')
```

#### SQL 注入防护

```python
# 检查危险关键字
dangerous_keywords = [';', '--', '/*', '*/', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE']
```

#### Shell 注入防护

```python
# 金额如果包含 $ 需要单引号包裹
if amount.startswith('$'):
    amount_arg = f"'{amount}'"
else:
    amount_arg = amount
```

## API 接口

### 1. 获取钱包状态

```http
GET /api/v1/wallet/status
```

**响应：**
```json
{
  "authenticated": true,
  "address": "0x1234...abcd",
  "network": "base"
}
```

### 2. 获取余额

```http
GET /api/v1/wallet/balance?asset=usdc&chain=base
```

**响应：**
```json
{
  "asset": "usdc",
  "amount": "100.50",
  "chain": "base",
  "address": "0x1234...abcd"
}
```

### 3. 发送代币

```http
POST /api/v1/wallet/send
Content-Type: application/json

{
  "amount": "10.00",
  "recipient": "0x5678...efgh",
  "asset": "usdc",
  "chain": "base"
}
```

**响应：**
```json
{
  "success": true,
  "tx_hash": "0xabcd...1234",
  "from_address": "0x1234...abcd",
  "to_address": "0x5678...efgh",
  "amount": "10.00",
  "asset": "usdc",
  "chain": "base"
}
```

### 4. 交易/兑换代币

```http
POST /api/v1/wallet/trade
Content-Type: application/json

{
  "amount": "10.00",
  "from_asset": "usdc",
  "to_asset": "eth",
  "chain": "base",
  "slippage": 100
}
```

**响应：**
```json
{
  "success": true,
  "tx_hash": "0xabcd...1234",
  "from_asset": "usdc",
  "to_asset": "eth",
  "from_amount": "10.00",
  "to_amount": "0.0035",
  "chain": "base"
}
```

### 5. 查询链上数据

```http
POST /api/v1/wallet/query
Content-Type: application/json

{
  "sql": "SELECT transaction_hash, to_address, value FROM base.transactions WHERE from_address = lower('0x1234...abcd') LIMIT 10",
  "timeout": 30
}
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "transaction_hash": "0xabcd...1234",
      "to_address": "0x5678...efgh",
      "value": "1000000"
    }
  ]
}
```

### 6. 认证钱包

```http
POST /api/v1/wallet/auth
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**响应：**
```json
{
  "success": true,
  "message": "OTP sent to user@example.com"
}
```

## 前端使用示例

### 获取 AFC Token 余额

```typescript
import { useAFCBalanceOnBase } from '@/hooks/useWalletService';

function MyComponent() {
  const { balance, isLoading, error, fetchAFCBalance } = useAFCBalanceOnBase();

  useEffect(() => {
    fetchAFCBalance();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>AFC Balance: {balance?.amount} {balance?.asset}</div>;
}
```

### 发送 AFC Token

```typescript
import { useAFCSend } from '@/hooks/useWalletService';

function SendAFCButton() {
  const { result, isLoading, error, sendAFC } = useAFCSend();

  const handleSend = async () => {
    await sendAFC('10.00', '0x5678...efgh');
  };

  return (
    <button onClick={handleSend} disabled={isLoading}>
      {isLoading ? 'Sending...' : 'Send 10 AFC'}
    </button>
  );
}
```

### 交易代币

```typescript
import { useWalletTrade } from '@/hooks/useWalletService';

function TradeButton() {
  const { result, isLoading, error, trade } = useWalletTrade();

  const handleTrade = async () => {
    await trade('10.00', 'usdc', 'eth', 'base', 100);
  };

  return (
    <button onClick={handleTrade} disabled={isLoading}>
      {isLoading ? 'Trading...' : 'Trade 10 USDC for ETH'}
    </button>
  );
}
```

## 配置

### AI Engine 环境变量

```bash
# Base 链 RPC 端点
BASE_CHAIN_RPC_URL="https://mainnet.base.org"
BASE_CHAIN_ID="8453"

# AFC Token 合约地址（Base 链上的 1:1 映射）
AFC_TOKEN_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

# Coinbase awal CLI 版本
AWAL_VERSION="2.10.0"

# 钱包服务超时配置（秒）
WALLET_COMMAND_TIMEOUT="60"
WALLET_AUTH_TIMEOUT="120"
WALLET_QUERY_TIMEOUT="30"
```

### 前端环境变量

```bash
# AI Engine URL
NEXT_PUBLIC_AI_ENGINE_URL=http://localhost:8000
```

## 部署前准备

### 1. 安装 Node.js 和 npm

```bash
# 检查 Node.js 版本（需要 v18+）
node --version

# 检查 npm 版本
npm --version
```

### 2. 测试 awal CLI

```bash
# 测试 awal CLI 是否可用
npx awal@2.10.0 --version

# 测试钱包状态
npx awal@2.10.0 status
```

### 3. 认证钱包

```bash
# 使用邮箱认证
npx awal@2.10.0 auth login your-email@example.com

# 输入收到的 OTP 验证码
```

### 4. 启动 AI Engine

```bash
cd packages/ai-engine
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. 测试 API

```bash
# 测试钱包状态
curl http://localhost:8000/api/v1/wallet/status

# 测试余额查询
curl "http://localhost:8000/api/v1/wallet/balance?asset=usdc&chain=base"
```

## AFC Token 主网上线后的迁移

当 AFC 公链主网上线后，需要进行以下更新：

### 1. 更新合约地址

```bash
# 更新 .env 文件
AFC_TOKEN_ADDRESS="0x新的AFC合约地址"
```

### 2. 更新前端配置

```typescript
// packages/frontend/src/config/contracts.ts
export const AFC_TOKEN_ADDRESS = '0x新的AFC合约地址';
```

### 3. 更新 awal 配置

如果 AFC 链不在 awal 默认支持的链中，需要：

1. 等待 Coinbase 添加 AFC 链支持
2. 或者使用自定义 RPC 端点（如果 awal 支持）

### 4. 测试迁移

```bash
# 测试新链上的余额查询
curl "http://localhost:8000/api/v1/wallet/balance?asset=afc&chain=afc"

# 测试新链上的转账
curl -X POST http://localhost:8000/api/v1/wallet/send \
  -H "Content-Type: application/json" \
  -d '{"amount":"1.00","recipient":"0x...","asset":"afc","chain":"afc"}'
```

## 常见问题

### Q1: awal CLI 命令超时怎么办？

**A:** 检查网络连接，增加超时时间：

```python
# wallet_service.py
result = await self._run_command(cmd, timeout=120)  # 增加到 120 秒
```

### Q2: 如何处理 ENS 名称解析失败？

**A:** awal CLI 会自动解析 ENS 名称，如果失败会返回错误。前端应该提示用户使用 0x 地址。

### Q3: 如何处理交易失败？

**A:** 检查错误信息，常见原因：
- 余额不足
- Gas 费用不足
- 滑点设置过低
- 网络拥堵

### Q4: 如何监控钱包服务的健康状态？

**A:** 定期调用 `/api/v1/wallet/status` 接口，检查认证状态。

## 技术债务

### 🟡 中优先级

1. **添加交易历史查询**
   - 实现 `/api/v1/wallet/transactions` 接口
   - 支持分页和过滤

2. **添加 Gas 费用估算**
   - 在发送交易前估算 Gas 费用
   - 提供 Gas 价格建议

3. **添加交易状态追踪**
   - 实现 `/api/v1/wallet/transaction/{tx_hash}` 接口
   - 支持 WebSocket 实时更新

### 🟢 低优先级

4. **添加批量操作支持**
   - 支持批量转账
   - 支持批量查询

5. **添加缓存层**
   - 缓存余额查询结果
   - 缓存链上数据查询结果

6. **添加监控和告警**
   - 监控 awal CLI 执行时间
   - 监控交易成功率
   - 监控错误率

## 参考资料

- [Coinbase Agentic Wallet Skills](https://github.com/coinbase/agentic-wallet-skills)
- [awal CLI Documentation](https://www.npmjs.com/package/awal)
- [Base Chain Documentation](https://docs.base.org/)
- [CDP SQL API Documentation](https://docs.cdp.coinbase.com/data-api/docs/welcome)
