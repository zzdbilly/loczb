/**
 * Time Progress Bar
 * 时光进度条 - 显示今年已过去多少%、本月还剩多少天
 */

class TimeProgress {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) return;
    
    this.init();
  }
  
  getYearProgress() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    const total = end - start;
    const elapsed = now - start;
    return Math.floor((elapsed / total) * 100);
  }
  
  getMonthProgress() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const total = end - start;
    const elapsed = now - start;
    return Math.floor((elapsed / total) * 100);
  }
  
  getDaysRemaining() {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return end.getDate() - now.getDate();
  }
  
  getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }
  
  getTotalDaysInYear() {
    const now = new Date();
    return ((now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || 
            now.getFullYear() % 400 === 0) ? 366 : 365;
  }
  
  formatDate(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  
  render() {
    const yearProgress = this.getYearProgress();
    const monthProgress = this.getMonthProgress();
    const daysRemaining = this.getDaysRemaining();
    const dayOfYear = this.getDayOfYear();
    const totalDays = this.getTotalDaysInYear();
    const year = new Date().getFullYear();
    
    this.container.innerHTML = `
      <div class="time-progress-wrapper">
        <div class="time-progress-item">
          <div class="time-progress-header">
            <span class="time-progress-icon">📅</span>
            <span class="time-progress-label">今年进度</span>
            <span class="time-progress-value">${yearProgress}%</span>
          </div>
          <div class="time-progress-bar">
            <div class="time-progress-fill" style="width: ${yearProgress}%"></div>
          </div>
          <div class="time-progress-detail">
            第 ${dayOfYear} / ${totalDays} 天
          </div>
        </div>
        
        <div class="time-progress-item">
          <div class="time-progress-header">
            <span class="time-progress-icon">⏳</span>
            <span class="time-progress-label">本月剩余</span>
            <span class="time-progress-value">${daysRemaining} 天</span>
          </div>
          <div class="time-progress-bar">
            <div class="time-progress-fill month" style="width: ${100 - monthProgress}%"></div>
          </div>
          <div class="time-progress-detail">
            ${this.formatDate(new Date())} → ${this.formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))}
          </div>
        </div>
        
        <div class="time-progress-item">
          <div class="time-progress-header">
            <span class="time-progress-icon">🕐</span>
            <span class="time-progress-label">本周进度</span>
            <span class="time-progress-value">${Math.floor((new Date().getDay() / 7) * 100)}%</span>
          </div>
          <div class="time-progress-bar">
            <div class="time-progress-fill week" style="width: ${Math.floor((new Date().getDay() / 7) * 100)}%"></div>
          </div>
          <div class="time-progress-detail">
            ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()]}
          </div>
        </div>
      </div>
    `;
    
    this.container.classList.add('time-progress-initialized');
  }
  
  init() {
    this.render();
    // Update at midnight and every minute
    this.updateInterval = setInterval(() => this.render(), 60000);
  }
  
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.time-progress-container');
  if (container) {
    new TimeProgress('.time-progress-container');
  }
});