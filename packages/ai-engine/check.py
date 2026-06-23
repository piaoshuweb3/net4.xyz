import requests

url = "<INTERNAL_URL_REDACTED>"
try:
    r = requests.get(url, timeout=2)
    print("Service is running! Status:", r.status_code)
except Exception as e:
    print("Service not running or error:", e)
