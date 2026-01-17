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
```bash
npm test
```
Runs the test suite with Create React App's test runner

## Architecture Overview

### Data Storage Strategy: Hybrid Local-First with Cloud Sync

This application uses a **local-first architecture** with optional cloud synchronization via Supabase:

- **Primary Storage**: IndexedDB via `src/storage.js` adapter (exposes `window.storage` API)
- **Cloud Backend**: Supabase (PostgreSQL with real-time subscriptions)
- **Sync Layer**: `src/lib/sync.js` handles bidirectional sync with offline queue
- **Offline Support**: Full app functionality without network connection

The app will work entirely offline if Supabase credentials are not configured. When configured, it syncs data bidirectionally and provides real-time updates across users.

### Single-File Architecture

The entire application UI is contained in `src/App.jsx` (~4000+ lines). This is an intentional monolithic design choice. All React components, state management, and business logic for the UI layer are in this single file.

**Key sections in App.jsx:**
- Theme constants and configuration
- Validation utilities with input sanitization
- Storage wrapper functions
- Utility functions (date formatting, statistics calculations)
- Main App component with all state management
- Inline component definitions (Dashboard, Feed, Leaderboard, Manager views, etc.)

### Supporting Infrastructure

**Storage Layer** (`src/storage.js`):
- IndexedDB adapter with retry logic
- Provides async `get()`, `set()`, `delete()` methods
- Auto-serializes/deserializes JSON
- Made globally available as `window.storage`

**Sync Layer** (`src/lib/sync.js`):
- Queue-based sync system for offline operations
- Syncs 4 main data types: users, daily_logs, appointments, feed_posts
- Auto-retry with exponential backoff (3 attempts)
- Transforms between app format (camelCase) and database format (snake_case)
- Periodic sync every 5 seconds when online

**Presence System** (`src/lib/presence.js`):
- Real-time user presence tracking via Supabase channels
- Shows who's currently online and what view they're on
- Graceful degradation if Supabase not configured

**AI Chatbot** (`src/lib/ai.js`):
- Google Gemini 2.0 Flash integration for in-app coaching
- Rate limited to 15 requests/minute
- Context-aware responses (user stats, goals, progress)
- Optional feature (requires `REACT_APP_GEMINI_API_KEY`)

### Database Schema (Supabase)

**Tables:**
- `users`: User profiles with name, role, and goals
- `daily_logs`: Daily activity counts by user/date/category
- `appointments`: Customer appointments with product interests
- `feed_posts`: Social feed posts (auto-generated and manual)
- `feed_likes`: Like relationships
- `feed_comments`: Comment threads on posts

Real-time replication is enabled on all tables via migrations in `supabase/migrations/`.

### Data Flow

1. **User Action** → Updates local IndexedDB immediately
2. **If Online** → Queues sync operation to Supabase
3. **Sync Queue** → Processes operations with retry logic
4. **Real-time Subscription** → Broadcasts changes to other connected users
5. **Other Clients** → Receive update via WebSocket, refresh local data

### State Management

All state is managed via React hooks in `src/App.jsx`:
- `useState` for UI state and data
- `useEffect` for data loading, sync initialization, and subscriptions
- `useMemo` for computed values (leaderboards, statistics)
- `useCallback` for optimized event handlers

No Redux, Context API, or other state management libraries.

### Key Features

**Goal Tracking**: Users track 3 categories (reviews, demos, callbacks) against daily goals
**Appointments**: Log customer appointments with product interests
**Social Feed**: Auto-posts for achievements + manual posts with likes/comments
**Leaderboard**: Weekly rankings with gold/silver/bronze badges
**Manager Dashboard**: Team overview, reports with charts (Recharts), admin controls
**Active Users**: Real-time presence indicator showing who's online
**AI Chatbot**: Optional coaching assistant with user context

## Environment Variables

Create `.env.local` for local development:

```
REACT_APP_SUPABASE_URL=<your-supabase-url>
REACT_APP_SUPABASE_ANON_KEY=<your-anon-key>
REACT_APP_GEMINI_API_KEY=<optional-for-ai-chatbot>
```

The app gracefully handles missing credentials and runs in offline-only mode.

## Deployment

- **Platform**: Vercel
- **Production URL**: https://window-depot-mke-goal-tracker.vercel.app
- **Build Output**: `build/` directory (static files)
- **Branch**: Deploys from `master`

Configure environment variables in Vercel dashboard for production deployment.

## Code Patterns

### Adding New Features

Since the app is monolithic, new features should:
1. Add any new storage keys to the storage initialization in App.jsx
2. Add state variables in the main App component
3. Create inline component functions within App.jsx
4. Add navigation in the existing nav structure
5. If using Supabase, add sync functions to `src/lib/sync.js`
6. Update database schema via SQL files in `supabase/migrations/`

### Validation

Always use the `VALIDATIONS` object for input validation and `sanitizeInput()` for text inputs to prevent XSS. Validation functions return error strings or null.

### Storage Operations

Always use the storage wrapper with error handling:
```javascript
const data = await storage.get('key', defaultValue);
await storage.set('key', value);
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

## Important Notes

- The app uses **camelCase** in JavaScript but **snake_case** in database columns
- All dates are stored as ISO strings (YYYY-MM-DD format)
- User IDs are UUIDs generated in the frontend
- The app is mobile-first with responsive design
- No authentication system - users are identified by ID only
- IndexedDB database name: `WindowDepotTracker`
