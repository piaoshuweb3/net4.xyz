"""
AFC 钱包服务 - 简化版 AI Engine
仅包含钱包服务功能，不依赖 langchain 等重型库
"""
import os
import logging
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建 FastAPI 应用
app = FastAPI(
    title="AFC 钱包服务 API",
    description="基于 Coinbase awal CLI 的钱包操作服务",
    version="1.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入钱包服务
from src.services.wallet_service import (
    get_wallet_service,
    WalletStatus,
    Balance,
    TransactionResult,
    TradeResult,
    QueryResult
)

# ==================== 健康检查 ====================

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "service": "AFC Wallet Service"}

@app.get("/")
async def root():
    """根路径"""
    return {"message": "AFC 钱包服务 API", "docs": "/docs"}

# ==================== API 密钥验证（简化版） ====================

async def get_api_key(authorization: Optional[str] = None):
    """简化的 API 密钥验证（开发模式）"""
    # 开发模式下允许无密钥访问
    if os.getenv("ALLOW_NO_KEY", "false").lower() == "true":
        return "dev_key"
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing API key")
    
    return authorization

# ==================== 钱包服务接口 ====================

# 钱包请求模型
class WalletSendRequest(BaseModel):
    """发送代币请求"""
    amount: str = Field(..., description="金额（$1.00, 1.0, 或原子单位）")
    recipient: str = Field(..., description="接收地址（0x 地址、ENS 名称或 Solana 地址）")
    asset: str = Field(default="usdc", description="资产类型（usdc, eth, pol, sol）")
    chain: str = Field(default="base", description="区块链（base, polygon, solana）")

class WalletTradeRequest(BaseModel):
    """交易代币请求"""
    amount: str = Field(..., description="金额")
    from_asset: str = Field(..., description="源资产")
    to_asset: str = Field(..., description="目标资产")
    chain: str = Field(default="base", description="区块链")
    slippage: Optional[int] = Field(default=None, description="滑点（基点，100 = 1%）")

class WalletQueryRequest(BaseModel):
    """链上查询请求"""
    sql: str = Field(..., description="SQL 查询语句")
    timeout: Optional[int] = Field(default=30, description="超时时间（秒）")

class WalletAuthRequest(BaseModel):
    """钱包认证请求"""
    email: str = Field(..., description="邮箱地址")

@app.get("/api/v1/wallet/status")
async def wallet_status(api_key_id: str = Depends(get_api_key)):
    """获取钱包状态"""
    wallet_service = get_wallet_service()
    status = await wallet_service.get_status()
    return status.model_dump()

@app.get("/api/v1/wallet/balance")
async def wallet_balance(
    asset: str = "usdc",
    chain: str = "base",
    api_key_id: str = Depends(get_api_key)
):
    """获取钱包余额"""
    wallet_service = get_wallet_service()
    balance = await wallet_service.get_balance(asset=asset, chain=chain)
    
    if balance:
        return balance.model_dump()
    else:
        raise HTTPException(status_code=404, detail="Balance not found")

@app.post("/api/v1/wallet/send")
async def wallet_send(
    request: WalletSendRequest,
    api_key_id: str = Depends(get_api_key)
):
    """发送代币"""
    wallet_service = get_wallet_service()
    result = await wallet_service.send(
        amount=request.amount,
        recipient=request.recipient,
        asset=request.asset,
        chain=request.chain
    )
    return result.model_dump()

@app.post("/api/v1/wallet/trade")
async def wallet_trade(
    request: WalletTradeRequest,
    api_key_id: str = Depends(get_api_key)
):
    """交易/兑换代币"""
    wallet_service = get_wallet_service()
    result = await wallet_service.trade(
        amount=request.amount,
        from_asset=request.from_asset,
        to_asset=request.to_asset,
        chain=request.chain,
        slippage=request.slippage
    )
    return result.model_dump()

@app.post("/api/v1/wallet/query")
async def wallet_query(
    request: WalletQueryRequest,
    api_key_id: str = Depends(get_api_key)
):
    """查询链上数据"""
    wallet_service = get_wallet_service()
    result = await wallet_service.query_onchain_data(
        sql=request.sql,
        timeout=request.timeout or 30
    )
    return result.model_dump()

@app.post("/api/v1/wallet/auth")
async def wallet_auth(
    request: WalletAuthRequest,
    api_key_id: str = Depends(get_api_key)
):
    """认证钱包"""
    wallet_service = get_wallet_service()
    result = await wallet_service.authenticate(email=request.email)
    
    if result["success"]:
        return {"success": True, "message": result["message"]}
    else:
        raise HTTPException(status_code=400, detail=result["error"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)