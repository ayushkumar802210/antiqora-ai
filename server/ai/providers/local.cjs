/**
 * Antiqora AI Offline Local System Provider
 * Handles basic local rules, system inspection, and explicit setup reminders when no external API key is active.
 * NEVER fabricates LLM answers.
 */

const BaseAIProvider = require('./base.cjs');

class LocalProvider extends BaseAIProvider {
  constructor() {
    super('local');
  }

  isConfigured() {
    return true; // Local mode is always available for system and tool operations
  }

  async generateResponse({ messages }) {
    const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
    const text = String(lastMsg).toLowerCase().trim();

    if (text === 'help' || text.includes('what can you do')) {
      return {
        content: `I am **ANTIQORA AI** in **Local Offline Mode**.\n\nWithout an external cloud API key configured, I can still execute local tools safely:\n- **System Status:** Say *"system info"* or *"show cpu"*\n- **File Operations:** Say *"read file <path>"* or *"summarize file <path>"*\n- **App Launcher:** Say *"open notepad"*, *"open calc"*, or *"open explorer"*\n- **Live Web Search:** Say *"search <query>"*\n\nTo unlock autonomous generative reasoning and vision analysis, please configure your **Gemini** or **OpenAI** API key in **Settings** (⚙️).`,
        model: 'local-rule-engine',
        provider: 'local',
      };
    }

    if (text.includes('who are you') || text.includes('what is antiqora')) {
      return {
        content: `I am **ANTIQORA AI** — *Your Intelligent Digital Companion*.\n\nCurrently operating in **Local Mode**. Configure your AI API key in **Settings** to activate full neural conversation capabilities.`,
        model: 'local-rule-engine',
        provider: 'local',
      };
    }

    return {
      content: `⚠️ **AI Provider Not Configured**\n\nTo answer general questions and perform deep reasoning, Antiqora AI requires an API key.\n\nPlease open **Settings** (⚙️) and enter your **Google Gemini API Key** (Free from Google AI Studio) or **OpenAI API Key**.\n\n*Note: Local tools such as System Information, Web Search, and File Inspection remain operational.*`,
      model: 'local-rule-engine',
      provider: 'local',
    };
  }

  async generateVisionResponse() {
    return {
      content: `Vision analysis requires a configured Gemini or OpenAI multimodal model. Please add an API key in Settings.`,
      model: 'local-rule-engine',
      provider: 'local',
    };
  }
}

module.exports = LocalProvider;
