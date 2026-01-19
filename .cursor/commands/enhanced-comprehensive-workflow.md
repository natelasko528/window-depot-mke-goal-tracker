# Enhanced Comprehensive Workflow Command (v3.0 - Autonomous)

This command integrates ALL standard workflow patterns, skills, and protocols from `@.cursor/rules/cursor-skill.mdc` and `@.cursor/rules/AUTONOMOUS_WORKFLOW.md`, PLUS parallel agent execution patterns, RIPPLE Context Strategy, and **fully autonomous context detection and execution**.

## ULTRATHINK Activation

**CRITICAL**: When executing this workflow, you MUST activate ULTRATHINK mode:

```
ULTRATHINK use ALL of your skills especially PRD RIPPLE PARALLEL AGENTS and FRONT END DESIGN from @.cursor/rules/cursor-skill.mdc
```

This means:
- **Override Brevity**: Immediately suspend the "Zero Fluff" rule
- **Maximum Depth**: Engage in exhaustive, deep-level reasoning
- **Multi-Dimensional Analysis**: Analyze through every lens:
  - Psychological: User sentiment and cognitive load
  - Technical: Rendering performance, repaint/reflow costs, state complexity
  - Accessibility: WCAG AAA strictness
  - Scalability: Long-term maintenance and modularity
- **Prohibition**: NEVER use surface-level logic. If reasoning feels easy, dig deeper until logic is irrefutable

---

## Phase 0: Autonomous Context Detection (NEW - AUTOMATIC)

**CRITICAL**: This phase runs **AUTOMATICALLY** when workflow is invoked. No user prompts required.

**Objective:** Automatically understand current situation and classify work type without explicit user input.

### Auto-Detection Checklist

- [ ] **Git Status Analyzed**: Check for modified/untracked files using `run_terminal_cmd` with `git status`
- [ ] **Linter Errors Checked**: `read_lints()` to find code issues automatically
- [ ] **CONTEXT.md Read**: Check app health and known issues from living context document
- [ ] **RIPPLE_INDEX.md Read**: Understand file structure and component locations
- [ ] **ByteRover Queried** (if available): Get recent context and patterns
- [ ] **Codebase Scanned**: Search for TODO, FIXME, error patterns, console.error calls
- [ ] **Issue Type Classified**: Automatically determine Bug/Feature/Refactor/Docs/Integration
- [ ] **Priority Assigned**: P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)
- [ ] **Complexity Estimated**: Simple / Medium / Complex / Very Complex

### Detection Mechanisms

#### 1. File System Analysis

**Automatic Detection:**
```bash
# Check git status for modified/untracked files
run_terminal_cmd("git status --porcelain")

# Read linter errors to detect issues
read_lints()

# Check for recent changes in key files
run_terminal_cmd("git log --oneline -10")

# Detect broken imports or missing dependencies
grep("import.*from.*'", path="src/")
read_file("package.json")  # Check dependencies
```

#### 2. Living Context Documents

**Automatic Reading:**
- Read `CONTEXT.md` for:
  - App health status (🟢 Green / 🟡 Yellow / 🔴 Red)
  - Known issues (Critical P0, High P1, Medium P2)
  - Component health matrix
  - Recent changes section
- Read `RIPPLE_INDEX.md` for:
  - File structure and component locations
  - State management maps
  - Hook dependencies
  - Pattern locations

#### 3. ByteRover Memory Query (if available)

**Automatic Queries:**
```bash
# Query project state
brv query "What is the current state of the project?"
brv query "What issues were recently fixed or are still pending?"
brv query "What patterns were used for similar tasks?"

# Query specific context
brv query "What is the current implementation of [detected component]?"
brv query "How does [related feature] handle [similar concern]?"
```

#### 4. Codebase State Analysis

**Automatic Scanning:**
- Use `codebase_search` to find:
  - TODO comments: `codebase_search("TODO comments or incomplete features")`
  - FIXME markers: `grep("FIXME|TODO|XXX", path="src/")`
  - Error patterns: `grep("console.error|throw new Error|Error:", path="src/")`
  - Test failures: Check for test files and run if possible
  - Deprecated patterns: `grep("deprecated|@deprecated", path="src/")`

#### 5. Automatic Issue Classification

**Classification Logic:**

**Bug Fix** (detected when):
- Linter errors found (`read_lints()` returns errors)
- CONTEXT.md shows 🔴 or ⚠️ issues
- Git status shows modified files with error patterns
- Console errors or throw statements found
- Test failures detected

**Feature Addition** (detected when):
- New component files in `git status`
- PRD files exist: `glob_file_search("tasks/prd-*.md")`
- Feature flags found: `grep("FEATURE_|feature.*flag", path="src/")`
- New files in `src/components/` or `src/lib/`

**Refactor** (detected when):
- Code quality warnings in linter
- CONTEXT.md mentions performance issues
- Deprecated patterns found
- Complexity warnings in code analysis

**Documentation** (detected when):
- Missing or outdated README
- Documentation files modified
- Code comments indicate missing docs

**Integration** (detected when):
- New API keys or environment variables
- Missing dependencies in package.json
- Integration-related files modified

