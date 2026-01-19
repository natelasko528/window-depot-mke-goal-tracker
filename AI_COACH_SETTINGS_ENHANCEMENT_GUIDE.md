# AI Coach & Settings Enhancement Implementation Guide

## Overview
This guide documents the comprehensive enhancement to the AI Coach and Settings features for the Window Depot Goal Tracker application.

## Part 1: Completed Implementation

### 1.1 App Settings Structure (COMPLETED)
Extended `appSettings` state to include:

```javascript
{
  ai: {
    // Existing properties...
    // AI Coach Enhancements
    proactiveMode: true,
    coachingStyle: 'coach', // 'coach', 'mentor', 'cheerleader', 'drill-sergeant', 'robot'
    personalitySettings: {
      humor: 'some', // 'none', 'some', 'lots'
      formality: 'professional', // 'casual', 'professional', 'very-formal'
      frequency: 'normal', // 'minimal', 'normal', 'chatty'
    },
    checkinTimes: {
      morning: '09:00',
      midday: '13:00',
      evening: '18:00',
    },
    enableVoiceCommands: true,
    enableTrainingMode: true,
  },
  appearance: {
    compactMode: false,
    showAnimations: true,
    theme: 'light', // 'light', 'dark', 'high-contrast', 'blue', 'green'
    fontSize: 'medium', // 'small', 'medium', 'large', 'extra-large'
    density: 'comfortable', // 'compact', 'comfortable', 'spacious'
    reduceMotion: false,
  },
  notifications: {
    goalReminders: true,
    goalReminderTime: '09:00',
    endOfDayReminder: true,
    endOfDayReminderTime: '18:00',
    achievementAlerts: true,
    teamActivityAlerts: true,
    likeNotifications: true,
    appointmentSharedNotifications: true,
    leaderboardChangeAlerts: true,
  },
  privacy: {
    optOutOfLeaderboard: false,
    privateMode: false,
    anonymousMode: false,
  },
  accessibility: {
    screenReaderMode: false,
    enableKeyboardShortcuts: true,
    highContrast: false,
    increaseBorderThickness: false,
    alwaysShowFocusIndicators: true,
    colorblindMode: 'none', // 'none', 'deuteranopia', 'protanopia', 'tritanopia'
  },
}
```

### 1.2 State Variables Added (COMPLETED)
- `activityLog`: Array to track user actions (max 100 entries)
- `proactiveMessages`: Array to store proactive coaching messages
- `lastCheckinTime`: Timestamp of last check-in message

### 1.3 Core Functions Implemented (COMPLETED)

#### `logActivity(action, details)`
Logs user actions to the activity log for audit trail. Stores locally in IndexedDB.

**Actions logged:**
- 'increment_reviews', 'increment_demos', 'increment_callbacks'
- 'update_goals'
- 'add_appointment', 'edit_appointment', 'delete_appointment'
- 'add_feed_post', 'edit_feed_post', 'delete_feed_post'
- 'account_deleted'
- 'data_exported'
- 'settings_updated'

#### `generateProactiveMessage(messageType, context)`
Generates AI coach messages based on:
- **morning**: Daily goals briefing (9am)
- **midday**: Progress check-in (1pm)
- **evening**: Day recap with celebration or encouragement (6pm)
- **goal_hit**: Celebration when user hits a goal
- **streak**: Recognition for multi-day streaks

#### `deleteUserAccount()`
Securely deletes user account with:
- Removal from users array
- Sync to Supabase if configured
- Clear user session
- Activity log entry

#### `exportUserData()`
Exports all user data as JSON:
- User profile
- Daily activity logs
- Appointments
- Feed posts
- Export timestamp

## Part 2: Settings Component Enhancement

### 2.1 Tabbed Interface Implementation

Add state management for tab switching:

```javascript
const [activeSettingsTab, setActiveSettingsTab] = useState('ai');
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [deleteConfirmText, setDeleteConfirmText] = useState('');
```

Tabs:
- `ai` - AI & LLM Settings (existing, expand with new features)
- `notifications` - Notification Preferences
- `privacy` - Data & Privacy
- `accessibility` - Accessibility Settings
- `appearance` - Appearance Enhancements
- `integrations` - Future Integrations

