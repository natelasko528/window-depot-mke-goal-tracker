# CONTEXT.md - Living Context Document

**Purpose:** Single source of truth for Window Depot Daily Goal Tracker app state, architecture, and issues.

## Quick Status

- **Last Updated:** 2025-01-16
- **App Health:** 🟢 Green
- **Critical Issues:** 0
- **Active Warnings:** 2 (P1: Feed scroll performance, P2: Missing test coverage)
- **Last Deployment:** [To be updated after verification]

## Current State

### Settings Page
- **Status:** 🟢 Fixed
- **Last Issue:** React hooks order violation - state setters used before state declarations
- **Location:** `src/App.jsx` lines 8404-8431 (state declarations), 8434-8517 (useEffect hooks)
- **Fix Status:** ✅ Verified - All useState declarations now before useEffect hooks
- **Fix Applied:** Moved all integration state useState declarations (lines 8405-8431) to before useEffect hooks
- **Last Checked:** 2025-01-16

### Component Health Matrix

| Component | Status | Lines | Last Issue | Last Updated |
|-----------|--------|-------|------------|--------------|
| WindowDepotTracker | 🟢 | 2384 (340-2724) | None | 2025-01-16 |
| UserSelection | 🟢 | 278 (2725-3003) | None | 2025-01-16 |
| Dashboard | 🟢 | 753 (3004-3757) | None | 2025-01-16 |
| Goals | 🟢 | 144 (3758-3902) | None | 2025-01-16 |
| Appointments | 🟢 | 525 (3903-4428) | None | 2025-01-16 |
| Feed | 🟢 | 533 (4429-4962) | None | 2025-01-16 |
| Leaderboard | 🟢 | 363 (4963-5326) | None | 2025-01-16 |
| HistoryView | 🟢 | 856 (5327-6183) | None | 2025-01-16 |
| ActiveUsersList | 🟢 | 84 (6184-6268) | None | 2025-01-16 |
| Chatbot | 🟢 | 1319 (6361-7680) | None | 2025-01-16 |
| TeamView | 🟢 | 124 (7681-7805) | None | 2025-01-16 |
| AdminPanel | 🟢 | 337 (7806-8143) | None | 2025-01-16 |
| Reports | 🟢 | 219 (8144-8363) | None | 2025-01-16 |
| **SettingsPage** | 🟢 | **2728 (8364-11092)** | **None** | **2025-01-16** |
| ConnectionWizard | 🟢 | ~271 (src/components/) | None | 2025-01-16 |
| ConnectionsDashboard | 🟢 | ~134 (src/components/) | None | 2025-01-16 |
| ConnectorCatalog | 🟢 | ~252 (src/components/) | None | 2025-01-16 |
| WebhooksManager | 🟢 | ~256 (src/components/) | None | 2025-01-16 |
| BottomNav | 🟢 | 28 (11093-11121) | None | 2025-01-16 |

## Known Issues

### Critical (P0) - Fix Immediately

#### SETTINGS-001: React Hooks Order Violation
- **Description:** State setters (`setIntegrationManager`, `setJotformStatus`, etc.) are used in `useEffect` hooks before the corresponding `useState` declarations
- **Location:** `src/App.jsx` lines 8404-8517
- **Impact:** Settings page fails to render/function correctly
- **Root Cause:** `useEffect` hooks at lines 8439-8494 use state setters that weren't declared until later in the component
- **Fix Applied:** Moved all `useState` declarations for integration state (lines 8405-8431) to immediately after initial state declarations (line 8402), before any `useEffect` hooks
- **Status:** ✅ Fixed and Verified
- **Priority:** P0 (Resolved)
- **Fixed:** 2025-01-16

**Affected State Variables:**
- `integrationManager` / `setIntegrationManager` (line 8596)
- `jotformStatus` / `setJotformStatus` (line 8576)
- `marketsharpStatus` / `setMarketsharpStatus` (line 8577)
- `gohighlevelStatus` / `setGoHighLevelStatus` (line 8578)
- `zoomStatus` / `setZoomStatus` (line 8579)
- `jotformSubmissions` / `setJotformSubmissions` (line 8592)
- `marketsharpData` / `setMarketsharpData` (line 8593)
- `gohighlevelData` / `setGoHighLevelData` (line 8594)
- `zoomMeetings` / `setZoomMeetings` (line 8595)
- `zoomClientId` / `setZoomClientId` (line 8597)
- `zoomClientSecret` / `setZoomClientSecret` (line 8598)
- `zoomRedirectUri` / `setZoomRedirectUri` (line 8599)
- Plus all related integration state variables