### Detection Patterns

#### Pattern A: Bug Detection
```bash
# Automatic bug detection sequence
1. read_lints()  # Check for linter errors
2. grep("🔴|⚠️|Known Issues", path="CONTEXT.md")  # Check known issues
3. grep("console.error|throw new Error", path="src/")  # Check error patterns
4. run_terminal_cmd("git status --porcelain")  # Check for broken files
```

#### Pattern B: Feature Detection
```bash
# Automatic feature detection sequence
1. glob_file_search("tasks/prd-*.md")  # Check for PRD files
2. grep("FEATURE_|feature.*flag", path="src/")  # Check feature flags
3. run_terminal_cmd("git status --porcelain | grep 'src/components/'")  # New components
4. codebase_search("new features or components being added")
```

#### Pattern C: Refactor Detection
```bash
# Automatic refactor detection sequence
1. read_lints()  # Look for complexity warnings
2. grep("Performance|Optimization", path="CONTEXT.md")  # Performance issues
3. grep("deprecated|TODO|FIXME", path="src/")  # Deprecated patterns
4. codebase_search("code quality issues or refactoring needs")
```

### Context Synthesis

**After detection, automatically synthesize:**

- **Primary Task Type**: Bug Fix / Feature / Refactor / Docs / Integration
- **Affected Components**: List of files/components involved (from git status, linter, CONTEXT.md)
- **Priority Level** (Auto-Assigned):
  - **P0 (Critical)**: 
    - Linter errors found (`read_lints()` returns errors)
    - CONTEXT.md shows 🔴 status or Critical (P0) issues
    - Broken functionality detected (test failures, console errors)
    - Production deployment failures
  - **P1 (High)**: 
    - Performance issues mentioned in CONTEXT.md
    - Missing features blocking other work
    - CONTEXT.md shows ⚠️ warnings or High Priority (P1) issues
    - Security concerns
  - **P2 (Medium)**: 
    - Code quality improvements
    - Refactoring opportunities
    - Medium Priority (P2) issues in CONTEXT.md
    - Technical debt reduction
  - **P3 (Low)**: 
    - Documentation updates
    - Minor improvements
    - Low Priority (P3) issues in CONTEXT.md
    - Nice-to-have features
- **Estimated Complexity** (Auto-Calculated):
  - **Simple**: 
    - Single file change
    - <50 lines modified
    - No dependencies on other components
    - Straightforward fix or addition
  - **Medium**: 
    - Multiple files (2-5 files)
    - 50-200 lines modified
    - Some dependencies on existing components
    - Requires understanding of existing patterns
  - **Complex**: 
    - Architecture changes
    - 200-500 lines modified
    - Multiple component dependencies
    - Requires new patterns or significant refactoring
  - **Very Complex**: 
    - Major refactor or new feature
    - >500 lines modified
    - Cross-cutting concerns
    - Requires new architecture or significant design decisions
- **Dependencies** (Auto-Detected):
  - From CONTEXT.md: Check "Known Issues" for dependency chains
  - From codebase: Use `codebase_search` to find component dependencies
  - From RIPPLE_INDEX.md: Check component hierarchy and state management maps
  - From git history: Check what files were recently changed together
  - Standard order: Schema → Backend → UI (for features)

### Output from Phase 0

After autonomous detection, workflow automatically knows:
- **Task Type**: Bug Fix / Feature / Refactor / Docs / Integration
- **Affected Files**: List of files/components from git status, linter, CONTEXT.md
- **Priority**: P0/P1/P2/P3 (auto-assigned based on severity)
- **Complexity**: Simple/Medium/Complex/Very Complex (auto-calculated)
- **Dependencies**: What needs to be done first (auto-detected)
- **Patterns**: Relevant patterns from ByteRover memory (if available)
- **Context**: Current app health, known issues, component status

**No user prompts required** - workflow proceeds automatically to Phase 1 with full context.

### Example Auto-Detection Output

```
Detected: Bug Fix
Affected: src/App.jsx (SettingsPage component, lines 8364-11092)
Priority: P0 (Critical) - Linter errors found, CONTEXT.md shows 🔴 issue
Complexity: Medium - ~100 lines need reordering
Dependencies: None - isolated fix
Patterns: React hooks order pattern from ByteRover memory
Context: Settings page broken, hooks order violation identified
```

Workflow automatically proceeds to Phase 1 with this context.

---

## Phase 0A: Pre-Work (Context Gathering with RIPPLE)

**BEFORE starting any implementation:**

### Pre-Work Checklist

- [ ] **Memory queried** (if ByteRover available): `brv query "What is the current state of [feature/context]?"`
- [ ] **CONTEXT.md reviewed**: Check living context document for current app state
- [ ] **RIPPLE_INDEX.md checked**: Review file structure and component locations
- [ ] **Documentation reviewed**: Check `docs/README.md` → find relevant `docs/` subdirectories → review patterns
- [ ] **Codebase understood**: Use `codebase_search`, `read_file`, `grep` to understand existing code
- [ ] **Affected libraries/APIs identified**: List all external libraries, APIs, or services for Context7 lookup

### Enhanced Steps