### 2.2 AI Coach Settings Section

Add to AI Settings:

#### Proactive Coaching
```jsx
{/* Proactive Mode Toggle */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
  <div>
    <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>
      Enable Proactive Check-ins
    </div>
    <div style={{ fontSize: '12px', color: THEME.textLight }}>
      Receive coaching messages at specific times
    </div>
  </div>
  <button
    style={toggleStyle(localSettings.ai.proactiveMode)}
    onClick={() => handleAISettingChange('proactiveMode', !localSettings.ai.proactiveMode)}
  >
    <div style={toggleKnobStyle(localSettings.ai.proactiveMode)} />
  </button>
</div>

{/* Check-in Times */}
{localSettings.ai.proactiveMode && (
  <div style={{
    padding: '16px',
    background: THEME.secondary,
    borderRadius: '8px',
    marginBottom: '16px',
  }}>
    <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: THEME.text }}>
      Check-in Times
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
      {Object.entries(localSettings.ai.checkinTimes || {}).map(([key, value]) => (
        <div key={key}>
          <label style={labelStyle}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
          <input
            type="time"
            value={value}
            onChange={(e) => {
              handleAISettingChange('checkinTimes', {
                ...localSettings.ai.checkinTimes,
                [key]: e.target.value,
              });
            }}
            style={inputStyle}
          />
        </div>
      ))}
    </div>
  </div>
)}
```

#### Coaching Style
```jsx
{/* Coaching Style Selection */}
<div style={{ marginBottom: '16px' }}>
  <label style={labelStyle}>Coaching Style</label>
  <select
    value={localSettings.ai.coachingStyle || 'coach'}
    onChange={(e) => handleAISettingChange('coachingStyle', e.target.value)}
    style={selectStyle}
  >
    <option value="coach">Coach - Motivational & energetic</option>
    <option value="mentor">Mentor - Calm & supportive</option>
    <option value="cheerleader">Cheerleader - Super enthusiastic</option>
    <option value="drill-sergeant">Drill Sergeant - Strict & demanding</option>
    <option value="robot">Robot - Neutral & data-driven</option>
  </select>
</div>

{/* Personality Settings */}
<div style={{
  padding: '16px',
  background: THEME.secondary,
  borderRadius: '8px',
  marginBottom: '16px',
}}>
  <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: THEME.text }}>
    Personality Settings
  </div>

  {/* Humor Slider */}
  <div style={{ marginBottom: '12px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
      <span style={{ fontSize: '12px', fontWeight: '600', color: THEME.text }}>Humor Level</span>
      <span style={{ fontSize: '12px', color: THEME.textLight }}>
        {localSettings.ai.personalitySettings?.humor || 'some'}
      </span>
    </div>
    <select
      value={localSettings.ai.personalitySettings?.humor || 'some'}
      onChange={(e) => {
        handleAISettingChange('personalitySettings', {
          ...localSettings.ai.personalitySettings,
          humor: e.target.value,
        });
      }}
      style={selectStyle}
    >
      <option value="none">None - All business</option>
      <option value="some">Some - Friendly</option>
      <option value="lots">Lots - Very funny</option>
    </select>
  </div>

  {/* Formality Slider */}
  <div style={{ marginBottom: '12px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
      <span style={{ fontSize: '12px', fontWeight: '600', color: THEME.text }}>Formality</span>
      <span style={{ fontSize: '12px', color: THEME.textLight }}>
        {localSettings.ai.personalitySettings?.formality || 'professional'}
      </span>
    </div>
    <select
      value={localSettings.ai.personalitySettings?.formality || 'professional'}
      onChange={(e) => {
        handleAISettingChange('personalitySettings', {
          ...localSettings.ai.personalitySettings,
          formality: e.target.value,
        });
      }}
      style={selectStyle}
    >
      <option value="casual">Casual - Conversational</option>
      <option value="professional">Professional - Balanced</option>
      <option value="very-formal">Very Formal - Corporate</option>
    </select>
  </div>

  {/* Frequency Slider */}
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
      <span style={{ fontSize: '12px', fontWeight: '600', color: THEME.text }}>Message Frequency</span>
      <span style={{ fontSize: '12px', color: THEME.textLight }}>
        {localSettings.ai.personalitySettings?.frequency || 'normal'}
      </span>
    </div>
    <select
      value={localSettings.ai.personalitySettings?.frequency || 'normal'}
      onChange={(e) => {
        handleAISettingChange('personalitySettings', {
          ...localSettings.ai.personalitySettings,
          frequency: e.target.value,
        });
      }}
      style={selectStyle}
    >
      <option value="minimal">Minimal - Essential messages only</option>
      <option value="normal">Normal - Regular updates</option>
      <option value="chatty">Chatty - Frequent messages</option>
    </select>
  </div>
</div>

{/* Training Mode */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
  <div>
    <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Enable Training Mode</div>
    <div style={{ fontSize: '12px', color: THEME.textLight }}>Practice scenarios & role-plays</div>
  </div>
  <button
    style={toggleStyle(localSettings.ai.enableTrainingMode)}
    onClick={() => handleAISettingChange('enableTrainingMode', !localSettings.ai.enableTrainingMode)}
  >
    <div style={toggleKnobStyle(localSettings.ai.enableTrainingMode)} />
  </button>
</div>

{/* Voice Commands */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div>
    <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Enable Voice Commands</div>
    <div style={{ fontSize: '12px', color: THEME.textLight }}>Control app with voice ("add 2 reviews")</div>
  </div>
  <button
    style={toggleStyle(localSettings.ai.enableVoiceCommands)}
    onClick={() => handleAISettingChange('enableVoiceCommands', !localSettings.ai.enableVoiceCommands)}
  >
    <div style={toggleKnobStyle(localSettings.ai.enableVoiceCommands)} />
  </button>
</div>
```

