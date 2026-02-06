/**
 * Theme Manager Module
 * Handles dark/light theme switching with localStorage persistence
 */

export const ThemeManager = {
  STORAGE_KEY: 'theme',
  
  init() {
    this.toggleBtn = document.querySelector('.theme-toggle');
    this.loadTheme();
    this.bindEvents();
  },
  
  loadTheme() {
    const savedTheme = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  },
  
  toggle() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(this.STORAGE_KEY, newTheme);
  },
  
  bindEvents() {
    this.toggleBtn?.addEventListener('click', () => this.toggle());
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });
  }
};
