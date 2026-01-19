# Integration Setup Guide

This guide provides step-by-step instructions for setting up GoHighLevel and Zoom Workplace integrations in the Window Depot Daily Goal Tracker application.

## Table of Contents

- [GoHighLevel Setup](#gohighlevel-setup)
- [Zoom Workplace Setup](#zoom-workplace-setup)
- [Troubleshooting](#troubleshooting)

## GoHighLevel Setup

### Prerequisites

- Active GoHighLevel account
- API access enabled
- Location ID for your sub-account

### Step 1: Obtain API Key

1. Log in to your GoHighLevel account
2. Navigate to **Settings** > **Integrations** > **API**
3. Click **Generate New API Key**
4. Copy and securely store your API key
5. Note: API keys have full access to your account - keep them secure

**Alternative: OAuth Setup**

For production applications, OAuth 2.0 is recommended:

1. Go to [GoHighLevel Marketplace](https://marketplace.gohighlevel.com/)
2. Create a new app or select your existing app
3. Configure OAuth credentials (Client ID and Client Secret)
4. Set redirect URI: `https://your-domain.com/oauth/gohighlevel/callback`
5. Request required scopes:
   - `contacts.readonly`
   - `contacts.write`
   - `opportunities.readonly`
   - `opportunities.write`
   - `calendars.readonly`

### Step 2: Find Your Location ID

1. In GoHighLevel, navigate to **Settings** > **Locations**
2. Select your location (or sub-account)
3. The Location ID is visible in the URL or settings page
4. Copy the Location ID

### Step 3: Connect in Application

1. Open the Window Depot Daily Goal Tracker application
2. Navigate to **Settings** > **Integrations**
3. Find the **GoHighLevel Integration** section
4. Enter your **API Key** (or complete OAuth flow if using OAuth)
5. Enter your **Location ID**
6. Click **Connect GoHighLevel**
7. The connection will be tested automatically

### Step 4: Configure Webhooks (Optional)

To receive real-time updates from GoHighLevel:

1. In GoHighLevel, go to **Settings** > **Integrations** > **Webhooks**
2. Add webhook URL: `https://your-supabase-project.supabase.co/functions/v1/gohighlevel-webhook`
3. Select events to subscribe to:
   - `Contact.Create`
   - `Contact.Update`
   - `AppointmentCreate`
   - `OpportunityCreate`
4. Save webhook configuration

### Step 5: Sync Data

1. After connecting, click **Sync Now** to fetch initial data
2. The application will sync:
   - Contacts
   - Opportunities/Deals
   - Appointments (for synced contacts)
3. Data syncs automatically every 30 minutes

## Zoom Workplace Setup

### Prerequisites

- Active Zoom account with admin access
- Ability to create OAuth apps in Zoom App Marketplace

### Step 1: Create OAuth App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click **Develop** > **Build App**
3. Select **OAuth** as the app type
4. Fill in app information:
   - **App Name**: Window Depot Goal Tracker
   - **Company Name**: Your company name
   - **Developer Contact**: Your email
5. Click **Create**

### Step 2: Configure OAuth Settings

1. In your app settings, go to **OAuth** tab
2. Set **Redirect URL**: `https://your-domain.com/oauth/zoom/callback`
3. Add **Whitelist URLs** if required:
   - `https://your-domain.com`
   - `https://api.zoom.us`
4. Save changes

### Step 3: Request Scopes

1. In app settings, go to **Scopes** tab
2. Click **Add Scopes**
3. Select the following scopes:
   - **Meeting** > `meeting:write` - Create and manage meetings
   - **Meeting** > `meeting:read` - View meetings
   - **User** > `user:read` - View user information
4. Click **Done**
5. Submit for review (if required)

### Step 4: Get Credentials

1. In app settings, go to **App Credentials** tab
2. Copy the following:
   - **Client ID**
   - **Client Secret**
3. Store these securely (you'll need them for the OAuth flow)

### Step 5: Configure Webhooks

1. In app settings, go to **Feature** tab
2. Enable **Event Subscriptions**
3. Add **Subscription Event Notification Endpoint URL**:
   - `https://your-supabase-project.supabase.co/functions/v1/zoom-webhook`
4. Select events to subscribe to:
   - `meeting.created`
   - `meeting.updated`
   - `meeting.deleted`
   - `meeting.started`
   - `meeting.ended`
5. Copy the **Webhook Secret Token** (save this for signature verification)
6. Click **Save**

### Step 6: Set Environment Variables

For webhook signature verification, set the webhook secret in your Supabase Edge Function:

```bash
# In Supabase dashboard, go to Edge Functions > Settings > Secrets
ZOOM_WEBHOOK_SECRET=your-webhook-secret-token
```

### Step 7: Connect in Application

1. Open the Window Depot Daily Goal Tracker application
2. Navigate to **Settings** > **Integrations**
3. Find the **Zoom Workplace Integration** section
4. Click **Connect with Zoom**
5. You'll be redirected to Zoom for authorization
6. Authorize the application
7. You'll be redirected back to the application
8. The connection will be established automatically

### Step 8: Sync Data

1. After connecting, click **Sync Now** to fetch initial meetings
2. The application will sync all meetings for the authenticated user
3. Data syncs automatically every 30 minutes

## Troubleshooting

### GoHighLevel

**Issue: "Invalid token or location ID" error**

- Verify your API key is correct and hasn't expired
- Ensure the Location ID matches your GoHighLevel sub-account
- Check that API access is enabled in your GoHighLevel account

**Issue: Webhooks not being received**

- Verify webhook URL is publicly accessible (not localhost)
- Check webhook configuration in GoHighLevel settings
- Ensure Supabase Edge Function is deployed and accessible
- Check Supabase logs for webhook errors

**Issue: Rate limit errors**

- GoHighLevel has API rate limits
- Implement exponential backoff in sync operations
- Reduce sync frequency if hitting limits

### Zoom

**Issue: OAuth redirect fails**

- Verify redirect URI matches exactly in Zoom app settings
- Check that redirect URI is using HTTPS (required)
- Ensure app is published/approved if required

**Issue: "Invalid or expired token" error**

- Zoom access tokens expire after ~60 minutes
- Implement token refresh mechanism
- Store refresh tokens securely for long-term access

**Issue: Webhook signature verification fails**

- Verify `ZOOM_WEBHOOK_SECRET` is set correctly in Supabase
- Check that webhook secret matches the one in Zoom app settings
- Ensure signature verification logic matches Zoom's HMAC-SHA256 method

**Issue: Webhooks not received**

- Verify webhook endpoint URL is publicly accessible
- Check Event Subscriptions are enabled in Zoom app
- Verify events are selected in subscription settings
- Check Supabase Edge Function logs for errors

**Issue: Meetings not syncing**

- Verify OAuth scopes include `meeting:read`
- Check user has permission to view meetings
- Ensure token hasn't expired (refresh if needed)

## Best Practices

### Security

- **Never commit API keys or secrets to version control**
- Store credentials in environment variables or secure vaults
- Use OAuth instead of API keys for production applications
- Rotate API keys and tokens periodically
- Implement proper error handling to avoid exposing sensitive data

### Performance

- Implement rate limiting and exponential backoff
- Cache frequently accessed data
- Use webhooks for real-time updates instead of polling
- Batch API calls when possible

### Data Management

- Sync data incrementally (only changed items)
- Store sync timestamps to avoid duplicate processing
- Handle pagination properly for large datasets
- Implement data validation before syncing

## Support Resources

- [GoHighLevel API Documentation](https://marketplace.gohighlevel.com/docs)
- [GoHighLevel Support](https://support.gohighlevel.com/)
- [Zoom API Documentation](https://developers.zoom.us/docs/api/)
- [Zoom Developer Support](https://devforum.zoom.us/)
- [Project Documentation](./gohighlevel-api.md) - GoHighLevel API reference
- [Project Documentation](./zoom-api.md) - Zoom API reference
