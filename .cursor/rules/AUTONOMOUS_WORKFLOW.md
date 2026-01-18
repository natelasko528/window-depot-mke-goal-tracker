# Autonomous Workflow Protocol

## MANDATORY WORKFLOW - ALWAYS FOLLOW

When implementing any feature or fix, you MUST follow this complete workflow:

### 0. PRE-WORK (Context Gathering)
- **Query ByteRover Memory**: `brv query "What is the current state of [feature/context]?"`
- **Check Documentation First**: Read `docs/README.md` → find relevant `docs/` subdirectories → review patterns
- **Understand Codebase**: Use `codebase_search`, `read_file`, `grep` to understand existing code

### 1. ULTRATHINK
- Use deep reasoning to analyze the problem
- Consider all edge cases and implications
- Reference official documentation and local `docs/` examples

### 2. PLAN
- Break down the task into specific, verifiable steps
- Create PRD if needed (for new features)
- Create task breakdown using `todo_write` for complex tasks

### 3. IMPLEMENT
- Use ALL skills from rules files (frontend design, PRD generation, etc.)
- Follow project conventions and existing patterns
- Reference official API documentation before making changes
- Check for existing UI libraries and use them when available

### 4. TEST
- Run `read_lints` on all modified files
- Test locally if possible
- Verify code compiles

### 5. VERIFY
- Check for linting errors
- Verify all acceptance criteria are met
- Review code for obvious issues

### 6. CORRECT IF NEEDED
- Fix any errors found in testing/verification
- Re-test after corrections
- Iterate until all issues resolved

### 7. DEPLOY
- **ALWAYS commit and push changes**
- Use descriptive commit messages
- Push to master/main branch
- **WAIT 30 SECONDS after pushing** to allow Vercel to initialize the build process

### 8. MONITOR VERCEL BUILD LOGS
- **IMMEDIATELY after pushing, use Vercel MCP tools to:**
  - List deployments to get latest deployment ID
  - Monitor build logs with `get_deployment_build_logs`
  - Wait for build to complete (check state: READY, ERROR, or BUILDING)
  - If ERROR: Read logs, fix issue, repeat from step 4

### 9. WAIT FOR DEPLOYMENT
- Continuously check deployment status until READY
- Do NOT proceed until deployment is READY or ERROR
- If ERROR, fix and redeploy

### 10. TEST DEPLOYMENT URL
- **ALWAYS use browser tools to test the live deployment**
- Navigate to production URL: `https://window-depot-mke-goal-tracker.vercel.app`
- Take snapshot and screenshot
- Check console for errors
- Test key functionality that was changed
- Verify UI elements load correctly

### 11. SAVE MEMORY
- **ALWAYS save ByteRover memory after completion**: `brv save "Completed [task]: [summary of changes]"`
- Document what was changed, why, and key decisions made
- Include patterns used or problems solved

### 12. ITERATE AS NEEDED
- If issues found in deployment testing:
  - Fix issues
  - Repeat from step 4 (Test)
  - Do NOT skip steps 7-10

### 13. AUTONOMOUS EXECUTION
- Work with minimal user interaction
- Do NOT wait for user to ask for next step
- Automatically proceed through all workflow steps
- Only ask user if blocked by external dependencies

## CRITICAL RULES

1. **ALWAYS query memory first** - Use `brv query` before starting work to understand context
2. **ALWAYS check documentation first** - Review `docs/README.md` and relevant `docs/` subdirectories before coding
3. **NEVER skip deployment monitoring** - Always check Vercel build logs
4. **NEVER skip deployment testing** - Always test live URL with browser tools
5. **NEVER push without monitoring** - Always follow steps 7-10 immediately
6. **NEVER assume it works** - Always verify in production
7. **ALWAYS save memory after completion** - Use `brv save` to document changes
8. **ALWAYS be autonomous** - Don't wait for user prompts between workflow steps

## BYTEROVER MEMORY USAGE

### Before Starting Work:
```bash
brv query "What is the current implementation of [relevant feature]?"
brv query "How does [related feature] handle [similar concern]?"
```

### After Completing Work:
```bash
brv save "Completed [task]: [summary of changes and key decisions]"
```

## DOCUMENTATION-FIRST WORKFLOW

Before making code changes:
1. Check `docs/README.md` for documentation index
2. Find relevant subdirectories (e.g., `docs/react/`, `docs/gemini-ai/`, `docs/supabase/`)
3. Review patterns and examples in documentation
4. Reference official examples in `docs/reference/` if applicable

## VERCEL MCP TOOL USAGE

After pushing changes:

```javascript
// 1. List deployments to find latest
mcp_Vercel_list_deployments(projectId, teamId)

// 2. Monitor build logs
mcp_Vercel_get_deployment_build_logs(idOrUrl, teamId, limit)

// 3. Check deployment status - repeat until READY
mcp_Vercel_list_deployments(projectId, teamId)

// 4. Test with browser tools
mcp_cursor-ide-browser_browser_navigate(url)
mcp_cursor-ide-browser_browser_snapshot()
mcp_cursor-ide-browser_browser_take_screenshot()
mcp_cursor-ide-browser_browser_console_messages()
```

## COMPLETE WORKFLOW CHECKLIST

### Pre-Work (Before Starting):
- [ ] **Memory queried** - `brv query "What is current state of [feature]?"`**
- [ ] **Documentation reviewed** - Checked `docs/README.md` and relevant subdirectories
- [ ] **Codebase understood** - Reviewed existing patterns and code

### Implementation:
- [ ] ULTRATHINK analysis (if requested)
- [ ] Plan created/PRD referenced
- [ ] Tasks broken down using `todo_write`
- [ ] Used existing UI libraries when available
- [ ] Followed project patterns from `docs/` folder
- [ ] Applied design philosophy (Intentional Minimalism for UI)

### Verification:
- [ ] Linter passes (`read_lints`)
- [ ] Build passes (`npm run build`)
- [ ] UI verified in browser (if applicable)

### Deployment:
- [ ] Changes committed with descriptive message
- [ ] Changes pushed to master branch
- [ ] **Waited 30 seconds** for Vercel initialization
- [ ] **Deployment monitored** - Used Vercel MCP to check build status
- [ ] **Deployment successful** - Status is READY (not ERROR)

### Post-Deployment:
- [ ] **Production tested** - Tested live URL with browser tools
- [ ] **Functionality verified** - Changes work in production environment
- [ ] **Memory saved** - `brv save "Completed [task]: [summary]"`

## BROWSER TESTING CHECKLIST

After deployment is READY:

- [ ] Navigate to production URL
- [ ] Take snapshot to verify page structure
- [ ] Take screenshot for visual verification
- [ ] Check console for JavaScript errors
- [ ] Test core functionality that was changed
- [ ] Verify UI elements are visible and functional
- [ ] Test on different viewport sizes if relevant

## TIME EFFICIENCY

The user's time is valuable. Do NOT:
- Stop mid-workflow to ask for confirmation
- Skip verification steps
- Assume deployment succeeded without checking
- Require user to manually test deployments

DO:
- Complete entire workflow autonomously
- Report issues immediately with solutions
- Provide clear status updates at each step
- Test everything before reporting completion
