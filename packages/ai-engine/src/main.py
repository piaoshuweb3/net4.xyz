"""
net4.xyz AI Engine - Main Application
基于 PoUE 共识机制的 AI 任务编排系统
云端 API 服务（轨道 A）
"""
import os
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
from dotenv import load_dotenv

load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 导入服务
from src.services import (
    AIRouter,
    ModelProvider,
    LoadBalancingStrategy,
    APIKeyManager,
    KeyTier
)
from langchain_core.documents import Document


# 全局服务实例
router: Optional[AIRouter] = None
api_key_manager: Optional[APIKeyManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global router, api_key_manager, local_router

    # 启动时初始化
    logger.info("Initializing AI Engine services...")

    # 初始化轨道 A 路由器
    strategy = LoadBalancingStrategy(
        os.getenv("LOAD_BALANCING_STRATEGY", "weighted")
    )
    router = AIRouter(
        strategy=strategy,
        enable_fallback=os.getenv("ENABLE_FALLBACK", "true").lower() == "true"
    )

    # 初始化 API 密钥管理器
    api_key_manager = APIKeyManager()

    # 初始化轨道 B 本地模型路由
    local_router = await init_local_model_router()

    logger.info("AI Engine services initialized successfully (Track A + Track B)")

    yield

    # 关闭时清理
    logger.info("Shutting down AI Engine services...")

    # 关闭本地模型路由
    if local_router:
        await close_local_model_router()


app = FastAPI(
    title="net4.xyz AI Engine",
    description="基于 PoUE 共识机制的 AI 任务编排系统 - 轨道 A：云端 API + 轨道 B：本地模型部署",
    version="1.0.0",
    lifespan=lifespan
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 数据模型 ====================

class GenerateRequest(BaseModel):
    """生成请求"""
    prompt: str = Field(..., description="用户提示")
    system_message: Optional[str] = Field(None, description="系统消息")
    model_type: Optional[str] = Field("gpt-4o", description="模型类型")
    provider: Optional[str] = Field(None, description="指定提供商")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="温度参数")
    max_tokens: Optional[int] = Field(4096, ge=1, le=128000, description="最大 token 数")


class ChatMessage(BaseModel):
    """聊天消息"""
    role: str = Field(..., description="角色: system, user, assistant")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    """聊天请求"""
    messages: List[ChatMessage] = Field(..., description="消息列表")
    model_type: Optional[str] = Field("gpt-4o", description="模型类型")
    provider: Optional[str] = Field(None, description="指定提供商")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="温度参数")


class StreamRequest(BaseModel):
    """流式请求"""
    prompt: str = Field(..., description="用户提示")
    system_message: Optional[str] = Field(None, description="系统消息")
    model_type: Optional[str] = Field("gpt-4o", description="模型类型")


class CreateKeyRequest(BaseModel):
    """创建密钥请求"""
    user_id: str = Field(..., description="用户 ID")
    tier: str = Field("free", description="密钥等级: free, basic, premium, enterprise")
    rate_limit: Optional[int] = Field(None, description="速率限制（每分钟）")
    monthly_quota: Optional[int] = Field(None, description="月度配额")
    expires_in_days: Optional[int] = Field(None, description="过期天数")


class APIKeyResponse(BaseModel):
    """API 密钥响应"""
    key: str = Field(..., description="API 密钥（只显示一次）")
    key_id: str = Field(..., description="密钥 ID")
    tier: str = Field(..., description="密钥等级")


# ==================== 依赖项 ====================