1. **Query Memory** (if ByteRover available):
   ```bash
   brv query "What is the current implementation of [relevant feature]?"
   brv query "How does [related feature] handle [similar concern]?"
   ```

2. **Check Living Context Documents FIRST**:
   - Read `CONTEXT.md` for current app health and known issues
   - Read `RIPPLE_INDEX.md` for file structure and component locations
   - These documents provide instant context without codebase searches

3. **Check Documentation**:
   - Read `docs/README.md` for documentation index
   - Find relevant subdirectories (e.g., `docs/integrations/`, `docs/gemini-ai/`, `docs/development/`)
   - Review patterns and examples in documentation
   - Reference official examples in `docs/reference/` if applicable

4. **Understand Codebase**:
   - Use `codebase_search` for semantic understanding
   - Use `read_file` to read key configuration files
   - Use `grep` for exact string searches
   - Use `list_dir` to see directory structure

5. **Identify Affected Libraries/APIs**:
   - List all external libraries, APIs, or services being used or changed
   - Note version updates or breaking changes
   - Prepare for Context7 MCP lookup (Phase 4)

---

## Phase 1: Autonomous Plan Generation (ENHANCED)

**CRITICAL**: This phase automatically generates execution plans based on detected context from Phase 0. No user prompts required.

**After autonomous context detection, automatically build execution plan:**

### Auto-Plan Based on Task Type

The workflow automatically selects the appropriate plan generation strategy based on the task type detected in Phase 0.

#### Bug Fix Auto-Plan

**When Bug Fix detected (P0/P1 priority):**

1. **Diagnose** (RIPPLE Phase 1-2):
   - Use RIPPLE strategy to understand issue
   - Probe structure of affected files
   - Search for root cause patterns
   - Extract relevant code sections

2. **Fix** (Implementation):
   - Apply fix based on root cause
   - Use patterns from ByteRover memory if available
   - Follow existing code patterns from `docs/` folder

3. **Test** (Verification):
   - Run `read_lints()` automatically
   - Verify fix works (browser test if UI)
   - Check for regressions

4. **Update Context** (Documentation):
   - Update CONTEXT.md issue status
   - Mark issue as resolved
   - Update component health matrix

**No PRD needed** - Bug fixes use focused fix plan, not full PRD.

#### Feature Auto-Plan

**When Feature detected:**

1. **PRD Check**: 
   - Check if PRD exists: `glob_file_search("tasks/prd-[feature-name].md")`
   - If PRD exists: Read and use it
   - If no PRD: **Automatically generate PRD** (see below)

2. **Task Breakdown**: 
   - Convert PRD to tasks automatically
   - Each task: One focused session
   - Dependencies: Automatically ordered (Schema → Backend → UI)

3. **Dependency Ordering**: 
   - Schema changes first (migrations)
   - Backend logic second (server actions, APIs)
   - UI components last (React components, pages)

4. **Execution**: 
   - Implement tasks in dependency order
   - Use parallel agents for independent tasks

#### Automatic PRD Generation (When Needed)

**If feature detected and no PRD exists, automatically generate:**

1. **Extract Requirements** from:
   - New component files (read component code to understand purpose)
   - Feature flags (`grep("FEATURE_|feature.*flag", path="src/")`)
   - User stories in code comments (`grep("As a|user story", path="src/", -i: true)`)
   - Related documentation (`codebase_search("feature requirements or specifications")`)
   - CONTEXT.md architecture map (check for planned features)

2. **Generate PRD** using PRD generation skills:
   - Ask clarifying questions ONLY if requirements are ambiguous
   - If requirements are clear from code/docs, skip questions and generate directly
   - Include all standard PRD sections:
     - Introduction/Overview
     - Goals
     - User Stories (with acceptance criteria)
     - Functional Requirements
     - Non-Goals
     - Design Considerations
     - Technical Considerations
     - Success Metrics
     - Open Questions

3. **Save PRD** to `tasks/prd-[auto-detected-feature-name].md` using `write` tool

#### Refactor Auto-Plan

**When Refactor detected:**

1. **Scope Analysis**: 
   - Identify what needs refactoring (from linter, CONTEXT.md, codebase search)
   - Determine refactor boundaries
   - Check for test coverage

2. **Incremental Plan**: 
   - Break into small, safe steps
   - Each step: One focused refactor
   - Ensure backward compatibility at each step

3. **Test Coverage**: 
   - Ensure tests exist before refactoring
   - If no tests: Add tests first (separate task)

4. **Execute**: 
   - One refactor at a time with verification
   - Run tests after each refactor
   - Update CONTEXT.md with refactor notes

#### Documentation Auto-Plan

**When Documentation detected:**

1. **Identify Gaps**: 
   - Missing README sections
   - Outdated documentation
   - Missing API docs

2. **Update Plan**: 
   - Update existing docs
   - Add missing sections
   - Reference Context7 MCP for library docs

3. **Execute**: 
   - Update documentation files
   - Verify links work
   - Update docs/README.md index

#### Integration Auto-Plan

**When Integration detected:**

1. **Context7 Lookup**: 
   - Use Context7 MCP to get latest integration docs
   - Check for breaking changes
   - Get authentication patterns

