/**
 * Base AI Provider Abstract Interface
 */

class BaseAIProvider {
  constructor(name) {
    this.name = name;
  }

  isConfigured() {
    return false;
  }

  async generateResponse({ messages, systemPrompt, tools, temperature }) {
    throw new Error(`generateResponse() not implemented for ${this.name}`);
  }

  async generateVisionResponse({ imageBase64, mimeType, prompt, systemPrompt }) {
    throw new Error(`generateVisionResponse() not implemented for ${this.name}`);
  }
}

module.exports = BaseAIProvider;
