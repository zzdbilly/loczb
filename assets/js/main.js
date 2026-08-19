/**
 * loczb 2.0 - Main JavaScript
 * 精致动画效果与交互
 */

// Page Loading Animation
document.addEventListener('DOMContentLoaded', () => {
  const loading = document.querySelector('.loading');
  
  // Hide loading quickly for better LCP
  requestAnimationFrame(() => {
    if (loading) {
      loading.classList.add('hidden');
    }
  });
  
  // Initialize all animations
  initScrollAnimations();
  initNavScroll();
  initMobileMenu();
  initTypingEffect();
  initParallax();
  initSmoothScroll();
  initThemeToggle();
  initSpotlightCards();
});

// Scroll-triggered Animations
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

// Navigation Scroll Effect
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

// Mobile Menu
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

// Typing Effect
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

// Parallax Effect
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

// Smooth Scroll
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

// Active Nav Link
function setActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  
  // 处理页面链接的 active 状态（基于完整路径）
  const currentPath = window.location.pathname;
  // 标准化路径：移除末尾斜杠，添加 index.html 如果是目录
  let normalizedPath = currentPath.replace(/\/$/, '');
  if (normalizedPath === '' || !normalizedPath.endsWith('.html')) {
    normalizedPath += '/index.html';
  }
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    
    // 跳过锚点链接（由 scroll 事件处理）
    if (href.startsWith('#')) return;
    
    // 处理页面链接 - 使用完整路径匹配
    // 将相对路径转为绝对路径进行比较
    let absoluteHref = href;
    if (!href.startsWith('/')) {
      // 根据当前路径计算绝对路径
      const baseDir = currentPath.replace(/[^/]*$/, ''); // 获取目录部分
      absoluteHref = baseDir + href;
    }
    
    // 标准化链接路径
    let normalizedHref = absoluteHref.replace(/\/$/, '');
    if (!normalizedHref.endsWith('.html')) {
      normalizedHref += '/index.html';
    }
    
    if (normalizedHref === normalizedPath) {
      link.classList.add('active');
    }
  });
  
  // 处理锚点链接的 active 状态（基于滚动位置）
  const anchorLinks = Array.from(navLinks).filter(link => link.getAttribute('href').startsWith('#'));
  
  if (anchorLinks.length > 0 && sections.length > 0) {
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
}

// Intersection Observer for Stats
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

// Copy to Clipboard
function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).then(() => {
    return true;
  }).catch(err => {
    console.error('Failed to copy:', err);
    return false;
  });
}

// Theme Toggle with View Transition
function initThemeToggle() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'light' ? '#ffffff' : '#3b82f6');
    }
  }
  
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
  
  toggle.addEventListener('click', async (e) => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // View Transition API - 圆形扩散动画
    if (document.startViewTransition) {
      const x = e.clientX;
      const y = e.clientY;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );
      
      const transition = document.startViewTransition(() => {
        setTheme(newTheme);
      });
      
      transition.ready.then(() => {
        document.documentElement.animate({
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        }, {
          duration: 500,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-new'
        });
      });
    } else {
      // Fallback: 简单过渡
      document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
      setTheme(newTheme);
    }
  });
}

// Lazy Load Images
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

// Scroll Progress Indicator
function initScrollProgress() {
  const progressBar = document.querySelector('.scroll-progress, #readingProgress, .reading-progress');
  if (!progressBar || progressBar._hasProgressInit) return;
  progressBar._hasProgressInit = true;
  
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      const scrollPercent = (scrollTop / docHeight) * 100;
      progressBar.style.width = `${Math.min(100, Math.max(0, scrollPercent))}%`;
    }
  }, { passive: true });
}

// Back to Top Button
function initBackToTop() {
  let btn = document.querySelector('.back-to-top, #backToTop');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', '返回顶部');
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>';
    document.body.appendChild(btn);
  }
  
  if (btn._hasBackToTopInit) return;
  btn._hasBackToTopInit = true;
  
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });
  
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Cursor Effect (Optional)
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

// Spotlight Mouse Glow for modern cards
function initSpotlightCards() {
  const cards = document.querySelectorAll('.spotlight-card, .project-card, .blog-card-featured, .blog-mini-card, .case-card');
  if (!cards.length) return;

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    }, { passive: true });
  });
}

// Form Validation
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