### High Priority (P1) - Fix This Week

#### FEED-001: Feed Scroll Performance
- **Description:** Feed scroll becomes janky with >50 posts
- **Location:** `src/App.jsx` Feed component (lines 4429-4962)
- **Impact:** Poor UX when scrolling through many posts
- **Status:** ⚠️ Known issue - needs optimization
- **Priority:** P1

### Medium Priority (P2) - Fix This Month

#### TEST-001: Missing Test Coverage
- **Description:** Most components lack unit, integration, and E2E tests
- **Location:** No test files found
- **Impact:** Risk of regressions, harder to refactor
- **Status:** ⚠️ Known issue
- **Priority:** P2

#### ERROR-001: Missing Error Boundaries
- **Description:** No React error boundaries implemented
- **Location:** `src/App.jsx` (entire app)
- **Impact:** Unhandled errors can crash entire app
- **Status:** ✅ Fixed - ErrorBoundary component implemented and wrapped around app
- **Priority:** P2 (Resolved)
- **Fixed:** 2025-01-16
- **Files:** `src/components/ErrorBoundary.jsx`, `src/index.js`

## Architecture Map

### Component Hierarchy

```
WindowDepotTracker (340-2724, 2384 lines)
├── UserSelection (2725-3003, 278 lines)
├── Dashboard (3004-3757, 753 lines)
├── Goals (3758-3902, 144 lines)
├── Appointments (3903-4428, 525 lines)
├── Feed (4429-4962, 533 lines)
├── Leaderboard (4963-5326, 363 lines)
├── HistoryView (5327-6183, 856 lines)
├── ActiveUsersList (6184-6268, 84 lines)
├── Chatbot (6361-7680, 1319 lines)
├── TeamView (7681-7805, 124 lines)
├── AdminPanel (7806-8143, 337 lines)
├── Reports (8144-8363, 219 lines)
├── SettingsPage (8364-11092, 2728 lines)
└── BottomNav (11093-11121, 28 lines)

**Universal Connector Components** (New):
├── ConnectionWizard (src/components/ConnectionWizard.jsx, ~271 lines)
│   └── Multi-step wizard for connecting apps with Google OAuth approval
├── ConnectionsDashboard (src/components/ConnectionsDashboard.jsx, ~134 lines)
│   └── Manages all active connections
├── ConnectorCatalog (src/components/ConnectorCatalog.jsx, ~252 lines)
│   └── App-store-like interface for browsing and connecting apps
└── WebhooksManager (src/components/WebhooksManager.jsx, ~256 lines)
    └── Create and manage webhooks for event notifications
```

### State Management

**Main App State (WindowDepotTracker):**
- Lines 345-431: Core state (currentUser, users, dailyLogs, etc.)
- Total useState hooks in main component: ~20

**SettingsPage State:**
- Lines 8394-8402: Initial state (localSettings, showApiKey, etc.)
- Lines 8404-8431: Integration state (FIXED - now declared before useEffect hooks)
- Lines 8434-8517: useEffect hooks (all state setters now have corresponding useState declarations)

### Data Flow

1. **User Action** → Updates local IndexedDB immediately
2. **If Online** → Queues sync operation to Supabase
3. **Sync Queue** → Processes operations with retry logic
4. **Real-time Subscription** → Broadcasts changes to other connected users
5. **Other Clients** → Receive update via WebSocket, refresh local data

### File Structure

**Main File:** `src/App.jsx`
- **Total Lines:** 10,759
- **Total Characters:** 389,599
- **Components:** 15
- **useState Hooks:** ~50+
- **useEffect Hooks:** ~30

## Integration Status

| Integration | Status | Last Sync | Error Rate | Notes |
|-------------|--------|-----------|------------|-------|
| Supabase | 🟢 Active | [timestamp] | 0% | Real-time sync working |
| Jotform | 🟡 Partial | [timestamp] | - | Requires API key |
| Marketsharp | 🟡 Partial | [timestamp] | - | Requires API key |
| GoHighLevel | 🟡 Partial | [timestamp] | - | Requires API key |
| Zoom | 🟡 Partial | [timestamp] | - | Requires OAuth setup |
| Gemini AI | 🟡 Partial | [timestamp] | - | Requires API key |

