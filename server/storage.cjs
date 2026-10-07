/**
 * Antiqora AI Reliable Persistence Layer
 * Atomic file storage with schemas for conversations, memory, permissions, and tool audit logs
 */

const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger.cjs');

const DATA_DIR = path.resolve(__dirname, '../data');
const STORE_PATH = path.join(DATA_DIR, 'antiqora_store.json');

const DEFAULT_STATE = {
  version: 1,
  conversations: [],
  shortTermMemories: {},
  longTermMemories: [],
  permissionsAudit: [],
  toolExecutionsAudit: [],
  settings: {
    aiProvider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openAiApiKey: '',
    openAiModel: 'gpt-4o-mini',
    searchProvider: 'duckduckgo',
    searchApiKey: '',
    ttsEnabled: true,
    ttsVoice: '',
    ttsRate: 1.0,
    autoSpeakResponse: false,
    autoConfirmLevel0: true,
    autoConfirmLevel1: false,
    desktopBridgeEnabled: true,
    developerDiagnostics: false,
  },
};

class StorageEngine {
  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.isInitialized = false;
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          ...DEFAULT_STATE,
          ...parsed,
          settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
        };
        logger.info('STORAGE', 'Loaded persistence store successfully', {
          conversations: this.state.conversations.length,
          memories: this.state.longTermMemories.length,
        });
      } else {
        this.save();
        logger.info('STORAGE', 'Initialized fresh persistent store');
      }
      this.isInitialized = true;
    } catch (err) {
      logger.error('STORAGE', 'Failed to load storage, using in-memory state', { error: err.message });
      this.state = { ...DEFAULT_STATE };
    }
  }

  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const dataStr = JSON.stringify(this.state, null, 2);
      const tempPath = `${STORE_PATH}.tmp.${Date.now()}`;
      try {
        fs.writeFileSync(tempPath, dataStr, 'utf-8');
        fs.renameSync(tempPath, STORE_PATH);
      } catch (atomicErr) {
        // Fallback for Windows file locking / OneDrive sync
        try {
          fs.writeFileSync(STORE_PATH, dataStr, 'utf-8');
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch {}
          }
        } catch (directErr) {
          logger.error('STORAGE', 'Failed to persist storage to disk', { error: directErr.message });
        }
      }
    } catch (err) {
      logger.error('STORAGE', 'Storage save error', { error: err.message });
    }
  }

  // Conversation operations
  getConversations() {
    return this.state.conversations;
  }

  getConversation(id) {
    return this.state.conversations.find((c) => c.id === id) || null;
  }

  saveConversation(conv) {
    const idx = this.state.conversations.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      this.state.conversations[idx] = { ...this.state.conversations[idx], ...conv, updatedAt: Date.now() };
    } else {
      this.state.conversations.unshift({
        ...conv,
        createdAt: conv.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
    }
    this.save();
    return this.getConversation(conv.id);
  }

  deleteConversation(id) {
    this.state.conversations = this.state.conversations.filter((c) => c.id !== id);
    delete this.state.shortTermMemories[id];
    this.save();
    return true;
  }

  // Long-Term Memory
  getLongTermMemories() {
    return this.state.longTermMemories;
  }

  addLongTermMemory(item) {
    const newItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key: String(item.key).trim(),
      value: String(item.value).trim(),
      category: item.category || 'preference',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceMessageId: item.sourceMessageId || null,
    };
    this.state.longTermMemories.push(newItem);
    this.save();
    return newItem;
  }

  deleteLongTermMemory(id) {
    this.state.longTermMemories = this.state.longTermMemories.filter((m) => m.id !== id);
    this.save();
    return true;
  }

  clearLongTermMemories() {
    this.state.longTermMemories = [];
    this.save();
    return true;
  }

  // Short-Term Memory
  getShortTermMemory(conversationId) {
    return this.state.shortTermMemories[conversationId] || { conversationId, recentTurns: [] };
  }

  saveShortTermMemory(conversationId, recentTurns) {
    this.state.shortTermMemories[conversationId] = {
      conversationId,
      recentTurns: (recentTurns || []).slice(-10), // keep last 10 turns
    };
    this.save();
  }

  // Settings
  getSettings() {
    return this.state.settings;
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.save();
    return this.state.settings;
  }

  // Audit Log
  recordToolExecution(entry) {
    this.state.toolExecutionsAudit.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
      ...entry,
    });
    // keep latest 100 entries
    if (this.state.toolExecutionsAudit.length > 100) {
      this.state.toolExecutionsAudit.shift();
    }
    this.save();
  }

  getToolAuditLogs() {
    return this.state.toolExecutionsAudit;
  }
}

const storage = new StorageEngine();
module.exports = storage;