### 2.3 Notification Preferences Section

```jsx
{activeSettingsTab === 'notifications' && (
  <div style={sectionStyle}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <div style={{...}}>
        <Bell size={20} color={THEME.primary} />
      </div>
      <div>
        <h3>Notification Preferences</h3>
        <p>Control when and how you receive notifications</p>
      </div>
    </div>

    {/* Goal Reminders */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Daily Goal Reminder</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Get reminded of your daily goals</div>
        </div>
        <button
          style={toggleStyle(localSettings.notifications.goalReminders)}
          onClick={() => handleNotificationChange('goalReminders', !localSettings.notifications.goalReminders)}
        >
          <div style={toggleKnobStyle(localSettings.notifications.goalReminders)} />
        </button>
      </div>
      {localSettings.notifications.goalReminders && (
        <div>
          <label style={labelStyle}>Reminder Time</label>
          <input
            type="time"
            value={localSettings.notifications.goalReminderTime || '09:00'}
            onChange={(e) => handleNotificationChange('goalReminderTime', e.target.value)}
            style={inputStyle}
          />
        </div>
      )}
    </div>

    {/* End of Day Reminder */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>End of Day Review</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Summary of today's achievements</div>
        </div>
        <button
          style={toggleStyle(localSettings.notifications.endOfDayReminder)}
          onClick={() => handleNotificationChange('endOfDayReminder', !localSettings.notifications.endOfDayReminder)}
        >
          <div style={toggleKnobStyle(localSettings.notifications.endOfDayReminder)} />
        </button>
      </div>
      {localSettings.notifications.endOfDayReminder && (
        <div>
          <label style={labelStyle}>Review Time</label>
          <input
            type="time"
            value={localSettings.notifications.endOfDayReminderTime || '18:00'}
            onChange={(e) => handleNotificationChange('endOfDayReminderTime', e.target.value)}
            style={inputStyle}
          />
        </div>
      )}
    </div>

    {/* Achievement Alerts */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Achievement Notifications</div>
        <div style={{ fontSize: '12px', color: THEME.textLight }}>When you hit goals or reach milestones</div>
      </div>
      <button
        style={toggleStyle(localSettings.notifications.achievementAlerts)}
        onClick={() => handleNotificationChange('achievementAlerts', !localSettings.notifications.achievementAlerts)}
      >
        <div style={toggleKnobStyle(localSettings.notifications.achievementAlerts)} />
      </button>
    </div>

    {/* Team Activity Alerts */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Team Activity Alerts</div>
        <div style={{ fontSize: '12px', color: THEME.textLight }}>New posts and interactions</div>
      </div>
      <button
        style={toggleStyle(localSettings.notifications.teamActivityAlerts)}
        onClick={() => handleNotificationChange('teamActivityAlerts', !localSettings.notifications.teamActivityAlerts)}
      >
        <div style={toggleKnobStyle(localSettings.notifications.teamActivityAlerts)} />
      </button>
    </div>
  </div>
)}
```

