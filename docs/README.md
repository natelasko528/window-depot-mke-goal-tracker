# Window Depot Daily Goal Tracker - Documentation

This directory contains comprehensive documentation for the Window Depot Daily Goal Tracker application.

## Documentation Structure

### Integrations

Third-party integration documentation and setup guides:

- **[GoHighLevel API](./integrations/gohighlevel-api.md)** - API reference for GoHighLevel CRM integration
- **[Zoom Workplace API](./integrations/zoom-api.md)** - API reference for Zoom meeting management
- **[Integration Setup Guide](./integrations/INTEGRATION_SETUP.md)** - Step-by-step setup instructions for all integrations

### Gemini AI

AI integration documentation:

- **[Live API](./gemini-ai/live-api.md)** - Voice chat and WebSocket implementation
- **Text API** - Text generation API (to be documented)
- **Models** - Available models documentation (to be documented)

### Reference

Reference implementations and examples:

- **[Gemini Live API Web Console](./reference/gemini-live-api-web-console/)** - Reference implementation

## Quick Links

- **[CONTEXT.md](../CONTEXT.md)** - Living context document (single source of truth for app state, architecture, and issues)
- **[RIPPLE_INDEX.md](../RIPPLE_INDEX.md)** - Navigation index for large files (especially App.jsx)
- [PROJECT_RULES.md](../PROJECT_RULES.md) - Project-specific rules and quick reference
- [.cursor/rules/cursor-skill.mdc](../.cursor/rules/cursor-skill.mdc) - Comprehensive agent skill file

## RIPPLE Context Strategy

The project uses **RIPPLE Context Strategy** for managing large files and maintaining comprehensive context:

- **CONTEXT.md**: Complete living context document containing all app knowledge (dependencies, schema, patterns, API docs, etc.)
- **RIPPLE_INDEX.md**: Searchable index for navigating large files like `src/App.jsx` (10,759 lines)

**Usage:**
- Before starting work, check `CONTEXT.md` for current app state and known issues
- For large files, use `RIPPLE_INDEX.md` to find exact line numbers for components, functions, and patterns
- Always update `CONTEXT.md` after significant changes to the codebase

See `ULTRATHINK_AGENT_SELF_IMPROVEMENT_ANALYSIS.md` for detailed explanation of RIPPLE strategy.

## Documentation Standards

When adding new documentation:

1. **Use Context7 MCP** to fetch latest API documentation before writing
2. **Follow existing patterns** in this directory
3. **Include code examples** that match project implementation
4. **Update this README** when adding new documentation sections
5. **Update PROJECT_RULES.md** when adding new integrations or major features

## Contributing

When making major changes that require documentation:

- See [Pattern 4A: Documentation Update Protocol](../.cursor/rules/cursor-skill.mdc#pattern-4a-documentation-update-protocol-mandatory) in cursor-skill.mdc
- Always fetch latest documentation using Context7 MCP
- Update relevant documentation files
- Commit documentation changes with code changes
