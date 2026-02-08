/* ========================================
   Modern Interactions for loczb
   Advanced functionality and interactivity
   ======================================== */

class ModernInteractions {
    constructor() {
        this.init();
    }
    
    init() {
        this.initDarkMode();
        this.initProgressAnimation();
        this.initInteractiveTimeline();
        this.initSmoothScrolling();
        this.initSkillCharts();
        this.initProjectGallery();
        this.initTypewriterEffect();
        this.initAnalytics();
        this.initScrollAnimations();
    }
    
    // 暗色模式切换
    initDarkMode() {
        // 获取当前主题
        const savedTheme = localStorage.getItem('theme') || 
                          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        // 应用主题
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // 创建主题切换按钮
        const themeToggleHTML = `
            <button class="theme-toggle" id="themeToggle" aria-label="切换主题">
                <i class="fas fa-sun theme-toggle-icon sun"></i>
                <i class="fas fa-moon theme-toggle-icon moon"></i>
            </button>
        `;
        
        // 添加到页面（你可以决定放在哪里）
        const navContainer = document.querySelector('.nav-container');
        if (navContainer) {
            const toggleContainer = document.createElement('div');
            toggleContainer.innerHTML = themeToggleHTML;
            navContainer.appendChild(toggleContainer);
            
            const toggleBtn = document.getElementById('themeToggle');
            toggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                
                // 触发自定义事件
                document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
            });
        }
        
        console.log('🌓 暗色模式系统已加载');
    }
    
    // 进度条动画
    initProgressAnimation() {
        const animateProgressBars = () => {
            const progressBars = document.querySelectorAll('.progress-fill');
            
            progressBars.forEach(bar => {
                const width = bar.style.width || '0%';
                const numericWidth = parseFloat(width);
                
                // 如果宽度为0，从CSS获取目标宽度
                if (numericWidth === 0) {
                    const computedWidth = getComputedStyle(bar).width;
                    const targetWidth = parseFloat(computedWidth);
                    
                    // 动画效果
                    bar.style.transition = 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    bar.style.width = targetWidth + '%';
                }
            });
        };
        
        // 使用IntersectionObserver监听元素进入视口
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateProgressBars();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        const skillsSection = document.getElementById('skills');
        if (skillsSection) {
            observer.observe(skillsSection);
        }
        
        console.log('📊 进度条动画已加载');
    }
    
    // 交互式时间线
    initInteractiveTimeline() {
        const timelineEvents = document.querySelectorAll('.timeline-event');

        timelineEvents.forEach(event => {
            event.addEventListener('click', () => {
                // 切换详情显示
                const description = event.querySelector('.timeline-event-description');
                if (description) {
                    const isHidden = description.style.display === 'none';
                    description.style.display = isHidden ? 'block' : 'none';
                }
                
                // 添加视觉反馈
                event.classList.toggle('active');
                
                // 滚动到合适位置（如果需要）
                event.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
            
            // 添加键盘支持
            event.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    event.click();
                }
            });
            
            // 可访问性
            event.setAttribute('tabindex', '0');
            event.setAttribute('role', 'button');
            event.setAttribute('aria-expanded', 'false');
        });
        
        console.log('📅 交互式时间线已加载');
    }
    
    // 平滑滚动
    initSmoothScrolling() {
        // 监听所有锚点链接
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // 跳过空链接
                if (href === '#') return;
                
                // 获取目标元素

                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    e.preventDefault();

                    
                    // 平滑滚动
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // 更新URL（不添加历史记录）
                    history.replaceState(null, '', href);
                }
            });
        });
        
        console.log('🎯 平滑滚动已启用');
    }
    
    // 技能图表
    initSkillCharts() {
        // 创建技能数据可视化
        const createSkillChart = (containerId, skillData) => {
            const container = document.getElementById(containerId);
            if (!container) return;

            
            // 创建图表容器

            const chartContainer = document.createElement('div');
            chartContainer.className = 'skill-chart';
            chartContainer.style.position = 'relative';
            chartContainer.style.width = '100%';
            chartContainer.style.height = '300px';
            
            // 这里可以集成Chart.js或D3.js
            // 为了简化，我们创建简单的HTML/CSS图表

            skillData.forEach((skill, index) => {
                const skillBar = document.createElement('div');
                skillBar.className = 'skill-bar';
                skillBar.style.marginBottom = '10px';
                
                const skillInfo = document.createElement('div');
                skillInfo.className = 'skill-info';
                skillInfo.style.display = 'flex';
                skillInfo.style.justifyContent = 'space-between';
                skillInfo.style.marginBottom = '5px';
                
                skillInfo.innerHTML = `
                    <span class="skill-name">${skill.name}</span>
                    <span class="skill-level">${skill.level}%</span>
                `;

                
                const progressContainer = document.createElement('div');
                progressContainer.className = 'progress';
                progressContainer.style.height = '8px';
                progressContainer.style.backgroundColor = 'var(--color-gray-200)';

                progressContainer.style.borderRadius = '4px';

                progressContainer.style.overflow = 'hidden';

                
                const progressFill = document.createElement('div');

                progressFill.className = 'progress-fill';

                progressFill.style.width = '0%';

                progressFill.style.height = '100%';

                progressFill.style.background = 'linear-gradient(90deg, var(--color-primary-500), var(--color-violet-500))';

                progressFill.style.transition = 'width 1s ease-in-out';

                
                // 延迟动画
                setTimeout(() => {
                    progressFill.style.width = skill.level + '%';
                }, index * 200);
                
                progressContainer.appendChild(progressFill);
                skillBar.appendChild(skillInfo);
                skillBar.appendChild(progressContainer);
                chartContainer.appendChild(skillBar);
            });
            
            container.appendChild(chartContainer);
        };
        
        // 示例技能数据
        const frontendSkills = [
            { name: 'React', level: 95 },
            { name: 'Vue.js', level: 90 },
            { name: 'TypeScript', level: 92 },
            { name: 'HTML/CSS', level: 98 }
        ];
        
        const backendSkills = [
            { name: 'Node.js', level: 88 },
            { name: 'Python', level: 85 },
            { name: 'Database', level: 90 },
            { name: 'API Design', level: 87 }
        ];
        
        // 创建图表
        createSkillChart('frontendSkillsChart', frontendSkills);

        createSkillChart('backendSkillsChart', backendSkills);
        
        console.log('📈 技能图表已加载');

    }
    
    // 项目画廊

    initProjectGallery() {

        const galleryItems = document.querySelectorAll('.gallery-item');

        let activeItem = null;

        
        galleryItems.forEach(item => {

            item.addEventListener('click', () => {

                if (activeItem && activeItem !== item) {

                    activeItem.classList.remove('active');

                }

                
                item.classList.toggle('active');

                activeItem = item.classList.contains('active') ? item : null;

                
                // 显示项目详情

                const projectId = item.getAttribute('data-project-id');

                if (projectId) {

                    this.showProjectDetail(projectId);

                }

            });

        });

        
        // 键盘导航

        document.addEventListener('keydown', (e) => {

            if (!activeItem) return;

            
            switch(e.key) {

                case 'ArrowRight':

                    const nextItem = activeItem.nextElementSibling;

                    if (nextItem && nextItem.classList.contains('gallery-item')) {

                        activeItem.classList.remove('active');

                        nextItem.classList.add('active');

                        activeItem = nextItem;

                    }

                    break;

                case 'ArrowLeft':

                    const prevItem = activeItem.previousElementSibling;

                    if (prevItem && prevItem.classList.contains('gallery-item')) {

                        activeItem.classList.remove('active');

                        prevItem.classList.add('active');

                        activeItem = prevItem;

                    }

                    break;

                case 'Escape':

                    if (activeItem) {

                        activeItem.classList.remove('active');

                        activeItem = null;

                        this.hideProjectDetail();

                    }

                    break;

            }

        });

        
        console.log('🖼️ 项目画廊交互已加载');

    }
    
    // 打字机效果

    initTypewriterEffect() {

        const typewriterElements = document.querySelectorAll('.typewriter-effect');

        
        typewriterElements.forEach(element => {

            const text = element.textContent;

            element.textContent = '';

            element.style.borderRight = '2px solid var(--color-primary-500)';

            
            let index = 0;

            const typewriter = () => {

                if (index < text.length) {

                    element.textContent += text.charAt(index);

                    index++;

                    setTimeout(typewriter, 50);

                } else {

                    element.style.borderRight = 'none';

                }

            };

            
            // 延迟开始打字效果

            setTimeout(typewriter, 500);

        });

        
        console.log('⌨️ 打字机效果已加载');

    }
    
    // 基础数据分析

    initAnalytics() {

        // 页面访问跟踪

        this.trackPageView();

        
        // 交互事件跟踪

        this.setupEventTracking();

        
        console.log('📊 基础分析系统已加载');

    }
    
    // 滚动动画

    initScrollAnimations() {

        const fadeInElements = document.querySelectorAll('.fade-in-on-scroll');

        
        const fadeInObserver = new IntersectionObserver((entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add('fade-in-visible');

                    fadeInObserver.unobserve(entry.target);

                }

            });

        }, { threshold: 0.1 });
        
        fadeInElements.forEach(element => {

            fadeInObserver.observe(element);

        });

        
        console.log('✨ 滚动动画已加载');

    }
    
    // 辅助方法

    trackPageView() {

        console.log('📄 页面访问：', window.location.pathname);

    }

    
    setupEventTracking() {

        // 跟踪按钮点击

        document.addEventListener('click', (e) => {

            if (e.target.classList.contains('btn')) {

                const buttonText = e.target.textContent.trim();

                const buttonType = e.target.classList.contains('btn-primary') ? 'Primary' : 
                                 e.target.classList.contains('btn-secondary') ? 'Secondary' : 'Other';

                
                console.log(`🖱️ 按钮点击：${buttonText} (${buttonType})`);

            }

        });

    }

    
    showProjectDetail(projectId) {

        console.log('🔍 查看项目详情：', projectId);

        // 这里可以实现显示项目详情的逻辑

    }

    
    hideProjectDetail() {

        console.log('✖️ 关闭项目详情');

    }
}

// 初始化

document.addEventListener('DOMContentLoaded', () => {

    const modernInteractions = new ModernInteractions();

    

    // 添加CSS类用于动画

    document.body.classList.add('modern-interactions-loaded');

    

    console.log('🚀 现代交互系统已完全加载');

});