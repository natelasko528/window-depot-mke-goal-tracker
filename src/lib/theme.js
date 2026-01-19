/**
 * Theme System for Window Depot Tracker
 * Provides light and dark theme configurations with management utilities
 */

// Light theme (default)
export const LIGHT_THEME = {
  primary: '#0056A4',
  primaryDark: '#003D73',
  primaryLight: '#4A90D9',
  secondary: '#F5F7FA',
  accent: '#E8F4FD',
  success: '#28A745',
  warning: '#FFC107',
  danger: '#DC3545',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6B7280',
  border: '#E5E7EB',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Expanded color palette with gradients
  gradients: {
    primary: 'linear-gradient(135deg, #0056A4 0%, #4A90D9 100%)',
    success: 'linear-gradient(135deg, #28A745 0%, #5CB85C 100%)',
    warning: 'linear-gradient(135deg, #FFC107 0%, #FFD700 100%)',
    danger: 'linear-gradient(135deg, #DC3545 0%, #E74C3C 100%)',
    gold: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    background: 'linear-gradient(135deg, #F5F7FA 0%, #E8F4FD 100%)',
    cardHover: 'linear-gradient(135deg, rgba(0, 86, 164, 0.05) 0%, rgba(74, 144, 217, 0.05) 100%)',
  },

  // Additional accent colors
  accentColors: {
    purple: '#9333EA',
    teal: '#17A2B8',
    orange: '#F59E0B',
  },

  // Shadow variants for depth
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 2px 8px rgba(0, 0, 0, 0.08)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.12)',
    xl: '0 8px 32px rgba(0, 0, 0, 0.16)',
    layered: '0 2px 8px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04)',
  },

  // Background colors
  bg: {
    primary: '#FFFFFF',
    secondary: '#F5F7FA',
    tertiary: '#E8F4FD',
  },
};

// Dark theme
export const DARK_THEME = {
  primary: '#4A90D9',
  primaryDark: '#2E5BA8',
  primaryLight: '#6BA3E5',
  secondary: '#16213e',
  accent: '#1e3a5f',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  white: '#1E293B',
  text: '#F8FAFC',
  textLight: '#94A3B8',
  border: '#334155',
  gold: '#FCD34D',
  silver: '#E5E7EB',
  bronze: '#F97316',

  // Gradients adapted for dark mode
  gradients: {
    primary: 'linear-gradient(135deg, #4A90D9 0%, #2E5BA8 100%)',
    success: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
    warning: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
    danger: 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)',
    gold: 'linear-gradient(135deg, #FCD34D 0%, #FBBF24 100%)',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    cardHover: 'linear-gradient(135deg, rgba(74, 144, 217, 0.15) 0%, rgba(46, 91, 168, 0.15) 100%)',
  },

  // Additional accent colors (muted for dark mode)
  accentColors: {
    purple: '#A78BFA',
    teal: '#2DD4BF',
    orange: '#FB923C',
  },

  // Shadow variants for dark mode
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 2px 8px rgba(0, 0, 0, 0.4)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.5)',
    xl: '0 8px 32px rgba(0, 0, 0, 0.6)',
    layered: '0 2px 8px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)',
  },

  // Background colors
  bg: {
    primary: '#0A0A0A',
    secondary: '#1A1A2E',
    tertiary: '#2D3E5F',
  },
};

/**
 * Get the current theme based on theme mode
 * @param {string} themeMode - 'light', 'dark', or 'system'
 * @returns {object} Theme object
 */
export function getTheme(themeMode = 'light') {
  if (themeMode === 'dark') {
    return DARK_THEME;
  }

  if (themeMode === 'system') {
    // Detect system preference
    const prefersDark = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? DARK_THEME : LIGHT_THEME;
  }

  // Default to light theme
  return LIGHT_THEME;
}

/**
 * Get system theme preference
 * @returns {string} 'light' or 'dark'
 */
export function getSystemThemePreference() {
  if (typeof window === 'undefined') return 'light';

  const prefersDark = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Listen for system theme changes
 * @param {function} callback - Function to call when system theme changes
 * @returns {function} Unsubscribe function
 */
export function listenToSystemThemeChanges(callback) {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', (e) => {
      callback(e.matches ? 'dark' : 'light');
    });
  } else if (mediaQuery.addListener) {
    // Older browsers
    mediaQuery.addListener((e) => {
      callback(e.matches ? 'dark' : 'light');
    });
  }

  // Return cleanup function
  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', callback);
    } else if (mediaQuery.removeListener) {
      mediaQuery.removeListener(callback);
    }
  };
}

/**
 * Theme Manager class for advanced theme management
 * Handles persistence and toggling
 */
export class ThemeManager {
  constructor(initialMode = 'light') {
    this.mode = initialMode;
    this.loadPreference();
  }

  loadPreference() {
    try {
      const stored = localStorage.getItem('appThemeMode');
      if (stored === 'dark' || stored === 'light') {
        this.mode = stored;
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  }

  savePreference() {
    try {
      localStorage.setItem('appThemeMode', this.mode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }

  toggle() {
    this.mode = this.mode === 'dark' ? 'light' : 'dark';
    this.savePreference();
    return this.mode;
  }

  setMode(mode) {
    if (mode === 'dark' || mode === 'light') {
      this.mode = mode;
      this.savePreference();
    }
  }

  getCurrentTheme() {
    return getTheme(this.mode);
  }

  getMode() {
    return this.mode;
  }

  isDarkMode() {
    return this.mode === 'dark';
  }
}

/**
 * Get contrasting text color based on background
 */
export const getContrastingTextColor = (backgroundColor, theme) => {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? theme.text : theme.white;
};

/**
 * Merge custom theme with base theme
 */
export const mergeTheme = (baseTheme, customTheme) => {
  return {
    ...baseTheme,
    ...customTheme,
    gradients: {
      ...baseTheme.gradients,
      ...customTheme.gradients,
    },
    accentColors: {
      ...baseTheme.accentColors,
      ...customTheme.accentColors,
    },
    shadows: {
      ...baseTheme.shadows,
      ...customTheme.shadows,
    },
    bg: {
      ...baseTheme.bg,
      ...customTheme.bg,
    },
  };
};

export default LIGHT_THEME;
