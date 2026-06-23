import requests

print("Testing AI Engine...")
print("URL: <INTERNAL_URL_REDACTED>")

# Test 1: Root
print("\nTest 1: GET /")
try:
    r = requests.get("<INTERNAL_URL_REDACTED> + "/", timeout=5)
    print("  Status:", r.status_code)
    if r.status_code == 200:
        print("  OK!")
except Exception as e:
    print("  Error:", e)

# Test 2: Health
print("\nTest 2: GET /health")
try:
    r = requests.get("<INTERNAL_URL_REDACTED> + "/health", timeout=5)
    print("  Status:", r.status_code)
    if r.status_code == 200:
        print("  OK!")
except Exception as e:
    print("  Error:", e)

# Test 3: Generate (KEY TEST)
print("\nTest 3: POST /api/v1/generate")
print("  (This was timing out before)")
try:
    url = "<INTERNAL_URL_REDACTED>" + "/api/v1/generate"
    headers = {"Content-Type": "application/json", "X-<SECRET_REDACTED>"}
    data = {"prompt": "Hello", "max_tokens": 50}
    print("  Sending request...")
    r = requests.post(url, json=data, headers=headers, timeout=30)
    print("  Status:", r.status_code)
    if r.status_code == 200:
        print("  SUCCESS!")
        result = r.json()
        print("  Result:", result.get("result", "")[:100])
    else:
        print("  Failed:", r.text[:100])
except requests.exceptions.Timeout:
    print("  TIMEOUT!")
except Exception as e:
    print("  Error:", e)

print("\nDone!")