## Performance Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Initial Load | ~500ms | <1s | ✅ Good |
| Increment Action | ~50ms | <100ms | ✅ Good |
| Feed Scroll | Janky >50 posts | Smooth | ⚠️ Needs Work |
| Settings Page Load | Broken | <500ms | 🔴 Broken |
| Report Generation | ~200ms | <500ms | ✅ Good |

## Testing Status

| Component | Unit Tests | Integration Tests | E2E Tests | Status |
|-----------|------------|-------------------|-----------|--------|
| SettingsPage | ❌ | ❌ | ❌ | Not tested |
| Dashboard | ❌ | ❌ | ❌ | Manual testing |
| Appointments | ❌ | ❌ | ❌ | Manual testing |

## RIPPLE Index References

See `RIPPLE_INDEX.md` for:
- Detailed file structure maps
- Function locations (exact line numbers)
- Pattern locations
- Dependency graphs
- Search templates

## Dependencies and Versions

### Core Frameworks
- **React:** 18.2.0 (UI framework)
- **React DOM:** 18.2.0
- **React Scripts:** 5.0.1 (build tooling)

### Backend Services
- **@supabase/supabase-js:** 2.90.1
  - Project ID: jzxmmtaloiglvclrmfjb
  - Project URL: https://jzxmmtaloiglvclrmfjb.supabase.co
  - Region: us-east-1
  - Status: ACTIVE_HEALTHY

### AI Services
- **@google/genai:** 1.0.0
- **@google/generative-ai:** 0.21.0
  - Used for: Text chat and voice chat features
  - Requires: REACT_APP_GEMINI_API_KEY (optional)

### UI Libraries
- **lucide-react:** 0.263.0 (icons)
  - Usage: All icons throughout the app
- **recharts:** 2.8.0 (data visualization)
  - Usage: Leaderboards, statistics charts, reports

### Testing
- **@playwright/test:** 1.49.1
  - E2E testing framework
  - Commands: `npm run test:e2e`, `npm run test:e2e:headed`

## Environment Variables

### Required for Production
- **REACT_APP_SUPABASE_URL:** https://jzxmmtaloiglvclrmfjb.supabase.co
- **REACT_APP_SUPABASE_ANON_KEY:** JWT token (see ENV_SETUP.md for full token)
  - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Optional
- **REACT_APP_GEMINI_API_KEY:** For AI chatbot features (text and voice)

### Configuration Status
- **Local Development:** Configure via `.env.local` (gitignored)
- **Vercel Production:** Must be set in Vercel dashboard
- **Status:** ✅ Configured in production

### Setup Instructions
- See `ENV_SETUP.md` for local development setup
- See `VERCEL_ENV_SETUP.md` for production deployment

## Database Schema Reference

### Core Tables

#### users
- **Columns:** id (UUID), name (TEXT), role (TEXT), daily_goals (JSONB), xp (INTEGER), level (INTEGER), achievements (TEXT[]), achievement_progress (JSONB), current_streak (INTEGER), longest_streak (INTEGER), last_activity_date (TEXT), total_sales (INTEGER)
- **Indexes:** Primary key on id
- **RLS:** Enabled with allow_all policies
- **Real-time:** Enabled

#### daily_logs
- **Columns:** id (UUID), user_id (TEXT), date (TEXT), reviews (INTEGER), demos (INTEGER), callbacks (INTEGER)
- **Indexes:** Primary key on id, index on user_id
- **RLS:** Enabled
- **Real-time:** Enabled

#### appointments
- **Columns:** id (UUID), user_id (TEXT), customer_name (TEXT), product_interests (TEXT[]), appointment_date (TEXT), notes (TEXT), status (TEXT), outcome (TEXT), sale_amount (NUMERIC)
- **Indexes:** Primary key on id, index on user_id
- **RLS:** Enabled
- **Real-time:** Enabled

#### feed_posts
- **Columns:** id (UUID), user_id (TEXT), content (TEXT), type (TEXT), metadata (JSONB), created_at (TIMESTAMPTZ)
- **Indexes:** Primary key on id, index on user_id
- **RLS:** Enabled
- **Real-time:** Enabled

