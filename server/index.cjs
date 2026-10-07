/**
 * Antiqora AI Backend Server
 * Express API server powering intelligence, tools, files, search, and OS bridges.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const logger = require('./utils/logger.cjs');
const { ERROR_CODES, AntiqoraError } = require('./utils/errors.cjs');
const storage = require('./storage.cjs');
const { orchestrator } = require('./ai/orchestrator.cjs');
const { toolRegistry } = require('./ai/tools/registry.cjs');
const { agentManager } = require('./ai/agents/definitions.cjs');
const { performWebResearch } = require('./services/webSearch.cjs');
const { parseFileContent } = require('./services/fileParser.cjs');
const { getRealSystemStatus } = require('./services/systemInfo.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Upload directory for file intelligence
const UPLOAD_DIR = path.resolve(__dirname, '../data/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug('HTTP', `${req.method} ${req.path}`);
  next();
});

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'ANTIQORA AI',
    version: '1.0.0',
    timestamp: Date.now(),
  });
});

// 2. System Status
app.get('/api/system/status', (req, res) => {
  try {
    const settings = storage.getSettings();
    const isAiConfigured = Boolean(
      (settings.aiProvider === 'gemini' && settings.geminiApiKey) ||
      (settings.aiProvider === 'openai' && settings.openAiApiKey) ||
      process.env.AI_API_KEY
    );
    const status = getRealSystemStatus(isAiConfigured, settings.aiProvider);
    res.json({ success: true, data: status });
  } catch (err) {
    logger.error('SYSTEM', 'Failed to retrieve system status', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. AI Chat
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, conversationId, clientConfirmedTool } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'Message cannot be empty.' },
      });
    }

    const result = await orchestrator.processRequest({
      message: message.trim(),
      conversationId,
      clientConfirmedTool,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('API_CHAT', 'Chat orchestration failure', { error: err.message });
    res.status(500).json({
      success: false,
      error: { code: ERROR_CODES.AI_PROVIDER_ERROR, message: err.message },
    });
  }
});

// 4. AI Vision
app.post('/api/ai/vision', async (req, res) => {
  try {
    const { imageBase64, mimeType, prompt } = req.body;
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'Image data is required.' },
      });
    }

    const result = await orchestrator.processVisionRequest({
      imageBase64,
      mimeType,
      prompt,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('API_VISION', 'Vision failure', { error: err.message });
    res.status(500).json({
      success: false,
      error: { code: ERROR_CODES.AI_PROVIDER_ERROR, message: err.message },
    });
  }
});

// 5. Web Research
app.post('/api/research', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'Search query is required.' },
      });
    }

    const research = await performWebResearch(query, storage.getSettings());
    res.json({ success: true, data: research });
  } catch (err) {
    logger.error('API_RESEARCH', 'Research failure', { error: err.message });
    res.status(500).json({
      success: false,
      error: { code: ERROR_CODES.NETWORK_ERROR, message: err.message },
    });
  }
});

// 6. File Analyze & Upload
app.post('/api/files/analyze', upload.single('file'), async (req, res) => {
  try {
    let targetPath = req.body.filePath;

    // If file was uploaded via multipart
    if (req.file) {
      targetPath = req.file.path;
      // Rename to include original extension for correct format parser
      const originalExt = path.extname(req.file.originalname);
      const newPath = `${req.file.path}${originalExt}`;
      fs.renameSync(req.file.path, newPath);
      targetPath = newPath;
    }

    if (!targetPath) {
      return res.status(400).json({
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'filePath or uploaded file is required.' },
      });
    }

    const parsed = await parseFileContent(targetPath);
    res.json({ success: true, data: parsed });
  } catch (err) {
    logger.error('API_FILES', 'File analysis failure', { error: err.message });
    res.status(500).json({
      success: false,
      error: { code: ERROR_CODES.TOOL_FAILED, message: err.message },
    });
  }
});

// 7. Tool Direct Execution (with permission gate)
app.post('/api/tools/execute', async (req, res) => {
  try {
    const { toolId, arguments: args, confirmed } = req.body;
    if (!toolId) {
      return res.status(400).json({
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'toolId is required.' },
      });
    }

    const result = await toolRegistry.executeTool(toolId, args, { confirmed: Boolean(confirmed) });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('API_TOOLS', `Tool execution exception for ${req.body.toolId}`, { error: err.message });
    res.status(500).json({
      success: false,
      error: { code: ERROR_CODES.TOOL_FAILED, message: err.message },
    });
  }
});

// 8. Tool Registry listing
app.get('/api/tools', (req, res) => {
  const allTools = toolRegistry.getAllTools().map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    permissionLevel: t.permissionLevel,
  }));
  res.json({ success: true, data: allTools });
});

// 9. Agent listing
app.get('/api/agents', (req, res) => {
  const allAgents = agentManager.getAllAgents().map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    capabilities: a.capabilities,
    allowedTools: a.allowedTools,
    permissionLevel: a.permissionLevel,
  }));
  res.json({ success: true, data: allAgents });
});

// 10. Memory APIs
app.get('/api/memory', (req, res) => {
  const items = storage.getLongTermMemories();
  res.json({ success: true, data: items });
});

app.post('/api/memory', (req, res) => {
  try {
    const { key, value, category } = req.body;
    if (!key || !value) {
      return res.status(400).json({
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'key and value are required.' },
      });
    }
    const item = storage.addLongTermMemory({ key, value, category });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/memory/:id', (req, res) => {
  storage.deleteLongTermMemory(req.params.id);
  res.json({ success: true, message: 'Memory deleted.' });
});

// 11. Conversations APIs
app.get('/api/conversations', (req, res) => {
  const list = storage.getConversations();
  res.json({ success: true, data: list });
});

app.get('/api/conversations/:id', (req, res) => {
  const conv = storage.getConversation(req.params.id);
  if (!conv) {
    return res.status(404).json({ success: false, error: 'Conversation not found.' });
  }
  res.json({ success: true, data: conv });
});

app.post('/api/conversations', (req, res) => {
  const conv = storage.saveConversation(req.body);
  res.json({ success: true, data: conv });
});

app.delete('/api/conversations/:id', (req, res) => {
  storage.deleteConversation(req.params.id);
  res.json({ success: true, message: 'Conversation deleted.' });
});

// 12. Settings APIs
app.get('/api/settings', (req, res) => {
  const safeSettings = { ...storage.getSettings() };
  // Mask keys partially for safe display
  if (safeSettings.geminiApiKey) {
    safeSettings.geminiApiKeyMasked = `${safeSettings.geminiApiKey.substring(0, 6)}...${safeSettings.geminiApiKey.slice(-4)}`;
  }
  if (safeSettings.openAiApiKey) {
    safeSettings.openAiApiKeyMasked = `${safeSettings.openAiApiKey.substring(0, 3)}...${safeSettings.openAiApiKey.slice(-4)}`;
  }
  res.json({ success: true, data: safeSettings });
});

app.post('/api/settings', (req, res) => {
  try {
    const updated = storage.updateSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. System Logs & Diagnostics
app.get('/api/system/logs', (req, res) => {
  const logs = logger.getLogs();
  const audits = storage.getToolAuditLogs();
  res.json({
    success: true,
    data: {
      logs,
      toolAudits: audits,
    },
  });
});

// Centralized error handling middleware
app.use((err, req, res, _next) => {
  logger.error('SERVER', 'Unhandled error caught by Express middleware', { error: err.message });
  res.status(500).json({
    success: false,
    error: {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: err.message || 'An unexpected server error occurred.',
    },
  });
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('SERVER', `ANTIQORA AI Engine running on http://localhost:${PORT}`);
  });
}

module.exports = app;