// Blog Filters
// Blog filtering, pagination, and tag cloud are fully handled by blog-list.js.
// This function is kept as a no-op stub for backward compatibility.
function initBlogFilters() {
  // All blog filter logic is handled by blog-list.js
  return;
}

// Code Block Copy Button + Language Label
function initCodeCopy() {
  const codeBlocks = document.querySelectorAll('.post-content pre');

  // 语言名称映射（hljs 返回的 short name → 显示名）
  const langNames = {
    kotlin: 'Kotlin', java: 'Java', python: 'Python', javascript: 'JavaScript',
    typescript: 'TypeScript', bash: 'Bash', sh: 'Shell', shell: 'Shell',
    json: 'JSON', xml: 'XML', html: 'HTML', css: 'CSS', sql: 'SQL',
    yaml: 'YAML', dockerfile: 'Dockerfile', groovy: 'Groovy', gradle: 'Gradle',
    ruby: 'Ruby', go: 'Go', rust: 'Rust', c: 'C', cpp: 'C++', swift: 'Swift',
    php: 'PHP', markdown: 'Markdown', plaintext: 'Text', diff: 'Diff',
    nginx: 'Nginx', properties: 'Properties', ini: 'INI', toml: 'TOML',
    makefile: 'Makefile', dart: 'Dart', scala: 'Scala', lua: 'Lua',
    perl: 'Perl', r: 'R', matlab: 'MATLAB', pascal: 'Pascal',
  };

  function detectLanguage(pre) {
    // 优先从 pygments class 检测
    const codeBlock = pre.closest('.codehilite, .highlight');
    if (codeBlock) {
      const cls = codeBlock.className;
      // pygments 输出如 "codehilite language-kotlin" 或 "highlight-kotlin"
      const langMatch = cls.match(/(?:language-|highlight-)([a-zA-Z0-9_+#-]+)/);
      if (langMatch) return langMatch[1].toLowerCase();
    }
    // 回退：hljs 自动检测
    if (typeof hljs !== 'undefined') {
      const code = pre.querySelector('code') || pre;
      const result = hljs.highlightAuto(code.textContent || '');
      if (result.language && result.language !== 'undefined') {
        return result.language;
      }
    }
    return null;
  }

  const codeBlockMargin = '1.2rem';

  codeBlocks.forEach(pre => {
    if (!pre.parentElement.classList.contains('code-block-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      // 检测语言并添加标签
      const lang = detectLanguage(pre);
      if (lang) {
        const label = document.createElement('div');
        label.className = 'code-lang-label';
        label.textContent = langNames[lang] || lang;
        wrapper.appendChild(label);
      }

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
    }
  });

  // Add copy buttons
  document.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
    if (wrapper.querySelector('.copy-code-btn')) return;
    
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 复制';
    
    btn.addEventListener('click', async () => {
      const code = wrapper.querySelector('code') || wrapper.querySelector('pre');
      const text = code ? code.textContent : '';
      
      try {
        await copyToClipboard(text);
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 已复制';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 复制';
          btn.classList.remove('copied');
        }, 2000);
      } catch {
        btn.textContent = '复制失败';
      }
    });
    
    wrapper.appendChild(btn);
  });
}

// Image Lightbox (click to enlarge)
function initLightbox() {
  const images = document.querySelectorAll('.post-content img');
  if (images.length === 0) return;
  
  // Create lightbox elements
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = '<img class="lightbox-image" src="" alt=""><div class="lightbox-caption"></div>';
  document.body.appendChild(overlay);
  
  const lightboxImg = overlay.querySelector('.lightbox-image');
  const lightboxCaption = overlay.querySelector('.lightbox-caption');
  
  images.forEach(img => {
    // Skip small icons (under 80px)
    if (img.naturalWidth <= 80) return;
    
    img.addEventListener('click', () => {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxCaption.textContent = img.alt || '';
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });
  
  overlay.addEventListener('click', () => {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

// Initialize Everything
document.addEventListener('DOMContentLoaded', () => {
  initCountUp();
  initLazyLoad();
  initScrollProgress();
  initBackToTop();
  setActiveNavLink();
  // Blog filters are fully handled by blog-list.js — no action needed here.
  initCodeCopy();
  initLightbox();
  
  // Add loading animation to page
  document.body.classList.add('loaded');
  
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});

// Export utilities
window.loczb = {
  copyToClipboard,
  validateForm,
  validateEmail
};