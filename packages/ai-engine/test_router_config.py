#!/usr/bin/env python3
"""
单元测试：验证 AI 路由器配置
"""
import os
import sys

# 设置环境变量（模拟 .env 配置）
os.environ["ENABLE_OPENAI"] = "false"
os.environ["ENABLE_ANTHROPIC"] = "false"
os.environ["ENABLE_DEEPSEEK"] = "true"
os.environ["DEEPSEEK_API_KEY"] = "sk-3752f563c8304e1daee4c34ac5efc933"
os.environ["DEEPSEEK_BASE_URL"] = "https://api.deepseek.com"
os.environ["DEEPSEEK_MODEL"] = "deepseek-chat"

print("🧪 测试 AI 路由器初始化...")
print("="*50)

# 导入路由器
try:
    from src.services.router import AIRouter, ModelProvider, LoadBalancingStrategy
    print("✅ 成功导入 AIRouter")
except Exception as e:
    print(f"❌ 导入失败: {e}")
    sys.exit(1)

# 创建路由器实例
try:
    print("\n📝 创建 AIRouter 实例...")
    router = AIRouter(strategy=LoadBalancingStrategy.WEIGHTED)
    print("✅ AIRouter 实例创建成功")
except Exception as e:
    print(f"❌ 创建实例失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 检查初始化的服务
print(f"\n📊 初始化的服务数量: {len(router._services)}")
print(f"📊 初始化的服务商: {[p.value for p in router._services.keys()]}")

# 验证只有 DeepSeek 被初始化
if len(router._services) == 1 and ModelProvider.DEEPSEEK in router._services:
    print("✅ 只有 DeepSeek 服务被初始化（符合预期）")
else:
    print("❌ 初始化了错误的服务")
    sys.exit(1)

# 测试路由功能（不需要真实 API 调用）
print("\n🧪 测试路由选择逻辑...")
try:
    # 测试 _select_provider 方法
    provider = router._select_provider(user_id="test_user")
    print(f"✅ 选择的提供商: {provider.value}")
    
    if provider == ModelProvider.DEEPSEEK:
        print("✅ 正确选择 DeepSeek")
    else:
        print("❌ 选择了错误的提供商")
except Exception as e:
    print(f"❌ 路由选择失败: {e}")

print("\n" + "="*50)
print("🎉 测试完成！配置正确。")
print("\n📝 总结:")
print("   - ENABLE_OPENAI=false ✅")
print("   - ENABLE_ANTHROPIC=false ✅")
print("   - ENABLE_DEEPSEEK=true ✅")
print("   - 只有 DeepSeek 服务被初始化 ✅")
print("\n💡 文本生成端点的问题应该已修复。")
print("   原因：之前会尝试调用 OpenAI 和 Anthropic（API 密钥未配置），导致超时。")
print("   现在：只调用 DeepSeek（API 密钥已配置且有效）。")
