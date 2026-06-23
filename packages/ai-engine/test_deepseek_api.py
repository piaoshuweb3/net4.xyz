"""
测试 DeepSeek API 密钥
"""
import os
from dotenv import load_dotenv

load_dotenv()

# 获取 API 密钥
api_key = os.getenv("DEEPSEEK_API_KEY")
base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

print(f"API Key: {api_key[:10]}..." if api_key else "NOT SET")
print(f"Base URL: {base_url}")
print(f"Model: {model}")
print()

if not api_key or api_key == "sk-your-deepseek-api-key-here":
    print("❌ DEEPEEK_API_KEY not configured!")
    exit(1)

# 测试 API 调用
from langchain_openai import ChatOpenAI

try:
    client = ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=0.7,
        max_tokens=100
    )
    
    print("🔄 Testing API call...")
    from langchain_core.messages import HumanMessage
    response = client.invoke([HumanMessage(content="Hello, respond in one sentence")])
    
    print(f"✅ API call successful!")
    print(f"Response: {response.content}")
    
except Exception as e:
    print(f"❌ API call failed: {str(e)}")
    import traceback
    traceback.print_exc()