#### feed_likes
- **Columns:** id (UUID), post_id (UUID), user_id (TEXT), created_at (TIMESTAMPTZ)
- **Indexes:** Primary key on id, unique index on (post_id, user_id)
- **RLS:** Enabled
- **Real-time:** Enabled

#### feed_comments
- **Columns:** id (UUID), post_id (UUID), user_id (TEXT), content (TEXT), created_at (TIMESTAMPTZ)
- **Indexes:** Primary key on id, index on post_id
- **RLS:** Enabled
- **Real-time:** Enabled

### Gamification Tables

#### achievements
- **Columns:** id (TEXT), name (TEXT), description (TEXT), category (TEXT), icon (TEXT), xp_reward (INTEGER), tier (TEXT), criteria (JSONB)
- **Pre-populated:** 23 achievements across 6 tiers (bronze, silver, gold, diamond, platinum, legendary)

#### challenges
- **Columns:** id (UUID), name (TEXT), description (TEXT), type (TEXT), start_date (TIMESTAMPTZ), end_date (TIMESTAMPTZ), criteria (JSONB), rewards (JSONB)

#### user_challenges
- **Columns:** id (UUID), user_id (TEXT), challenge_id (UUID), progress (JSONB), completed (BOOLEAN)

#### rewards
- **Columns:** id (UUID), name (TEXT), description (TEXT), type (TEXT), value (TEXT), xp_cost (INTEGER)

#### user_rewards
- **Columns:** id (UUID), user_id (TEXT), reward_id (UUID), earned_at (TIMESTAMPTZ)

### Integration Tables

#### webhook_events
- **Columns:** id (UUID), source (TEXT), form_id (TEXT), submission_id (TEXT), data (JSONB), received_at (TIMESTAMPTZ), processed (BOOLEAN)

#### integration_sync_status
- **Columns:** id (UUID), user_id (TEXT), integration_type (TEXT), last_sync (TIMESTAMPTZ), last_webhook_received (TIMESTAMPTZ), sync_count (INTEGER), error_message (TEXT), status (TEXT), location_id (TEXT), oauth_tokens (JSONB), webhook_subscription_id (TEXT)
- **Unique:** (user_id, integration_type)

#### integration_data
- **Columns:** id (UUID), user_id (TEXT), integration_type (TEXT), external_id (TEXT), data_type (TEXT), data (JSONB), synced_at (TIMESTAMPTZ)
- **Unique:** (user_id, integration_type, external_id, data_type)

### Universal Connector Tables

#### connector_definitions
- **Columns:** id (TEXT), name (TEXT), category (TEXT), icon_url (TEXT), description (TEXT), oauth_endpoints (JSONB), api_base_url (TEXT), connection_type (TEXT), required_scopes (TEXT[]), metadata (JSONB), enabled (BOOLEAN)

#### api_keys
- **Columns:** id (UUID), user_id (TEXT), key_hash (TEXT), name (TEXT), last_used_at (TIMESTAMPTZ), expires_at (TIMESTAMPTZ)
- **Unique:** key_hash

#### user_webhooks
- **Columns:** id (UUID), user_id (TEXT), url (TEXT), events (TEXT[]), secret (TEXT), status (TEXT), last_triggered_at (TIMESTAMPTZ), failure_count (INTEGER)

#### webhook_delivery_logs
- **Columns:** id (UUID), webhook_id (UUID), event_type (TEXT), payload (JSONB), response_status (INTEGER), response_body (TEXT), delivery_time_ms (INTEGER), success (BOOLEAN), error_message (TEXT)

### Audit & System Tables

#### audit_log
- **Columns:** id (UUID), user_id (UUID), action (TEXT), resource_type (TEXT), resource_id (TEXT), details (JSONB), timestamp (TIMESTAMPTZ)

#### error_log
- **Columns:** id (UUID), user_id (UUID), error_type (TEXT), error_message (TEXT), stack_trace (TEXT), context (JSONB), severity (TEXT), resolved (BOOLEAN), resolved_at (TIMESTAMPTZ)

#### system_settings
- **Columns:** id (UUID), key (TEXT), value (JSONB), description (TEXT)

#### data_backups
- **Columns:** id (UUID), backup_type (TEXT), data (JSONB), created_at (TIMESTAMPTZ)

