#!/usr/bin/env node

/**
 * AI Assistant 配置脚本
 * 从 OpenClaw secrets.json 读取 Bailian API Key 并生成配置文件
 */

const fs = require('fs');
const path = require('path');

const secretsPath = path.join(process.env.HOME, '.openclaw/secrets.json');
const configPath = path.join(__dirname, '../assets/js/ai-config.js');

try {
  // 读取 secrets.json
  const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  
  if (!secrets.providers || !secrets.providers.bailian || !secrets.providers.bailian.apiKey) {
    console.error('❌ 错误：secrets.json 中没有找到 providers.bailian.apiKey');
    process.exit(1);
  }
  
  const apiKey = secrets.providers.bailian.apiKey;
  
  // 生成配置文件
  const config = `/**
 * AI Assistant Configuration
 * 自动生成的配置文件 - 不要手动修改
 * 运行 scripts/setup-ai-assistant.js 更新配置
 */

window.AI_ASSISTANT_CONFIG = {
  apiKey: '${apiKey}',
  apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  model: 'qwen3.5-plus'
};
`;
  
  fs.writeFileSync(configPath, config, 'utf8');
  console.log('✅ AI Assistant 配置已生成：', configPath);
  console.log('⚠️  注意：请将 ai-config.js 添加到 .gitignore');
  
  // 更新 .gitignore
  const gitignorePath = path.join(__dirname, '../.gitignore');
  let gitignore = '';
  
  if (fs.existsSync(gitignorePath)) {
    gitignore = fs.readFileSync(gitignorePath, 'utf8');
  }
  
  if (!gitignore.includes('ai-config.js')) {
    gitignore += '\n# AI Assistant Config\nassets/js/ai-config.js\n';
    fs.writeFileSync(gitignorePath, gitignore, 'utf8');
    console.log('✅ 已更新 .gitignore');
  }
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  process.exit(1);
}
