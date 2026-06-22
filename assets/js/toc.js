// ===================================
// Table of Contents (TOC)
// ===================================
function initTOC() {
  const postContent = document.querySelector('.post-content');
  if (!postContent) return;
  
  // Find all h2, h3 headings
  const headings = postContent.querySelectorAll('h2, h3');
  if (headings.length < 2) return; // Don't show TOC for short articles
  
  // Create TOC container
  const toc = document.createElement('nav');
  toc.className = 'toc';
  toc.setAttribute('aria-label', '文章目录');
  
  const tocTitle = document.createElement('div');
  tocTitle.className = 'toc-title';
  tocTitle.textContent = '📑 目录';
  toc.appendChild(tocTitle);
  
  const tocList = document.createElement('ul');
  tocList.className = 'toc-list';
  
  headings.forEach((heading, index) => {
    // Add ID if not exists
    if (!heading.id) {
      heading.id = 'heading-' + index;
    }
    
    const level = heading.tagName.toLowerCase();
    const li = document.createElement('li');
    li.className = 'toc-item toc-' + level;
    
    const a = document.createElement('a');
    a.href = '#' + heading.id;
    a.className = 'toc-link';
    a.textContent = heading.textContent;
    
    a.addEventListener('click', (e) => {
      e.preventDefault();
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    
    li.appendChild(a);
    tocList.appendChild(li);
  });
  
  toc.appendChild(tocList);
  
  // Insert TOC after the first element (title/meta)
  const firstChild = postContent.firstElementChild;
  if (firstChild) {
    postContent.insertBefore(toc, firstChild.nextSibling);
  }
  
  // Add active state on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.toc-link').forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-20% 0px -60% 0px' });
  
  headings.forEach(h => observer.observe(h));
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', initTOC);