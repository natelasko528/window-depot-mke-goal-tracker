# Zoom Workplace API Integration Documentation

## Overview

This document provides comprehensive documentation for integrating with the Zoom Workplace API in the Window Depot Daily Goal Tracker application.

## Authentication

### OAuth 2.0 with PKCE

Zoom requires OAuth 2.0 authentication with PKCE (Proof Key for Code Exchange) for enhanced security. The OAuth flow includes:

1. **Generate Authorization URL**: Create an authorization URL with PKCE parameters
2. **User Authorization**: Redirect user to Zoom for authorization
3. **Token Exchange**: Exchange authorization code for access and refresh tokens
4. **Token Refresh**: Use refresh tokens to obtain new access tokens (tokens expire after ~60 minutes)

**Required Scopes:**
- `meeting:write` - Create and manage meetings
- `meeting:read` - Read meeting information
- `user:read` - Read user information

**Base URL**: `https://api.zoom.us/v2`

### OAuth Flow Implementation

```javascript
// 1. Generate authorization URL with PKCE
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

const authUrl = `https://zoom.us/oauth/authorize?` +
  `response_type=code&` +
  `client_id=${clientId}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256&` +
  `scope=${encodeURIComponent('meeting:write meeting:read user:read')}`;

// 2. Exchange code for tokens
const tokenResponse = await fetch('https://zoom.us/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  }),
});
```

## API Endpoints

### Meetings API

#### Create Meeting

Create a new Zoom meeting.

```javascript
POST /users/me/meetings

Headers:
  Authorization: Bearer <ACCESS_TOKEN>
  Content-Type: application/json

Body:
{
  "topic": "Team Sync",
  "type": 2,  // 1=Instant, 2=Scheduled, 3=Recurring
  "start_time": "2023-10-28T14:00:00Z",
  "duration": 60,
  "timezone": "America/Los_Angeles",
  "password": "optional-password",
  "settings": {
    "host_video": true,
    "participant_video": true,
    "join_before_host": false
  }
}

Response (201):
{
  "id": 987654321,
  "uuid": "uuid_xyz789",
  "join_url": "https://zoom.us/j/987654321?pwd=...",
  "start_url": "https://zoom.us/s/987654321?zak=...",
  "topic": "Team Sync",
  "start_time": "2023-10-28T14:00:00Z",
  "duration": 60
}
```

#### List Meetings

Retrieve a list of meetings for a user with pagination.

```javascript
GET /users/{userId}/meetings?page_size=30&next_page_token={token}

Headers:
  Authorization: Bearer <ACCESS_TOKEN>
  Accept: application/json

Response (200):
{
  "page_count": 1,
  "page_size": 30,
  "total_records": 5,
  "next_page_token": "",
  "meetings": [
    {
      "id": 987654321,
      "uuid": "uuid_xyz789",
      "topic": "Team Sync",
      "type": 2,
      "start_time": "2023-10-28T14:00:00Z",
      "duration": 60,
      "join_url": "https://zoom.us/j/987654321"
    }
  ]
}

// Use 'me' as userId to get meetings for authenticated user
GET /users/me/meetings
```

#### Get Meeting Details

Retrieve details for a specific meeting.

```javascript
GET /meetings/{meetingId}

Headers:
  Authorization: Bearer <ACCESS_TOKEN>
  Accept: application/json

Response (200):
{
  "id": 987654321,
  "uuid": "uuid_xyz789",
  "topic": "Team Sync",
  "type": 2,
  "start_time": "2023-10-28T14:00:00Z",
  "duration": 60,
  "timezone": "America/Los_Angeles",
  "join_url": "https://zoom.us/j/987654321",
  "settings": {
    "host_video": true,
    "participant_video": true
  }
}
```

#### Update Meeting

Update an existing meeting.

```javascript
PATCH /meetings/{meetingId}

Headers:
  Authorization: Bearer <ACCESS_TOKEN>
  Content-Type: application/json

Body:
{
  "topic": "Updated Meeting Topic",
  "start_time": "2024-01-01T10:00:00Z",
  "duration": 90
}

Response (204): No content
```

#### Delete Meeting

Delete a meeting.

```javascript
DELETE /meetings/{meetingId}

Headers:
  Authorization: Bearer <ACCESS_TOKEN>

Response (204): No content
```

#### Get User Info

Get information about the authenticated user.

```javascript
GET /users/me

Headers:
  Authorization: Bearer <ACCESS_TOKEN>
  Accept: application/json

