/**
 * Navigation Module
 * Handles smooth scrolling, active link highlighting, and mobile menu
 */

import { throttle } from '../utils/helpers.js';

export const NavigationManager = {
  init() {
    this.navbar = document.querySelector('.navbar');
    this.navLinks = document.querySelectorAll('.nav-link');
    this.sections = document.querySelectorAll('.section, .hero');
    this.mobileMenuToggle = document.querySelector('.nav-toggle');
    this.navMenu = document.querySelector('.nav-menu');
    
    this.bindEvents();
    this.updateActiveLink();
  },
  
  bindEvents() {
    // Smooth scroll
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
          const offset = this.navbar?.offsetHeight || 72;
          const targetPosition = targetSection.offsetTop - offset;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
        
        // Close mobile menu
        this.closeMobileMenu();
      });
    });
    
    // Update active link on scroll
    window.addEventListener('scroll', throttle(() => {
      this.updateActiveLink();
      this.toggleNavbarShadow();
      this.toggleBackToTop();
    }, 100));
    
    // Mobile menu toggle
    this.mobileMenuToggle?.addEventListener('click', () => this.toggleMobileMenu());
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMobileMenu();
      }
    });
  },
  
  updateActiveLink() {
    const scrollPos = window.scrollY + (this.navbar?.offsetHeight || 72) + 100;
    
    this.sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');
      
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        this.navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  },
  
  toggleNavbarShadow() {
    if (window.scrollY > 10) {
      this.navbar?.classList.add('scrolled');
    } else {
      this.navbar?.classList.remove('scrolled');
    }
  },
  
  toggleBackToTop() {
    const backToTop = document.querySelector('.back-to-top');
    if (window.scrollY > 500) {
      backToTop?.classList.add('visible');
    } else {
      backToTop?.classList.remove('visible');
    }
  },
  
  toggleMobileMenu() {
    this.navMenu?.classList.toggle('active');
    this.mobileMenuToggle?.classList.toggle('active');
    document.body.classList.toggle('menu-open');
    
    const isExpanded = this.mobileMenuToggle?.getAttribute('aria-expanded') === 'true';
    this.mobileMenuToggle?.setAttribute('aria-expanded', !isExpanded);
  },
  
  closeMobileMenu() {
    this.navMenu?.classList.remove('active');
    this.mobileMenuToggle?.classList.remove('active');
    document.body.classList.remove('menu-open');
    this.mobileMenuToggle?.setAttribute('aria-expanded', 'false');
  }
};
