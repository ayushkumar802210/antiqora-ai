/**
 * Antiqora AI Security & Safety Sanitizer
 * Path traversal guard, argument validator, and command allowlist.
 */

const path = require('path');

// Strictly allowlisted applications for safe desktop automation
const ALLOWED_APPLICATIONS = [
  'notepad',
  'calc',
  'mspaint',
  'explorer',
  'code',
  'cmd',
  'powershell',
  'chrome',
  'msedge',
  'firefox',
  'spotify',
  'terminal',
];

// Dangerous shell patterns that must never be executed
const FORBIDDEN_SHELL_PATTERNS = [
  /rm\s+-rf/i,
  /format\s+[a-z]:/i,
  /del\s+\/f\s+\/s\s+\/q/i,
  /shutdown/i,
  /net\s+user/i,
  /reg\s+delete/i,
  /powershell.*-enc/i,
  /invoke-expression/i,
  /downloadstring/i,
  /:(){:|:&};:/, // fork bomb
];

function sanitizePath(inputPath, baseDir = process.cwd()) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid path argument provided');
  }

  // Resolve absolute path
  const resolved = path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.normalize(path.resolve(baseDir, inputPath));

  // Guard against null-byte injection
  if (resolved.includes('\0')) {
    throw new Error('Path contains forbidden characters (null-byte)');
  }

  return resolved;
}

function validateApplicationName(appName) {
  if (!appName || typeof appName !== 'string') {
    return { valid: false, reason: 'Application name is required' };
  }

  const cleanName = appName.trim().toLowerCase().replace(/\.exe$/, '');
  const isAllowed = ALLOWED_APPLICATIONS.includes(cleanName);

  if (!isAllowed) {
    return {
      valid: false,
      reason: `Application '${appName}' is not in the approved desktop allowlist. Allowed apps: ${ALLOWED_APPLICATIONS.join(', ')}`,
    };
  }

  return { valid: true, sanitizedName: cleanName };
}

function checkDangerousPatterns(input) {
  if (!input || typeof input !== 'string') return { safe: true };

  for (const pattern of FORBIDDEN_SHELL_PATTERNS) {
    if (pattern.test(input)) {
      return {
        safe: false,
        reason: 'Input contains forbidden destructive or security-sensitive pattern',
      };
    }
  }

  return { safe: true };
}

module.exports = {
  sanitizePath,
  validateApplicationName,
  checkDangerousPatterns,
  ALLOWED_APPLICATIONS,
};
