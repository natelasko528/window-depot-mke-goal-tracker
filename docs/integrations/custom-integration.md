# Custom Integration Guide

Build your own integration with Window Depot Goal Tracker using the REST API and webhooks.

## Getting Started

1. **Generate an API Key**: See the Authentication documentation
2. **Review the API Documentation**: Understand available endpoints
3. **Set up Webhooks** (optional): Receive real-time event notifications

## API Overview

Base URL: `https://jzxmmtaloiglvclrmfjb.supabase.co/functions/v1/api`

All requests require authentication via API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Common Integration Patterns

### Pattern 1: One-Way Sync (Pull)

Pull data from Window Depot Goal Tracker:

```python
import requests
from datetime import datetime

API_KEY = "your-api-key"
BASE_URL = "https://jzxmmtaloiglvclrmfjb.supabase.co/functions/v1/api"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Get today's daily logs
response = requests.get(
    f"{BASE_URL}/v1/daily-logs",
    headers=headers,
    params={"date": datetime.now().strftime("%Y-%m-%d")}
)

daily_logs = response.json()["daily_logs"]
```

### Pattern 2: One-Way Sync (Push)

Push data to Window Depot Goal Tracker:

```python
# Create a daily log entry
response = requests.post(
    f"{BASE_URL}/v1/daily-logs",
    headers=headers,
    json={
        "user_id": "user123",
        "reviews": 5,
        "demos": 3,
        "callbacks": 2
    }
)

new_log = response.json()
```

### Pattern 3: Real-Time with Webhooks

Receive real-time notifications:

```python
from flask import Flask, request
import hmac
import hashlib

app = Flask(__name__)
WEBHOOK_SECRET = "your-webhook-secret"

def verify_signature(payload, signature, timestamp):
    message = payload.encode('utf-8')
    expected = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        message,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    timestamp = request.headers.get('X-Webhook-Timestamp')
    event_type = request.headers.get('X-Webhook-Event')
    
    if not verify_signature(request.data, signature, timestamp):
        return 'Invalid signature', 401
    
    payload = request.json
    
    if event_type == 'daily_log.created':
        # Handle new daily log
        process_daily_log(payload)
    elif event_type == 'appointment.created':
        # Handle new appointment
        process_appointment(payload)
    
    return 'OK', 200
```

## Error Handling

Always handle API errors gracefully:

```python
try:
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 401:
        # Invalid API key
        raise AuthenticationError("Invalid API key")
    elif e.response.status_code == 429:
        # Rate limited
        raise RateLimitError("Rate limit exceeded")
    else:
        raise APIError(f"API error: {e}")
```

## Rate Limiting

Respect rate limits (100 requests/minute):
- Implement exponential backoff
- Cache responses when possible
- Use webhooks instead of polling

## Best Practices

1. **Store credentials securely**: Use environment variables or secure vaults
2. **Handle errors gracefully**: Implement retry logic with backoff
3. **Validate data**: Verify data format before sending
4. **Monitor usage**: Track API calls and errors
5. **Use webhooks**: Prefer webhooks over polling for real-time updates
6. **Respect rate limits**: Implement proper throttling
7. **Test thoroughly**: Test integration in development before production

## Example: Complete Integration

```python
import requests
import time
from datetime import datetime

class WindowDepotClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://jzxmmtaloiglvclrmfjb.supabase.co/functions/v1/api"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def get_users(self):
        response = requests.get(
            f"{self.base_url}/v1/users",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()["users"]
    
    def create_daily_log(self, user_id, reviews, demos, callbacks, date=None):
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{self.base_url}/v1/daily-logs",
            headers=self.headers,
            json={
                "user_id": user_id,
                "date": date,
                "reviews": reviews,
                "demos": demos,
                "callbacks": callbacks
            }
        )
        response.raise_for_status()
        return response.json()
    
    def create_appointment(self, user_id, customer_name, appointment_date, **kwargs):
        response = requests.post(
            f"{self.base_url}/v1/appointments",
            headers=self.headers,
            json={
                "user_id": user_id,
                "customer_name": customer_name,
                "appointment_date": appointment_date,
                **kwargs
            }
        )
        response.raise_for_status()
        return response.json()

# Usage
client = WindowDepotClient("your-api-key")
users = client.get_users()
client.create_daily_log("user123", 5, 3, 2)
```
