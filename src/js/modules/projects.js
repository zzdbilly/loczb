/**
 * Project Filter Module
 * Handles filtering projects by category
 */

export const ProjectFilter = {
  init() {
    this.filterBtns = document.querySelectorAll('.filter-btn');
    this.projectCards = document.querySelectorAll('.project-card');
    
    if (!this.filterBtns.length || !this.projectCards.length) return;
    
    this.bindEvents();
  },
  
  bindEvents() {
    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        
        // Update active state
        this.filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Filter projects
        this.filterProjects(filter);
      });
    });
  },
  
  filterProjects(category) {
    this.projectCards.forEach(card => {
      const cardCategory = card.dataset.category;
      
      if (category === 'all' || cardCategory === category) {
        card.classList.remove('hidden');
        card.style.animation = 'fadeIn 0.3s ease-out forwards';
      } else {
        card.classList.add('hidden');
      }
    });
  }
};
