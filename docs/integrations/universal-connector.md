# Universal Connector Guide

The Universal Connector provides a no-code interface for connecting your app to external services.

## Getting Started

1. Navigate to the "Integrations" section in the app
2. Browse available connectors in the catalog
3. Click "Connect" on the app you want to integrate

## Connection Types

### OAuth2 Connections

Apps like Zoom and GoHighLevel use OAuth2 authentication:

1. **Google Authentication**: First, sign in with your Google account
2. **App Configuration**: Enter your OAuth Client ID and Client Secret
3. **Authorization**: You'll be redirected to the app's authorization page
4. **Approval**: Approve the connection request
5. **Complete**: Return to the app - connection is established

### API Key Connections

Apps like Jotform and Marketsharp use API key authentication:

1. **Google Authentication**: Sign in with your Google account (for approval)
2. **API Key**: Enter your API key from the external service
3. **Test**: The system tests the connection automatically
4. **Complete**: Connection is established

## Managing Connections

### Viewing Connections

Go to the "Connections" dashboard to see all active connections:
- Connection status
- Last sync time
- Error messages (if any)

### Testing Connections

Click "Test" on any connection to verify it's working.

### Disconnecting

Click "Disconnect" to remove a connection. This will:
- Stop all syncing
- Remove stored credentials
- Cancel any scheduled syncs

## Connection Status

- **Connected**: Active and working
- **Error**: Connection failed or credentials invalid
- **Syncing**: Currently synchronizing data
- **Disconnected**: Connection removed

## Troubleshooting

### Connection Fails

- Verify your credentials are correct
- Check if the external service is accessible
- Ensure your Google account is properly authenticated

### Sync Not Working

- Check connection status in the dashboard
- Verify the external service API is operational
- Review error messages for specific issues

### OAuth Redirect Issues

- Ensure redirect URLs are correctly configured
- Check that your OAuth app credentials are valid
- Verify the callback URL matches your app's domain
