/**
 * Synchronized Motion and Animation Transitions
 * Centralized design tokens for consistent, harmonic animations across ClassPulse.
 * All curves use a refined cubic bezier deceleration [0.16, 1, 0.3, 1].
 */

export const TRANSITION_EASE = [0.16, 1, 0.3, 1] as const;
export const TRANSITION_DURATION = 0.22;
export const TRANSITION_DURATION_FAST = 0.18;

/**
 * Screen / Route transition preset
 * Used for all main screen switches (Dashboard, Schedule, Attendance, Inbox, Settings, etc.)
 */
export const screenMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.22, ease: TRANSITION_EASE }
};

/**
 * Modal Backdrop transition preset
 * Synchronized with modal card opening and closing
 */
export const modalBackdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: TRANSITION_EASE }
};

/**
 * Modal Card / Dialog transition preset
 * Silky scale + subtle Y entrance synchronized with backdrop
 */
export const modalCardMotion = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 6 },
  transition: { duration: 0.22, ease: TRANSITION_EASE }
};

/**
 * Popover / Dropdown / Menu transition preset
 */
export const popoverMotion = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.18, ease: TRANSITION_EASE }
};

/**
 * Toast notification transition preset
 */
export const toastMotion = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.96 },
  transition: { duration: 0.2, ease: TRANSITION_EASE }
};

/**
 * List Item / Card item staggered entrance
 */
export const listItemMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.18, ease: TRANSITION_EASE }
};
