/**
 * Utility Functions
 */

export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const easeOutQuart = (x) => {
  return 1 - Math.pow(1 - x, 4);
};

export const easeOutCubic = (x) => {
  return 1 - Math.pow(1 - x, 3);
};

export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const isTouchDevice = () => {
  return window.matchMedia('(pointer: coarse)').matches;
};
