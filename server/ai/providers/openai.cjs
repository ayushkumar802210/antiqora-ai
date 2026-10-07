/**
 * Antiqora AI OpenAI Provider
 * Connects to OpenAI compatible endpoints
 */

const BaseAIProvider = require('./base.cjs');
const logger = require('../../utils/logger.cjs');

class OpenAIProvider extends BaseAIProvider {
  constructor(apiKey, model = 'gpt-4o-mini') {
    super('openai');
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model || 'gpt-4o-mini';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  async generateResponse({ messages, systemPrompt, temperature = 0.7 }) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured. Please add your key in Settings or .env');
    }

    const formattedMessages = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    (messages || []).forEach((m) => {
      formattedMessages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
      });
    });

    logger.info('AI_PROVIDER', `Calling OpenAI model: ${this.model}`);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        temperature,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error('AI_PROVIDER', `OpenAI API HTTP Error: ${res.status}`, { error: errText });
      let message = `OpenAI API error (Status ${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          message = parsed.error.message;
        }
      } catch {
        // use fallback
      }
      throw new Error(message);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';

    return {
      content: text,
      model: this.model,
      provider: 'openai',
      usage: data.usage || null,
    };
  }

  async generateVisionResponse({ imageBase64, mimeType = 'image/png', prompt, systemPrompt }) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured for vision analysis.');
    }

    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:${mimeType};base64,${imageBase64}`;

    const formattedMessages = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    formattedMessages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt || 'Analyze this screenshot and describe the key UI elements.' },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI Vision error (HTTP ${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: this.model,
      provider: 'openai',
    };
  }
}

module.exports = OpenAIProvider;
