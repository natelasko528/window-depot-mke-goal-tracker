---
name: Comprehensive Context Enhancement and Settings Fix Completion
overview: Expand CONTEXT.md using RIPPLE strategy to become the complete context repository (1000+ lines), then complete SettingsPage fix verification and pending tasks. CONTEXT.md will serve as the "infinite context" dump replacing conversation history.
todos:
  - id: context-1
    content: Extract and document all dependencies and versions from package.json into CONTEXT.md
    status: completed
  - id: context-2
    content: Extract and document all environment variables and configuration requirements into CONTEXT.md
    status: completed
  - id: context-3
    content: Extract and document complete database schema from all migration files into CONTEXT.md
    status: completed
  - id: context-4
    content: Extract and document complete component details for all 15 components in App.jsx into CONTEXT.md
    status: in_progress
  - id: context-5
    content: Extract and document all integration patterns (Jotform, Marketsharp, GoHighLevel, Zoom, Gemini, Supabase) into CONTEXT.md
    status: completed
  - id: context-6
    content: Extract and document all code patterns (offline-first, real-time, hooks order, error handling) with examples into CONTEXT.md
    status: completed
  - id: context-7
    content: Extract and document all API endpoints, webhooks, and OAuth flows into CONTEXT.md
    status: completed
  - id: fix-verify-1
    content: Verify SettingsPage hooks order fix was applied correctly by reading relevant section of App.jsx
    status: completed
  - id: fix-verify-2
    content: Check SettingsPage imports, handlers, and error handling are complete
    status: completed
  - id: test-1
    content: Test settings page - verify all tabs work, no console errors, all functionality works (manual or browser tools)
    status: pending
  - id: docs-1
    content: Update PROJECT_RULES.md and docs/README.md to reference CONTEXT.md as single source of truth and RIPPLE_INDEX.md for navigation
    status: completed
  - id: workflow-1
    content: Create context maintenance workflow document explaining when and how to update CONTEXT.md
    status: completed
---

# Comprehensive Context Enhancement and Settings Fix Completion

## Problem Analysis

**Current State:**

- `CONTEXT.md` is ~175 lines - too minimal for RIPPLE's purpose
- `CONTEXT.md` should contain ALL context (like conversation history) that can be queried
- SettingsPage fix was applied but not fully verified
- Pending tasks: test-1, docs-1, workflow-1

**RIPPLE Skill Philosophy:**

- Context should be stored externally (CONTEXT.md) not maintained by AI
- CONTEXT.md should be queryable database of ALL knowledge
- Should contain: code patterns, decisions, issues, configurations, history, examples

**Gap Analysis:**

CONTEXT.md currently missing:

- Complete component documentation (not just line numbers)
- Full integration details and API patterns
- All environment variables and configurations
- Complete database schema documentation
- All code patterns and examples
- Historical context (why decisions were made)
- All error patterns and solutions
- Complete workflow documentation
- All dependencies with versions
- Performance baselines and optimizations
- Security considerations
- Testing patterns
- Deployment configurations

## Solution Architecture

### Phase 1: RIPPLE-Based Context Extraction

**Use RIPPLE Strategy to extract ALL context:**

1. **Probe Structure** - Get complete file inventory
2. **Parallel Search** - Extract patterns across codebase
3. **Zoom** - Extract detailed sections
4. **Recurse** - Synthesize into comprehensive documentation

### Phase 2: Expand CONTEXT.md Sections

**Transform CONTEXT.md into comprehensive repository:**

1. **Quick Status** (existing) - Keep and enhance
2. **Component Deep Dives** - Full documentation for each component
3. **Integration Encyclopedia** - Complete integration details
4. **Pattern Library** - All code patterns with examples
5. **Configuration Catalog** - All env vars, configs, dependencies
6. **Database Schema Reference** - Complete schema documentation
7. **API Documentation** - All endpoints, webhooks, connectors
8. **Architecture Decisions** - Why choices were made
9. **Issue Registry** - All known issues with solutions
10. **Performance Baselines** - Metrics and optimizations
11. **Testing Patterns** - All test approaches
12. **Deployment Guide** - Complete deployment context
13. **Security Audit** - Security considerations
14. **Historical Context** - Decision timeline

### Phase 3: Complete SettingsPage Fix Verification

1. Verify hooks order fix was applied correctly
2. Check all imports and handlers
3. Verify error handling
4. Update CONTEXT.md with fix status

### Phase 4: Complete Pending Tasks

1. **test-1**: Test settings page (manual/browser tools)
2. **docs-1**: Update PROJECT_RULES.md and docs/README.md
3. **workflow-1**: Create context maintenance workflow

## Implementation Plan

### Task 1: RIPPLE Context Extraction - Dependencies and Versions