## Integration Encyclopedia

### Jotform Integration
- **Type:** API Key authentication
- **Files:** 
  - `src/lib/integrations.js` (JotformClient class)
  - `supabase/functions/jotform-webhook/` (webhook handler)
- **API Base URL:** https://api.jotform.com
- **Configuration:** API key in settings
- **Data Synced:** Form submissions
- **Status:** 🟡 Partial (requires API key)
- **Documentation:** See `docs/integrations/INTEGRATION_SETUP.md`

### Marketsharp Integration
- **Type:** API Key authentication
- **Files:** `src/lib/integrations.js` (MarketsharpClient class)
- **API Base URL:** https://api.marketsharp.com
- **Configuration:** API key and company ID in settings
- **Data Synced:** Leads and contacts
- **Status:** 🟡 Partial (requires API key)
- **Documentation:** See integration files in `src/lib/integrations.js`

### GoHighLevel Integration
- **Type:** OAuth2 + API Key (hybrid)
- **Files:** 
  - `src/lib/integrations.js` (GoHighLevelClient class)
  - `src/lib/oauth.js` (OAuth utilities)
  - `supabase/functions/gohighlevel-webhook/` (webhook handler)
- **API Base URL:** https://services.leadconnectorhq.com
- **OAuth Endpoints:**
  - Authorization: https://marketplace.gohighlevel.com/oauth/chooselocation
  - Token: https://services.leadconnectorhq.com/oauth/token
- **Required Scopes:** contacts.readonly, contacts.write, opportunities.readonly, opportunities.write
- **Configuration:** Client ID, Client Secret, Location ID
- **Data Synced:** Contacts, opportunities, appointments
- **Status:** 🟡 Partial (requires OAuth setup)
- **Documentation:** `docs/integrations/gohighlevel-api.md`, `docs/integrations/INTEGRATION_SETUP.md`

### Zoom Integration
- **Type:** OAuth2
- **Files:**
  - `src/lib/integrations.js` (ZoomClient class)
  - `src/lib/oauth.js` (OAuth utilities)
  - `supabase/functions/zoom-webhook/` (webhook handler)
- **API Base URL:** https://api.zoom.us/v2
- **OAuth Flow:** Custom implementation in `src/lib/oauth.js`
- **Configuration:** Client ID, Client Secret, Redirect URI
- **Data Synced:** Meetings, meeting events
- **Status:** 🟡 Partial (requires OAuth setup)
- **Documentation:** `docs/integrations/zoom-api.md`, `docs/integrations/INTEGRATION_SETUP.md`

### Google OAuth (Universal Connector)
- **Type:** OAuth2 (for connector approval)
- **Files:** `src/lib/google-auth.js`
- **Usage:** Used for approving connector connections in Universal Connector system
- **Features:**
  - Google Sign-In with OAuth2
  - Token refresh management
  - User authentication state tracking
- **Status:** 🟡 Partial (requires setup)

### Universal Connector System
- **Type:** Universal OAuth2/API Key connector framework
- **Purpose:** Provides unified interface for connecting any app with Google OAuth approval layer
- **Components:**
  - **ConnectionWizard:** Multi-step wizard UI for connecting apps
  - **ConnectionsDashboard:** Management UI for active connections
  - **ConnectorCatalog:** App-store interface for browsing connectors
  - **WebhooksManager:** Webhook creation and management UI
- **Libraries:**
  - **ConnectionManager** (`src/lib/connectors/connection-manager.js`):
    - Unified connection interface for OAuth2 and API key connections
    - Google OAuth approval layer enforcement
    - Connection metadata storage and management
    - Status tracking and error handling
  - **OAuth2Manager** (`src/lib/connectors/oauth-manager.js`):
    - Provider-agnostic OAuth2 implementation
    - PKCE (Proof Key for Code Exchange) support
    - State parameter generation for CSRF protection
    - Token refresh and management
  - **ConnectorRegistry** (`src/lib/connectors/registry.js`):
    - Catalog of all connectable apps
    - Connector metadata management
    - Default connector definitions (Jotform, Marketsharp, GoHighLevel, Zoom)
    - Database-backed connector storage
  - **Google Auth** (`src/lib/google-auth.js`):
    - Google OAuth sign-in flow
    - Token exchange and refresh
    - User info retrieval
    - Authentication state management
  - **Webhooks** (`src/lib/webhooks.js`):
    - Webhook event emission
    - HMAC signature generation
    - Event payload formatting