2. **Setup Plan**: 
   - Environment variables
   - API keys configuration
   - OAuth setup if needed

3. **Implementation**: 
   - Follow integration patterns from `docs/integrations/`
   - Use existing integration code as reference
   - Test integration

### Automatic Task Breakdown

**Convert detected work into tasks automatically:**

- **Each task**: One focused session (2-3 sentences to describe)
- **Dependencies**: Automatically ordered based on:
  - File dependencies (imports)
  - Component hierarchy (from RIPPLE_INDEX.md)
  - Standard order: Schema → Backend → UI
- **Acceptance Criteria**: Auto-generated based on task type:
  - **Bug Fix**: "Fix applied", "Linter passes", "Issue resolved in CONTEXT.md"
  - **Feature**: "Feature works", "Typecheck passes", "Verify in browser"
  - **Refactor**: "Refactor complete", "Tests pass", "No regressions"
  - **Always include**: "Typecheck passes" (final criterion)
  - **UI tasks**: Include "Verify changes in browser"
  - **Testable logic**: Include "Tests pass"

### ULTRATHINK Analysis (Integrated)

**During plan generation, engage in deep analysis:**

- Override brevity, engage in exhaustive reasoning
- Multi-dimensional analysis: Psychological, Technical, Accessibility, Scalability
- Never use surface-level logic
- Reference official documentation and local `docs/` examples
- Consider all edge cases and implications
- Update CONTEXT.md with findings during analysis

---

## Phase 2: Autonomous Execution (ENHANCED)

**CRITICAL**: This phase executes AUTOMATICALLY without prompts. Start immediately after plan generation.

### Execution Rules

**AUTOMATIC EXECUTION - NO PROMPTS:**

- ✅ **Start immediately** after plan generation (Phase 1B)
- ✅ **Use parallel agents** for independent tasks
- ✅ **Update context documents** as you go
- ✅ **Only stop** if blocked by external dependency (then report and wait)
- ❌ **NEVER ask** "should I proceed?" or "ready to continue?"
- ❌ **NEVER wait** for user confirmation between tasks

### Parallel Execution Pattern

**For independent tasks, execute in parallel automatically:**

**Example parallel execution:**
- **Worker 1**: Fix bug in Component A
- **Worker 2**: Update documentation
- **Worker 3**: Add tests
- **Worker 4**: Update CONTEXT.md

**Parallel execution rules:**
- Tasks with no dependencies can run in parallel
- Use `todo_write` to track parallel task status
- Synthesize results from all workers
- Update context documents after parallel tasks complete

### Automatic Verification (After Each Task)

**After each task completes, automatically verify:**

1. **Run `read_lints()` automatically**:
   - Check for linting errors
   - Fix any errors found
   - Re-verify until clean

2. **If UI change: Verify in browser automatically**:
   - Navigate to localhost (if dev server running)
   - Take snapshot to verify structure
   - Take screenshot for visual verification
   - Check console for errors
   - Test functionality

3. **If testable: Run tests automatically**:
   - Run test suite if available
   - Fix any failing tests
   - Re-run until all pass

4. **Update task status in `todo_write`**:
   - Mark task as "completed" when verified
   - Add notes if issues encountered
   - Document any deviations from plan

### Context Updates During Execution

**Automatically update context documents as work progresses:**

- **After Fix**: 
  - Update CONTEXT.md issue status (🔴 → 🟢)
  - Update component health matrix
  - Add to "Recent Changes" section

- **After Feature**: 
  - Add component to architecture map in CONTEXT.md
  - Update component health matrix
  - Document new dependencies

- **After Refactor**: 
  - Update pattern library in CONTEXT.md
  - Update RIPPLE_INDEX.md if structure changed
  - Document refactor rationale

- **After Completion**: 
  - Save to ByteRover (see Phase 3: Self-Improvement)
  - Update "Last Updated" timestamps
  - Finalize "Recent Changes" section

### Explore Phase (Integrated into Execution)

**During execution, automatically explore as needed:**

1. **Check Context Documents**:
   - Review `CONTEXT.md` for known issues and current state
   - Review `RIPPLE_INDEX.md` for file structure (especially for files >1000 lines)

2. **Use `list_dir`** for directory structure:
   - Understand project layout
   - Identify key directories and files

3. **Use `read_file`** for key configuration files:
   - `package.json` for dependencies
   - Configuration files (`.eslintrc.json`, `vercel.json`, etc.)
   - Key source files related to the task
   - **For large files**: Use `read_file` with offset/limit based on RIPPLE_INDEX.md

4. **Use `codebase_search`** for semantic understanding:
   - Find code by meaning/intent
   - Understand existing patterns and conventions

5. **Use `grep`** for exact string searches:
   - Find exact strings, patterns, or symbols
   - Locate specific functions or components
   - **Use RIPPLE_INDEX.md** to narrow search scope

6. **Apply RIPPLE if files are large** (see Phase 2A below)

---

## Phase 2A: RIPPLE Context Strategy (Enhanced with Parallel Agents)

