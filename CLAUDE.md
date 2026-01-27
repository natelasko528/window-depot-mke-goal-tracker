# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development Server
```bash
npm start
```
Starts development server at http://localhost:3000

### Production Build
```bash
npm run build
```
Creates optimized production build in `build/` directory

### Testing

**Unit Tests (Create React App):**
```bash
npm test
```

**E2E Tests (Playwright):**
```bash
npm run test:e2e           # Run all E2E tests
npm run test:e2e:headed    # Run with browser visible
npm run test:e2e:ui        # Run with Playwright UI
npm run test:e2e:debug     # Debug mode
npm run test:e2e:chromium  # Run only on Chromium
npm run playwright:install # Install browser dependencies
```

Playwright tests are located in `*playwright*.spec.js` files at the project root.

## Architecture Overview

### Data Storage Strategy: Hybrid Local-First with Cloud Sync

This application uses a **local-first architecture** with optional cloud synchronization via Supabase:

- **Primary Storage**: IndexedDB via `src/storage.js` adapter (exposes `window.storage` API)
- **Cloud Backend**: Supabase (PostgreSQL with real-time subscriptions)
- **Sync Layer**: `src/lib/sync.js` handles bidirectional sync with offline queue
- **Offline Support**: Full app functionality without network connection

The app will work entirely offline if Supabase credentials are not configured. When configured, it syncs data bidirectionally and provides real-time updates across users.

### Single-File Architecture for UI

The primary application UI is contained in `src/App.jsx` (~12,400 lines). This is an intentional monolithic design choice. Most React components, state management, and business logic for the UI layer are in this single file.

**Key sections in App.jsx:**
- Constants: Categories, product interests, appointment status/outcomes, time slots
- Validation utilities with input sanitization (`VALIDATIONS`, `sanitizeInput()`)
- Storage wrapper functions
- Utility functions (date formatting, statistics calculations)
- Main App component with all state management
- Inline component definitions:
  - `UserSelection` - User login/creation
  - `Dashboard` - Daily goals and stats overview
  - `Goals` - Goal configuration per category
  - `Appointments` - Customer appointment management
  - `Feed` - Social feed with posts, likes, comments
  - `Challenges` - Team challenges and competitions
  - `Leaderboard` - Weekly rankings with badges
  - `HistoryView` - Historical data and statistics
  - `Chatbot` - AI coaching assistant
  - `TeamView` - Manager team overview
  - `AdminPanel` - User management and admin controls
  - `Reports` - Analytics with charts (Recharts)
  - `SettingsPage` - App preferences and integrations
  - `BottomNav` - Mobile navigation

### Separate Components (`src/components/`)

Some complex features are split into separate component files:
- `OnboardingFlow.jsx` - Welcome screen and setup checklist for new users
- `ConnectionWizard.jsx` - Multi-step wizard for third-party integrations
- `ConnectionsDashboard.jsx` - Manage connected services
- `ConnectorCatalog.jsx` - Browse available integrations
- `WebhooksManager.jsx` - Configure webhook endpoints
- `ErrorBoundary.jsx` - Error handling wrapper
- `DebugLogger.jsx` - Development debugging tool

### Library Modules (`src/lib/`)

**Core Infrastructure:**
- `supabase.js` - Supabase client initialization
- `supabase-health.js` - Connection health monitoring
- `sync.js` - Queue-based sync with offline support
- `presence.js` - Real-time user presence tracking
- `storage.js` (in src/) - IndexedDB adapter with retry logic
- `snapshots.js` - Daily data snapshots for historical tracking

**AI & Voice:**
- `ai.js` - Gemini 2.0 Flash integration for text-based coaching
- `aiToolDefinitions.js` - Function calling schema definitions
- `aiTools.js` - Tool implementations for AI function calling
- `voiceChat.js` - Gemini Live API voice conversation (WebSocket-based)

**Integrations:**
- `integrations.js` - Third-party API clients (Jotform, MarketSharp, GoHighLevel, Zoom)
- `webhooks.js` - Webhook management and triggers
- `oauth.js` - OAuth 2.0 flow handling
- `google-auth.js` - Google OAuth integration
- `connectors/registry.js` - Connector plugin registry
- `connectors/oauth-manager.js` - OAuth state management
- `connectors/connection-manager.js` - Connection lifecycle management