- **Database Tables:**
  - `connector_definitions`: Catalog of connectable apps
  - `integration_sync_status`: Connection status and metadata (enhanced with Google approval metadata)
- **Files:**
  - `src/components/ConnectionWizard.jsx`
  - `src/components/ConnectionsDashboard.jsx`
  - `src/components/ConnectorCatalog.jsx`
  - `src/components/WebhooksManager.jsx`
  - `src/lib/connectors/connection-manager.js`
  - `src/lib/connectors/oauth-manager.js`
  - `src/lib/connectors/registry.js`
  - `src/lib/google-auth.js`
  - `src/lib/webhooks.js`
- **Status:** 🟢 Implemented (requires Google OAuth setup for approval layer)

### Supabase Integration
- **Type:** Backend-as-a-Service
- **Files:** 
  - `src/lib/supabase.js` (Supabase client)
  - `src/lib/sync.js` (Offline-first sync layer)
  - `src/lib/presence.js` (Real-time presence)
- **Project ID:** jzxmmtaloiglvclrmfjb
- **URL:** https://jzxmmtaloiglvclrmfjb.supabase.co
- **Features:** 
  - Database (PostgreSQL)
  - Real-time subscriptions (WebSocket)
  - Row-Level Security (RLS)
  - Edge Functions
- **Status:** 🟢 Active
- **Real-time:** Enabled on all tables

### Gemini AI Integration
- **Type:** API Key
- **Files:**
  - `src/lib/ai.js` (Text chat API)
  - `src/lib/voiceChat.js` (Voice chat with Live API)
- **API:** Google Gemini 2.0 Flash
- **Models:** 
  - Text: TEXT_MODELS array from `src/lib/ai.js`
  - Voice: LIVE_MODELS_FALLBACK from `src/lib/voiceChat.js`
- **Configuration:** REACT_APP_GEMINI_API_KEY (optional)
- **Features:** 
  - Text-based coaching chatbot
  - Voice chat with real-time WebSocket
  - Rate limited to 15 requests/minute
- **Status:** 🟡 Partial (requires API key)
- **Documentation:** `docs/gemini-ai/`

## Code Pattern Library

### Offline-First Sync Pattern

**Pattern:** Write locally first, queue for sync, sync when online

**Implementation:**
```javascript
// 1. Write to IndexedDB immediately
await storage.set('key', value);

// 2. Queue sync operation
await queueSyncOperation({
  type: 'update',
  table: 'users',
  data: value
});

// 3. Sync queue processes automatically when online
// (handled by processSyncQueue in src/lib/sync.js)
```

**Files:** `src/lib/sync.js`, `src/storage.js`
**Used In:** All CRUD operations in `src/App.jsx`

### Real-Time Subscription Pattern

**Pattern:** Subscribe to Supabase channels for live updates

**Implementation:**
```javascript
useEffect(() => {
  if (!isSupabaseConfigured() || !currentUser) return;

  const channel = supabase
    .channel('feed_posts_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'feed_posts',
    }, (payload) => {
      // Handle change
      refreshData();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscription active');
      }
    });

  return () => {
    channel.unsubscribe();
  };
}, [currentUser]);
```

**Files:** `src/App.jsx` (multiple useEffect hooks)
**Tables:** users, daily_logs, appointments, feed_posts, feed_likes, feed_comments

### React Hooks Order Pattern

**CRITICAL:** useState must be declared before useEffect that uses their setters

**Correct Order:**
```javascript
// ✅ CORRECT: All useState first
const [state1, setState1] = useState();
const [state2, setState2] = useState();

// Then useEffect hooks
useEffect(() => {
  setState1(value); // ✅ State already declared
  setState2(value); // ✅ State already declared
}, []);
```

**Incorrect Order (Bug Fixed in SettingsPage):**
```javascript
// ❌ WRONG: useEffect before useState
useEffect(() => {
  setState1(value); // ❌ State not declared yet!
}, []);

const [state1, setState1] = useState(); // ❌ Too late!
```

**Fix Applied:** Moved all integration state useState declarations (lines 8405-8431) to before useEffect hooks in SettingsPage

