/**
 * Main Application Entry Point
 * Initializes all modules
 */

import { ThemeManager } from './modules/theme.js';
import { NavigationManager } from './modules/navigation.js';
import { CounterAnimation, ScrollReveal, ProgressBarAnimation, BackToTop } from './modules/animations.js';
import { FormValidation } from './modules/forms.js';
import { ProjectFilter } from './modules/projects.js';

// Initialize all modules when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Remove page loader
  const pageLoader = document.getElementById('pageLoader');
  if (pageLoader) {
    setTimeout(() => {
      pageLoader.classList.add('hidden');
    }, 500);
  }
  
  // Initialize modules
  ThemeManager.init();
  NavigationManager.init();
  CounterAnimation.init();
  ScrollReveal.init();
  ProgressBarAnimation.init();
  FormValidation.init();
  ProjectFilter.init();
  BackToTop.init();
  
  // Update copyright year
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});
