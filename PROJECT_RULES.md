# PROJECT_RULES.md

## Overview

This file provides comprehensive skill instructions for the **Window Depot Daily Goal Tracker** project. It references skills from `cursor-skill.md` and `project-rules.md`, and provides project-specific context and quick reference guides.

## Project Context

**Window Depot Daily Goal Tracker** is a daily goal tracking application for Window Depot Milwaukee employees featuring:

- **Offline-first architecture** with IndexedDB
- **Real-time synchronization** with Supabase
- **AI-powered coaching** (text and voice via Google Gemini)
- **Social feed** with likes and comments
- **Weekly leaderboards** and statistics
- **Appointment management**

## Tech Stack Quick Reference

### Core Frameworks
- **React 18.2.0** - UI framework (`src/App.jsx`)
  - Documentation: [`docs/react/`](./docs/react/)
  - Patterns: Functional components with hooks (useState, useEffect, useMemo, useCallback)

### UI Libraries
- **Recharts 2.8.0** - Data visualization
  - Documentation: [`docs/recharts/`](./docs/recharts/)
  - Usage: Leaderboards, statistics charts in `src/App.jsx`
- **Lucide React 0.263.0** - Icons
  - Documentation: [`docs/lucide-react/`](./docs/lucide-react/)
  - Usage: All icons throughout the app

### Backend & Database
- **Supabase** - Backend, database, real-time subscriptions
  - Documentation: [`docs/supabase/`](./docs/supabase/)
  - Files: `src/lib/supabase.js`, `supabase/migrations/`
  - Usage: Real-time subscriptions, database operations, presence tracking

### AI Integration
- **Google Gemini AI** - Text and voice chat
  - Documentation: [`docs/gemini-ai/`](./docs/gemini-ai/)
  - Files: `src/lib/ai.js` (text), `src/lib/voiceChat.js` (voice)
  - Usage: AI Coach for goal tracking

### Third-Party Integrations
- **Jotform** - Form submission sync
  - Documentation: See integration files in `src/lib/integrations.js`
  - Usage: Sync form submissions for lead tracking
- **Marketsharp** - CRM integration
  - Documentation: See integration files in `src/lib/integrations.js`
  - Usage: Sync leads and contacts from Marketsharp CRM
- **GoHighLevel** - CRM and appointment management
  - Documentation: [`docs/integrations/gohighlevel-api.md`](./docs/integrations/gohighlevel-api.md)
  - Files: `src/lib/integrations.js` (GoHighLevelClient), `supabase/functions/gohighlevel-webhook/`
  - Usage: Sync contacts, opportunities, and appointments
  - Setup: [`docs/integrations/INTEGRATION_SETUP.md`](./docs/integrations/INTEGRATION_SETUP.md)
- **Zoom Workplace** - Meeting management
  - Documentation: [`docs/integrations/zoom-api.md`](./docs/integrations/zoom-api.md)
  - Files: `src/lib/integrations.js` (ZoomClient), `src/lib/oauth.js`, `supabase/functions/zoom-webhook/`
  - Usage: Create and sync Zoom meetings, receive meeting webhooks
  - Setup: [`docs/integrations/INTEGRATION_SETUP.md`](./docs/integrations/INTEGRATION_SETUP.md)

### Storage
- **IndexedDB** - Client-side storage
  - Documentation: [`docs/indexeddb/`](./docs/indexeddb/)
  - File: `src/storage.js`
  - Usage: Offline-first data persistence

### Build & Deployment
- **React Scripts 5.0.1** - Build tooling
  - Documentation: [`docs/react-scripts/`](./docs/react-scripts/)
- **Vercel** - Deployment platform
  - Documentation: [`docs/vercel/`](./docs/vercel/)
  - Config: `vercel.json`

## Skills Reference

### ULTRATHINK Protocol

**When to use**: User prompts "ULTRATHINK"

**What it does**: 
- Suspends brevity rules
- Engages in exhaustive multi-dimensional analysis
- Analyzes through psychological, technical, accessibility, and scalability lenses
- Provides deep reasoning chains and edge case analysis

**Reference**: See `cursor-skill.md` and `project-rules.md` for details

### PRD Generation

**Triggers**: 
- "create a prd"
- "write prd for"
- "plan this feature"
- "requirements for"
- "spec out"

**Workflow**:
1. Ask 3-5 clarifying questions with lettered options (e.g., "1A, 2C, 3B")
2. Generate structured PRD with required sections:
   - Introduction/Overview
   - Goals
   - User Stories (with acceptance criteria)
   - Functional Requirements
   - Non-Goals
   - Design Considerations
   - Technical Considerations
   - Success Metrics
   - Open Questions
3. Save to `tasks/prd-[feature-name].md` using `write` tool
4. **DO NOT** start implementing - just create the PRD

**Output Format**: Markdown (`.md`), saved to `tasks/` directory

**Reference**: See `cursor-skill.md` → "PRD GENERATION CAPABILITIES" section

### Task Execution

**Task Sizing Rule**: Each task must be completable in ONE focused session

