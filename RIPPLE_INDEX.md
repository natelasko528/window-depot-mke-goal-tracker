# RIPPLE_INDEX.md - Navigation Index for Large Files

**Purpose:** Searchable index for RIPPLE strategy operations on large files, especially `src/App.jsx`.

## App.jsx Index (10,759 lines)

### File Metrics

- **Total Lines:** 10,759
- **Total Characters:** 389,599
- **Functions:** 24 (including components)
- **Components:** 15
- **useState Hooks:** ~50+
- **useEffect Hooks:** ~30
- **Major Sections:** 8
- **Imports:** Lines 1-64

### Component Map (Line Numbers)

| Component | Start | End | Lines | Dependencies |
|-----------|-------|-----|-------|--------------|
| **Constants & Utilities** | 66 | 339 | 273 | - |
| WindowDepotTracker | 340 | 2724 | 2384 | All libs, all components |
| UserSelection | 2725 | 3003 | 278 | WindowDepotTracker |
| Dashboard | 3004 | 3757 | 753 | WindowDepotTracker |
| Goals | 3758 | 3902 | 144 | WindowDepotTracker |
| Appointments | 3903 | 4428 | 525 | WindowDepotTracker |
| Feed | 4429 | 4962 | 533 | WindowDepotTracker |
| Leaderboard | 4963 | 5326 | 363 | WindowDepotTracker |
| HistoryView | 5327 | 6183 | 856 | WindowDepotTracker |
| ActiveUsersList | 6184 | 6268 | 84 | WindowDepotTracker |
| Chatbot | 6361 | 7680 | 1319 | WindowDepotTracker |
| TeamView | 7681 | 7805 | 124 | WindowDepotTracker |
| AdminPanel | 7806 | 8143 | 337 | WindowDepotTracker |
| Reports | 8144 | 8363 | 219 | WindowDepotTracker |
| **SettingsPage** | **8364** | **11092** | **2728** | **WindowDepotTracker** |
| BottomNav | 11093 | 11121 | 28 | WindowDepotTracker |

### State Management Map

#### WindowDepotTracker State (Lines 345-431)

| State Variable | Line | Type | Used In |
|----------------|------|------|---------|
| currentUser | 345 | useState | Throughout |
| users | 346 | useState | Throughout |
| dailyLogs | 347 | useState | Dashboard, History, etc. |
| appointments | 348 | useState | Appointments, Reports |
| feed | 349 | useState | Feed component |
| feedReactions | 350 | useState | Feed component |
| feedFilters | 351 | useState | Feed component |
| pinnedPosts | 359 | useState | Feed component |
| unreadPosts | 360 | useState | Feed component |
| activeView | 361 | useState | Navigation |
| isLoading | 362 | useState | Initialization |
| isOnline | 363 | useState | Sync logic |
| isInitialized | 364 | useState | Initialization |
| toast | 365 | useState | Toast notifications |
| showCelebration | 366 | useState | Achievements |
| rememberUser | 367 | useState | User selection |
| activeUsers | 368 | useState | Presence |
| appSettings | 369 | useState | Settings, Chatbot |
| themeMode | 427 | useState | Theming |
| dailySnapshots | 428 | useState | Snapshots |
| showOnboarding | 429 | useState | Onboarding |
| reduceMotion | 430 | useState | Accessibility |
| activeSettingsTab | 431 | useState | Settings navigation |

#### SettingsPage State

| State Variable | Line | Type | Used In | Status |
|----------------|------|------|---------|--------|
| localSettings | 8394 | useState | SettingsPage | ✅ OK |
| showApiKey | 8395 | useState | SettingsPage | ✅ OK |
| isValidating | 8396 | useState | SettingsPage | ✅ OK |
| validationResult | 8397 | useState | SettingsPage | ✅ OK |
| textModels | 8398 | useState | SettingsPage | ✅ OK |
| liveModels | 8399 | useState | SettingsPage | ✅ OK |
| isLoadingModels | 8400 | useState | SettingsPage | ✅ OK |
| modelsError | 8401 | useState | SettingsPage | ✅ OK |
| activeSettingsTab | 8402 | useState | SettingsPage | ✅ OK |
| showDeleteConfirm | 8572 | useState | SettingsPage | ✅ OK |
| deleteConfirmText | 8573 | useState | SettingsPage | ✅ OK |
| **jotformStatus** | **8407** | **useState** | **useEffect 8439** | **✅ FIXED** |
| **marketsharpStatus** | **8408** | **useState** | **useEffect 8439** | **✅ FIXED** |
| **gohighlevelStatus** | **8409** | **useState** | **useEffect 8439** | **✅ FIXED** |
| **zoomStatus** | **8410** | **useState** | **useEffect 8439** | **✅ FIXED** |
| jotformApiKey | 8580 | useState | SettingsPage | ✅ OK |
| showJotformKey | 8581 | useState | SettingsPage | ✅ OK |
| marketsharpApiKey | 8582 | useState | SettingsPage | ✅ OK |
| marketsharpCompanyId | 8583 | useState | SettingsPage | ✅ OK |
| showMarketsharpKey | 8584 | useState | SettingsPage | ✅ OK |
| gohighlevelApiKey | 8585 | useState | SettingsPage | ✅ OK |
| gohighlevelLocationId | 8586 | useState | SettingsPage | ✅ OK |
| showGoHighLevelKey | 8587 | useState | SettingsPage | ✅ OK |
| isConnectingJotform | 8588 | useState | SettingsPage | ✅ OK |
| isConnectingMarketsharp | 8589 | useState | SettingsPage | ✅ OK |
| isConnectingGoHighLevel | 8590 | useState | SettingsPage | ✅ OK |
| isConnectingZoom | 8591 | useState | SettingsPage | ✅ OK |
| **jotformSubmissions** | **8423** | **useState** | **useEffect 8439** | **✅ FIXED** |
| **marketsharpData** | **8424** | **useState** | **useEffect 8439** | **✅ FIXED** |
| **gohighlevelData** | **8425** | **useState** | **useEffect 8439** | **✅ FIXED** |
| **zoomMeetings** | **8426** | **useState** | **useEffect 8439** | **✅ FIXED** |
| **integrationManager** | **8427** | **useState** | **useEffect 8439** | **✅ FIXED** |
| **zoomClientId** | **8428** | **useState** | **useEffect 8460** | **✅ FIXED** |
| **zoomClientSecret** | **8429** | **useState** | **useEffect 8460, 8479** | **✅ FIXED** |
| **zoomRedirectUri** | **8430** | **useState** | **useEffect 8460, 8479** | **✅ FIXED** |
| showZoomClientSecret | 8600 | useState | SettingsPage | ✅ OK |

