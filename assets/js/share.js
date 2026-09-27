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
    // 无 href 的动作用 <button>：<a> 不带 href 时既没有可访问角色、也不允许 aria-label
    // （axe aria-prohibited-attr 实测命中）。带 href 的分享项继续用 <a>。
    const el = document.createElement(btn.href ? 'a' : 'button');
    el.className = 'share-btn';
    el.innerHTML = btn.icon;
    el.setAttribute('aria-label', btn.name);
    el.title = btn.name;
    
    if (btn.action === 'copy') {
      el.type = 'button';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(window.location.href).then(() => {
          el.classList.add('copied');
          el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
          setTimeout(() => {
            el.classList.remove('copied');
            el.innerHTML = btn.icon;
          }, 2000);
        });
      });
    } else if (btn.href) {
      el.href = btn.href;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    }
    
    share.appendChild(el);
  });
  
  postTags.parentNode.insertBefore(share, postTags.nextSibling);
}

document.addEventListener('DOMContentLoaded', initShareButtons);