**Files:** `src/App.jsx` SettingsPage component (lines 8404-8517)

### Error Handling Pattern

**Pattern:** Try-catch with graceful degradation

**Implementation:**
```javascript
try {
  const result = await operation();
  // Success handling
} catch (error) {
  console.error('Operation failed:', error);
  // Graceful degradation
  // Show user-friendly error message
  // Fallback to local data if available
}
```

**Files:** Throughout `src/App.jsx`, `src/lib/sync.js`

### Validation Pattern

**Pattern:** Centralized validation functions

**Implementation:**
```javascript
const VALIDATIONS = {
  userName: (name) => {
    if (!name || name.trim().length === 0) return 'Name is required';
    if (name.length > 50) return 'Name must be under 50 characters';
    return null; // Valid
  },
  goalValue: (value) => {
    const num = parseInt(value);
    if (isNaN(num)) return 'Must be a number';
    if (num < 0) return 'Must be positive';
    if (num > 100) return 'Maximum is 100';
    return null; // Valid
  }
};
```

**Files:** `src/App.jsx` (VALIDATIONS constant)

## API Reference

### REST API Base URL
```
https://jzxmmtaloiglvclrmfjb.supabase.co/functions/v1/api
```

### Supabase Edge Functions

#### API Function (`supabase/functions/api/`)
- **Purpose:** Main REST API endpoint handler
- **Routes:**
  - `GET /health` - Health check (no auth required)
  - `GET /v1/users` - List all users
  - `GET /v1/users/:id` - Get user by ID
  - `POST /v1/users` - Create user
  - `PUT /v1/users/:id` - Update user
  - `DELETE /v1/users/:id` - Delete user
  - `GET /v1/daily-logs` - List daily logs (query params: date, user_id)
  - `POST /v1/daily-logs` - Create daily log entry
  - `PUT /v1/daily-logs/:id` - Update daily log
  - `DELETE /v1/daily-logs/:id` - Delete daily log
  - `GET /v1/appointments` - List appointments
  - `POST /v1/appointments` - Create appointment
  - `PUT /v1/appointments/:id` - Update appointment
  - `DELETE /v1/appointments/:id` - Delete appointment
  - `GET /v1/feed` - List feed posts
  - `POST /v1/feed` - Create feed post
  - `POST /v1/feed/:id/like` - Like a post
  - `POST /v1/feed/:id/comment` - Add comment to post
- **Authentication:** API Key in Authorization header (`Bearer YOUR_API_KEY`)
- **Rate Limit:** 100 requests per minute per API key
- **Files:** `supabase/functions/api/index.ts`, `supabase/functions/api/_shared/auth.ts`

#### Webhook Dispatcher (`supabase/functions/webhook-dispatcher/`)
- **Purpose:** Receives events and dispatches them to subscribed webhooks with signing and retry logic
- **Features:**
  - HMAC-SHA256 signature generation
  - Automatic retry with exponential backoff (max 3 retries)
  - Delivery logging to `webhook_delivery_logs` table
  - Webhook status management (active/inactive)
- **Events:** Supports all events in `user_webhooks.events` array
- **Files:** `supabase/functions/webhook-dispatcher/index.ts`

#### Google OAuth Callback (`supabase/functions/google-oauth-callback/`)
- **Purpose:** Handles Google OAuth callback after user approval
- **Flow:** Receives authorization code, exchanges for tokens, stores in database
- **Files:** `supabase/functions/google-oauth-callback/index.ts`

#### Google OAuth Refresh (`supabase/functions/google-oauth-refresh/`)
- **Purpose:** Refreshes expired Google OAuth tokens
- **Flow:** Checks token expiration, requests refresh, updates stored tokens
- **Files:** `supabase/functions/google-oauth-refresh/index.ts`

#### Jotform Webhook (`supabase/functions/jotform-webhook/`)
- **Purpose:** Receives webhook events from Jotform
- **Events:** Form submissions
- **Files:** `supabase/functions/jotform-webhook/index.ts`

#### GoHighLevel Webhook (`supabase/functions/gohighlevel-webhook/`)
- **Purpose:** Receives webhook events from GoHighLevel
- **Events:** Contact updates, opportunity changes, appointment events
- **Files:** `supabase/functions/gohighlevel-webhook/index.ts`

