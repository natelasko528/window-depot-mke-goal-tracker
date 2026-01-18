/**
 * Accessibility Utilities (WCAG AA Compliant)
 * Helps ensure the app is accessible to all users including those using screen readers
 * and keyboard navigation
 */

/**
 * Generate ARIA labels for common elements
 */
export const ariaLabels = {
  // Goal tracking
  goalIncrement: (category, current, goal) => `Increase ${category} from ${current} to ${current + 1} (Goal: ${goal})`,
  goalDecrement: (category, current) => `Decrease ${category} from ${current} to ${current - 1}`,
  goalProgress: (category, current, goal) => `${category} progress: ${current} of ${goal}`,

  // Navigation
  navDashboard: 'Dashboard - Overview and daily goals',
  navGoals: 'Goals - Set and manage category goals',
  navAppointments: 'Appointments - Customer meetings and follow-ups',
  navFeed: 'Social Feed - Posts and team activity',
  navLeaderboard: 'Leaderboard - Weekly rankings and achievements',
  navHistory: 'History - View past activity and statistics',
  navTeam: 'Team View - Manager overview of team performance',
  navReports: 'Reports - Detailed analytics and charts',
  navSettings: 'Settings - Preferences and API configuration',

  // Actions
  addNew: (type) => `Create new ${type}`,
  delete: (type) => `Delete ${type}`,
  edit: (type) => `Edit ${type}`,
  save: 'Save changes',
  cancel: 'Cancel operation',

  // Social
  like: 'Like this post',
  unlike: 'Unlike this post',
  comment: 'Leave a comment on this post',
  share: 'Share this post',

  // Forms
  inputName: 'User name (required)',
  inputGoal: 'Goal value (0-100)',
  inputCustomer: 'Customer name (required)',
  inputNotes: 'Additional notes (optional)',
  inputSearch: 'Search items',

  // Status
  loading: 'Content is loading',
  error: 'An error occurred',
  success: 'Operation successful',
  offline: 'You are currently offline',
  online: 'You are now online',
};

/**
 * Create live region announcement for dynamic content
 * Screen readers will announce updates to users
 */
export class AccessibilityAnnouncer {
  constructor() {
    this.liveRegion = null;
    this.initializeLiveRegion();
  }

  initializeLiveRegion() {
    if (!this.liveRegion) {
      this.liveRegion = document.createElement('div');
      this.liveRegion.setAttribute('role', 'status');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.style.position = 'absolute';
      this.liveRegion.style.left = '-10000px';
      this.liveRegion.style.width = '1px';
      this.liveRegion.style.height = '1px';
      this.liveRegion.style.overflow = 'hidden';
      document.body.appendChild(this.liveRegion);
    }
  }

  announce(message, isAlert = false) {
    if (this.liveRegion) {
      this.liveRegion.setAttribute(
        'role',
        isAlert ? 'alert' : 'status'
      );
      this.liveRegion.textContent = message;
    }
  }

  cleanup() {
    if (this.liveRegion) {
      this.liveRegion.remove();
      this.liveRegion = null;
    }
  }
}

/**
 * Singleton instance for announcements
 */
export const accessibilityAnnouncer = new AccessibilityAnnouncer();

/**
 * Check for reduced motion preference
 * Returns true if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation duration based on user preference
 */
export const getAnimationDuration = (normalDuration = 300) => {
  return prefersReducedMotion() ? 0 : normalDuration;
};

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Trap focus within a modal or container
   */
  trapFocus: (containerElement) => {
    const focusableElements = containerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return null;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeydown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    containerElement.addEventListener('keydown', handleKeydown);

    return () => {
      containerElement.removeEventListener('keydown', handleKeydown);
    };
  },

  /**
   * Move focus to an element
   */
  focusElement: (element) => {
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  /**
   * Restore focus to previous element
   */
  restoreFocus: (element) => {
    if (element && element.focus) {
      element.focus();
    }
  },
};

/**
 * Keyboard navigation utilities
 */
export const keyboardNav = {
  /**
   * Handle arrow key navigation between list items
   */
  handleArrowNavigation: (e, items, currentIndex, onSelect) => {
    let newIndex = currentIndex;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = Math.min(currentIndex + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = Math.max(currentIndex - 1, 0);
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = items.length - 1;
    }

    if (newIndex !== currentIndex && onSelect) {
      onSelect(items[newIndex], newIndex);
    }
  },

  /**
   * Handle Enter/Space key activation
   */
  handleActivation: (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (callback) callback();
    }
  },

  /**
   * Handle Escape key (close modals, cancel operations)
   */
  handleEscape: (e, callback) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (callback) callback();
    }
  },
};

/**
 * Color contrast checker (WCAG AA requires 4.5:1 for normal text)
 */
export const getRelativeLuminance = (r, g, b) => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const getContrastRatio = (rgb1, rgb2) => {
  const lum1 = getRelativeLuminance(...rgb1);
  const lum2 = getRelativeLuminance(...rgb2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Heading hierarchy validation
 * Ensures proper nesting: h1 -> h2 -> h3 (not h1 -> h3)
 */
export const validateHeadingHierarchy = () => {
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let isValid = true;
  let lastLevel = 0;

  headings.forEach((heading) => {
    const currentLevel = parseInt(heading.tagName[1]);
    if (currentLevel > lastLevel + 1) {
      console.warn(`Heading hierarchy violation: Jumped from h${lastLevel} to h${currentLevel}`, heading);
      isValid = false;
    }
    lastLevel = currentLevel;
  });

  return isValid;
};

/**
 * Skip to main content link - creates accessible navigation
 */
export const createSkipLink = () => {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: white;
    padding: 8px;
    z-index: 100;
  `;
  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });
  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });
  document.body.insertBefore(skipLink, document.body.firstChild);
};

/**
 * ARIA label helper for interactive elements
 */
export const getAriaLabel = (action, subject, additionalContext = '') => {
  return `${action} ${subject}${additionalContext ? ` - ${additionalContext}` : ''}`;
};

/**
 * Create semantic button with proper ARIA attributes
 */
export const createSemanticButton = (text, onClickHandler, options = {}) => {
  const {
    ariaLabel = text,
    ariaPressed = false,
    ariaExpanded = false,
    disabled = false,
    icon = null,
  } = options;

  return {
    role: 'button',
    'aria-label': ariaLabel,
    'aria-pressed': ariaPressed,
    'aria-expanded': ariaExpanded,
    disabled,
    onClick: onClickHandler,
  };
};
