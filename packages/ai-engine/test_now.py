import requests

base = "http://localhost:8002"

print("Testing AI Engine API...")
print("Base URL: <ADDRESS_REDACTED>

# Test 1: Root endpoint
print("\nTest 1: GET /")
try:
    r = requests.get(base + "/", timeout=5)
    print("  Status:", r.status_code)
    if r.status_code == 200:
        print("  SUCCESS!")
        data = r.json()
        print("  Service:", data.get("service"))
    else:
        print("  FAILED")
except Exception as e:
    print("  ERROR:", e)

# Test 2: Health check
print("\nTest 2: GET /health")
try:
    r = requests.get(base + "/health", timeout=5)
    print("  Status:", r.status_code)
    if r.status_code == 200:
        print("  SUCCESS!")
        data = r.json()
        print("  Status:", data.get("status"))
    else:
        print("  FAILED")
except Exception as e:
    print("  ERROR:", e)

# Test 3: Text generation (THE KEY TEST)
print("\nTest 3: POST /api/v1/generate")
print("  (This was timing out before, should work now)")
try:
    url = base + "/api/v1/generate"
    headers = {
        "Content-Type": "application/json",
        "X-<SECRET_REDACTED>"
    }
    data = {
        "prompt": "Introduce Web4.0 in one sentence",
        "max_tokens": 100
    }
    print("  Sending request...")
    r = requests.post(url, json=data, headers=headers, timeout=30)
    print("  Status:", r.status_code)
    if r.status_code == 200:
        print("  SUCCESS!")
        result = r.json()
        print("  Success:", result.get("success"))
        print("  Model:", result.get("model"))
        print("  Provider:", result.get("provider"))
        print("  Result:", result.get("result", "")[:100])
    else:
        print("  FAILED")
        print("  Response:", r.text[:200])
except requests.exceptions.Timeout:
    print("  TIMEOUT (30 seconds)")
except Exception as e:
    print("  ERROR:", e)

# Test 4: Chat endpoint
print("\nTest 4: POST /api/v1/chat")
try:
    url = base + "/api/v1/chat"
    headers = {
        "Content-Type": "application/json",
        "X-<SECRET_REDACTED>"
    }
    data = {
        "messages": [
            {"role": "user", "content": "Hello"}
        ]
    }
    print("  Sending request...")
    r = requests.post(url, json=data, headers=headers, timeout=30)
    print("  Status:", r.status_code)
    if r.status_code == 200:
        print("  SUCCESS!")
        result = r.json()
        print("  Result:", result.get("result", "")[:100])
    else:
        print("  FAILED")
except Exception as e:
    print("  ERROR:", e)

print("\n" + "="*50)
print("Tests completed!")
