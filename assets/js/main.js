/**
 * loczb 2.0 - Main JavaScript
 * 精致动画效果与交互
 */

// ===================================
// Page Loading Animation
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  const loading = document.querySelector('.loading');
  
  // Hide loading after content loads
  setTimeout(() => {
    if (loading) {
      loading.classList.add('hidden');
    }
  }, 300);
  
  // Initialize all animations
  initScrollAnimations();
  initNavScroll();
  initMobileMenu();
  initTypingEffect();
  initParallax();
  initSmoothScroll();
  initThemeToggle();
});

// ===================================
// Scroll-triggered Animations
// ===================================
function initScrollAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);
  
  // Observe all elements with animation classes
  const animateElements = document.querySelectorAll('.animate-on-scroll, .stagger-item');
  animateElements.forEach(el => observer.observe(el));
}

// ===================================
// Navigation Scroll Effect
// ===================================
function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Add scrolled class
    if (currentScroll > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  }, { passive: true });
}

// ===================================
// Mobile Menu
// ===================================
function initMobileMenu() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const overlay = document.querySelector('.nav-overlay');

  if (!toggle || !links) return;

  function openMenu() {
    links.classList.add('open');
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', '关闭菜单');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    links.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '打开菜单');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    if (links.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close when clicking overlay
  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }

  // Close menu when clicking a link
  const navLinks = links.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && links.classList.contains('open')) {
      closeMenu();
    }
  });
}

// ===================================
// Typing Effect
// ===================================
function initTypingEffect() {
  const typingElements = document.querySelectorAll('[data-typing]');
  
  typingElements.forEach(el => {
    const text = el.getAttribute('data-typing');
    const speed = parseInt(el.getAttribute('data-typing-speed')) || 100;
    
    el.textContent = '';
    el.style.opacity = '1';
    
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, speed);
  });
}

// ===================================
// Parallax Effect
// ===================================
function initParallax() {
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  
  if (parallaxElements.length === 0) return;
  
  let ticking = false;
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        parallaxElements.forEach(el => {
          const speed = parseFloat(el.getAttribute('data-parallax')) || 0.5;
          const yPos = -(window.pageYOffset * speed);
          el.style.transform = `translateY(${yPos}px)`;
        });
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ===================================
// Smooth Scroll
// ===================================
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      
      if (target) {
        const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// ===================================
// Active Nav Link
// ===================================
function setActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  
  // 只处理锚点链接，保留页面链接的 active 状态
  const anchorLinks = Array.from(navLinks).filter(link => link.getAttribute('href').startsWith('#'));
  
  window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      
      if (window.pageYOffset >= sectionTop - 200) {
        current = section.getAttribute('id');
      }
    });
    
    anchorLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

// ===================================
// Intersection Observer for Stats
// ===================================
function initCountUp() {
  const stats = document.querySelectorAll('[data-count]');
  
  const observerOptions = {
    threshold: 0.5
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute('data-count'));
        const duration = parseInt(entry.target.getAttribute('data-duration')) || 2000;
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;
        
        const updateCount = () => {
          current += increment;
          if (current < target) {
            entry.target.textContent = Math.floor(current);
            requestAnimationFrame(updateCount);
          } else {
            entry.target.textContent = target;
          }
        };
        
        updateCount();
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  stats.forEach(stat => observer.observe(stat));
}

// ===================================
// Copy to Clipboard
// ===================================
function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).then(() => {
    // Success feedback
    console.log('Copied to clipboard');
    return true;
  }).catch(err => {
    console.error('Failed to copy:', err);
    return false;
  });
}

// ===================================
// Theme Toggle
// ===================================
function initThemeToggle() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    // 更新 meta theme-color（移动端浏览器地址栏颜色）
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'light' ? '#ffffff' : '#3b82f6');
    }
  }
  
  // Check saved preference, default to dark if not set
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
  
  toggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });
}

// ===================================
// Lazy Load Images
// ===================================
function initLazyLoad() {
  const lazyImages = document.querySelectorAll('[data-src]');
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px'
  });
  
  lazyImages.forEach(img => imageObserver.observe(img));
}

