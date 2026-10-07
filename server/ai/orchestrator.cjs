/**
 * Antiqora AI Master Orchestrator
 * Coordinates intent analysis, agent routing, tool execution, safety permission gates, and memory.
 */

const logger = require('../utils/logger.cjs');
const storage = require('../storage.cjs');
const { toolRegistry } = require('./tools/registry.cjs');
const { agentManager } = require('./agents/definitions.cjs');
const GeminiProvider = require('./providers/gemini.cjs');
const OpenAIProvider = require('./providers/openai.cjs');
const LocalProvider = require('./providers/local.cjs');

class Orchestrator {
  constructor() {
    this.localProvider = new LocalProvider();
  }

  getProvider(settings = {}) {
    const config = { ...storage.getSettings(), ...settings };
    if (config.aiProvider === 'gemini' && config.geminiApiKey) {
      return new GeminiProvider(config.geminiApiKey, config.geminiModel);
    }
    if (config.aiProvider === 'openai' && config.openAiApiKey) {
      return new OpenAIProvider(config.openAiApiKey, config.openAiModel);
    }
    return this.localProvider;
  }

  detectToolIntent(userText = '') {
    const text = userText.trim();
    const lower = text.toLowerCase();

    // 1. System info intent
    if (
      lower === 'system info' ||
      lower === 'system status' ||
      lower.includes('show system info') ||
      lower.includes('check system specs') ||
      lower.includes('what are my system specs') ||
      lower.includes('cpu usage') ||
      lower.includes('memory usage')
    ) {
      return { toolId: 'system_information', args: {} };
    }

    // 2. Open application intent
    const appMatch = lower.match(/(?:open|launch|start|run)\s+(?:application|app)?\s*(notepad|calc|calculator|mspaint|paint|explorer|code|cmd|powershell|chrome|msedge|firefox|spotify|terminal)/i);
    if (appMatch) {
      let appName = appMatch[1].toLowerCase();
      if (appName === 'calculator') appName = 'calc';
      if (appName === 'paint') appName = 'mspaint';
      return { toolId: 'open_application', args: { applicationName: appName } };
    }

    // 3. Open folder intent
    const folderMatch = text.match(/(?:open\s+(?:folder|directory))\s+["']?([^"']+)["']?/i);
    if (folderMatch) {
      return { toolId: 'open_folder', args: { folderPath: folderMatch[1].trim() } };
    }

    // 4. Open URL intent
    const urlMatch = text.match(/(?:open\s+(?:website|url|site|link)|browse to)\s+["']?(https?:\/\/[^\s"']+)["']?/i);
    if (urlMatch) {
      return { toolId: 'open_url', args: { url: urlMatch[1].trim() } };
    }

    // 5. Read file intent
    const readMatch = text.match(/(?:read|view|inspect|examine|show)\s+(?:the\s+)?file\s+["']?([^"']+)["']?/i);
    if (readMatch) {
      return { toolId: 'read_file', args: { filePath: readMatch[1].trim() } };
    }

    // 6. Summarize file intent
    const sumMatch = text.match(/(?:summarize|summarise)\s+(?:the\s+)?(?:document|file)\s+["']?([^"']+)["']?/i);
    if (sumMatch) {
      return { toolId: 'summarize_file', args: { filePath: sumMatch[1].trim() } };
    }

    // 7. Search files intent
    const searchFilesMatch = text.match(/(?:search|find)\s+files?\s+(?:named|matching|for)\s+["']?([^"']+)["']?/i);
    if (searchFilesMatch) {
      return { toolId: 'search_files', args: { query: searchFilesMatch[1].trim(), directory: '.' } };
    }

    // 8. Create file intent
    const createMatch = text.match(/(?:create|write|make)\s+(?:a\s+)?file\s+["']?([^"'\s]+)["']?\s+with\s+(?:content|text)\s+["']?([\s\S]+?)["']?$/i);
    if (createMatch) {
      return {
        toolId: 'create_file',
        args: { filePath: createMatch[1].trim(), content: createMatch[2], overwrite: false },
      };
    }

    // 9. Move file intent
    const moveMatch = text.match(/(?:move|relocate)\s+file\s+["']?([^"']+)["']?\s+to\s+["']?([^"']+)["']?/i);
    if (moveMatch) {
      return {
        toolId: 'move_file',
        args: { sourcePath: moveMatch[1].trim(), targetPath: moveMatch[2].trim() },
      };
    }

    // 10. Web search intent
    const searchMatch = text.match(/(?:search\s+(?:the\s+)?(?:web|internet|google|online)\s+for|search\s+for|look\s+up|google)\s+["']?([^"']+)["']?/i);
    if (searchMatch) {
      return { toolId: 'web_search', args: { query: searchMatch[1].trim() } };
    }

    // Implicit search if question starts with 'what is the latest' or 'who won the'
    if (lower.startsWith('what is the latest') || lower.startsWith('current news') || lower.startsWith('today\'s weather') || lower.startsWith('recent developments')) {
      return { toolId: 'web_search', args: { query: text } };
    }

    return null;
  }

  async processRequest({ message, conversationId, clientConfirmedTool = null }) {
    const startTime = Date.now();
    logger.info('ORCHESTRATOR', 'Processing incoming user request', { conversationId, text: message });

    // 1. Fetch conversation & long-term memory
    const conversation = storage.getConversation(conversationId) || {
      id: conversationId || `conv-${Date.now()}`,
      title: message.substring(0, 36) + '...',
      createdAt: Date.now(),
      messages: [],
    };

    const longTermMemories = storage.getLongTermMemories();
    const activeAgent = agentManager.selectAgentByIntent(message);

    // 2. Intent & Tool Determination
    let intendedTool = clientConfirmedTool || this.detectToolIntent(message);
    const toolsUsed = [];
    const toolResults = [];
    let sources = [];
    let toolSummaryText = '';

    // If client provided a pre-approved confirmation execution
    if (clientConfirmedTool) {
      logger.info('ORCHESTRATOR', 'Executing explicitly confirmed tool', clientConfirmedTool);
      const executionResult = await toolRegistry.executeTool(
        clientConfirmedTool.toolId,
        clientConfirmedTool.arguments,
        { confirmed: true }
      );
      toolsUsed.push(clientConfirmedTool.toolId);
      toolResults.push(executionResult);

      if (executionResult.data?.sources) {
        sources = executionResult.data.sources;
      }
      toolSummaryText = `Executed ${clientConfirmedTool.toolId}: ${executionResult.message}`;
    } else if (intendedTool) {
      const executionResult = await toolRegistry.executeTool(
        intendedTool.toolId,
        intendedTool.args,
        { confirmed: false }
      );

      // Check if confirmation is requested by permission gate
      if (executionResult.requiresConfirmation) {
        logger.info('ORCHESTRATOR', 'Tool halted: requires confirmation', executionResult.confirmationDetails);
        const confirmationRequest = {
          id: `perm-${Date.now()}`,
          toolId: intendedTool.toolId,
          level: executionResult.confirmationDetails.level,
          actionDescription: executionResult.confirmationDetails.action,
          details: executionResult.confirmationDetails.payload,
          timestamp: Date.now(),
        };

        const assistantMsg = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: executionResult.message,
          timestamp: Date.now(),
          agent: activeAgent.name,
          coreState: 'IDLE',
          pendingConfirmation: confirmationRequest,
        };

        return {
          message: assistantMsg,
          conversationId: conversation.id,
          coreState: 'IDLE',
          requiresConfirmation: true,
          confirmationRequest,
        };
      }

      toolsUsed.push(intendedTool.toolId);
      toolResults.push(executionResult);

      if (executionResult.data?.sources) {
        sources = executionResult.data.sources;
      }
      toolSummaryText = executionResult.message;
    }

    // 3. AI Provider Generation
    const provider = this.getProvider();
    let finalContent = '';

    if (toolsUsed.length > 0 && !provider.isConfigured()) {
      // Local mode with successful tool execution
      const toolRes = toolResults[0];
      if (toolRes.toolId === 'system_information' && toolRes.data) {
        const sys = toolRes.data;
        finalContent = `**ANTIQORA System Status**\n\n- **OS Platform:** ${sys.platform}\n- **Host:** ${sys.hostname}\n- **Uptime:** ${Math.floor(sys.uptimeSeconds / 60)} minutes\n- **CPU:** ${sys.cpu.model} (${sys.cpu.cores} cores, ${sys.cpu.usagePercent}% load)\n- **Memory:** ${Math.round(sys.memory.usedBytes / 1024 / 1024)} MB used / ${Math.round(sys.memory.totalBytes / 1024 / 1024)} MB total (${sys.memory.usagePercent}%)\n- **AI Provider:** ${sys.aiProvider} (${sys.aiConfigured ? 'Configured' : 'Not configured'})\n\n*All statistics read directly from live OS.*`;
      } else if (toolRes.toolId === 'web_search' && toolRes.data) {
        finalContent = toolRes.data.summary;
      } else if (toolRes.toolId === 'read_file' && toolRes.data) {
        finalContent = `### File Content: ${toolRes.data.metadata.fileName}\n\`\`\`\n${toolRes.data.content}\n\`\`\``;
      } else {
        finalContent = toolRes.message;
      }
    } else {
      // Synthesize full response via AI provider
      const memoryContext = longTermMemories.length > 0
        ? `\nApproved User Preferences & Long-term Memory:\n${longTermMemories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`).join('\n')}`
        : '';

      const toolContext = toolsUsed.length > 0
        ? `\nLive Tool Results Available:\n${toolResults.map((tr) => `[Tool ${tr.toolId}]: ${JSON.stringify(tr.data || tr.message)}`).join('\n')}`
        : '';

      const systemPrompt = `${activeAgent.systemPrompt}\n${memoryContext}\n${toolContext}`;

      const historyMessages = (conversation.messages || []).slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      historyMessages.push({ role: 'user', content: message });

      try {
        const response = await provider.generateResponse({
          messages: historyMessages,
          systemPrompt,
          temperature: 0.7,
        });
        finalContent = response.content;
      } catch (err) {
        logger.error('ORCHESTRATOR', 'AI Provider generation error', { error: err.message });
        finalContent = `⚠️ **AI Service Temporarily Unavailable**\n\n${err.message}\n\n*Local tools and system commands continue to operate.*`;
      }
    }

    // 4. Memory check: if user asked to remember something
    const rememberMatch = message.match(/(?:remember\s+that|remember\s+this:?|please\s+remember)\s+(.+)/i);
    if (rememberMatch) {
      storage.addLongTermMemory({
        key: 'User Note',
        value: rememberMatch[1].trim(),
        category: 'preference',
      });
      finalContent += `\n\n*(Saved to Antiqora Long-Term Memory)*`;
    }

    // 5. Store conversation
    const userMsg = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: startTime,
    };

    const assistantMsg = {
      id: `msg-a-${Date.now()}`,
      role: 'assistant',
      content: finalContent,
      timestamp: Date.now(),
      agent: activeAgent.name,
      toolsUsed,
      toolResults,
      sources,
      coreState: 'IDLE',
    };

    conversation.messages = conversation.messages || [];
    conversation.messages.push(userMsg, assistantMsg);
    storage.saveConversation(conversation);

    // Save short-term memory
    storage.saveShortTermMemory(conversation.id, conversation.messages);

    return {
      message: assistantMsg,
      conversationId: conversation.id,
      coreState: 'IDLE',
      toolsUsed,
      sources,
    };
  }

  async processVisionRequest({ imageBase64, mimeType, prompt }) {
    const provider = this.getProvider();
    if (!provider.isConfigured()) {
      return {
        success: false,
        error: 'Vision understanding requires an active Gemini or OpenAI API key. Configure in Settings.',
      };
    }

    const activeAgent = agentManager.getAgent('screen_vision');
    try {
      const response = await provider.generateVisionResponse({
        imageBase64,
        mimeType: mimeType || 'image/png',
        prompt: prompt || 'Analyze this screen/image and explain what is visible, including any buttons, active windows, or errors.',
        systemPrompt: activeAgent.systemPrompt,
      });

      return {
        success: true,
        content: response.content,
      };
    } catch (err) {
      logger.error('ORCHESTRATOR', 'Vision processing failed', { error: err.message });
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

const orchestrator = new Orchestrator();
module.exports = {
  orchestrator,
};