**Utilities:**
- `encryption.js` - API key encryption/decryption
- `theme.js` - Theme management (light/dark mode)
- `accessibility.js` - WCAG AA compliant utilities (ARIA, focus management)
- `performance.js` - Optimization utilities (debounce, throttle, virtual scroll, memoization)

### Database Schema (Supabase)

Migrations are in `supabase/migrations/` and numbered sequentially (002-011).

**Core Tables:**
- `users` - User profiles with name, role, goals, XP, level, streaks, achievements
- `daily_logs` - Daily activity counts by user/date/category
- `appointments` - Customer appointments with product interests and outcomes
- `daily_snapshots` - Historical data snapshots

**Social Tables:**
- `feed_posts` - Social posts (types: achievement, manual, announcement, challenge)
- `feed_likes` - Post likes
- `feed_comments` - Post comments
- `user_presence` - Real-time online status

**Gamification Tables:**
- `achievements` - Achievement definitions with criteria and rewards
- `challenges` - Team challenges with goals and timeframes
- `user_challenges` - User participation in challenges

**System Tables:**
- `audit_log` - Activity audit trail (supports AI-initiated actions)
- `ai_chat_history` - AI conversation storage for analysis
- `integrations` - Third-party integration configurations
- `connectors` - Universal connector definitions
- `webhooks` - Webhook endpoint configurations

Real-time replication is enabled on all tables via Supabase publications.

### Data Flow

1. **User Action** -> Updates local IndexedDB immediately
2. **If Online** -> Queues sync operation to Supabase
3. **Sync Queue** -> Processes operations with retry logic (3 attempts, exponential backoff)
4. **Real-time Subscription** -> Broadcasts changes to other connected users
5. **Other Clients** -> Receive update via WebSocket, refresh local data

### State Management

All state is managed via React hooks in `src/App.jsx`:
- `useState` for UI state and data
- `useEffect` for data loading, sync initialization, and subscriptions
- `useMemo` for computed values (leaderboards, statistics)
- `useCallback` for optimized event handlers
- `useRef` for DOM references and persistence

No Redux, Context API, or other state management libraries.

### Key Features

**Goal Tracking:** Users track 3 categories (reviews, demos, callbacks) against daily goals

**Appointments:** Log customer appointments with:
- Product interests (windows, doors, siding, roof, gutters, flooring, bathroom, solar)
- Status tracking (scheduled, confirmed, in_progress, completed, cancelled, etc.)
- Outcome recording (sale, no_sale, follow_up, demo_scheduled, etc.)

**Social Feed:** Auto-posts for achievements + manual posts with likes/comments

**Challenges:** Team-wide or individual challenges with time limits and progress tracking

**Gamification:**
- XP and leveling system
- Streak tracking (current and longest)
- Achievements with tiers (bronze, silver, gold, diamond, platinum, legendary)
- Progress tracking toward achievements

**Leaderboard:** Weekly rankings with gold/silver/bronze badges

**Manager Dashboard:** Team overview, reports with charts (Recharts), admin controls

**Active Users:** Real-time presence indicator showing who's online and their current view

**AI Chatbot:**
- Text-based coaching via Gemini 2.0 Flash
- Function calling for data access (stats, appointments, achievements)
- Manager-only tools (team stats, create challenges)
- Voice chat via Gemini Live API (WebSocket)

**Third-Party Integrations:**
- Jotform - Form data sync
- MarketSharp - CRM integration
- GoHighLevel - Marketing automation
- Zoom - Meeting integration with OAuth

**Accessibility:** WCAG AA compliant with ARIA labels, keyboard navigation, screen reader support

## Environment Variables

Create `.env.local` for local development:

```
# Required for cloud sync
REACT_APP_SUPABASE_URL=<your-supabase-url>
REACT_APP_SUPABASE_ANON_KEY=<your-anon-key>

# Optional - AI features
REACT_APP_GEMINI_API_KEY=<for-ai-chatbot>

# Optional - Integrations
REACT_APP_JOTFORM_API_KEY=<jotform-api-key>
REACT_APP_ZOOM_CLIENT_ID=<zoom-oauth-client-id>
REACT_APP_ZOOM_CLIENT_SECRET=<zoom-oauth-client-secret>
```