**Task Ordering** (CRITICAL):
1. Schema/database changes (migrations in `supabase/migrations/`)
2. Backend logic (`src/lib/` files)
3. UI components (`src/App.jsx`)

**Acceptance Criteria**:
- Must be verifiable (not vague)
- Always include "Typecheck passes"
- For UI tasks: include "Verify changes in browser"
- For testable logic: include "Tests pass"

**Reference**: See `cursor-skill.md` → "AUTONOMOUS TASK EXECUTION" section

### Frontend Design

**Philosophy**: "INTENTIONAL MINIMALISM"
- Anti-generic, uniqueness, purpose-driven
- No cookie-cutter design

**Library Discipline**: 
- Use existing UI libraries (Lucide React for icons)
- Do not create custom components if library provides them

**Aesthetics Guidelines**:
- Distinctive typography (avoid generic fonts)
- Cohesive color scheme with CSS variables
- Motion and animations for micro-interactions
- Unexpected layouts and spatial composition

**Reference**: See `cursor-skill.md` → "FRONTEND DESIGN CAPABILITIES" section

### MCP Server Usage

Available MCP servers:
- **Context7 MCP** - Documentation retrieval (use for `docs/` folder)
- **Chrome DevTools MCP** - Browser automation and testing
- **Supabase MCP** - Database operations and migrations
- **Vercel MCP** - Deployment and project management

**Reference**: See `cursor-skill.md` → "CURSOR-SPECIFIC CONFIGURATIONS" section

## Project-Specific Patterns

### Offline-First Architecture

1. **Write locally first**: All operations write to IndexedDB immediately (`src/storage.js`)
2. **Queue for sync**: Add operations to sync queue (`src/lib/sync.js`)
3. **Sync when online**: Background sync processes queue every 5 seconds
4. **Real-time updates**: Subscribe to Supabase channels for live updates

### Real-time Subscriptions

Pattern used in `src/App.jsx`:

```javascript
useEffect(() => {
  if (!isSupabaseConfigured() || !currentUser) return

  const channel = supabase
    .channel('feed_posts_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'feed_posts',
    }, (payload) => {
      // Handle change
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Feed posts subscription active')
      }
    })

  return () => {
    channel.unsubscribe()
  }
}, [currentUser])
```

### AI Integration

- **Text Chat**: Use `getAIResponse()` from `src/lib/ai.js`
- **Voice Chat**: Use `createVoiceChatSession()` from `src/lib/voiceChat.js`
- **Model Selection**: Configure via Settings (`appSettings.ai.model`, `appSettings.ai.voiceModel`)

### State Management

All state in `src/App.jsx` uses React hooks:
- `useState` - Local state
- `useEffect` - Side effects and subscriptions
- `useMemo` - Computed values (leaderboards, stats)
- `useCallback` - Event handlers

## Documentation Index

Comprehensive documentation is available in the `docs/` folder:

### React
- [`docs/react/react-api.md`](./docs/react/react-api.md) - Hooks, components, APIs
- [`docs/react/react-patterns.md`](./docs/react/react-patterns.md) - Patterns used in project

### Recharts
- [`docs/recharts/recharts-api.md`](./docs/recharts/recharts-api.md) - Component API reference
- [`docs/recharts/recharts-examples.md`](./docs/recharts/recharts-examples.md) - Chart examples

### Supabase
- [`docs/supabase/supabase-setup.md`](./docs/supabase/supabase-setup.md) - Configuration and setup
- [`docs/supabase/realtime.md`](./docs/supabase/realtime.md) - Real-time subscriptions
- [`docs/supabase/database.md`](./docs/supabase/database.md) - Database operations

### Gemini AI
- [`docs/gemini-ai/text-api.md`](./docs/gemini-ai/text-api.md) - Text generation API
- [`docs/gemini-ai/live-api.md`](./docs/gemini-ai/live-api.md) - Voice chat and WebSocket
- [`docs/gemini-ai/models.md`](./docs/gemini-ai/models.md) - Available models

### Integrations
- [`docs/integrations/gohighlevel-api.md`](./docs/integrations/gohighlevel-api.md) - GoHighLevel API reference
- [`docs/integrations/zoom-api.md`](./docs/integrations/zoom-api.md) - Zoom Workplace API reference
- [`docs/integrations/INTEGRATION_SETUP.md`](./docs/integrations/INTEGRATION_SETUP.md) - Setup instructions for all integrations

### Other
- [`docs/lucide-react/icons-guide.md`](./docs/lucide-react/icons-guide.md) - Icon usage
- [`docs/indexeddb/storage-patterns.md`](./docs/indexeddb/storage-patterns.md) - Storage patterns
- [`docs/react-scripts/build-config.md`](./docs/react-scripts/build-config.md) - Build configuration
- [`docs/vercel/deployment.md`](./docs/vercel/deployment.md) - Deployment guide

**Main Documentation Index**: [`docs/README.md`](./docs/README.md)

## Quick Command Reference

### ULTRATHINK Protocol
- **Trigger**: User prompts "ULTRATHINK"
- **Action**: Deep multi-dimensional analysis

### PRD Generation
- **Triggers**: "create a prd", "write prd for", "plan this feature"
- **Action**: Generate structured PRD, save to `tasks/prd-[feature-name].md`