#### Zoom Webhook (`supabase/functions/zoom-webhook/`)
- **Purpose:** Receives webhook events from Zoom
- **Events:** Meeting events (created, updated, deleted, participant joined/left)
- **Files:** `supabase/functions/zoom-webhook/index.ts`

### Authentication
- **Method:** API Key in Authorization header
- **Format:** `Authorization: Bearer YOUR_API_KEY`
- **Generation:** Generate in app settings
- **Rate Limit:** 100 requests per minute per API key

### Endpoints

#### Health Check
- **GET /health** - Check API availability (no auth required)

#### Users
- **GET /v1/users** - List all users
- **GET /v1/users/:id** - Get user by ID
- **POST /v1/users** - Create user
- **PUT /v1/users/:id** - Update user
- **DELETE /v1/users/:id** - Delete user

#### Daily Logs
- **GET /v1/daily-logs** - List daily logs (query params: date, user_id)
- **POST /v1/daily-logs** - Create daily log entry
- **PUT /v1/daily-logs/:id** - Update daily log
- **DELETE /v1/daily-logs/:id** - Delete daily log

#### Appointments
- **GET /v1/appointments** - List appointments
- **POST /v1/appointments** - Create appointment
- **PUT /v1/appointments/:id** - Update appointment
- **DELETE /v1/appointments/:id** - Delete appointment

#### Feed
- **GET /v1/feed** - List feed posts
- **POST /v1/feed** - Create feed post
- **POST /v1/feed/:id/like** - Like a post
- **POST /v1/feed/:id/comment** - Add comment to post

### Webhooks

#### Outbound Webhooks (User-Configured)
- **Events:** daily_log.created, appointment.created, feed_post.created
- **Configuration:** Set up in app settings
- **Authentication:** HMAC signature verification
- **Table:** user_webhooks

#### Inbound Webhooks
- **Jotform:** `supabase/functions/jotform-webhook/`
- **GoHighLevel:** `supabase/functions/gohighlevel-webhook/`
- **Zoom:** `supabase/functions/zoom-webhook/`

### OAuth Flows

#### Zoom OAuth
1. User enters Client ID and Client Secret in settings
2. System generates authorization URL
3. User redirected to Zoom authorization page
4. User approves and returns with code
5. System exchanges code for access token
6. Token stored encrypted in integration_sync_status table

#### GoHighLevel OAuth
1. User enters Client ID and Client Secret in settings
2. System generates authorization URL with location selection
3. User redirected to GoHighLevel marketplace
4. User selects location and approves
5. System exchanges code for access token
6. Token stored encrypted in integration_sync_status table

**Files:** `src/lib/oauth.js`, `src/lib/integrations.js`

## Recent Changes

### 2025-01-16
- ✅ Fixed React hooks order violation in SettingsPage
- ✅ Verified all useState declarations are before useEffect hooks
- ✅ Created comprehensive CONTEXT.md with all dependencies, schema, patterns, and API docs
- ✅ Created RIPPLE_INDEX.md for large file navigation
- ✅ Documented all integrations and code patterns
- ✅ Implemented Universal Connector System:
  - ConnectionWizard component for multi-step app connection flow
  - ConnectionsDashboard component for managing active connections
  - ConnectorCatalog component for browsing available connectors
  - WebhooksManager component for webhook management
  - ConnectionManager library for unified connection interface
  - OAuth2Manager library for provider-agnostic OAuth2 flows
  - ConnectorRegistry library for connector catalog management
  - Google Auth library for OAuth approval layer
  - Webhooks library for event emission
- ✅ Added Supabase Edge Functions:
  - REST API function (`supabase/functions/api/`)
  - Webhook Dispatcher function for event delivery
  - Google OAuth Callback and Refresh functions
  - Integration webhook handlers (Jotform, GoHighLevel, Zoom)
- ✅ Updated Component Health Matrix with new Universal Connector components
- ✅ Synchronized CONTEXT.md and RIPPLE_INDEX.md documentation
- ✅ Fixed SettingsPage status inconsistency in Component Health Matrix
- ✅ Created ErrorBoundary component for error handling (ERROR-001 resolved)
- ✅ Wrapped app with ErrorBoundary in src/index.js
- ✅ All linting errors resolved

---

*This document should be updated after every significant change to the codebase.*
