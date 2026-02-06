/**
 * Form Validation Module
 * Handles contact form validation and submission
 */

export const FormValidation = {
  init() {
    this.form = document.getElementById('contactForm');
    this.submitBtn = this.form?.querySelector('button[type="submit"]');
    
    if (!this.form) return;
    
    this.bindEvents();
  },
  
  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Real-time validation
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
      formGroup?.classList.add('has-error');
      if (errorEl) errorEl.textContent = error;
      return false;
    }
    
    return true;
  },
  
  clearError(field) {
    const formGroup = field.closest('.form-group');
    const errorEl = formGroup?.querySelector('.error-message');
    
    formGroup?.classList.remove('has-error');
    if (errorEl) errorEl.textContent = '';
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
    
    // Show loading state
    this.setLoading(true);
    
    // Simulate submission
    await this.simulateSubmit();
    
    // Show success message
    this.showSuccess();
    
    // Reset form
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
    // Remove existing success message
    const existingMsg = this.form.parentElement?.querySelector('.success-message');
    if (existingMsg) existingMsg.remove();
    
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>消息已发送成功！</span>
    `;
    
    this.form.insertAdjacentElement('afterend', successMsg);
    
    requestAnimationFrame(() => {
      successMsg.classList.add('show');
    });
    
    setTimeout(() => {
      successMsg.classList.remove('show');
      setTimeout(() => successMsg.remove(), 300);
    }, 3000);
  }
};
