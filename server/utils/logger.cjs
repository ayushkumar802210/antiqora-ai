/**
 * Antiqora AI Structured Logger
 * Safe logging with automatic secret redaction & in-memory ring buffer for developer diagnostics
 */

const MAX_LOG_BUFFER = 200;
const logBuffer = [];

const SENSITIVE_KEY_PATTERNS = [
  /api[-_]?key/i,
  /auth/i,
  /token/i,
  /password/i,
  /secret/i,
  /credential/i,
];

function sanitize(data) {
  if (!data) return data;
  if (typeof data === 'string') {
    // Redact anything looking like sk-..., AIza..., or long bearer tokens
    return data
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GEMINI_KEY]')
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_OPENAI_KEY]');
  }
  if (Array.isArray(data)) {
    return data.map(sanitize);
  }
  if (typeof data === 'object') {
    const safeObj = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        safeObj[key] = '[REDACTED]';
      } else {
        safeObj[key] = sanitize(value);
      }
    }
    return safeObj;
  }
  return data;
}

function recordLog(level, category, message, data = null) {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    level,
    category,
    message: typeof message === 'string' ? sanitize(message) : JSON.stringify(sanitize(message)),
    data: sanitize(data),
  };

  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }

  const prefix = `[${new Date(entry.timestamp).toISOString()}] [${level}] [${category}]`;
  if (level === 'ERROR') {
    console.error(prefix, entry.message, entry.data || '');
  } else if (level === 'WARN') {
    console.warn(prefix, entry.message, entry.data || '');
  } else {
    console.log(prefix, entry.message, entry.data || '');
  }

  return entry;
}

const logger = {
  debug: (category, message, data) => recordLog('DEBUG', category, message, data),
  info: (category, message, data) => recordLog('INFO', category, message, data),
  warn: (category, message, data) => recordLog('WARN', category, message, data),
  error: (category, message, data) => recordLog('ERROR', category, message, data),
  getLogs: () => [...logBuffer],
  clearLogs: () => {
    logBuffer.length = 0;
  },
};

module.exports = logger;