The app gracefully handles missing credentials and runs in offline-only mode.

## Deployment

- **Platform**: Vercel
- **Production URL**: https://window-depot-mke-goal-tracker.vercel.app
- **Build Output**: `build/` directory (static files)
- **Branch**: Deploys from `master`
- **SPA Routing**: Configured via `vercel.json` rewrites

Configure environment variables in Vercel dashboard for production deployment.

## Code Patterns

### Adding New Features

Since the app is largely monolithic, new features should:
1. Add any new storage keys to the storage initialization in App.jsx
2. Add state variables in the main App component
3. Create inline component functions within App.jsx (or separate file for complex features)
4. Add navigation in the existing nav structure
5. If using Supabase, add sync functions to `src/lib/sync.js`
6. Update database schema via SQL files in `supabase/migrations/` (use sequential numbering)
7. If adding AI capabilities, update `aiToolDefinitions.js` and `aiTools.js`

### Validation

Always use the `VALIDATIONS` object for input validation and `sanitizeInput()` for text inputs to prevent XSS. Validation functions return error strings or null.

```javascript
const error = VALIDATIONS.name(inputValue);
if (error) {
  showToast(error, 'error');
  return;
}
const sanitized = sanitizeInput(inputValue);
```

### Storage Operations

Always use the storage wrapper with error handling:
```javascript
const data = await storage.get('key', defaultValue);
await storage.set('key', value);
await storage.delete('key');
```

Never directly access `window.storage` without the wrapper.

### Sync Operations

For Supabase operations, queue them for offline support:
```javascript
await queueSyncOperation({
  type: 'insert', // or 'update', 'upsert', 'delete'
  table: 'table_name',
  data: { ...snakeCaseData },
});
```

### AI Tool Development

To add new AI tools:
1. Define the tool schema in `src/lib/aiToolDefinitions.js`
2. Implement the tool function in `src/lib/aiTools.js`
3. Export and register in the appropriate tool array (employee or manager tools)

Tools receive `args` and `context` (containing `currentUser`, storage functions, etc.)

### Theme Support

Use the `theme` prop passed to components for styling:
```javascript
style={{
  backgroundColor: theme.cardBg,
  color: theme.text,
  borderColor: theme.border
}}
```

Theme modes: `light` and `dark`

### Accessibility

Use ARIA labels from `src/lib/accessibility.js`:
```javascript
import { ariaLabels } from './lib/accessibility';

<button aria-label={ariaLabels.goalIncrement('Reviews', 3, 5)}>
```

## Important Notes

- The app uses **camelCase** in JavaScript but **snake_case** in database columns
- All dates are stored as ISO strings (YYYY-MM-DD format)
- User IDs are UUIDs generated in the frontend
- The app is mobile-first with responsive design
- No authentication system - users are identified by ID only (stored in localStorage)
- IndexedDB database name: `WindowDepotTracker`
- Sync interval: 5 seconds when online
- AI rate limit: 15 requests per minute
- Voice chat uses WebSocket connection to Gemini Live API at 16kHz input / 24kHz output

## File Structure Summary

```
window-depot-mke-goal-tracker/
├── src/
│   ├── App.jsx                 # Main application (~12,400 lines)
│   ├── index.js                # React entry point
│   ├── storage.js              # IndexedDB adapter
│   ├── lib/
│   │   ├── ai.js               # Gemini AI integration
│   │   ├── aiTools.js          # AI function implementations
│   │   ├── aiToolDefinitions.js# AI function schemas
│   │   ├── voiceChat.js        # Voice chat (Gemini Live)
│   │   ├── sync.js             # Supabase sync layer
│   │   ├── presence.js         # User presence tracking
│   │   ├── supabase.js         # Supabase client
│   │   ├── integrations.js     # Third-party integrations
│   │   ├── accessibility.js    # WCAG utilities
│   │   ├── performance.js      # Optimization utilities
│   │   └── ...
│   └── components/
│       ├── OnboardingFlow.jsx
│       ├── ConnectionWizard.jsx
│       └── ...
├── supabase/
│   └── migrations/             # Database migrations (002-011)
├── docs/                       # Documentation
├── playwright.config.js        # E2E test configuration
├── vercel.json                 # Vercel deployment config
└── package.json
```