**Apply RIPPLE Context Strategy when:**
- Working with files exceeding context limits (>5000 lines)
- User describes content as "large/massive/huge"
- Searching codebases or log files
- Aggregating information across many entries
- When precision matters over speed

### RIPPLE Phase 1: Parallel Probe Structure

**Objective:** Understand file structure efficiently

**Sequential Approach:**
- Get file metrics (lines, chars, format)
- Sample first/last lines
- Detect structure (JSON, CSV, etc.)

**Parallel Agent Approach:**
- **Worker 1:** File metrics (`wc -l`, `wc -c`)
- **Worker 2:** Extract component locations (grep for `^function`)
- **Worker 3:** Extract function locations (grep for `^const.*=.*function`)
- **Worker 4:** Extract hook locations (grep for `useState|useEffect`)

**Tools**: Use `read_file` with offset/limit, `grep` for structure detection, terminal commands for metrics

**Output:** Update RIPPLE_INDEX.md with findings

### RIPPLE Phase 2: Parallel Search (Cast the Ripple)

**Objective:** Filter content programmatically before reading

**Sequential Approach:**
- Use `grep` for initial searches
- Use `read_file` with offset/limit
- Bound all operations (max_results)

**Parallel Agent Approach:**
- **Worker 1:** Search for React hooks violations (pattern: `useEffect.*set(\w+).*useState`)
- **Worker 2:** Search for missing dependencies (pattern: `useEffect.*\[\]`)
- **Worker 3:** Search for performance issues (pattern: `\.map\(|\.filter\(|\.forEach\(`)
- **Worker 4:** Search for accessibility issues (pattern: `onClick|onKeyPress` without ARIA)

**Critical Rules**:
- Never ingest full context - always filter first
- Bound all operations - use `[:max_results]` or `head -N`
- Prefer code over LLM - use regex/string ops when possible
- Use parallel workers for multiple pattern searches

**Output:** Issue list to CONTEXT.md

### RIPPLE Phase 3: Parallel Zoom (Targeted Extraction)

**Objective:** Extract specific chunks around findings

**Sequential Approach:**
- Extract specific chunks around findings
- Get context around hits (±radius lines)
- Use `read_file` with offset/limit for targeted sections

**Parallel Agent Approach:**
- **Worker 1:** Extract SettingsPage component (lines 8364-11092)
- **Worker 2:** Extract state declarations (lines 8394-8600)
- **Worker 3:** Extract useEffect hooks (lines 8405-8488)
- **Worker 4:** Extract handlers (lines 8676-9076)

**Tools**: `read_file` with offset/limit for targeted sections

**Output:** Relevant code sections for analysis

### RIPPLE Phase 4: Parallel Recurse (Sub-LLM Decomposition)

**Objective:** Break complex tasks into sub-LLM calls over smaller chunks

**Sequential Approach:**
- Break complex tasks into sub-LLM calls over smaller chunks
- Use map-reduce for aggregation
- Batch sub-LLM calls to reduce round-trips

**Parallel Agent Approach:**
- **Worker 1:** Analyze SettingsPage for hooks issues
- **Worker 2:** Analyze state management patterns
- **Worker 3:** Analyze performance bottlenecks
- **Worker 4:** Analyze accessibility concerns

**Critical Rules**:
- Track provenance - keep line numbers for verification
- Fail gracefully - handle empty results, timeouts
- Batch sub-LLM calls - reduce round-trips
- Synthesize results from all workers

**Output:** Synthesized analysis report, update CONTEXT.md

### Parallel Agent Implementation

**Queue-Based System (based on cursor-tools patterns):**

```python
from multiprocessing import Pool, Manager
from queue import Queue

class ParallelRippleAgent:
    """Queue-based parallel agent for RIPPLE operations"""
    
    def __init__(self, num_workers=None):
        self.num_workers = num_workers or min(4, os.cpu_count() - 1)
        self.task_queue = Manager().Queue()
        self.results = Manager().dict()
    
    def add_task(self, task_type, task_data):
        """Add task to queue"""
        self.task_queue.put({
            'type': task_type,
            'data': task_data,
            'id': str(uuid.uuid4())
        })
    
    def worker(self, worker_id):
        """Worker function to process tasks"""
        while not self.task_queue.empty():
            try:
                task = self.task_queue.get(timeout=1)
                result = self.process_task(task, worker_id)
                self.results[task['id']] = result
            except Queue.Empty:
                break
            except Exception as e:
                self.results[task['id']] = {'error': str(e)}
    
    def run_parallel(self):
        """Execute all tasks in parallel"""
        with Pool(processes=self.num_workers) as pool:
            pool.map(self.worker, range(self.num_workers))
        return dict(self.results)
```

**Usage in Cursor:**

1. **For large files:** Automatically use parallel agents
2. **For multiple searches:** Distribute patterns across workers
3. **For analysis:** Analyze chunks in parallel, synthesize results

---

## Phase 1B: Automatic Task Breakdown (AUTOMATIC)

**CRITICAL**: This phase automatically converts detected work into right-sized tasks. No user prompts required.

### Automatic Task Creation

**After plan generation, automatically create tasks using `todo_write`:**

#### Task Sizing Rules (Automatic)

**Each task must be completable in ONE focused session:**