**Extract all dependencies from package.json and document:**

- React 18.2.0 and all React ecosystem packages
- Supabase client version and API details
- Google Gemini AI SDK versions
- UI libraries (Lucide React, Recharts)
- Build tools (react-scripts)
- Dev dependencies (Playwright)

**Add to CONTEXT.md:**

```markdown
## Dependencies and Versions

### Core Frameworks
- React: 18.2.0 (UI framework)
- React DOM: 18.2.0
- React Scripts: 5.0.1 (build tooling)

### Backend Services
- @supabase/supabase-js: 2.90.1
  - Project ID: jzxmmtaloiglvclrmfjb
  - URL: https://jzxmmtaloiglvclrmfjb.supabase.co
  - Region: us-east-1

### AI Services
- @google/genai: 1.0.0
- @google/generative-ai: 0.21.0

### UI Libraries
- lucide-react: 0.263.0 (icons)
- recharts: 2.8.0 (data visualization)

### Testing
- @playwright/test: 1.49.1
```

### Task 2: RIPPLE Context Extraction - Environment Variables

**Extract all environment variables from ENV_SETUP.md, VERCEL_ENV_SETUP.md:**

- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_ANON_KEY
- REACT_APP_GEMINI_API_KEY (optional)

**Add to CONTEXT.md:**

```markdown
## Environment Variables

### Required for Production
- REACT_APP_SUPABASE_URL: https://jzxmmtaloiglvclrmfjb.supabase.co
- REACT_APP_SUPABASE_ANON_KEY: [JWT token - see ENV_SETUP.md]

### Optional
- REACT_APP_GEMINI_API_KEY: For AI chatbot features

### Configuration Status
- Local: Configure via .env.local (gitignored)
- Vercel Production: Must be set in dashboard
- Status: ✅ Configured in production
```

### Task 3: RIPPLE Context Extraction - Database Schema

**Extract complete schema from all migration files:**

- 002_enable_realtime.sql
- 003_add_user_presence.sql
- 004_add_daily_snapshots.sql
- 005_enhance_feed_features.sql
- 006_gamification.sql
- 007_audit_log.sql
- 008_integrations.sql
- 009_universal_connector.sql

**Document all tables:**

- users, daily_logs, appointments, feed_posts, feed_likes, feed_comments
- achievements, challenges, user_challenges, rewards, user_rewards
- audit_log, error_log, system_settings
- integration_sync_status, connector_definitions, api_keys, user_webhooks

**Add to CONTEXT.md:**

```markdown
## Database Schema Reference

### Core Tables
[Complete schema documentation with columns, indexes, RLS policies]

### Gamification Tables
[Complete gamification schema]

### Integration Tables
[Complete integration schema]

### Universal Connector Tables
[Complete connector schema]
```

### Task 4: RIPPLE Context Extraction - Component Deep Dives

**For each component in App.jsx, extract:**

- Full props interface
- All state variables with types
- All useEffect hooks with dependencies
- All handlers and their purposes
- All integration points
- Known issues and patterns

**Components to document:**

1. WindowDepotTracker (main component)
2. UserSelection
3. Dashboard
4. Goals
5. Appointments
6. Feed
7. Leaderboard
8. HistoryView
9. ActiveUsersList
10. Chatbot
11. TeamView
12. AdminPanel
13. Reports
14. SettingsPage (with fix details)
15. BottomNav

**Add to CONTEXT.md:**

```markdown
## Component Deep Dives

### SettingsPage Component
- Location: src/App.jsx lines 8364-11092
- Size: 2,728 lines
- State Variables: [complete list with line numbers]
- useEffect Hooks: [complete list with dependencies]
- Handlers: [complete list]
- Integration Points: [all integrations]
- Known Issues:
  - SETTINGS-001: React hooks order violation (FIXED)
- Fix Applied: [details of fix]
```

### Task 5: RIPPLE Context Extraction - Integration Patterns

**Extract all integration details:**

- Jotform (API key auth)
- Marketsharp (API key auth)
- GoHighLevel (OAuth2 + API)
- Zoom (OAuth2)
- Google OAuth (for universal connector)
- Supabase (backend sync)
- Gemini AI (API key)

**Document:**

- Authentication flows
- API endpoints used
- Webhook handlers
- Error handling patterns
- Configuration requirements

**Add to CONTEXT.md:**

```markdown
## Integration Encyclopedia

### Jotform Integration
- Type: API Key authentication
- Files: src/lib/integrations.js (JotformClient)
- Webhook: supabase/functions/jotform-webhook/
- Configuration: API key in settings
- Status: 🟡 Partial (requires API key)

### GoHighLevel Integration
- Type: OAuth2 + API
- Files: src/lib/integrations.js (GoHighLevelClient), src/lib/oauth.js
- Webhook: supabase/functions/gohighlevel-webhook/
- OAuth Flow: [detailed flow]
- Configuration: Client ID, Client Secret, Location ID
- Status: 🟡 Partial (requires OAuth setup)

[Continue for all integrations...]
```