// ===================================
// Scroll Progress Indicator
// ===================================
function initScrollProgress() {
  const progressBar = document.querySelector('.scroll-progress');
  if (!progressBar) return;
  
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    progressBar.style.width = `${scrollPercent}%`;
  }, { passive: true });
}

// ===================================
// Cursor Effect (Optional)
// ===================================
function initCursorEffect() {
  const cursor = document.querySelector('.cursor');
  if (!cursor) return;
  
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
  
  const interactiveElements = document.querySelectorAll('a, button, .card');
  
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('cursor-hover');
    });
    
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('cursor-hover');
    });
  });
}

// ===================================
// Form Validation
// ===================================
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateForm(form) {
  let isValid = true;
  const inputs = form.querySelectorAll('[required]');
  
  inputs.forEach(input => {
    if (!input.value.trim()) {
      isValid = false;
      input.classList.add('error');
    } else {
      input.classList.remove('error');
    }
    
    if (input.type === 'email' && !validateEmail(input.value)) {
      isValid = false;
      input.classList.add('error');
    }
  });
  
  return isValid;
}

// ===================================
// Blog Filters
// ===================================
function initBlogFilters() {
  // Support both old (.tag) and new (.filter-btn) filter buttons
  const filterButtons = document.querySelectorAll('.blog-filters .tag, .blog-filters .filter-btn');
  const blogPosts = document.querySelectorAll('.blog-post, .blog-list-item');
  const blogContainer = document.querySelector('.blog-list-container');
  const emptyState = document.getElementById('blog-empty-state');
  const featuredSection = document.getElementById('featured-section');
  
  if (filterButtons.length === 0 || blogPosts.length === 0) return;
  
  function applyFilter(filter) {
    let visibleCount = 0;
    
    blogPosts.forEach(post => {
      if (filter === 'all' || filter === '全部') {
        post.style.display = '';
        post.classList.add('animate-on-scroll');
        visibleCount++;
      } else {
        // Check data-category attribute first, then fall back to tag matching
        const category = post.getAttribute('data-category');
        const hasMatch = category === filter || 
          Array.from(post.querySelectorAll('.tag-accent, .blog-list-tag')).some(tag => 
            tag.textContent.trim().toLowerCase().includes(filter.toLowerCase())
          );
        post.style.display = hasMatch ? '' : 'none';
        if (hasMatch) visibleCount++;
      }
    });
    
    // Update button active states
    filterButtons.forEach(btn => {
      btn.classList.remove('tag-accent', 'filter-btn-active');
      const btnFilter = btn.getAttribute('data-filter') || btn.textContent.trim();
      // 精确匹配：只有当前选中的按钮才高亮
      // "全部" 按钮对应 'all' 或 '全部'
      const isAllButton = btnFilter === 'all' || btnFilter === '全部';
      const isActive = (filter === 'all' || filter === '全部') ? isAllButton : (btnFilter === filter);
      if (isActive) {
        btn.classList.add('tag-accent', 'filter-btn-active');
      }
    });
    
    // Show/hide Featured section - only show on "all" filter
    if (featuredSection) {
      const isAllFilter = filter === 'all' || filter === '全部';
      featuredSection.style.display = isAllFilter ? '' : 'none';
    }
    
    // Show/hide empty state
    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }
  
  // Click handlers
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.getAttribute('data-filter') || button.textContent.trim();
      applyFilter(filter);
    });
  });
  
  // Check URL hash on page load
  if (window.location.hash) {
    const hashFilter = decodeURIComponent(window.location.hash.substring(1));
    applyFilter(hashFilter);
  } else {
    // Initialize with default filter (show Featured section for "all")
    applyFilter('all');
  }
}

// ===================================
// Initialize Everything
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  initCountUp();
  initLazyLoad();
  initScrollProgress();
  setActiveNavLink();
  initBlogFilters();
  
  // Add loading animation to page
  document.body.classList.add('loaded');
});

// Export utilities
window.loczb = {
  copyToClipboard,
  validateForm,
  validateEmail
};