- **Right-sized tasks** (auto-created):
  - Add a database column and migration
  - Add a UI component to an existing page
  - Update a server action with new logic
  - Add a filter dropdown to a list
  - Fix a specific bug in one component
  - Update documentation for one feature

- **Too big** (auto-split):
  - "Build the entire dashboard" → Split into: schema, queries, UI components, filters
  - "Add authentication" → Split into: schema, middleware, login UI, session handling
  - "Refactor the API" → Split into one task per endpoint or pattern

**Rule of thumb**: If task cannot be described in 2-3 sentences, it's too big - auto-split it.

#### Automatic Dependency Ordering

**Tasks automatically ordered by dependencies:**

**Correct order** (auto-detected):
1. Schema/database changes (migrations)
2. Server actions / backend logic
3. UI components that use the backend
4. Dashboard/summary views that aggregate data

**Dependency detection**:
- From file imports: `grep("import.*from", path="src/")` to find dependencies
- From RIPPLE_INDEX.md: Component hierarchy and state management maps
- From CONTEXT.md: Architecture map and integration status
- Standard patterns: Schema → Backend → UI

#### Automatic Acceptance Criteria Generation

**Acceptance criteria auto-generated based on task type:**

**For Bug Fixes:**
- "Fix applied to [component/file]"
- "Linter passes (`read_lints()` returns no errors)"
- "Issue marked as resolved in CONTEXT.md"
- "Typecheck passes"

**For Features:**
- "[Feature] works as specified"
- "Typecheck passes"
- "Verify changes in browser" (if UI)
- "Tests pass" (if testable logic)

**For Refactors:**
- "Refactor complete"
- "No regressions (tests pass)"
- "Typecheck passes"
- "Performance maintained or improved"

**For Documentation:**
- "Documentation updated"
- "Links verified"
- "Typecheck passes" (if code examples)

**Always include as final criterion:**
- "Typecheck passes"

**For UI tasks, always include:**
- "Verify changes in browser"

**For testable logic, always include:**
- "Tests pass"

#### Task Creation Process

1. **Analyze detected work** from Phase 0
2. **Break into tasks** using sizing rules
3. **Order by dependencies** automatically
4. **Generate acceptance criteria** based on task type
5. **Create tasks** using `todo_write` with:
   - `id`: Auto-generated (TASK-001, TASK-002, etc.)
   - `title`: Auto-generated from work description
   - `description`: Auto-generated (2-3 sentences)
   - `acceptanceCriteria`: Auto-generated list
   - `priority`: From Phase 0 detection
   - `status`: "pending" (initial)
   - `notes`: Empty initially

### Example Automatic Task Breakdown

**Detected: Bug Fix - Settings Page Hooks Order**

**Auto-created tasks:**
```json
{
  "id": "TASK-001",
  "title": "Fix React hooks order in SettingsPage",
  "description": "Move all useState declarations before useEffect hooks in SettingsPage component (lines 8364-11092)",
  "acceptanceCriteria": [
    "All useState declarations moved before useEffect hooks",
    "Linter passes (read_lints returns no errors)",
    "Settings page renders correctly",
    "Issue marked as resolved in CONTEXT.md",
    "Typecheck passes"
  ],
  "priority": 1,
  "status": "pending"
}
```

**No user prompts required** - tasks created automatically and workflow proceeds to Phase 2.

### Update Context Documents (Automatic)

**Before execution, automatically update:**

- **CONTEXT.md**: 
  - Add planned feature/fix to "Recent Changes" section
  - Update component health matrix if needed
  - Document expected impact

- **RIPPLE_INDEX.md**: 
  - Update if file structure will change
  - Add new components to component map if needed

**No user prompts required** - updates happen automatically.

---

## Phase 4: Context7 MCP Documentation Protocol (Pattern 4A - MANDATORY)

**CRITICAL**: Before implementation, you MUST update documentation using Context7 MCP.

[Same as original Phase 4, but also update CONTEXT.md with library versions]

---

## Phase 2B: Implementation (AUTOMATIC)

**CRITICAL**: Implementation happens automatically during Phase 2 execution. No separate phase needed.

### Automatic Implementation Process

**During execution, automatically:**

1. **Follow Implementation Checklist** (auto-verified):
   - ✅ ULTRATHINK analysis completed (Phase 1)
   - ✅ Plan created/PRD referenced (Phase 1B)
   - ✅ Tasks broken down using `todo_write` (Phase 1B)
   - ✅ Context7 documentation protocol completed (if applicable - Phase 4)
   - ✅ Used existing UI libraries when available (auto-checked)
   - ✅ Followed project patterns from `docs/` folder (auto-referenced)
   - ✅ Applied design philosophy (Intentional Minimalism for UI)
   - ✅ Applied RIPPLE Context Strategy for large files (auto-applied)
   - ✅ Used parallel agents for large file operations (auto-used)
   - ✅ Updated CONTEXT.md as work progresses (auto-updated)

2. **Apply Best Practices Automatically**:
   - Use existing UI libraries (check with `codebase_search` first)
   - Follow patterns from `docs/` folder
   - Apply design philosophy (Intentional Minimalism)
   - Use RIPPLE for large files automatically
   - Use parallel agents when possible