### Task 6: RIPPLE Context Extraction - Code Patterns

**Extract all reusable patterns:**

- Offline-first sync pattern
- Real-time subscription pattern
- State management pattern
- Error handling pattern
- Validation pattern
- Performance optimization patterns
- Accessibility patterns

**Add to CONTEXT.md with code examples:**

```markdown
## Code Pattern Library

### Offline-First Sync Pattern
[Complete pattern with example code]

### Real-Time Subscription Pattern
[Complete pattern with example code]

### React Hooks Order Pattern
**CRITICAL**: useState must be declared before useEffect that uses setters
[Example of correct order]
[Example of violation (SettingsPage bug)]
[Fix pattern]
```

### Task 7: RIPPLE Context Extraction - API and Webhooks

**Document all API endpoints:**

- REST API endpoints (from docs/api/)
- Webhook endpoints
- OAuth endpoints
- Supabase Edge Functions

**Add to CONTEXT.md:**

```markdown
## API Reference

### REST API Base URL
https://jzxmmtaloiglvclrmfjb.supabase.co/functions/v1/api

### Endpoints
[Complete endpoint documentation]

### Webhooks
[Complete webhook documentation]

### Authentication
[Complete auth documentation]
```

### Task 8: Verify SettingsPage Fix

**Steps:**

1. Read src/App.jsx around lines 8394-8610 to verify hooks order
2. Verify all useState declarations are before useEffect hooks
3. Check all imports are present
4. Verify all handlers are defined
5. Check error handling
6. Update CONTEXT.md with fix status

### Task 9: Test SettingsPage (if browser tools available)

**If browser tools work:**

1. Start dev server
2. Navigate to settings page
3. Test all tabs
4. Check console for errors
5. Verify all functionality

**If browser tools unavailable:**

1. Manual code review
2. Lint check
3. Document manual testing steps for user

### Task 10: Update Documentation

**Update PROJECT_RULES.md:**

- Add reference to CONTEXT.md as single source of truth
- Add reference to RIPPLE_INDEX.md for large file navigation
- Update workflow to check CONTEXT.md first

**Update docs/README.md:**

- Add CONTEXT.md to documentation index
- Explain RIPPLE strategy
- Link to RIPPLE_INDEX.md

### Task 11: Create Context Maintenance Workflow

**Create workflow document for maintaining CONTEXT.md:**

- When to update CONTEXT.md
- How to update (which sections)
- Format standards
- Update frequency
- Integration with git workflow

## Success Criteria

1. **CONTEXT.md expanded to 1000+ lines** with comprehensive context
2. **All code patterns documented** with examples
3. **All integrations fully documented**
4. **All database schemas documented**
5. **SettingsPage fix verified** and documented
6. **All pending tasks completed**
7. **Documentation updated** to reference CONTEXT.md
8. **Maintenance workflow established**

## File Changes

### Files to Modify:

- `CONTEXT.md` - Expand from ~175 lines to 1000+ lines
- `PROJECT_RULES.md` - Add CONTEXT.md references
- `docs/README.md` - Add CONTEXT.md to index

### Files to Read (for context extraction):

- `src/App.jsx` - Component documentation
- `package.json` - Dependencies
- `supabase/migrations/*.sql` - Database schema
- `src/lib/*.js` - Integration patterns
- `docs/**/*.md` - Documentation patterns
- `ENV_SETUP.md`, `VERCEL_ENV_SETUP.md` - Environment configs

### Files to Create:

- `.cursor/workflows/context-maintenance.md` - Maintenance workflow (optional)

## Implementation Order

1. **Extract dependencies and versions** (Task 1)
2. **Extract environment variables** (Task 2)
3. **Extract database schema** (Task 3)
4. **Extract component details** (Task 4)
5. **Extract integration patterns** (Task 5)
6. **Extract code patterns** (Task 6)
7. **Extract API documentation** (Task 7)
8. **Verify SettingsPage fix** (Task 8)
9. **Test SettingsPage** (Task 9 - conditional)
10. **Update documentation** (Task 10)
11. **Create maintenance workflow** (Task 11)

## Notes

- Use RIPPLE strategy for all extraction tasks (Probe → Search → Zoom → Recurse)
- For large files (App.jsx), use RIPPLE_INDEX.md to navigate
- Update CONTEXT.md incrementally as sections are completed
- Maintain existing CONTEXT.md structure while expanding content
- Use grep and codebase_search for pattern extraction
- Read file sections with offset/limit for targeted extraction