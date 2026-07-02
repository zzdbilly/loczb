/**
 * Particle Constellation Effect
 * 粒子连线星空效果 - 鼠标移动时粒子自动连线
 */

class ParticleConstellation {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = {
      particleCount: options.particleCount || 80,
      particleColor: options.particleColor || 'rgba(100, 150, 255, 0.6)',
      lineColor: options.lineColor || 'rgba(100, 150, 255, 0.15)',
      particleSize: options.particleSize || 2,
      connectDistance: options.connectDistance || 150,
      mouseDistance: options.mouseDistance || 200,
      speed: options.speed || 0.5,
      ...options
    };
    
    this.particles = [];
    this.mouse = { x: null, y: null };
    this.animationId = null;
    
    this.init();
    this.bindEvents();
  }
  
  init() {
    this.resize();
    this.createParticles();
  }
  
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.width = rect.width;
    this.height = rect.height;
  }
  
  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.options.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * this.options.speed,
        vy: (Math.random() - 0.5) * this.options.speed,
        radius: Math.random() * this.options.particleSize + 1
      });
    }
  }
  
  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }
  
  update() {
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      
      // Bounce off edges
      if (p.x < 0 || p.x > this.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.height) p.vy *= -1;
      
      // Keep within bounds
      p.x = Math.max(0, Math.min(this.width, p.x));
      p.y = Math.max(0, Math.min(this.height, p.y));
    });
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Draw particles
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.options.particleColor;
      this.ctx.fill();
    });
    
    // Draw connections between particles
    this.particles.forEach((p1, i) => {
      // Connect to nearby particles
      this.particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.options.connectDistance) {
          const opacity = 1 - distance / this.options.connectDistance;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = this.options.lineColor.replace('0.15', (opacity * 0.15).toFixed(2));
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      });
      
      // Connect to mouse
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = p1.x - this.mouse.x;
        const dy = p1.y - this.mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.options.mouseDistance) {
          const opacity = 1 - distance / this.options.mouseDistance;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.strokeStyle = `rgba(100, 200, 255, ${opacity * 0.4})`;
          this.ctx.lineWidth = 1.5;
          this.ctx.stroke();
        }
      }
    });
  }
  
  animate() {
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  start() {
    if (!this.animationId) {
      this.animate();
    }
  }
  
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
  }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('particle-canvas');
  if (canvas) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const particle = new ParticleConstellation(canvas, {
      particleColor: isDark ? 'rgba(100, 150, 255, 0.6)' : 'rgba(59, 130, 246, 0.5)',
      lineColor: isDark ? 'rgba(100, 150, 255, 0.12)' : 'rgba(59, 130, 246, 0.1)',
      particleCount: Math.min(80, Math.floor(window.innerWidth / 15))
    });
    particle.start();
    
    // Re-initialize on theme change
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          particle.destroy();
          const newIsDark = document.documentElement.getAttribute('data-theme') === 'dark';
          const newParticle = new ParticleConstellation(canvas, {
            particleColor: newIsDark ? 'rgba(100, 150, 255, 0.6)' : 'rgba(59, 130, 246, 0.5)',
            lineColor: newIsDark ? 'rgba(100, 150, 255, 0.12)' : 'rgba(59, 130, 246, 0.1)',
            particleCount: Math.min(80, Math.floor(window.innerWidth / 15))
          });
          newParticle.start();
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
  }
});