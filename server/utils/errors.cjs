/**
 * Centralized Error handling & standard Error Codes for Antiqora AI backend
 */

const ERROR_CODES = {
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  RATE_LIMITED: 'RATE_LIMITED',
  TOOL_FAILED: 'TOOL_FAILED',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

class AntiqoraError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'AntiqoraError';
    this.code = code;
    this.statusCode = options.statusCode || 500;
    this.retryable = Boolean(options.retryable);
    this.details = options.details || null;
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        retryable: this.retryable,
      },
    };
  }
}

module.exports = {
  ERROR_CODES,
  AntiqoraError,
};