### Task Conversion
- **Triggers**: "convert this prd", "create tasks from this"
- **Action**: Convert PRD to tasks.json format

### Frontend Design
- **Trigger**: Building any UI component
- **Action**: Apply "INTENTIONAL MINIMALISM", use existing libraries

### Documentation Lookup
- **Use Context7 MCP** for up-to-date library docs (70%+ token reduction)
- **Check `docs/` folder** for project-specific documentation
- **MANDATORY**: When making major changes (new integrations, API updates, architecture changes):
  1. Use Context7 MCP to fetch latest documentation
  2. Update relevant docs in `docs/` folder
  3. Update `PROJECT_RULES.md` if patterns change
  4. Commit documentation updates with code changes

## Workflow Patterns

### Pattern 1: Explore → Plan → Execute

1. **EXPLORE**: Use `codebase_search`, `read_file`, `list_dir`, `grep`
2. **PLAN**: Create PRD or reference existing one, use `todo_write` for tasks
3. **EXECUTE**: Implement incrementally, verify with `read_lints` and Chrome DevTools MCP

### Pattern 2: Documentation-Driven Development

1. **Before implementing**: Use Context7 MCP to retrieve latest library documentation
   - Use `mcp_Context7_resolve-library-id` to find library IDs
   - Use `mcp_Context7_query-docs` to get up-to-date API docs and examples
2. Check `docs/` folder for project-specific documentation patterns
3. Implement based on official patterns from Context7
4. **After implementing**: Update project documentation if needed
   - Create or update files in `docs/` folder
   - Update `PROJECT_RULES.md` if adding new integrations or changing patterns
5. Verify with tests and visual inspection

### Pattern 3: Offline-First Feature Development

1. Design for offline-first (IndexedDB writes first)
2. Implement sync layer (`src/lib/sync.js`)
3. Add real-time subscriptions (Supabase channels)
4. Test offline and online scenarios

## File Structure Reference

### Key Files
- `src/App.jsx` - Main application component
- `src/lib/supabase.js` - Supabase client
- `src/lib/sync.js` - Offline-first sync layer
- `src/lib/ai.js` - Gemini text API
- `src/lib/voiceChat.js` - Gemini Live API voice chat
- `src/lib/presence.js` - Real-time user presence
- `src/lib/integrations.js` - Third-party integrations (Jotform, Marketsharp, GoHighLevel, Zoom)
- `src/lib/oauth.js` - OAuth 2.0 utilities for Zoom and GoHighLevel
- `src/storage.js` - IndexedDB storage adapter
- `supabase/migrations/` - Database migrations
- `supabase/functions/jotform-webhook/` - Jotform webhook handler
- `supabase/functions/gohighlevel-webhook/` - GoHighLevel webhook handler
- `supabase/functions/zoom-webhook/` - Zoom webhook handler

### Configuration Files
- `package.json` - Dependencies and scripts
- `vercel.json` - Vercel deployment config
- `.env` - Environment variables (not in repo)

## Best Practices

1. **Read before write**: Always read files before editing
2. **Use existing libraries**: Don't recreate what's available (Lucide React, Recharts)
3. **Reference documentation**: Check `docs/` folder and Context7 MCP
4. **Verify changes**: Use `read_lints` and Chrome DevTools MCP
5. **Follow offline-first**: Write to IndexedDB first, sync when online
6. **Clean up subscriptions**: Always unsubscribe from Supabase channels in useEffect cleanup
7. **Always deploy and test**: After making changes, commit, push to trigger deployment, and test the production build using browser tools

## Summary Checklists

### Before Creating PRD:
- [ ] Asked clarifying questions with lettered options
- [ ] All questions answered
- [ ] PRD includes all required sections
- [ ] User stories are small and specific
- [ ] Saved to `tasks/prd-[feature-name].md`

### Before Implementing Feature:
- [ ] PRD created or referenced
- [ ] Tasks broken down into one-session chunks
- [ ] Tasks ordered by dependency (schema → backend → UI)
- [ ] Acceptance criteria are verifiable
- [ ] Documentation consulted (`docs/` folder or Context7 MCP)

### Before Committing:
- [ ] All tasks completed
- [ ] Typecheck passes
- [ ] Linting passes (`read_lints`)
- [ ] UI changes verified in browser (if applicable)
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if needed)

### After Making Changes (REQUIRED):
- [ ] **Always commit and push changes** to trigger Vercel deployment
- [ ] **Deploy to production** by pushing to `master` branch (or configured deployment branch)
- [ ] **Test deployed version** using browser tools (navigate to production URL)
- [ ] **Verify fixes work** in production environment
- [ ] **Monitor deployment** if build logs are available

---

## Additional Resources

- **Main Skill File**: [`cursor-skill.md`](./cursor-skill.md)
- **Project-Specific Rules**: [`project-rules.md`](./project-rules.md)
- **Documentation Index**: [`docs/README.md`](./docs/README.md)
- **Project README**: [`README.md`](./README.md)

---

*Last Updated: Generated as part of documentation structure setup*
