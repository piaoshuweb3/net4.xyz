#!/usr/bin/env python3
"""
测试 AI 引擎的文本生成端点（简化版）
"""
import requests

# 服务地址
host = "localhost"
port = 8001
base_url = "http://" + host + ":" + str(port)

print("测试 AI 引擎 API 端点...")
print("服务地址: <ADDRESS_REDACTED>

# 测试 1: 根路径
print("\n1. 测试根路径 /")
try:
    url = base_url + "/"
    response = requests.get(url, timeout=5)
    print("   状态码:", response.status_code)
    if response.status_code == 200:
        print("   ✅ 成功")
    else:
        print("   ❌ 失败")
except Exception as e:
    print("   ❌ 错误:", str(e))

# 测试 2: 健康检查
print("\n2. 测试健康检查 /health")
try:
    url = base_url + "/health"
    response = requests.get(url, timeout=5)
    print("   状态码:", response.status_code)
    if response.status_code == 200:
        print("   ✅ 成功")
    else:
        print("   ❌ 失败")
except Exception as e:
    print("   ❌ 错误:", str(e))

# 测试 3: 文本生成（关键测试）
print("\n3. 测试文本生成 /api/v1/generate")
print("   （这个之前会超时，现在应该能正常工作）")
try:
    url = base_url + "/api/v1/generate"
    headers = {
        "Content-Type": "application/json",
        "X-<SECRET_REDACTED>"
    }
    data = {
        "prompt": "请用一句话介绍什么是 Web4.0",
        "max_tokens": 100
    }
    print("   发送请求...")
    response = requests.post(url, json=data, headers=headers, timeout=30)
    print("   状态码:", response.status_code)
    if response.status_code == 200:
        print("   ✅ 成功！")
        result = response.json()
        print("   成功:", result.get("success"))
        print("   模型:", result.get("model"))
        print("   提供商:", result.get("provider"))
        print("   结果:", result.get("result", "")[:100])
    else:
        print("   ❌ 失败")
        print("   响应:", response.text[:200])
except requests.exceptions.Timeout:
    print("   ❌ 超时（30秒）")
except Exception as e:
    print("   ❌ 错误:", str(e))

print("\n" + "="*50)
print("测试完成！")
