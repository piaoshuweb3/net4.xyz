#!/usr/bin/env python3
"""
测试文本生成端点修复是否成功
"""
import requests
import time

BASE_URL = "http://localhost:8001"
API_KEY = "nk4_yIMJYzswRe2ND2Pc9RJn9NERmzP6xwF8kKbd-YDRXk"

def test_root():
    print("=" * 60)
    print("测试 1: 根路径 /")
    print("=" * 60)
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return True
    except Exception as e:
        print(f"错误: {e}")
        return False

def test_health():
    print("\n" + "=" * 60)
    print("测试 2: 健康检查 /health")
    print("=" * 60)
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return True
    except Exception as e:
        print(f"错误: {e}")
        return False

def test_generate():
    print("\n" + "=" * 60)
    print("测试 3: 文本生成 /api/v1/generate (关键测试)")
    print("=" * 60)
    print("⏳ 正在测试文本生成...（最多等待60秒）")

    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "prompt": "请用一句话介绍深圳",
        "max_tokens": 100,
        "temperature": 0.7
    }

    start_time = time.time()
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/generate",
            json=payload,
            headers=headers,
            timeout=60  # 60秒超时
        )
        elapsed = time.time() - start_time

        print(f"\n✅ 响应时间: {elapsed:.2f}秒")
        print(f"状态码: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"成功: {data.get('success')}")
            print(f"文本: {data.get('text', '')[:200]}...")
            print(f"模型: {data.get('model')}")
            print(f"耗时: {data.get('latency', 0):.2f}秒")
            return True
        else:
            print(f"错误响应: {response.text}")
            return False

    except requests.exceptions.Timeout:
        elapsed = time.time() - start_time
        print(f"\n❌ 超时！已等待 {elapsed:.2f} 秒")
        print("修复未成功，文本生成仍然超时")
        return False
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"\n❌ 错误: {e}")
        return False

if __name__ == "__main__":
    print("\n" + "🚀 开始测试 AI Engine API")
    print("=" * 60)

    # 测试1: 根路径
    r1 = test_root()

    # 测试2: 健康检查
    r2 = test_health()

    # 测试3: 文本生成（关键）
    r3 = test_generate()

    # 总结
    print("\n" + "=" * 60)
    print("📊 测试结果总结")
    print("=" * 60)
    print(f"根路径: {'✅ 通过' if r1 else '❌ 失败'}")
    print(f"健康检查: {'✅ 通过' if r2 else '❌ 失败'}")
    print(f"文本生成: {'✅ 通过' if r3 else '❌ 失败'}")

    if r3:
        print("\n🎉 修复成功！文本生成端点不再超时")
    else:
        print("\n⚠️  修复未成功，需要进一步排查")
