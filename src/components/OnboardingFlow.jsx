import React, { useState, useEffect } from 'react';
import { Check, ChevronRight } from 'lucide-react';

/**
 * Onboarding Flow Component
 * Welcome screen with feature discovery and setup checklist
 */
export default function OnboardingFlow({ onComplete, theme }) {
  const [step, setStep] = useState('welcome'); // welcome, checklist, tips
  const [checklist, setChecklist] = useState({
    setGoals: false,
    logActivity: false,
    addAppointment: false,
    makePost: false,
    viewLeaderboard: false,
  });

  // Check if onboarding was already completed
  useEffect(() => {
    const isOnboardingDone = localStorage.getItem('onboarding_completed');
    if (isOnboardingDone) {
      onComplete();
    }
  }, [onComplete]);

  const handleChecklistToggle = (key) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isChecklistComplete = Object.values(checklist).every((v) => v);

  const handleCompleteOnboarding = () => {
    if (isChecklistComplete) {
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('onboarding_completed_date', new Date().toISOString());
      onComplete();
    }
  };

  const welcomeTheme = {
    bg: theme.mode === 'dark' ? '#1a1a1a' : '#FFFFFF',
    cardBg: theme.mode === 'dark' ? '#252525' : '#F8F9FA',
    text: theme.mode === 'dark' ? '#FFFFFF' : '#1a1a1a',
    textSecondary: theme.mode === 'dark' ? '#B0B0B0' : '#666666',
    accent: '#6366F1',
    button: '#6366F1',
  };

  if (step === 'welcome') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${welcomeTheme.bg} 0%, ${welcomeTheme.cardBg} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            textAlign: 'center',
            background: welcomeTheme.bg,
            borderRadius: '16px',
            padding: '40px 30px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
            animation: 'fadeInUp 0.5s ease-out',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              marginBottom: '20px',
              animation: 'bounce 1s ease-in-out infinite',
            }}
          >
            🚀
          </div>

          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: welcomeTheme.text,
              marginBottom: '12px',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          >
            Welcome to Goal Tracker
          </h1>

          <p
            style={{
              fontSize: '16px',
              color: welcomeTheme.textSecondary,
              marginBottom: '30px',
              lineHeight: '1.6',
            }}
          >
            Track your daily goals, appointments, and celebrate wins with your team. Let's get you started!
          </p>

          <div
            style={{
              display: 'grid',
              gap: '15px',
              marginBottom: '30px',
              textAlign: 'left',
            }}
          >
            <FeatureTip
              icon="📊"
              title="Track Daily Goals"
              description="Set targets for reviews, demos, and callbacks"
              theme={welcomeTheme}
            />
            <FeatureTip
              icon="📅"
              title="Manage Appointments"
              description="Log customer meetings and follow-ups"
              theme={welcomeTheme}
            />
            <FeatureTip
              icon="🏆"
              title="Compete & Celebrate"
              description="See leaderboards and share your wins"
              theme={welcomeTheme}
            />
          </div>

          <button
            onClick={() => setStep('checklist')}
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '8px',
              background: welcomeTheme.button,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = '0.9';
              e.target.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = '1';
              e.target.style.transform = 'scale(1)';
            }}
          >
            Get Started <ChevronRight size={20} />
          </button>

          <button
            onClick={onComplete}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '10px 20px',
              fontSize: '14px',
              border: `2px solid ${welcomeTheme.textSecondary}`,
              borderRadius: '8px',
              background: 'transparent',
              color: welcomeTheme.textSecondary,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = welcomeTheme.cardBg;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (step === 'checklist') {
    const completionPercentage = Math.round((Object.values(checklist).filter((v) => v).length / Object.keys(checklist).length) * 100);

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${welcomeTheme.bg} 0%, ${welcomeTheme.cardBg} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            width: '100%',
            background: welcomeTheme.bg,
            borderRadius: '16px',
            padding: '40px 30px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
            animation: 'fadeInUp 0.5s ease-out',
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: welcomeTheme.text,
              marginBottom: '8px',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          >
            Quick Setup Checklist
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: welcomeTheme.textSecondary,
              marginBottom: '24px',
            }}
          >
            Complete these steps to get the most out of Goal Tracker
          </p>

          {/* Progress Bar */}
          <div
            style={{
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: welcomeTheme.textSecondary,
              }}
            >
              <span>Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <div
              style={{
                height: '6px',
                background: welcomeTheme.cardBg,
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${completionPercentage}%`,
                  background: welcomeTheme.accent,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
            <ChecklistItem
              id="setGoals"
              label="Set your goals"
              description="Define targets for reviews, demos, and callbacks"
              checked={checklist.setGoals}
              onChange={handleChecklistToggle}
              theme={welcomeTheme}
            />
            <ChecklistItem
              id="logActivity"
              label="Log your first activity"
              description="Record reviews, demos, or callbacks completed"
              checked={checklist.logActivity}
              onChange={handleChecklistToggle}
              theme={welcomeTheme}
            />
            <ChecklistItem
              id="addAppointment"
              label="Add an appointment"
              description="Log a customer meeting with product interests"
              checked={checklist.addAppointment}
              onChange={handleChecklistToggle}
              theme={welcomeTheme}
            />
            <ChecklistItem
              id="makePost"
              label="Make a feed post"
              description="Share an achievement or update with the team"
              checked={checklist.makePost}
              onChange={handleChecklistToggle}
              theme={welcomeTheme}
            />
            <ChecklistItem
              id="viewLeaderboard"
              label="Check the leaderboard"
              description="See how your team is performing this week"
              checked={checklist.viewLeaderboard}
              onChange={handleChecklistToggle}
              theme={welcomeTheme}
            />
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <button
              onClick={handleCompleteOnboarding}
              disabled={!isChecklistComplete}
              style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                background: isChecklistComplete ? welcomeTheme.button : welcomeTheme.cardBg,
                color: isChecklistComplete ? 'white' : welcomeTheme.textSecondary,
                cursor: isChecklistComplete ? 'pointer' : 'not-allowed',
                opacity: isChecklistComplete ? 1 : 0.5,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (isChecklistComplete) {
                  e.target.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                if (isChecklistComplete) {
                  e.target.style.opacity = '1';
                }
              }}
            >
              <Check size={20} /> Complete Setup
            </button>

            <button
              onClick={() => setStep('welcome')}
              style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '14px',
                border: `2px solid ${welcomeTheme.textSecondary}`,
                borderRadius: '8px',
                background: 'transparent',
                color: welcomeTheme.textSecondary,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = welcomeTheme.cardBg;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Feature tip component
 */
function FeatureTip({ icon, title, description, theme }) {
  return (
    <div
      style={{
        background: theme.cardBg,
        padding: '16px',
        borderRadius: '8px',
        border: `1px solid ${theme.mode === 'dark' ? '#333' : '#E5E7EB'}`,
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>{icon}</div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>
            {title}
          </div>
          <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '4px' }}>
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Checklist item component
 */
function ChecklistItem({ id, label, description, checked, onChange, theme }) {
  return (
    <div
      onClick={() => onChange(id)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px',
        background: checked ? `${theme.accent}15` : theme.cardBg,
        borderRadius: '8px',
        border: `2px solid ${checked ? theme.accent : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = checked ? `${theme.accent}20` : theme.cardBg;
        e.currentTarget.style.borderColor = theme.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = checked ? `${theme.accent}15` : theme.cardBg;
        e.currentTarget.style.borderColor = checked ? theme.accent : 'transparent';
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          border: `2px solid ${checked ? theme.accent : theme.textSecondary}`,
          background: checked ? theme.accent : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
      >
        {checked && <Check size={16} color="white" />}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: theme.text,
            textDecoration: checked ? 'line-through' : 'none',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: theme.textSecondary,
            marginTop: '2px',
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}
