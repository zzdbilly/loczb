// ===================================
// Share Buttons for Blog Posts
// ===================================
function initShareButtons() {
  const postTags = document.querySelector('.post-tags');
  if (!postTags) return;
  
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title.replace(/ \| 张小猛 - loczb$/, '').replace(/ \| 张小猛$/, ''));
  
  const share = document.createElement('div');
  share.className = 'share-buttons';
  
  const label = document.createElement('span');
  label.className = 'share-label';
  label.textContent = '分享';
  share.appendChild(label);
  
  const btnGroups = [
    { name: 'X (Twitter)', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>', href: `https://twitter.com/intent/tweet?text=${title}&url=${url}` },
    { name: '复制链接', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>', action: 'copy' }
  ];
  
  btnGroups.forEach(btn => {
    const a = document.createElement('a');
    a.className = 'share-btn';
    a.innerHTML = btn.icon;
    a.setAttribute('aria-label', btn.name);
    a.title = btn.name;
    
    if (btn.action === 'copy') {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(window.location.href).then(() => {
          a.classList.add('copied');
          a.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
          setTimeout(() => {
            a.classList.remove('copied');
            a.innerHTML = btn.icon;
          }, 2000);
        });
      });
    } else if (btn.href) {
      a.href = btn.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    
    share.appendChild(a);
  });
  
  postTags.parentNode.insertBefore(share, postTags.nextSibling);
}

document.addEventListener('DOMContentLoaded', initShareButtons);