### 2.4 Privacy & Data Section

```jsx
{activeSettingsTab === 'privacy' && (
  <div style={sectionStyle}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <div style={{...}}>
        <Shield size={20} color={THEME.primary} />
      </div>
      <div>
        <h3>Privacy & Data Management</h3>
        <p>Control your data and privacy preferences</p>
      </div>
    </div>

    {/* Privacy Toggles */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Opt Out of Leaderboard</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Hide your ranking from others</div>
        </div>
        <button
          style={toggleStyle(localSettings.privacy?.optOutOfLeaderboard)}
          onClick={() => handlePrivacyChange('optOutOfLeaderboard', !localSettings.privacy?.optOutOfLeaderboard)}
        >
          <div style={toggleKnobStyle(localSettings.privacy?.optOutOfLeaderboard)} />
        </button>
      </div>
    </div>

    {/* Private Mode */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Private Mode</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Don't share achievements to team feed</div>
        </div>
        <button
          style={toggleStyle(localSettings.privacy?.privateMode)}
          onClick={() => handlePrivacyChange('privateMode', !localSettings.privacy?.privateMode)}
        >
          <div style={toggleKnobStyle(localSettings.privacy?.privateMode)} />
        </button>
      </div>
    </div>

    {/* Anonymous Mode */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Anonymous Mode</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Show as "Anonymous User" in team views</div>
        </div>
        <button
          style={toggleStyle(localSettings.privacy?.anonymousMode)}
          onClick={() => handlePrivacyChange('anonymousMode', !localSettings.privacy?.anonymousMode)}
        >
          <div style={toggleKnobStyle(localSettings.privacy?.anonymousMode)} />
        </button>
      </div>
    </div>

    {/* Data Export */}
    <div style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Export Your Data</div>
        <div style={{ fontSize: '12px', color: THEME.textLight }}>Download all your personal data as JSON</div>
      </div>
      <button
        onClick={exportUserData}
        style={{
          width: '100%',
          padding: '12px',
          background: THEME.primary,
          color: THEME.white,
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <FileDown size={16} />
        Export My Data
      </button>
    </div>

    {/* Delete Account */}
    <div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.danger }}>Delete Account</div>
        <div style={{ fontSize: '12px', color: THEME.textLight }}>Permanently delete your account and all data</div>
      </div>
      <button
        onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
        style={{
          width: '100%',
          padding: '12px',
          background: 'transparent',
          color: THEME.danger,
          border: `2px solid ${THEME.danger}`,
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        <Trash size={16} style={{ marginRight: '8px' }} />
        Delete My Account
      </button>

      {showDeleteConfirm && (
        <div style={{ marginTop: '16px', padding: '16px', background: '#FFE5E5', borderRadius: '8px' }}>
          <div style={{ marginBottom: '12px', color: THEME.danger, fontWeight: '600' }}>
            This action cannot be undone!
          </div>
          <div style={{ marginBottom: '12px', fontSize: '12px', color: THEME.text }}>
            Type "DELETE" to confirm account deletion:
          </div>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE"
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              onClick={deleteUserAccount}
              disabled={deleteConfirmText !== 'DELETE'}
              style={{
                flex: 1,
                padding: '12px',
                background: deleteConfirmText === 'DELETE' ? THEME.danger : THEME.border,
                color: THEME.white,
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed',
              }}
            >
              Delete
            </button>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText('');
              }}
              style={{
                flex: 1,
                padding: '12px',
                background: THEME.secondary,
                color: THEME.text,
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

### 2.5 Accessibility Settings Section

```jsx
{activeSettingsTab === 'accessibility' && (
  <div style={sectionStyle}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <div style={{...}}>
        <Accessibility size={20} color={THEME.primary} />
      </div>
      <div>
        <h3>Accessibility Settings</h3>
        <p>Make the app work better for you</p>
      </div>
    </div>

    {/* Screen Reader Mode */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Screen Reader Mode</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Optimize for screen reader compatibility</div>
        </div>
        <button
          style={toggleStyle(localSettings.accessibility?.screenReaderMode)}
          onClick={() => handleAccessibilityChange('screenReaderMode', !localSettings.accessibility?.screenReaderMode)}
        >
          <div style={toggleKnobStyle(localSettings.accessibility?.screenReaderMode)} />
        </button>
      </div>
    </div>

    {/* Keyboard Shortcuts */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Keyboard Shortcuts</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Enable keyboard navigation shortcuts</div>
        </div>
        <button
          style={toggleStyle(localSettings.accessibility?.enableKeyboardShortcuts)}
          onClick={() => handleAccessibilityChange('enableKeyboardShortcuts', !localSettings.accessibility?.enableKeyboardShortcuts)}
        >
          <div style={toggleKnobStyle(localSettings.accessibility?.enableKeyboardShortcuts)} />
        </button>
      </div>
    </div>

    {/* High Contrast */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>High Contrast Mode</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Increase color contrast for visibility</div>
        </div>
        <button
          style={toggleStyle(localSettings.accessibility?.highContrast)}
          onClick={() => handleAccessibilityChange('highContrast', !localSettings.accessibility?.highContrast)}
        >
          <div style={toggleKnobStyle(localSettings.accessibility?.highContrast)} />
        </button>
      </div>
    </div>

    {/* Colorblind Mode */}
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>Color Blind Mode</label>
      <select
        value={localSettings.accessibility?.colorblindMode || 'none'}
        onChange={(e) => handleAccessibilityChange('colorblindMode', e.target.value)}
        style={selectStyle}
      >
        <option value="none">None - Standard colors</option>
        <option value="deuteranopia">Deuteranopia (Red-Green)</option>
        <option value="protanopia">Protanopia (Red-Green)</option>
        <option value="tritanopia">Tritanopia (Blue-Yellow)</option>
      </select>
    </div>

    {/* Reduce Motion */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Reduce Motion</div>
        <div style={{ fontSize: '12px', color: THEME.textLight }}>Minimize animations and transitions</div>
      </div>
      <button
        style={toggleStyle(localSettings.appearance?.reduceMotion)}
        onClick={() => handleAppearanceChange('reduceMotion', !localSettings.appearance?.reduceMotion)}
      >
        <div style={toggleKnobStyle(localSettings.appearance?.reduceMotion)} />
      </button>
    </div>
  </div>
)}
```

### 2.6 Appearance Enhancements Section

```jsx
{activeSettingsTab === 'appearance' && (
  <div style={sectionStyle}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <div style={{...}}>
        <Palette size={20} color={THEME.primary} />
      </div>
      <div>
        <h3>Appearance</h3>
        <p>Customize how the app looks</p>
      </div>
    </div>

    {/* Theme Selection */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <label style={labelStyle}>Color Theme</label>
      <select
        value={localSettings.appearance?.theme || 'light'}
        onChange={(e) => handleAppearanceChange('theme', e.target.value)}
        style={selectStyle}
      >
        <option value="light">Light - Clean and bright</option>
        <option value="dark">Dark - Easy on the eyes</option>
        <option value="high-contrast">High Contrast - Maximum visibility</option>
        <option value="blue">Blue Theme - Professional feel</option>
        <option value="green">Green Theme - Nature inspired</option>
      </select>
    </div>

    {/* Font Size */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <label style={labelStyle}>Font Size</label>
      <select
        value={localSettings.appearance?.fontSize || 'medium'}
        onChange={(e) => handleAppearanceChange('fontSize', e.target.value)}
        style={selectStyle}
      >
        <option value="small">Small - Compact display</option>
        <option value="medium">Medium - Balanced (default)</option>
        <option value="large">Large - Easier to read</option>
        <option value="extra-large">Extra Large - Maximum readability</option>
      </select>
    </div>

    {/* Density */}
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}` }}>
      <label style={labelStyle}>Layout Density</label>
      <select
        value={localSettings.appearance?.density || 'comfortable'}
        onChange={(e) => handleAppearanceChange('density', e.target.value)}
        style={selectStyle}
      >
        <option value="compact">Compact - More info on screen</option>
        <option value="comfortable">Comfortable - Balanced spacing (default)</option>
        <option value="spacious">Spacious - Large touch targets</option>
      </select>
    </div>

    {/* Animations */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Enable Animations</div>
        <div style={{ fontSize: '12px', color: THEME.textLight }}>Smooth transitions and effects</div>
      </div>
      <button
        style={toggleStyle(localSettings.appearance?.showAnimations)}
        onClick={() => handleAppearanceChange('showAnimations', !localSettings.appearance?.showAnimations)}
      >
        <div style={toggleKnobStyle(localSettings.appearance?.showAnimations)} />
      </button>
    </div>
  </div>
)}
```

### 2.7 Integrations Section (Future)

```jsx
{activeSettingsTab === 'integrations' && (
  <div style={sectionStyle}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <div style={{...}}>
        <Package size={20} color={THEME.primary} />
      </div>
      <div>
        <h3>Integrations</h3>
        <p>Connect external services (coming soon)</p>
      </div>
    </div>

    {/* Google Calendar */}
    <div style={{ marginBottom: '20px', padding: '16px', background: THEME.secondary, borderRadius: '8px', border: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Google Calendar Sync</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Sync appointments to Google Calendar</div>
        </div>
        <button
          disabled
          style={{
            padding: '8px 16px',
            background: THEME.border,
            color: THEME.textLight,
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'not-allowed',
          }}
        >
          Coming Soon
        </button>
      </div>
    </div>

    {/* Slack Integration */}
    <div style={{ marginBottom: '20px', padding: '16px', background: THEME.secondary, borderRadius: '8px', border: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Slack Integration</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Post achievements to Slack channel</div>
        </div>
        <button
          disabled
          style={{
            padding: '8px 16px',
            background: THEME.border,
            color: THEME.textLight,
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'not-allowed',
          }}
        >
          Coming Soon
        </button>
      </div>
    </div>

    {/* CSV Export */}
    <div style={{ marginBottom: '20px', padding: '16px', background: THEME.secondary, borderRadius: '8px', border: `1px solid ${THEME.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>Export to Excel</div>
          <div style={{ fontSize: '12px', color: THEME.textLight }}>Download data as CSV file</div>
        </div>
        <button
          disabled
          style={{
            padding: '8px 16px',
            background: THEME.border,
            color: THEME.textLight,
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'not-allowed',
          }}
        >
          Coming Soon
        </button>
      </div>
    </div>
  </div>
)}
```

## Part 3: Handler Functions for Settings Component

Add these handlers to the SettingsPage component:

```javascript
const handleAISettingChange = (key, value) => {
  setLocalSettings(prev => ({
    ...prev,
    ai: { ...prev.ai, [key]: value }
  }));
};

const handleNotificationChange = (key, value) => {
  setLocalSettings(prev => ({
    ...prev,
    notifications: { ...prev.notifications, [key]: value }
  }));
};

const handlePrivacyChange = (key, value) => {
  setLocalSettings(prev => ({
    ...prev,
    privacy: { ...prev.privacy, [key]: value }
  }));
};

const handleAccessibilityChange = (key, value) => {
  setLocalSettings(prev => ({
    ...prev,
    accessibility: { ...prev.accessibility, [key]: value }
  }));
};

const handleAppearanceChange = (key, value) => {
  setLocalSettings(prev => ({
    ...prev,
    appearance: { ...prev.appearance, [key]: value }
  }));
};
```

## Part 4: Tab Navigation UI

Add tab buttons at the top of the Settings component return:

```jsx
return (
  <div style={{ paddingBottom: '80px' }}>
    <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: THEME.text }}>
      Settings
    </h2>

    {/* Settings Tabs */}
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      overflowX: 'auto',
      paddingBottom: '8px',
    }}>
      {[
        { id: 'ai', label: 'AI Coach', icon: Bot },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'privacy', label: 'Privacy', icon: Shield },
        { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'integrations', label: 'Integrations', icon: Package },
      ].map(tab => {
        const TabIcon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveSettingsTab(tab.id)}
            style={{
              padding: '10px 16px',
              background: activeSettingsTab === tab.id ? THEME.primary : THEME.secondary,
              color: activeSettingsTab === tab.id ? THEME.white : THEME.text,
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: activeSettingsTab === tab.id ? '600' : '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            <TabIcon size={14} />
            {tab.label}
          </button>
        );
      })}
    </div>

    {/* Conditional Sections Based on Active Tab */}
    {/* AI Coach Settings */}
    {activeSettingsTab === 'ai' && (
      <div style={sectionStyle}>
        {/* Existing AI settings + new features above */}
      </div>
    )}

    {/* Notification Settings */}
    {activeSettingsTab === 'notifications' && (
      // Notification settings JSX from 2.3 above
    )}

    {/* Privacy Settings */}
    {activeSettingsTab === 'privacy' && (
      // Privacy settings JSX from 2.4 above
    )}

    {/* Accessibility Settings */}
    {activeSettingsTab === 'accessibility' && (
      // Accessibility settings JSX from 2.5 above
    )}

    {/* Appearance Settings */}
    {activeSettingsTab === 'appearance' && (
      // Appearance settings JSX from 2.6 above
    )}

    {/* Integrations (Future) */}
    {activeSettingsTab === 'integrations' && (
      // Integrations JSX from 2.7 above
    )}

    {/* Save Button (sticky at bottom) */}
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: 0,
      right: 0,
      padding: '16px',
      background: THEME.white,
      borderTop: `1px solid ${THEME.border}`,
      display: 'flex',
      gap: '12px',
    }}>
      <button
        onClick={() => setLocalSettings({ ...settings, themeMode: currentThemeMode })}
        style={{
          flex: 1,
          padding: '12px',
          background: THEME.secondary,
          color: THEME.text,
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Reset
      </button>
      <button
        onClick={handleSave}
        style={{
          flex: 1,
          padding: '12px',
          background: THEME.primary,
          color: THEME.white,
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Save Settings
      </button>
    </div>
  </div>
);
```

## Part 5: Additional Features to Implement

### Data Analysis & Insights in AI Coach
- Weekly trend analysis
- Best performing days
- Pattern recognition
- Predictive analytics

### Training & Development Features
- Objection handling scenarios
- Product knowledge quizzes
- Role-play mode with AI
- Feedback on responses

### Voice Commands
- Parse AI responses for action intents
- Use Gemini function calling API
- Execute actions: "add 2 reviews", "show leaderboard", "open appointments"
- Confirmation prompts for modifications

### AI Coach UI Enhancements
- Proactive message badge/indicator on AI Coach icon
- System message display with special styling
- Training mode toggle and UI
- Data analysis quick-view cards

## Implementation Checklist

- [x] Update appSettings state structure
- [x] Add activity logging functions
- [x] Add proactive message generation
- [x] Add user account deletion
- [x] Add data export
- [ ] Add tabbed Settings UI
- [ ] Implement Notification Preferences section
- [ ] Implement Privacy & Data section
- [ ] Implement Accessibility section
- [ ] Implement Appearance section
- [ ] Implement Integrations placeholder
- [ ] Add AI Coach personality customization UI
- [ ] Add proactive coaching check-in loop
- [ ] Implement data analysis endpoints
- [ ] Implement training mode UI
- [ ] Add voice command parsing
- [ ] Test all new features
- [ ] Add accessibility labels and ARIA attributes
- [ ] Mobile responsive testing
- [ ] Performance optimization

## Notes
- All settings should persist to IndexedDB via storage.set()
- Settings should sync to Supabase when online (add settings sync to sync.js)
- Activity logs should be limited to 100 most recent entries
- Privacy settings should filter data from team views
- Appearance settings should apply CSS custom properties globally
- Accessibility features should enhance existing app, not break functionality
