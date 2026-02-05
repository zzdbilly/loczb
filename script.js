// ===== 主题管理 =====
const ThemeManager = {
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
            document.body.classList.toggle('dark-theme', savedTheme === 'dark');
        } else if (prefersDark) {
            document.body.classList.add('dark-theme');
        }
        
        this.updateIcon();
    },
    
    toggle() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem(this.STORAGE_KEY, isDark ? 'dark' : 'light');
        this.updateIcon();
    },
    
    updateIcon() {
        const isDark = document.body.classList.contains('dark-theme');
        document.body.style.setProperty('--theme-display', isDark ? 'none' : 'block');
    },
    
    bindEvents() {
        this.toggleBtn?.addEventListener('click', () => this.toggle());
        
        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                document.body.classList.toggle('dark-theme', e.matches);
                this.updateIcon();
            }
        });
    }
};

// ===== 导航管理 =====
const NavigationManager = {
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
        // 平滑滚动
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const offset = this.navbar.offsetHeight;
                    const targetPosition = targetSection.offsetTop - offset;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
                
                // 移动端关闭菜单
                this.closeMobileMenu();
            });
        });
        
        // 滚动时高亮当前区域
        window.addEventListener('scroll', this.throttle(() => {
            this.updateActiveLink();
            this.toggleNavbarShadow();
        }, 100));
        
        // 移动端菜单切换
        this.mobileMenuToggle?.addEventListener('click', () => this.toggleMobileMenu());
    },
    
    updateActiveLink() {
        const scrollPos = window.scrollY + this.navbar.offsetHeight + 100;
        
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
    
    toggleMobileMenu() {
        this.navMenu?.classList.toggle('active');
        this.mobileMenuToggle?.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    },
    
    closeMobileMenu() {
        this.navMenu?.classList.remove('active');
        this.mobileMenuToggle?.classList.remove('active');
        document.body.classList.remove('menu-open');
    },
    
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// ===== 数字计数动画 =====
const CounterAnimation = {
    init() {
        this.counters = document.querySelectorAll('.stat');
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        this.counters.forEach(counter => this.observer.observe(counter));
    },
    
    animateCounter(statElement) {
        const numberEl = statElement.querySelector('.number');
        const target = parseInt(statElement.dataset.target);
        const duration = 2000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用 easeOutQuart 缓动函数
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(easeProgress * target);
            
            numberEl.textContent = current + '+';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                numberEl.textContent = target + '+';
            }
        };
        
        requestAnimationFrame(animate);
    }
};

// ===== 滚动显示动画 =====
const ScrollReveal = {
    init() {
        this.revealElements = document.querySelectorAll(
            '.skill-card, .project-card, .about-text, .stat'
        );
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        this.revealElements.forEach((el, index) => {
            el.classList.add('reveal');
            el.style.transitionDelay = `${index * 0.1}s`;
            this.observer.observe(el);
        });
    }
};

// ===== 进度条动画 =====
const ProgressBarAnimation = {
    init() {
        this.progressBars = document.querySelectorAll('.progress-bar');
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bar = entry.target;
                    const percent = bar.dataset.percent;
                    bar.style.setProperty('--percent', percent + '%');
                    bar.style.width = percent + '%';
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

// ===== 表单验证 =====
const FormValidation = {
    init() {
        this.form = document.getElementById('contactForm');
        this.submitBtn = this.form?.querySelector('.submit-btn');
        
        if (!this.form) return;
        
        this.bindEvents();
    },
    
    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // 实时验证
        const inputs = this.form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearError(input));
        });
    },
    
    validateField(field) {
        const formGroup = field.closest('.form-group');
        const errorEl = formGroup?.querySelector('.error-message');
        let error = '';
        
        if (!field.value.trim()) {
            error = '此字段为必填项';
        } else if (field.type === 'email' && !this.isValidEmail(field.value)) {
            error = '请输入有效的邮箱地址';
        } else if (field.id === 'message' && field.value.length < 10) {
            error = '消息内容至少需要10个字符';
        }
        
        if (error) {
            formGroup?.classList.add('error');
            if (errorEl) errorEl.textContent = error;
            return false;
        }
        
        return true;
    },
    
    clearError(field) {
        const formGroup = field.closest('.form-group');
        formGroup?.classList.remove('error');
    },
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const inputs = this.form.querySelectorAll('input, textarea');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        if (!isValid) return;
        
        // 显示加载状态
        this.setLoading(true);
        
        // 模拟提交
        await this.simulateSubmit();
        
        // 显示成功消息
        this.showSuccess();
        
        // 重置表单
        this.form.reset();
        this.setLoading(false);
    },
    
    simulateSubmit() {
        return new Promise(resolve => setTimeout(resolve, 1500));
    },
    
    setLoading(isLoading) {
        this.submitBtn?.classList.toggle('loading', isLoading);
        this.submitBtn?.setAttribute('disabled', isLoading);
    },
    
    showSuccess() {
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>消息已发送成功！</span>
        `;
        
        this.form.insertAdjacentElement('afterend', successMsg);
        
        setTimeout(() => {
            successMsg.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            successMsg.classList.remove('show');
            setTimeout(() => successMsg.remove(), 300);
        }, 3000);
    }
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    NavigationManager.init();
    CounterAnimation.init();
    ScrollReveal.init();
    ProgressBarAnimation.init();
    FormValidation.init();
});