3. **Update Context During Implementation**:
   - Update CONTEXT.md after each significant change
   - Update RIPPLE_INDEX.md if structure changes
   - Document decisions and patterns

**No user prompts required** - implementation proceeds automatically with verification.

---

## Phase 2C: Automatic Testing (INTEGRATED)

**CRITICAL**: Testing happens automatically after each task. No separate phase needed.

### Automatic Test Execution

**After each task, automatically:**

1. **Run Linter** (`read_lints()`):
   - Check all modified files
   - Fix any errors automatically
   - Re-verify until clean

2. **Run Typecheck** (if TypeScript):
   - Verify type safety
   - Fix any type errors
   - Re-verify until clean

3. **Run Tests** (if testable logic):
   - Run test suite automatically
   - Fix any failing tests
   - Re-run until all pass

4. **Browser Verification** (if UI changes):
   - Navigate to localhost automatically
   - Take snapshot and screenshot
   - Check console for errors
   - Test functionality

5. **Update CONTEXT.md with test results**:
   - Document test coverage
   - Note any test failures and fixes
   - Update component health if tests pass

**No user prompts required** - testing happens automatically with each task.

---

## Phase 7: UI Verification (Pattern 3: UI Development with Verification)

[Same as original Phase 7]

---

## Phase 8: Pre-Push Verification (Pattern 5 - MANDATORY)

[Same as original Phase 8]

---

## Phase 9: Deploy

[Same as original Phase 9]

---

## Phase 10: Post-Push Deployment Verification (Pattern 6 - MANDATORY)

[Same as original Phase 10]

---

## Phase 11: Production Testing

[Same as original Phase 11]

---

## Phase 3: Self-Improvement Integration (NEW - MANDATORY)

**CRITICAL**: After completing work, automatically save patterns and learn from execution.

### ByteRover Memory Storage (POST-EXECUTION)

**CRITICAL**: Always save to ByteRover memory AFTER completing work to enable pattern learning.

**Automatic Post-Execution Memory Storage:**

```bash
# Save successful patterns
brv curate "Pattern: [pattern name] - [description] - Location: [file/component]"

# Save fixes and solutions
brv curate "Fix: [issue] - [solution] - Location: [file:lines] - Pattern: [pattern used]"

# Save architectural decisions
brv curate "Decision: [architectural decision] - Rationale: [why] - Context: [when/where]"

# Save failed patterns (to avoid repetition)
brv curate "Anti-Pattern: [what didn't work] - Why: [reason] - Alternative: [better approach]"

# Save performance optimizations
brv curate "Optimization: [optimization] - Impact: [improvement] - Location: [where applied]"
```

**What to Curate Automatically:**

**Successful Patterns:**
- ✅ Code patterns that worked well
- ✅ Architectural decisions and rationale
- ✅ Integration patterns (OAuth, API keys, etc.)
- ✅ UI/UX patterns (component structures, styling approaches)
- ✅ Performance optimizations

**Failed Patterns:**
- ❌ What didn't work and why
- ❌ Common mistakes to avoid
- ❌ Anti-patterns to prevent

**Context for Future Reference:**
- 🏗️ Architectural decisions with rationale
- 🐛 Bug fixes with root cause analysis
- ⚡ Performance improvements with metrics
- 📚 Documentation patterns and structures

**Memory Organization (Context Tree Structure):**

```
Domain: react-patterns
  Topic: hooks-order
    File: react-hooks-order-pattern.md
    File: settings-page-hooks-fix.md
    
Domain: integrations
  Topic: oauth-flows
    File: zoom-oauth-implementation.md
    File: gohighlevel-oauth-pattern.md
    
Domain: bugs
  Topic: settings-page
    File: settings-page-hooks-bug-fix.md
    
Domain: performance
  Topic: optimization
    File: parallel-extraction-pattern.md
```

### Pattern Learning

**Automatic Pattern Extraction:**

1. **Successful Patterns**:
   - Extract from completed work
   - Store in ByteRover with domain/topic structure
   - Reference in future similar tasks automatically

2. **Failed Patterns**:
   - Learn what doesn't work
   - Store to avoid repetition
   - Improve detection accuracy over time

3. **Pattern Reuse**:
   - Query ByteRover before starting similar work
   - Apply known patterns automatically
   - Adapt patterns to current context

### Performance Tracking

**Automatic Metrics Collection:**

Track metrics automatically:
- **Time per task type**: Bug Fix, Feature, Refactor, etc.
- **Success rate per pattern**: Which patterns work best
- **Cost per operation**: Token usage, API calls
- **Optimization opportunities**: Identify slow operations

**Optimize based on data:**
- Use faster patterns for common tasks
- Avoid slow patterns
- Improve workflow efficiency over time

### Feedback Loops

**Automatic Learning Mechanisms:**

1. **Error Learning**:
   - Store errors and solutions
   - Learn from mistakes
   - Avoid repeating errors

2. **Detection Accuracy**:
   - Track detection accuracy (correct task type classification)
   - Improve classification logic based on results
   - Refine priority and complexity estimation

