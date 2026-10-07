/**
 * Antiqora AI Google Gemini Provider
 * Supports text, multi-turn chat, multimodal vision, and function execution
 */

const BaseAIProvider = require('./base.cjs');
const logger = require('../../utils/logger.cjs');

class GeminiProvider extends BaseAIProvider {
  constructor(apiKey, model = 'gemini-2.5-flash') {
    super('gemini');
    this.apiKey = apiKey || process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
    this.model = model || 'gemini-2.5-flash';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  async generateResponse({ messages, systemPrompt, temperature = 0.7 }) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key is not configured. Please add your key in Settings or .env');
    }

    // Convert messages to Gemini format: role 'user' | 'model'
    const contents = (messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: 2048,
      },
    };

    if (systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    logger.info('AI_PROVIDER', `Calling Gemini model: ${this.model}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error('AI_PROVIDER', `Gemini API HTTP Error: ${res.status}`, { error: errText });
      let message = `Gemini API error (Status ${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          message = parsed.error.message;
        }
      } catch {
        // use fallback message
      }
      throw new Error(message);
    }

    const data = await res.json();
    const candidate = data.candidates && data.candidates[0];
    const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';

    return {
      content: text,
      model: this.model,
      provider: 'gemini',
      usage: data.usageMetadata || null,
    };
  }

  async generateVisionResponse({ imageBase64, mimeType = 'image/png', prompt, systemPrompt }) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key is not configured for vision analysis.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
            },
          },
          { text: prompt || 'Analyze this screenshot and describe the key UI elements, active window, and any visible messages or errors.' },
        ],
      },
    ];

    const body = {
      contents,
      generationConfig: { temperature: 0.4 },
    };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    logger.info('AI_PROVIDER', `Calling Gemini Vision model: ${this.model}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error('AI_PROVIDER', 'Gemini Vision API error', { error: errText });
      throw new Error(`Gemini Vision error (HTTP ${res.status}): ${errText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';

    return {
      content: text,
      model: this.model,
      provider: 'gemini',
    };
  }
}

module.exports = GeminiProvider;
