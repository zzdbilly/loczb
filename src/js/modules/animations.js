/**
 * Animation Modules
 * Handles scroll-triggered animations and counters
 */

import { easeOutQuart } from '../utils/helpers.js';

export const CounterAnimation = {
  init() {
    this.counters = document.querySelectorAll('.stat-card');
    
    if (!this.counters.length) return;
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateCounter(entry.target);
          entry.target.classList.add('visible');
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    
    this.counters.forEach(counter => this.observer.observe(counter));
  },
  
  animateCounter(statElement) {
    const numberEl = statElement.querySelector('.stat-number');
    const target = parseInt(statElement.dataset.target);
    const suffix = statElement.dataset.suffix || '';
    const prefix = statElement.dataset.prefix || '';
    
    if (!numberEl || isNaN(target)) return;
    
    const duration = 2000;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeOutQuart(progress);
      const current = Math.floor(easeProgress * target);
      
      numberEl.textContent = `${prefix}${current}${suffix}`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        numberEl.textContent = `${prefix}${target}${suffix}`;
      }
    };
    
    requestAnimationFrame(animate);
  }
};

export const ScrollReveal = {
  init() {
    this.revealElements = document.querySelectorAll('[data-animate]');
    
    if (!this.revealElements.length) return;
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          this.observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    this.revealElements.forEach((el, index) => {
      el.style.transitionDelay = `${index * 0.1}s`;
      this.observer.observe(el);
    });
  }
};

export const ProgressBarAnimation = {
  init() {
    this.progressBars = document.querySelectorAll('.skill-progress');
    
    if (!this.progressBars.length) return;
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const percent = bar.dataset.percent || bar.parentElement?.dataset.percent;
          if (percent) {
            bar.style.width = `${percent}%`;
          }
          this.observer.unobserve(bar);
        }
      });
    }, { threshold: 0.5 });
    
    this.progressBars.forEach(bar => {
      bar.style.width = '0';
      this.observer.observe(bar);
    });
  }
};

export const BackToTop = {
  init() {
    this.button = document.querySelector('.back-to-top');
    
    if (!this.button) return;
    
    this.button.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
};