async def get_api_key(
    x_api_key: Optional[str] = Header(None, description="API 密钥")
) -> str:
    """获取并验证 API 密钥"""
    # 临时强制跳过 API key 验证（开发模式）
    return "dev_key"
    
    # 以下代码暂时不会被执行
    # 开发模式：强制跳过 API key 验证
    node_env = os.getenv("NODE_ENV", "development").strip('"')
    if node_env.lower() == "development":
        return "dev_key"
    
    allow_no_key = os.getenv("ALLOW_NO_KEY", "false").strip('"')
    if not x_api_key and allow_no_key.lower() == "true":
        return "dev_key"
    
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    # 验证密钥
    api_key_obj = api_key_manager.validate_key(x_api_key)
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Invalid or expired API key")

    # 检查速率限制
    if not api_key_manager.check_rate_limit(api_key_obj.key_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    # 检查配额
    if not api_key_manager.check_quota(api_key_obj.key_id):
        raise HTTPException(status_code=429, detail="Monthly quota exceeded")

    return api_key_obj.key_id


# ==================== 根路由 ====================

@app.get("/")
async def root():
    """根路由"""
    return {
        "service": "net4.xyz AI Engine",
        "version": "1.0.0",
        "tracks": {
            "A": "Cloud API (OpenAI/Anthropic)",
            "B": "Local Models (Ollama/vLLM)"
        },
        "status": "running",
        "track_a_providers": {
            "openai": "GPT-4o",
            "anthropic": "Claude 3.5",
            "deepseek": "DeepSeek V3/R1"
        },
        "track_b_providers": {
            "ollama": "Llama 3 70B/405B, Mixtral 8x22B",
            "vllm": "High-performance inference"
        }
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    try:
        # 简单返回健康状态，避免任何可能的错误
        return {
            "status": "healthy",
            "service": "net4.xyz AI Engine",
            "version": "1.0.0",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


# ==================== AI 生成接口 ====================

@app.post("/api/v1/generate")
async def generate(
    request: GenerateRequest,
    api_key_id: str = Depends(get_api_key)
):
    """生成文本响应"""
    # 确定提供商
    provider = None
    if request.provider:
        try:
            provider = ModelProvider(request.provider)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid provider: {request.provider}")

    # 确定模型
    model_type = request.model_type or "gpt-4o"
    if "claude" in model_type.lower():
        if not provider:
            provider = ModelProvider.ANTHROPIC
    elif "deepseek" in model_type.lower():
        if not provider:
            provider = ModelProvider.DEEPSEEK

    start_time = time.time()

    try:
        result = await router.route(
            prompt=request.prompt,
            system_message=request.system_message,
            provider=provider,
            user_id=api_key_id,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )

        latency_ms = (time.time() - start_time) * 1000

        # 记录使用
        if result.get("success"):
            tokens_used = result.get("usage", {}).get("total_tokens", 0)
            api_key_manager.record_usage(
                key_id=api_key_id,
                provider=result.get("provider", "unknown"),
                model=result.get("model", model_type),
                tokens_used=tokens_used,
                latency_ms=latency_ms,
                success=True
            )

        return result

    except Exception as e:
        logger.error(f"Generate error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/chat")
async def chat(
    request: ChatRequest,
    api_key_id: str = Depends(get_api_key)
):
    """聊天接口"""
    # 确定提供商
    provider = None
    if request.provider:
        try:
            provider = ModelProvider(request.provider)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid provider: {request.provider}")

    # 确定模型
    model_type = request.model_type or "gpt-4o"
    if "claude" in model_type.lower():
        if not provider:
            provider = ModelProvider.ANTHROPIC
    elif "deepseek" in model_type.lower():
        if not provider:
            provider = ModelProvider.DEEPSEEK
    elif "deepseek" in model_type.lower():
        if not provider:
            provider = ModelProvider.DEEPSEEK

    start_time = time.time()

    try:
        messages = [msg.model_dump() for msg in request.messages]
        result = await router.route(
            prompt=messages[-1]["content"],  # 使用最后一条消息
            system_message=messages[0]["content"] if messages[0].get("role") == "system" else None,
            provider=provider,
            user_id=api_key_id,
            temperature=request.temperature
        )

        latency_ms = (time.time() - start_time) * 1000

        # 记录使用
        if result.get("success"):
            tokens_used = result.get("usage", {}).get("total_tokens", 0)
            api_key_manager.record_usage(
                key_id=api_key_id,
                provider=result.get("provider", "unknown"),
                model=result.get("model", model_type),
                tokens_used=tokens_used,
                latency_ms=latency_ms,
                success=True
            )

        return result

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/generate/stream")
async def generate_stream(
    request: StreamRequest,
    api_key_id: str = Depends(get_api_key)
):
    """流式生成文本响应"""
    from fastapi.responses import StreamingResponse
    
    # 确定提供商
    provider = None
    if request.model_type and ("claude" in request.model_type.lower() or "deepseek" in request.model_type.lower()):
        if "claude" in request.model_type.lower():
            provider = ModelProvider.ANTHROPIC
        else:
            provider = ModelProvider.DEEPSEEK

    async def stream_generator():
        try:
            async for chunk in router.route_stream(
                prompt=request.prompt,
                system_message=request.system_message,
                provider=provider,
                user_id=api_key_id
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# ==================== 模型列表 ====================

@app.get("/api/v1/models")
async def list_models(api_key_id: str = Depends(get_api_key)):
    """列出可用模型"""
    return router.get_available_providers() if router else {}


@app.get("/api/v1/providers")
async def list_providers(api_key_id: str = Depends(get_api_key)):
    """列出可用提供商"""
    return {
        "providers": router.get_available_providers() if router else [],
        "stats": router.get_stats() if router else {}
    }


# ==================== API 密钥管理 ====================

@app.post("/api/v1/keys", response_model=APIKeyResponse)
async def create_api_key(
    request: CreateKeyRequest,
    api_key_id: str = Depends(get_api_key)
):
    """创建新的 API 密钥"""
    try:
        tier = KeyTier(request.tier)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {request.tier}")

    key = api_key_manager.create_key(
        user_id=request.user_id,
        tier=tier,
        rate_limit=request.rate_limit,
        monthly_quota=request.monthly_quota,
        expires_in_days=request.expires_in_days
    )

    # 获取刚创建的密钥 ID
    user_keys = api_key_manager.get_user_keys(request.user_id)
    new_key_id = user_keys[-1]["key_id"] if user_keys else "unknown"

    return APIKeyResponse(
        key=key,
        key_id=new_key_id,
        tier=request.tier
    )


@app.get("/api/v1/keys")
async def list_api_keys(
    api_key_id: str = Depends(get_api_key)
):
    """列出当前用户的 API 密钥"""
    # 获取密钥信息
    key_info = api_key_manager.get_key_info(api_key_id)
    if not key_info:
        return {"keys": []}

    return {
        "keys": [key_info]
    }


@app.get("/api/v1/keys/{key_id}")
async def get_key_info(
    key_id: str,
    api_key_id: str = Depends(get_api_key)
):
    """获取密钥详情"""
    if key_id != api_key_id:
        raise HTTPException(status_code=403, detail="Access denied")

    info = api_key_manager.get_key_info(key_id)
    if not info:
        raise HTTPException(status_code=404, detail="Key not found")

    return info


@app.get("/api/v1/keys/{key_id}/usage")
async def get_key_usage(
    key_id: str,
    days: int = 7,
    api_key_id: str = Depends(get_api_key)
):
    """获取密钥使用统计"""
    if key_id != api_key_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return api_key_manager.get_usage_stats(key_id, days)


@app.delete("/api/v1/keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    api_key_id: str = Depends(get_api_key)
):
    """撤销 API 密钥"""
    if key_id != api_key_id:
        raise HTTPException(status_code=403, detail="Access denied")

    success = api_key_manager.revoke_key(key_id)
    if not success:
        raise HTTPException(status_code=404, detail="Key not found")

    return {"status": "revoked", "key_id": key_id}


# ==================== 统计接口 ====================

@app.get("/api/v1/stats")
async def get_stats(api_key_id: str = Depends(get_api_key)):
    """获取路由器统计"""
    return router.get_stats() if router else {}


@app.get("/api/v1/tiers")
async def list_tiers():
    """列出所有密钥等级"""
    return {"tiers": api_key_manager.list_tiers() if api_key_manager else []}


# ==================== 任务接口 ====================

class TaskRequest(BaseModel):
    """AI 任务请求"""
    task_type: str
    prompt: str
    model_type: Optional[str] = "gpt-4o"
    options: Optional[dict] = None


class TaskResponse(BaseModel):
    """AI 任务响应"""
    task_id: str
    result: str
    status: str
    model_used: str


@app.post("/api/v1/tasks", response_model=TaskResponse)
async def create_task(
    request: TaskRequest,
    api_key_id: str = Depends(get_api_key)
):
    """创建 AI 任务（兼容旧接口）"""
    # 确定提供商
    provider = None
    if request.model_type and ("claude" in request.model_type.lower() or "deepseek" in request.model_type.lower()):
        if "claude" in request.model_type.lower():
            provider = ModelProvider.ANTHROPIC
        else:
            provider = ModelProvider.DEEPSEEK

    result = await router.route(
        prompt=request.prompt,
        provider=provider,
        user_id=api_key_id
    )

    return TaskResponse(
        task_id=f"task_{uuid.uuid4().hex[:8]}",
        result=result.get("result", ""),
        status="completed" if result.get("success") else "failed",
        model_used=result.get("model", request.model_type or "gpt-4o")
    )


# ==================== 轨道 B：本地模型接口 ====================

# 导入本地模型服务
from src.services.local_model_router import (
    LocalModelRouter,
    ModelProvider as LocalModelProvider,
    ModelLoadStrategy,
    get_local_model_router,
    init_local_model_router,
    close_local_model_router
)
from src.services.ollama_service import OllamaService, OllamaChatMessage
from src.services.vllm_service import VLLMService, SamplingParams

# 全局本地模型路由实例
local_router: Optional[LocalModelRouter] = None


# 本地模型请求/响应模型
class LocalGenerateRequest(BaseModel):
    """本地模型生成请求"""
    prompt: str = Field(..., description="用户提示")
    system_message: Optional[str] = Field(None, description="系统消息")
    model: Optional[str] = Field("llama3:70b", description="模型名称")
    provider: Optional[str] = Field(None, description="提供商: ollama, vllm, auto")
    strategy: Optional[str] = Field("auto", description="加载策略: auto, prefer_ollama, prefer_vllm")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="温度参数")
    max_tokens: Optional[int] = Field(4096, ge=1, le=128000, description="最大 token 数")


class LocalChatMessage(BaseModel):
    """本地模型聊天消息"""
    role: str = Field(..., description="角色: system, user, assistant")
    content: str = Field(..., description="消息内容")


class LocalChatRequest(BaseModel):
    """本地模型聊天请求"""
    messages: List[LocalChatMessage] = Field(..., description="消息列表")
    model: Optional[str] = Field("llama3:70b", description="模型名称")
    provider: Optional[str] = Field(None, description="提供商")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="温度参数")
    max_tokens: Optional[int] = Field(4096, ge=1, le=128000, description="最大 token 数")


class LocalModelInfo(BaseModel):
    """本地模型信息"""
    name: str
    provider: str
    family: Optional[str] = None
    size: Optional[str] = None
    description: Optional[str] = None
    hardware: Optional[str] = None
    context_length: Optional[int] = None


class PullModelRequest(BaseModel):
    """拉取模型请求"""
    model: str = Field(..., description="模型名称")
    stream: Optional[bool] = Field(True, description="是否流式输出")


# 初始化本地模型路由
async def init_local_services():
    """初始化本地模型服务"""
    global local_router
    local_router = await init_local_model_router()


# 本地模型生成接口
@app.post("/api/v1/local/generate")
async def local_generate(
    request: LocalGenerateRequest,
    api_key_id: str = Depends(get_api_key)
):
    """本地模型生成文本响应（轨道 B）"""
    if not local_router:
        await init_local_services()

    # 解析提供商
    provider = None
    if request.provider:
        try:
            provider = LocalModelProvider(request.provider)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid provider: {request.provider}")

    # 解析策略
    strategy = ModelLoadStrategy(request.strategy or "auto")

    result = await local_router.generate(
        prompt=request.prompt,
        model=request.model,
        system_message=request.system_message,
        provider=provider,
        strategy=strategy,
        temperature=request.temperature or 0.7,
        max_tokens=request.max_tokens or 4096
    )

    return {
        "success": result.success,
        "result": result.result,
        "model": result.model,
        "provider": result.provider,
        "latency_ms": result.latency_ms,
        "usage": result.usage
    }


@app.post("/api/v1/local/generate/stream")
async def local_generate_stream(
    request: LocalGenerateRequest,
    api_key_id: str = Depends(get_api_key)
):
    """本地模型流式生成文本响应（轨道 B）"""
    from fastapi.responses import StreamingResponse

    if not local_router:
        await init_local_services()

    provider = None
    if request.provider:
        try:
            provider = LocalModelProvider(request.provider)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid provider: {request.provider}")

    async def stream_generator():
        try:
            async for chunk in local_router.generate_stream(
                prompt=request.prompt,
                model=request.model,
                system_message=request.system_message,
                provider=provider,
                temperature=request.temperature or 0.7,
                max_tokens=request.max_tokens or 4096
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.post("/api/v1/local/chat")
async def local_chat(
    request: LocalChatRequest,
    api_key_id: str = Depends(get_api_key)
):
    """本地模型聊天接口（轨道 B）"""
    if not local_router:
        await init_local_services()

    provider = None
    if request.provider:
        try:
            provider = LocalModelProvider(request.provider)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid provider: {request.provider}")

    messages = [msg.model_dump() for msg in request.messages]

    result = await local_router.chat(
        messages=messages,
        model=request.model,
        provider=provider,
        temperature=request.temperature or 0.7,
        max_tokens=request.max_tokens or 4096
    )

    return {
        "success": result.success,
        "result": result.result,
        "model": result.model,
        "provider": result.provider,
        "latency_ms": result.latency_ms
    }


@app.get("/api/v1/local/models")
async def list_local_models(api_key_id: str = Depends(get_api_key)):
    """列出本地可用模型"""
    if not local_router:
        await init_local_services()

    return await local_router.get_available_models()


@app.get("/api/v1/local/models/installed")
async def list_installed_models(api_key_id: str = Depends(get_api_key)):
    """列出已安装的本地模型"""
    if not local_router:
        await init_local_services()

    return await local_router.list_models()


@app.get("/api/v1/local/models/requirements/{model_name}")
async def get_model_requirements(
    model_name: str,
    api_key_id: str = Depends(get_api_key)
):
    """获取模型硬件要求"""
    if not local_router:
        await init_local_services()

    ollama = get_local_model_router().ollama
    vllm = get_local_model_router().vllm

    result = {}

    if ollama:
        reqs = ollama.get_model_requirements(model_name)
        if reqs:
            result["ollama"] = reqs

    if vllm:
        config = vllm.get_model_config(model_name)
        if config:
            result["vllm"] = config

    if not result:
        raise HTTPException(status_code=404, detail="Model not found")

    return result


@app.post("/api/v1/local/models/pull")
async def pull_model(
    request: PullModelRequest,
    api_key_id: str = Depends(get_api_key)
):
    """拉取/下载模型"""
    from fastapi.responses import StreamingResponse

    ollama_service = OllamaService()

    async def pull_generator():
        async for status in ollama_service.pull_model(request.model, request.stream):
            yield f"data: {status}\n\n"
        yield "data: [DONE]\n\n"

    await ollama_service.close()

    return StreamingResponse(
        pull_generator(),
        media_type="text/event-stream"
    )


@app.delete("/api/v1/local/models/{model_name}")
async def delete_model(
    model_name: str,
    api_key_id: str = Depends(get_api_key)
):
    """删除模型"""
    ollama_service = OllamaService()
    result = await ollama_service.delete_model(model_name)
    await ollama_service.close()

    if result:
        return {"status": "deleted", "model": model_name}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete model")


@app.get("/api/v1/local/health")
async def local_health_check():
    """本地模型服务健康检查"""
    if not local_router:
        await init_local_services()

    health = await local_router.check_health()

    return {
        "status": "healthy" if any(health.values()) else "degraded",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "providers": health
    }


# ==================== 主程序入口 ====================

# ==================== 钱包服务接口 ====================

from src.services.wallet_service import (
    get_wallet_service,
    WalletStatus,
    Balance,
    TransactionResult,
    TradeResult,
    QueryResult,
    Chain,
    Asset
)

# 钱包请求模型
class WalletSendRequest(BaseModel):
    """发送代币请求"""
    amount: str = Field(..., description="金额（$1.00, 1.0, 或原子单位）")
    recipient: str = Field(..., description="接收地址（0x 地址、ENS 名称或 Solana 地址）")
    asset: Optional[str] = Field("usdc", description="资产类型：usdc, eth, pol, sol")
    chain: Optional[str] = Field("base", description="区块链：base, polygon, solana")


class WalletTradeRequest(BaseModel):
    """交易代币请求"""
    amount: str = Field(..., description="金额")
    from_asset: str = Field(..., description="源资产")
    to_asset: str = Field(..., description="目标资产")
    chain: Optional[str] = Field("base", description="区块链")
    slippage: Optional[int] = Field(None, description="滑点（基点，100 = 1%）")


class WalletQueryRequest(BaseModel):
    """链上查询请求"""
    sql: str = Field(..., description="SQL 查询语句")
    timeout: Optional[int] = Field(30, description="超时时间（秒）")


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
        raise HTTPException(status_code=500, detail="Failed to get balance")


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
        asset=request.asset or "usdc",
        chain=request.chain or "base"
    )
    
    if result.success:
        return result.model_dump()
    else:
        raise HTTPException(status_code=400, detail=result.error)


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
        chain=request.chain or "base",
        slippage=request.slippage
    )
    
    if result.success:
        return result.model_dump()
    else:
        raise HTTPException(status_code=400, detail=result.error)


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
    
    if result.success:
        return result.model_dump()
    else:
        raise HTTPException(status_code=400, detail=result.error)


@app.post("/api/v1/wallet/auth")
async def wallet_auth(
    request: WalletAuthRequest,
    api_key_id: str = Depends(get_api_key)
):
    """认证钱包"""
    wallet_service = get_wallet_service()
    result = await wallet_service.authenticate(email=request.email)
    
    if result["success"]:
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Authentication failed"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )
# ==================== LangChain 任务编排与 RAG ====================

# 导入新服务
from src.services.rag_service import (
    RAGService,
    RAGConfig,
    VectorStoreType,
    EmbeddingModel,
    DocumentProcessor,
)
from src.services.task_orchestration import (
    TaskOrchestrator,
    TaskConfig,
    TaskResult,
    TaskType,
    TaskStatus,
    Priority,
)
from src.services.emotional_computing import (
    EmotionalComputingService,
    EmotionalMemory,
    EmotionType,
    EmotionalTone,
)
from src.services.knowledge_base import (
    KnowledgeBaseQAService,
    KnowledgeCategory,
    Web4KnowledgeSeeder,
)

# 全局服务实例
rag_service: Optional[RAGService] = None
task_orchestrator: Optional[TaskOrchestrator] = None
emotional_service: Optional[EmotionalComputingService] = None
knowledge_qa_service: Optional[KnowledgeBaseQAService] = None


# RAG 请求/响应模型
class RAGQueryRequest(BaseModel):
    """RAG 查询请求"""
    query: str = Field(..., description="查询文本")
    top_k: Optional[int] = Field(4, description="返回结果数量")
    use_history: Optional[bool] = Field(False, description="是否使用对话历史")
    return_sources: Optional[bool] = Field(True, description="是否返回来源")


class RAGQueryResponse(BaseModel):
    """RAG 查询响应"""
    answer: str
    sources: List[str]
    metadata: Dict[str, Any]


class KnowledgeBaseEntryRequest(BaseModel):
    """知识库条目请求"""
    title: str = Field(..., description="标题")
    content: str = Field(..., description="内容")
    category: str = Field(..., description="分类")
    tags: Optional[List[str]] = Field(default_factory=list, description="标签")


class TaskExecuteRequest(BaseModel):
    """任务执行请求"""
    task_type: str = Field(..., description="任务类型")
    input_data: Dict[str, Any] = Field(..., description="输入数据")
    priority: Optional[str] = Field("normal", description="优先级")
    max_retries: Optional[int] = Field(3, description="最大重试次数")


class EmotionalAnalysisRequest(BaseModel):
    """情感分析请求"""
    text: str = Field(..., description="待分析文本")
    return_scores: Optional[bool] = Field(True, description="是否返回详细分数")


class EmotionalResponseRequest(BaseModel):
    """情感响应请求"""
    user_message: str = Field(..., description="用户消息")
    user_emotion: str = Field(..., description="用户情感")
    tone: Optional[str] = Field("empathetic", description="响应色调")


class EmotionalConsensusRequest(BaseModel):
    """情感共识请求"""
    inputs: List[str] = Field(..., description="输入列表")
    threshold: Optional[float] = Field(0.7, description="共识阈值")


class KnowledgeQueryRequest(BaseModel):
    """知识库问答请求"""
    question: str = Field(..., description="问题")
    use_history: Optional[bool] = Field(False, description="是否使用对话历史")
    return_sources: Optional[bool] = Field(True, description="是否返回来源")
    return_related: Optional[bool] = Field(True, description="是否返回相关问题")


# 初始化任务编排和 RAG 服务
def init_orchestration_services():
    """初始化任务编排和 RAG 服务"""
    global rag_service, task_orchestrator, emotional_service, knowledge_qa_service
    
    # 初始化 LLM（直接创建 DeepSeek ChatOpenAI 客户端）
    try:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.getenv("DEEPSEEK_API_KEY", ""),
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=float(os.getenv("DEEPSEEK_TEMPERATURE", "0.7")),
            max_tokens=int(os.getenv("DEEPSEEK_MAX_TOKENS", "4096")),
        )
        logger.info("Initialized LLM with DeepSeek for orchestration services")
    except Exception as e:
        logger.warning(f"Failed to initialize DeepSeek LLM: {e}, using None")
        llm = None
    
    # 初始化 RAG 服务
    try:
        rag_config = RAGConfig(
            vector_store_type=VectorStoreType.CHROMA,
            embedding_model=EmbeddingModel.OPENAI_TEXT_EMBEDDING_3_SMALL,
            chunk_size=1000,
            chunk_overlap=200,
            collection_name="web4_knowledge_base",
            persist_directory=os.getenv("RAG_PERSIST_DIR", "./data/vector_store"),
            top_k=4
        )
        rag_service = RAGService(config=rag_config, llm_service=llm)
        logger.info("RAG service initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize RAG service: {e}")
        rag_service = None
    
    # 初始化任务编排器
    try:
        task_config = TaskConfig(
            task_type=TaskType.TEXT_GENERATION,
            max_retries=3,
            timeout=300,
            priority=Priority.NORMAL
        )
        task_orchestrator = TaskOrchestrator(llm=llm, config=task_config)
        logger.info("Task orchestrator initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize task orchestrator: {e}")
        task_orchestrator = None
    
    # 初始化情感计算服务
    try:
        emotional_service = EmotionalComputingService(llm=llm)
        logger.info("Emotional computing service initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize emotional service: {e}")
        emotional_service = None
    
    # 初始化知识库问答服务
    try:
        knowledge_qa_service = KnowledgeBaseQAService(
            llm=llm,
            rag_service=rag_service,
            config={
                "vector_store_type": "chroma",
                "embedding_model": "openai-text-embedding-3-small",
                "persist_directory": os.getenv("RAG_PERSIST_DIR", "./data/vector_store")
            }
        )
        
        # 初始化 Web4 知识库
        seed_data = Web4KnowledgeSeeder.get_seed_data()
        knowledge_qa_service.initialize_from_documents(
            [Document(page_content=e.content, metadata={"title": e.title, "category": e.category.value}) for e in seed_data]
        )
        logger.info("Knowledge QA service initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize knowledge QA service: {e}")
        knowledge_qa_service = None
    
    logger.info("Orchestration services initialized successfully")