3. **Plan Generation Quality**:
   - Track plan success rate
   - Learn which plans work best
   - Improve plan generation over time

### Context Document Updates (AUTOMATIC)

**CRITICAL**: After completing any work, automatically update living context documents.

**Automatic Context Update Checklist:**

- [ ] **CONTEXT.md updated**:
  - Update Quick Status (app health, critical issues count)
  - Update component health matrix
  - Add/update known issues
  - Update architecture map if changed
  - Update integration status if changed
  - Update performance metrics if changed
  - Add to "Recent Changes" section

- [ ] **RIPPLE_INDEX.md updated** (if file structure changed):
  - Update file metrics (line counts, etc.)
  - Update component map (if components added/removed)
  - Update state management map (if state changed)
  - Update hook dependencies graph (if hooks changed)
  - Update pattern locations (if patterns changed)

- [ ] **Automated Updates** (if scripts exist):
  - Run `scripts/update-context.js` if available
  - Verify context documents are accurate

**Automatic Context Update Process:**

1. **After Fixing Issues:**
   - Mark issue as resolved in CONTEXT.md (🔴 → 🟢)
   - Update component health status
   - Update last checked timestamp
   - Add to "Recent Changes" section

2. **After Adding Features:**
   - Add component to architecture map
   - Update component health matrix
   - Document any new dependencies
   - Add to "Recent Changes" section

3. **After Performance Changes:**
   - Update performance metrics section
   - Note any improvements or regressions
   - Add to "Recent Changes" section

**No user prompts required** - context updates happen automatically.

---

## Phase 13: Error Handling

[Same as original Phase 12, but log errors to CONTEXT.md]

---

## Phase 14: Task Management

[Same as original Phase 13]

---

## Critical Rules

### Autonomous Execution Rules (MANDATORY)

1. **ALWAYS execute autonomously** - No "should I proceed?" prompts
2. **ALWAYS detect context automatically** - Phase 0 runs without user input
3. **ALWAYS generate plans automatically** - Phase 1 creates plans from detected context
4. **ALWAYS execute without prompts** - Phase 2 runs tasks automatically
5. **ALWAYS verify automatically** - Testing happens after each task
6. **ALWAYS update context automatically** - Documents updated during execution
7. **ALWAYS save to ByteRover** - Patterns stored after completion (Phase 3)
8. **ONLY stop if blocked** - External dependency requires user input

### Context Detection Rules (MANDATORY)

9. **ALWAYS activate ULTRATHINK** when executing this workflow
10. **ALWAYS check CONTEXT.md first** - it may have the answer
11. **ALWAYS check RIPPLE_INDEX.md** - for file structure and component locations
12. **ALWAYS query ByteRover** (if available) - before starting work (Phase 0)
13. **ALWAYS scan codebase** - for TODO, FIXME, errors, patterns
14. **ALWAYS check git status** - for modified/untracked files
15. **ALWAYS check linter errors** - `read_lints()` to find issues

### Execution Rules (MANDATORY)

16. **NEVER skip MANDATORY steps** - All steps marked MANDATORY/CRITICAL must be followed
17. **ALWAYS use RIPPLE for large files** (>5000 lines)
18. **ALWAYS use parallel agents** when searching multiple patterns in large files
19. **ALWAYS update context documents** after completing work
20. **ALWAYS verify locally** before pushing (Pattern 5)
21. **ALWAYS monitor deployment** after pushing (Pattern 6)
22. **ALWAYS test production** after deployment is READY
23. **ALWAYS use Context7 MCP** when adding integrations or major features

### Self-Improvement Rules (MANDATORY)

24. **ALWAYS save patterns to ByteRover** - After completing work (Phase 3)
25. **ALWAYS learn from errors** - Store failed patterns to avoid repetition
26. **ALWAYS track performance** - Metrics collection for optimization
27. **ALWAYS improve detection** - Refine classification accuracy over time
28. **ALWAYS reuse patterns** - Query ByteRover before similar work

### Workflow Invocation

**The workflow can be invoked with just:**
```
/enhanced-comprehensive-workflow
```

**No additional prompts needed** - workflow automatically:
1. Detects context (Phase 0)
2. Generates plan (Phase 1)
3. Executes tasks (Phase 2)
4. Saves patterns (Phase 3)

**BOOM baby its on and popping!** 🚀

---

## References

- **Primary Skill File**: `@.cursor/rules/cursor-skill.mdc`
- **Autonomous Workflow**: `@.cursor/rules/AUTONOMOUS_WORKFLOW.md`
- **Documentation**: `docs/README.md` and subdirectories
- **Project Rules**: `PROJECT_RULES.md`
- **Living Context**: `CONTEXT.md`
- **RIPPLE Index**: `RIPPLE_INDEX.md`
- **Enhanced Plan**: `.cursor/plans/enhanced-ripple-context-parallel-agents-plan.md`

---

*Workflow Version: 3.0 - Autonomous*
*Last Updated: 2025-01-16*
*Incorporates: RIPPLE Context Strategy, Parallel Agents, Living Context Documents, Autonomous Context Detection, Automatic Plan Generation, Self-Improvement Integration, ByteRover Memory*
