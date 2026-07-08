const https = require('https');
const http = require('http');
const { URL } = require('url');
const AiConfig = require('../models/AiConfig');

/**
 * 调用通用 OpenAI 兼容接口的聊天补全服务
 * @param {Array<{role: string, content: string}>} messages 消息上下文
 * @returns {Promise<string>} AI 助手的回复文本
 */
async function chatCompletion(messages) {
  const config = await AiConfig.get();

  if (!config) {
    throw new Error('AI 配置不存在');
  }

  if (!config.enabled) {
    throw new Error('AI 聊天功能未启用');
  }

  if (!config.api_key) {
    throw new Error('AI API Key 未配置');
  }

  if (!config.api_base_url) {
    throw new Error('AI API 基础地址未配置');
  }

  const apiUrl = new URL(config.api_base_url);
  const endpoint = `${apiUrl.pathname.replace(/\/$/, '')}/chat/completions`;
  const postData = JSON.stringify({
    model: config.model || 'gpt-3.5-turbo',
    messages: messages,
    temperature: config.temperature !== undefined ? config.temperature : 0.7,
    max_tokens: config.max_tokens || 2048
  });

  const options = {
    hostname: apiUrl.hostname,
    port: apiUrl.port || (apiUrl.protocol === 'https:' ? 443 : 80),
    path: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 60000 // 60 秒超时
  };

  return new Promise((resolve, reject) => {
    const client = apiUrl.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (response.choices && response.choices.length > 0) {
              const content = response.choices[0].message?.content || '';
              resolve(content.trim());
            } else {
              reject(new Error('AI 响应中未找到回复内容'));
            }
          } else {
            const errorMessage = response.error?.message || response.message || `AI 服务请求失败，状态码: ${res.statusCode}`;
            reject(new Error(errorMessage));
          }
        } catch (parseError) {
          reject(new Error('解析 AI 响应失败'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`AI 服务请求出错: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('AI 服务请求超时'));
    });

    req.write(postData);
    req.end();
  });
}

module.exports = {
  chatCompletion
};