### Hook Dependencies Graph

```
SettingsPage Component (line 8364)

useState Declarations:
├── Lines 8394-8402: Initial state ✅
├── Lines 8572-8573: Delete confirmation state ✅
└── Lines 8576-8600: Integration state 🔴 (DECLARED TOO LATE!)

useEffect Hooks:
├── Line 8434: Settings update ✅ (uses localSettings - OK)
├── Line 8439: Integration init ✅ (uses setIntegrationManager - DECLARED at line 8427)
├── Line 8460: Zoom OAuth load ✅ (uses setZoomClientId - DECLARED at line 8428)
├── Line 8479: Zoom OAuth save ✅ (uses setZoomClientId - DECLARED at line 8428)
└── Line 8497: Model loading ✅ (uses setIsLoadingModels - OK)
```

**✅ FIXED:** React Hooks Rules require all `useState` hooks to be declared before any `useEffect` hooks that use their setters.

**Fix Applied:** Moved all integration state useState declarations (lines 8405-8431) to before useEffect hooks (now at lines 8434-8517).

### Pattern Locations

| Pattern | Locations | Count | Status |
|---------|-----------|-------|--------|
| Promise.all | 482, 491, 8841, 989, 1319, 1328, 1342 | 7 | ✅ OK |
| useState | [see State Management Map] | ~50+ | ✅ OK |
| useEffect | 443, 596, 627, 808, 821, 835, 913, 1109, 1158, 1165, 1186, 1211, 1225, 1239, 1253, 1267, 1284, 6393, 6410, 6522, 6648, 6652, 6661, 6671, 8434, 8439, 8460, 8479, 8497, 9010 | ~30 | ✅ OK |
| Component Props | Throughout | - | ✅ OK |
| Error Boundaries | src/components/ErrorBoundary.jsx | 1 | ✅ Implemented |

### Issue Hotspots

| Area | Issues | Severity | Status |
|------|--------|----------|--------|
| SettingsPage Hooks (8404-8517) | 0 | - | ✅ Fixed |
| Feed Rendering | 0 | - | ✅ OK |
| Sync Queue | 0 | - | ✅ OK |
| Performance | 1 | P1 | ⚠️ Feed scroll janky |
| Error Boundaries | 0 | - | ✅ Fixed |

### Search Patterns

#### Find all useState declarations
```bash
grep "^\\s*const \\[.*\\] = useState" src/App.jsx
```

#### Find all useEffect hooks
```bash
grep "^\\s*useEffect\\(" src/App.jsx
```

#### Find hook order violations
```bash
# This would require script to check if useEffect uses setState before useState declaration
# Pattern: useEffect using setState before useState declaration
```

### RIPPLE Search Templates

#### Probe Structure
```javascript
// Get file metrics
wc -l src/App.jsx        // 10,759 lines
wc -c src/App.jsx        // 389,599 characters

// Extract component locations
grep "^function " src/App.jsx
grep "^export.*function" src/App.jsx
```

#### Search for Issues
```javascript
// Find React hooks violations
// Pattern: useEffect that uses setState before useState
// Lines 8410-8465: useEffect hooks
// Lines 8576-8600: useState declarations (too late!)

// Search for specific setters used before declaration
grep "setIntegrationManager" src/App.jsx
grep "setJotformStatus" src/App.jsx
grep "setZoomClientId" src/App.jsx
```

#### Extract Context
```javascript
// Extract SettingsPage component
read_file('src/App.jsx', offset=8364, limit=2728)

// Extract state declarations section
read_file('src/App.jsx', offset=8394, limit=210)  // Through line 8600

// Extract useEffect hooks
read_file('src/App.jsx', offset=8405, limit=85)  // Through line 8488
```

## Integration with Cursor Tools

- Use `grep` for initial searches
- Use `read_file` with offset/limit for targeted extraction
- Use `codebase_search` for semantic understanding
- Use terminal commands for metrics (`wc -l`, etc.)

---

*This index should be updated when file structure changes significantly.*