# LangChain 任务编排接口
@app.post("/api/v1/orchestration/tasks")
async def create_task(
    request: TaskExecuteRequest,
    api_key_id: str = Depends(get_api_key)
):
    """创建并执行任务"""
    if not task_orchestrator:
        init_orchestration_services()
    
    if not task_orchestrator:
        raise HTTPException(status_code=503, detail="Task orchestrator not available. Check server logs for initialization errors.")
    
    # 解析任务类型
    try:
        task_type = TaskType(request.task_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid task type: {request.task_type}")
    
    # 解析优先级
    priority = Priority(request.priority or "normal")
    
    # 创建任务配置
    config = TaskConfig(
        task_type=task_type,
        max_retries=request.max_retries or 3,
        priority=priority
    )
    
    # 创建任务
    task_id = task_orchestrator.create_task(
        task_type=task_type,
        input_data=request.input_data,
        config=config
    )
    
    # 执行任务
    try:
        result = await task_orchestrator.execute_task(
            task_id,
            rag_service=rag_service
        )
    except Exception as e:
        logger.error(f"Task execution error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Task execution failed: {str(e)}")
    
    return {
        "task_id": result.task_id,
        "status": result.status.value,
        "result": result.result,
        "error": result.error,
        "execution_time": result.execution_time,
        "metadata": result.metadata
    }


@app.get("/api/v1/orchestration/tasks/{task_id}")
async def get_task_status(
    task_id: str,
    api_key_id: str = Depends(get_api_key)
):
    """获取任务状态"""
    if not task_orchestrator:
        init_orchestration_services()
    
    result = task_orchestrator.get_task_status(task_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "task_id": result.task_id,
        "status": result.status.value,
        "result": result.result,
        "error": result.error,
        "execution_time": result.execution_time,
        "metadata": result.metadata
    }


@app.get("/api/v1/orchestration/task-types")
async def list_task_types():
    """列出所有任务类型"""
    return {
        "task_types": [t.value for t in TaskType]
    }


# RAG 接口
@app.post("/api/v1/rag/query", response_model=RAGQueryResponse)
async def rag_query(
    request: RAGQueryRequest,
    api_key_id: str = Depends(get_api_key)
):
    """RAG 查询"""
    if not rag_service:
        init_orchestration_services()
    
    result = await rag_service.query(
        question=request.query,
        use_history=request.use_history,
        return_sources=request.return_sources
    )
    
    return RAGQueryResponse(
        answer=result.get("answer", ""),
        sources=[doc.page_content for doc in result.get("source_documents", [])],
        metadata=result
    )


@app.post("/api/v1/rag/documents")
async def add_documents(
    documents: List[Dict[str, Any]],
    api_key_id: str = Depends(get_api_key)
):
    """添加文档到知识库"""
    if not rag_service:
        init_orchestration_services()
    
    from langchain_core.documents import Document
    
    docs = [
        Document(
            page_content=doc.get("content", ""),
            metadata=doc.get("metadata", {})
        )
        for doc in documents
    ]
    
    rag_service.add_documents(docs)
    
    return {
        "status": "success",
        "added_count": len(docs)
    }


@app.get("/api/v1/rag/search")
async def rag_search(
    query: str,
    k: int = 4,
    api_key_id: str = Depends(get_api_key)
):
    """RAG 搜索"""
    if not rag_service:
        init_orchestration_services()
    
    docs = rag_service.get_relevant_documents(query, k=k)
    
    return {
        "results": [
            {
                "content": doc.page_content,
                "metadata": doc.metadata
            }
            for doc in docs
        ]
    }


# 情感计算接口
@app.post("/api/v1/emotions/analyze")
async def analyze_emotion(
    request: EmotionalAnalysisRequest,
    api_key_id: str = Depends(get_api_key)
):
    """情感分析"""
    if not emotional_service:
        init_orchestration_services()
    
    result = await emotional_service.analyze_emotion(
        text=request.text,
        return_scores=request.return_scores
    )
    
    return {
        "primary_emotion": result.primary_emotion,
        "emotion_scores": [
            {"emotion": es.emotion, "score": es.score}
            for es in result.emotion_scores
        ],
        "sentiment": result.sentiment.value,
        "intensity": result.intensity,
        "tone_description": result.tone_description,
        "emotional_keywords": result.emotional_keywords,
        "confidence": result.confidence
    }


@app.post("/api/v1/emotions/response")
async def generate_emotional_response(
    request: EmotionalResponseRequest,
    api_key_id: str = Depends(get_api_key)
):
    """生成情感响应"""
    if not emotional_service:
        init_orchestration_services()
    
    result = await emotional_service.generate_emotional_response(
        user_message=request.user_message,
        user_emotion=request.user_emotion,
        tone=request.tone or "empathetic"
    )
    
    return {
        "response_text": result.response_text,
        "matched_emotion": result.matched_emotion,
        "emotional_intensity": result.emotional_intensity,
        "empathy_level": result.empathy_level,
        "metadata": result.metadata
    }


@app.post("/api/v1/emotions/consensus")
async def emotional_consensus(
    request: EmotionalConsensusRequest,
    api_key_id: str = Depends(get_api_key)
):
    """情感共识验证 - PoUE 核心功能"""
    if not emotional_service:
        init_orchestration_services()
    
    result = await emotional_service.emotional_consensus(
        inputs=request.inputs,
        threshold=request.threshold or 0.7
    )
    
    return result


@app.get("/api/v1/emotions/types")
async def list_emotion_types():
    """列出所有情感类型"""
    return {
        "emotion_types": [e.value for e in EmotionType]
    }


# 知识库问答接口
@app.post("/api/v1/knowledge/query")
async def knowledge_query(
    request: KnowledgeQueryRequest,
    api_key_id: str = Depends(get_api_key)
):
    """知识库问答"""
    if not knowledge_qa_service:
        init_orchestration_services()
    
    result = await knowledge_qa_service.query(
        question=request.question,
        use_history=request.use_history,
        return_sources=request.return_sources,
        return_related=request.return_related
    )
    
    return {
        "question": result.question,
        "answer": result.answer,
        "confidence": result.confidence.value,
        "sources": result.sources,
        "category": result.category.value if result.category else None,
        "related_questions": result.related_questions,
        "metadata": result.metadata
    }


@app.post("/api/v1/knowledge/entries")
async def add_knowledge_entry(
    request: KnowledgeBaseEntryRequest,
    api_key_id: str = Depends(get_api_key)
):
    """添加知识库条目"""
    if not knowledge_qa_service:
        init_orchestration_services()
    
    # 解析分类
    try:
        category = KnowledgeCategory(request.category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {request.category}")
    
    entry_id = knowledge_qa_service.add_knowledge(
        title=request.title,
        content=request.content,
        category=category,
        tags=request.tags
    )
    
    return {
        "status": "success",
        "entry_id": entry_id
    }


@app.get("/api/v1/knowledge/search")
async def search_knowledge(
    query: str,
    limit: int = 10,
    api_key_id: str = Depends(get_api_key)
):
    """搜索知识库"""
    if not knowledge_qa_service:
        init_orchestration_services()
    
    results = knowledge_qa_service.search_knowledge(query, limit)
    
    return {
        "results": [
            {
                "id": entry.id,
                "title": entry.title,
                "content": entry.content[:200] + "...",
                "category": entry.category.value,
                "tags": entry.tags
            }
            for entry in results
        ]
    }


@app.get("/api/v1/knowledge/categories")
async def list_knowledge_categories():
    """列出知识库分类"""
    if not knowledge_qa_service:
        init_orchestration_services()
    
    return {
        "categories": [c.value for c in KnowledgeCategory],
        "stats": knowledge_qa_service.get_category_stats()
    }


@app.post("/api/v1/knowledge/seed")
async def seed_knowledge_base(
    api_key_id: str = Depends(get_api_key)
):
    """播种 Web4 知识库"""
    if not knowledge_qa_service:
        init_orchestration_services()
    
    seed_data = Web4KnowledgeSeeder.get_seed_data()
    
    # 添加到知识库
    for entry in seed_data:
        knowledge_qa_service.add_knowledge(
            title=entry.title,
            content=entry.content,
            category=entry.category,
            tags=entry.tags
        )
    
    return {
        "status": "success",
        "seeded_count": len(seed_data)
    }


# 健康检查增���
@app.get("/api/v1/orchestration/health")
async def orchestration_health_check():
    """任务编排服务健康检查"""
    return {
        "status": "healthy",
        "services": {
            "rag_service": rag_service is not None,
            "task_orchestrator": task_orchestrator is not None,
            "emotional_service": emotional_service is not None,
            "knowledge_qa_service": knowledge_qa_service is not None
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }