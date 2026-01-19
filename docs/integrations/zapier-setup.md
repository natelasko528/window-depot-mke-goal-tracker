# Zapier Integration Setup

Connect Window Depot Goal Tracker to Zapier for powerful automation workflows.

## Prerequisites

- A Window Depot Goal Tracker account
- A Zapier account (free or paid)

## Setup Steps

### 1. Generate API Key

1. Open the Window Depot Goal Tracker app
2. Go to Settings > API Keys
3. Click "Generate New API Key"
4. Give it a name like "Zapier Integration"
5. Copy the API key (you'll need it in the next step)

### 2. Add Window Depot Goal Tracker to Zapier

1. Go to [zapier.com](https://zapier.com)
2. Click "Make a Zap"
3. Search for "Window Depot Goal Tracker"
4. Select it from the results

### 3. Authenticate

1. Enter your API key in the authentication form
2. Click "Yes, Continue"
3. Zapier will test the connection

### 4. Create Your First Zap

#### Example: Create Daily Log from Google Sheets

**Trigger:**
- App: Google Sheets
- Event: New Spreadsheet Row

**Action:**
- App: Window Depot Goal Tracker
- Event: Create Daily Log
- Configure:
  - User ID: Select from dropdown
  - Date: Map from Google Sheets
  - Reviews: Map from Google Sheets
  - Demos: Map from Google Sheets
  - Callbacks: Map from Google Sheets

## Available Triggers

### New Daily Log
Triggers when a new daily log entry is created.

**Fields:**
- User ID
- Date
- Reviews count
- Demos count
- Callbacks count

### New Appointment
Triggers when a new appointment is scheduled.

**Fields:**
- User ID
- Customer name
- Customer phone
- Customer email
- Appointment date
- Product interests

### Goal Achieved
Triggers when a user achieves their daily goal.

**Fields:**
- User ID
- User name
- Goal type (reviews, demos, callbacks)
- Goal value
- Actual value
- Date

### New Feed Post
Triggers when a new post is created in the feed.

**Fields:**
- User ID
- Content
- Post type

## Available Actions

### Create Daily Log
Create a new daily log entry.

**Required Fields:**
- User ID
- Reviews
- Demos
- Callbacks

**Optional Fields:**
- Date (defaults to today)

### Create Appointment
Schedule a new customer appointment.

**Required Fields:**
- User ID
- Customer name
- Appointment date

**Optional Fields:**
- Customer phone
- Customer email
- Product interests
- Notes

### Update User Goals
Update a user's daily goals.

**Required Fields:**
- User ID

**Optional Fields:**
- Reviews goal
- Demos goal
- Callbacks goal

### Create Feed Post
Create a new post in the feed.

**Required Fields:**
- User ID
- Content

**Optional Fields:**
- Post type (manual/auto)

## Common Zaps

### 1. Sync Daily Logs to Google Sheets
- **Trigger**: New Daily Log in Window Depot
- **Action**: Create Row in Google Sheets

### 2. Send Slack Notification on Goal Achievement
- **Trigger**: Goal Achieved in Window Depot
- **Action**: Send Channel Message in Slack

### 3. Create Calendar Event for Appointments
- **Trigger**: New Appointment in Window Depot
- **Action**: Create Event in Google Calendar

### 4. Sync from CRM
- **Trigger**: New Contact in CRM
- **Action**: Create Appointment in Window Depot

## Troubleshooting

### Authentication Fails
- Verify your API key is correct
- Check that the API key hasn't expired
- Generate a new API key if needed

### Triggers Not Firing
- Check that your Zap is turned on
- Verify the trigger is correctly configured
- Review Zap history for error messages

### Actions Fail
- Ensure all required fields are mapped
- Check that User IDs are valid
- Verify date formats are correct (YYYY-MM-DD)

## Support

For Zapier-specific issues, visit [Zapier Support](https://zapier.com/help).

For API-related issues, refer to the REST API documentation.
