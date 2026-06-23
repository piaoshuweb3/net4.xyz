"""
测试 DeepSeek 集成
验证 DeepSeek 服务是否能正常导入和初始化
"""
import sys
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 60)
print("DeepSeek 集成测试")
print("=" * 60)

# 测试 1: 导入模块
print("\n[测试 1] 导入模块...")
try:
    from src.services import DeepSeekService, ModelProvider, AIRouter
    print("✓ 成功导入 DeepSeekService, ModelProvider, AIRouter")
    print(f"  - ModelProvider 枚举值: {[p.value for p in ModelProvider]}")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

# 测试 2: 检查环境变量
print("\n[测试 2] 检查 DeepSeek 环境变量...")
deepseek_key = os.getenv("DEEPSEEK_API_KEY")
deepseek_base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
deepseek_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

if deepseek_key:
    print(f"✓ DEEPSEEK_API_KEY: {deepseek_key[:10]}...{deepseek_key[-4:]}")
else:
    print("✗ DEEPSEEK_API_KEY 未设置")

print(f"✓ DEEPSEEK_BASE_URL: {deepseek_base_url}")
print(f"✓ DEEPSEEK_MODEL: {deepseek_model}")

# 测试 3: 初始化 DeepSeek 服务
print("\n[测试 3] 初始化 DeepSeek 服务...")
try:
    from src.services.base import AIServiceConfig
    
    config = AIServiceConfig(
        model_name=deepseek_model,
        temperature=0.7,
        max_tokens=4096
    )
    
    service = DeepSeekService(config)
    print("✓ DeepSeekService 初始化成功")
    print(f"  - 模型: {service.model_name}")
except Exception as e:
    print(f"✗ DeepSeekService 初始化失败: {e}")
    import traceback
    traceback.print_exc()

# 测试 4: 初始化路由器
print("\n[测试 4] 初始化 AI 路由器...")
try:
    from src.services.router import LoadBalancingStrategy
    
    router = AIRouter(
        strategy=LoadBalancingStrategy.WEIGHTED,
        enable_fallback=True
    )
    print("✓ AI 路由器初始化成功")
    print(f"  - 可用提供商: {[p.value for p in router._services.keys()]}")
    print(f"  - 权重: {router._weights}")
except Exception as e:
    print(f"✗ 路由器初始化失败: {e}")
    import traceback
    traceback.print_exc()

# 测试 5: 获取可用模型
print("\n[测试 5] 获取 DeepSeek 可用模型...")
try:
    models = service.get_available_models()
    print(f"✓ DeepSeek 可用模型:")
    for model in models:
        print(f"  - {model['id']}: {model['name']} ({model['status']})")
except Exception as e:
    print(f"✗ 获取模型列表失败: {e}")

print("\n" + "=" * 60)
print("测试完成！")
print("=" * 60)

# 如果 API key 有效，尝试一个真实的 API 调用
if deepseek_key and deepseek_key != "your-deepseek-api-key-here":
    print("\n[可选] 测试真实 API 调用...")
    try:
        import asyncio
        
        async def test_api_call():
            result = await service.generate("Hello, who are you?", system_message="Reply in one sentence.")
            if result.get("success"):
                print(f"✓ API 调用成功!")
                print(f"  - 响应: {result['result'][:100]}...")
                print(f"  - 模型: {result['model']}")
                print(f"  - 提供商: {result['provider']}")
            else:
                print(f"✗ API 调用失败: {result.get('error')}")
        
        asyncio.run(test_api_call())
    except Exception as e:
        print(f"✗ API 调用出错: {e}")
        import traceback
        traceback.print_exc()
else:
    print("\n提示: 设置有效的 DEEPSEEK_API_KEY 后可以测试真实 API 调用")
