/**
 * OG Image Generator - 自动根据文章标题生成社交分享图
 */
(function() {
  'use strict';

  function generateOGImage() {
    // 获取文章标题
    const title = document.querySelector('meta[property="og:title"]')?.content || document.title;
    const date = document.querySelector('time')?.textContent || '';
    
    // 创建 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');

    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);

    // 装饰性圆形
    ctx.beginPath();
    ctx.arc(1000, 100, 300, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(124, 124, 247, 0.1)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(200, 500, 200, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
    ctx.fill();

    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    
    // 标题折行处理
    const maxWidth = 1000;
    const words = title.split('');
    let lines = [];
    let currentLine = '';
    
    for (let char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // 限制行数
    if (lines.length > 3) {
      lines = lines.slice(0, 3);
      lines[2] = lines[2].slice(0, -3) + '...';
    }

    // 垂直居中计算
    const lineHeight = 72;
    const totalHeight = lines.length * lineHeight;
    const startY = (630 - totalHeight) / 2 + 20;

    lines.forEach((line, i) => {
      ctx.fillText(line, 600, startY + i * lineHeight);
    });

    // 日期和网站名
    if (date) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`📅 ${date} · loczb`, 600, 560);
    }

    // 网站角标
    ctx.fillStyle = 'rgba(124, 124, 247, 0.8)';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('loczb', 600, 600);

    // 转换为图片并更新 meta 标签
    const dataUrl = canvas.toDataURL('image/png');
    
    // 更新 og:image
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      ogImage.content = dataUrl;
    }

    // 同时更新 Twitter Card
    let twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
      twitterImage.content = dataUrl;
    } else {
      const meta = document.createElement('meta');
      meta.name = 'twitter:image';
      meta.content = dataUrl;
      document.head.appendChild(meta);
    }

    console.log('OG Image generated:', title.substring(0, 20));
  }

  // 页面加载后生成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generateOGImage);
  } else {
    generateOGImage();
  }
})();
