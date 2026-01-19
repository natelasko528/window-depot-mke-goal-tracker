# GoHighLevel API Integration Documentation

## Overview

This document provides comprehensive documentation for integrating with the GoHighLevel API in the Window Depot Daily Goal Tracker application.

## Authentication

### API Key Authentication

GoHighLevel supports API key authentication for simple integrations. The API key should be sent as a Bearer token in the Authorization header.

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
}
```

### OAuth 2.0 Authentication

For production applications, OAuth 2.0 is recommended. The OAuth flow includes:

1. **Authorization URL Generation**: Generate an authorization URL that redirects users to GoHighLevel
2. **Token Exchange**: Exchange the authorization code for access and refresh tokens
3. **Token Refresh**: Use refresh tokens to obtain new access tokens when they expire

**Required Scopes:**
- `contacts.readonly` - Read contacts
- `contacts.write` - Create and update contacts
- `opportunities.readonly` - Read opportunities/deals
- `opportunities.write` - Create and update opportunities
- `calendars.readonly` - Read appointments
- `calendars.write` - Create and update appointments

**Base URL**: `https://services.leadconnectorhq.com`

## API Endpoints

### Contacts API

#### Get Contacts

Fetch contacts with pagination support.

```javascript
GET /contacts/?locationId={locationId}&limit={limit}&skip={offset}

Headers:
  Authorization: Bearer <TOKEN>
  Version: 2021-07-28
  Accept: application/json

Response:
{
  "contacts": [
    {
      "id": "contact-uuid-123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1 888-888-8888",
      "tags": ["lead", "website"],
      "customFields": [],
      "dateAdded": "2023-01-15T10:00:00Z"
    }
  ]
}
```

#### Create Contact

Create a new contact in GoHighLevel.

```javascript
POST /contacts/

Headers:
  Authorization: Bearer <TOKEN>
  Version: 2021-07-28
  Content-Type: application/json

Body:
{
  "locationId": "location-uuid-456",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+1 888-888-8888",
  "tags": ["lead", "website"],
  "customFields": [
    {
      "id": "field-id",
      "key": "source",
      "field_value": "website"
    }
  ],
  "source": "public api"
}

Response:
{
  "contact": {
    "id": "new-contact-uuid",
    "name": "Jane Smith",
    "email": "jane@example.com"
  }
}
```

#### Update Contact

Update an existing contact.

```javascript
PUT /contacts/{contactId}

Headers:
  Authorization: Bearer <TOKEN>
  Version: 2021-07-28
  Content-Type: application/json

Body:
{
  "firstName": "Jane",
  "lastName": "Doe",
  "tags": ["lead", "website", "qualified"],
  "customFields": [
    {
      "id": "field-id",
      "key": "status",
      "field_value": "qualified"
    }
  ]
}
```

#### Get Single Contact

Retrieve details for a specific contact.

```javascript
GET /contacts/{contactId}

Headers:
  Authorization: Bearer <TOKEN>
  Version: 2021-07-28
  Accept: application/json
```

### Opportunities API

#### Get Opportunities

Fetch opportunities/deals with pagination.

```javascript
GET /opportunities/?locationId={locationId}&limit={limit}&skip={offset}

Headers:
  Authorization: Bearer <TOKEN>
  Version: 2021-07-28
  Accept: application/json
```

#### Create/Update Opportunity

Upsert an opportunity (creates if doesn't exist, updates if it does).

```javascript
POST /opportunities/upsert

Headers:
  Authorization: Bearer <TOKEN>
  Version: 2021-07-28
  Content-Type: application/json

Body:
{
  "pipelineId": "pipeline-uuid",
  "locationId": "location-uuid",
  "contactId": "contact-uuid",
  "name": "Enterprise Deal - Acme Corp",
  "status": "open",
  "pipelineStageId": "stage-uuid",
  "monetaryValue": 50000,
  "assignedTo": "user-uuid"
}

Response:
{
  "id": "opportunity-uuid",
  "name": "Enterprise Deal - Acme Corp",
  "monetaryValue": 50000,
  "status": "open"
}
```

### Appointments API

#### Get Appointments for Contact

Retrieve appointments associated with a specific contact.

```javascript
GET /contacts/{contactId}/appointments

Headers:
  Authorization: Bearer <TOKEN>
  Version: 2021-07-28
  Accept: application/json

Response:
{
  "events": [
    {
      "id": "appointment-uuid",
      "title": "Consultation Call",
      "startTime": "2023-09-25T16:00:00+05:30",
      "endTime": "2023-09-25T16:30:00+05:30",
      "status": "booked",
      "assignedUserId": "user-uuid",
      "notes": "Initial consultation"
    }
  ]
}
```

## Webhooks

GoHighLevel supports webhooks for real-time event notifications. The following events are available:

### Supported Webhook Events

- `Contact.Create` - Triggered when a new contact is created
- `Contact.Update` - Triggered when a contact is updated
- `AppointmentCreate` - Triggered when an appointment is created
- `Appointment.Update` - Triggered when an appointment is updated
- `OpportunityCreate` - Triggered when an opportunity is created
- `Opportunity.Update` - Triggered when an opportunity is updated

### Webhook Payload Format

```json
{
  "type": "Contact.Create",
  "locationId": "location-uuid-456",
  "contact": {
    "id": "contact-uuid-123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1 888-888-8888",
    "dateAdded": "2023-01-15T10:00:00Z"
  }
}
```

### Webhook Setup

1. **Register Webhook URL**: Configure your webhook URL in GoHighLevel marketplace app settings
2. **Verify Signature**: Implement signature verification using the webhook public key (if provided)
3. **Handle Events**: Process incoming webhook events and update local data

### Webhook Signature Verification

GoHighLevel provides webhook signature verification through the `@gohighlevel/api-client` SDK:

```typescript
import { HighLevel } from '@gohighlevel/api-client';

// Verify webhook signature
const isValid = ghl.webhooks.verifySignature(payload, signature, ghlPublicKey);
```

## Error Handling

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Invalid or expired token
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Invalid locationId"
}
```

## Rate Limiting

GoHighLevel API has rate limits. Implement exponential backoff when receiving `429 Too Many Requests` responses.

## Location ID

All GoHighLevel API calls require a `locationId` parameter. This identifies which location (sub-account) within the GoHighLevel account the request should target. Users must provide their Location ID when connecting the integration.

## Integration Implementation

The GoHighLevel integration is implemented in:

- **Client Class**: `src/lib/integrations.js` - `GoHighLevelClient`
- **Manager**: `src/lib/integrations.js` - `IntegrationManager` methods
- **UI**: `src/App.jsx` - Settings > Integrations tab
- **Webhook Handler**: `supabase/functions/gohighlevel-webhook/index.ts`

## Resources

- [GoHighLevel API Documentation](https://marketplace.gohighlevel.com/docs)
- [GoHighLevel API SDK](https://github.com/gohighlevel/highlevel-api-sdk)
- [OAuth Documentation](https://support.gohighlevel.com/hc/en-us/articles/360041267573-API-Keys)