Response (200):
{
  "id": "user-id",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "type": 2,
  "role_name": "Owner"
}
```

## Webhooks

Zoom supports webhooks for real-time event notifications. Webhooks must be subscribed to via the Event Subscriptions API.

### Supported Webhook Events

- `meeting.created` - Triggered when a meeting is created
- `meeting.updated` - Triggered when a meeting is updated
- `meeting.deleted` - Triggered when a meeting is deleted
- `meeting.started` - Triggered when a meeting starts
- `meeting.ended` - Triggered when a meeting ends

### Create Event Subscription

Subscribe to webhook events.

```javascript
POST /marketplace/app/event_subscription

Headers:
  Authorization: Bearer <ACCESS_TOKEN>
  Content-Type: application/json

Body:
{
  "events": [
    "meeting.created",
    "meeting.updated",
    "meeting.deleted",
    "meeting.started",
    "meeting.ended"
  ],
  "event_subscription_name": "Window Depot Goal Tracker Webhooks",
  "event_webhook_url": "https://your-app.com/webhooks/zoom",
  "subscription_scope": "user",
  "user_ids": ["user-id-1", "user-id-2"]  // Optional, omit for all users
}

Response (201):
{
  "event_subscription_id": "0ZAaJY4dQ52BbwI9PArBLQ"
}
```

### Webhook Payload Format

```json
{
  "event": "meeting.created",
  "payload": {
    "account_id": "account-id",
    "object": {
      "id": 987654321,
      "uuid": "uuid_xyz789",
      "topic": "Team Sync",
      "type": 2,
      "start_time": "2023-10-28T14:00:00Z",
      "duration": 60,
      "timezone": "America/Los_Angeles",
      "host_id": "host-id",
      "host_email": "host@example.com"
    }
  },
  "event_ts": 1698494400000
}
```

### Webhook Signature Verification

Zoom includes signature verification headers:
- `x-zm-request-timestamp` - Request timestamp
- `x-zm-signature` - HMAC-SHA256 signature

The signature is calculated as:
```
message = "v0:" + timestamp + ":" + requestBody
signature = HMAC-SHA256(webhookSecret, message)
```

### Webhook URL Validation

When setting up a webhook, Zoom sends a validation request with `event: endpoint.url_validation`:

```json
{
  "event": "endpoint.url_validation",
  "payload": {
    "plainToken": "random-token-string"
  }
}
```

Your webhook endpoint should respond with an encrypted token:

```javascript
// Encrypt the plainToken using HMAC-SHA256 with your webhook secret
const encryptedToken = crypto
  .createHmac('sha256', webhookSecret)
  .update(plainToken)
  .digest('hex');

return {
  plainToken: encryptedToken
};
```

## Error Handling

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content to return
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Invalid or expired token
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "code": 1247,
  "message": "User not found.",
  "errors": [
    {
      "field": "user_id",
      "message": "User does not exist."
    }
  ]
}
```

## Token Management

### Access Token Expiration

Zoom access tokens expire after approximately 60 minutes. Use refresh tokens to obtain new access tokens.

### Refresh Access Token

```javascript
POST /oauth/token

Headers:
  Content-Type: application/x-www-form-urlencoded
  Authorization: Basic <base64(clientId:clientSecret)>

Body:
{
  grant_type: "refresh_token",
  refresh_token: "<refresh_token>"
}

Response:
{
  "access_token": "new_access_token",
  "refresh_token": "new_refresh_token",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

## Rate Limiting

Zoom API has rate limits. Implement exponential backoff when receiving `429 Too Many Requests` responses.

## Meeting Types

- `1` - Instant meeting
- `2` - Scheduled meeting
- `3` - Recurring meeting with no fixed time
- `8` - Recurring meeting with fixed time

## Integration Implementation

The Zoom integration is implemented in:

- **Client Class**: `src/lib/integrations.js` - `ZoomClient`
- **Manager**: `src/lib/integrations.js` - `IntegrationManager` methods
- **OAuth Utilities**: `src/lib/oauth.js` - PKCE and token exchange functions
- **UI**: `src/App.jsx` - Settings > Integrations tab
- **Webhook Handler**: `supabase/functions/zoom-webhook/index.ts`

## Resources

- [Zoom Developers Documentation](https://developers.zoom.us/docs/api/)
- [OAuth 2.0 Authorization](https://developers.zoom.us/docs/integrations/oauth/)
- [Webhooks Documentation](https://developers.zoom.us/docs/api/webhooks/)
- [Meeting API Reference](https://developers.zoom.us/docs/api/rest/reference/zoom-api/ma/)
