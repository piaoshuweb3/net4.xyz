"""
简化版 DeepSeek 集成测试
只测试核心功能，避免其他模块的导入问题
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

print("=" * 60)
print("DeepSeek 简化版测试")
print("=" * 60)

# 直接导入，不通过 __init__.py
print("\n[测试 1] 直接导入 DeepSeek 模块...")
try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    # 直接导入，避免触发其他服务的导入
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage
    from pydantic import BaseModel
    
    print("✓ 基础模块导入成功")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

# 测试 2: 检查环境变量
print("\n[测试 2] 检查 DeepSeek 环境变量...")
deepseek_key = os.getenv("DEEPSEEK_API_KEY")
deepseek_base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
deepseek_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

if deepseek_key and deepseek_key != "your-deepseek-api-key-here":
    print(f"✓ DEEPSEEK_API_KEY: {deepseek_key[:10]}...{deepseek_key[-4:]}")
    print(f"✓ DEEPSEEK_BASE_URL: {deepseek_base_url}")
    print(f"✓ DEEPSEEK_MODEL: {deepseek_model}")
    
    # 测试 3: 初始化客户端
    print("\n[测试 3] 初始化 DeepSeek 客户端...")
    try:
        client = ChatOpenAI(
            model=deepseek_model,
            api_key=deepseek_key,
            base_url=deepseek_base_url,
            temperature=0.7,
            max_tokens=100
        )
        print("✓ DeepSeek 客户端初始化成功")
        
        # 测试 4: 真实 API 调用
        print("\n[测试 4] 测试真实 API 调用...")
        try:
            import asyncio
            
            async def test_call():
                messages = [HumanMessage(content="Hello, reply in one sentence: who are you?")]
                response = await client.ainvoke(messages)
                return response.content
            
            result = asyncio.run(test_call())
            print(f"✓ API 调用成功!")
            print(f"  响应: {result[:200]}...")
            
        except Exception as e:
            print(f"✗ API 调用失败: {e}")
            import traceback
            traceback.print_exc()
            
    except Exception as e:
        print(f"✗ 客户端初始化失败: {e}")
        import traceback
        traceback.print_exc()
else:
    print("⚠ DEEPSEEK_API_KEY 未设置或使用了占位符")
    print("  请设置有效的 API 密钥以测试真实调用")

print("\n" + "=" * 60)
print("测试完成！")
print("=" * 60)

# 如有 API key，提供后续步骤建议
if deepseek_key and deepseek_key != "your-deepseek-api-key-here":
    print("\n后续步骤:")
    print("1. 修复其他服务文件的导入问题（langchain.schema -> langchain_core.*）")
    print("2. 运行完整测试: python test_deepseek.py")
    print("3. 启动 AI 引擎: python src/main.py")
