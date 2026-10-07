/**
 * Antiqora AI Controlled Desktop Automation
 * Safely executes allowlisted desktop actions with argument sanitization
 */

const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger.cjs');
const { validateApplicationName, sanitizePath } = require('../ai/safety/sanitizer.cjs');

// Windows executable mappings for known safe applications
const APP_EXECUTABLES = {
  notepad: 'notepad.exe',
  calc: 'calc.exe',
  mspaint: 'mspaint.exe',
  explorer: 'explorer.exe',
  cmd: 'cmd.exe',
  powershell: 'powershell.exe',
  chrome: 'chrome.exe',
  msedge: 'msedge.exe',
  firefox: 'firefox.exe',
  spotify: 'spotify.exe',
  code: 'code.cmd',
  terminal: 'wt.exe',
};

async function openApplication(appName) {
  const validation = validateApplicationName(appName);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const binary = APP_EXECUTABLES[validation.sanitizedName] || `${validation.sanitizedName}.exe`;
  logger.info('DESKTOP', `Launching safe application: ${validation.sanitizedName}`);

  return new Promise((resolve, reject) => {
    // Spawn detached so it runs independently
    const proc = spawn(binary, [], {
      detached: true,
      stdio: 'ignore',
      shell: false,
    });

    proc.on('error', (err) => {
      logger.error('DESKTOP', `Failed to launch ${binary}`, { error: err.message });
      reject(new Error(`Could not launch application '${validation.sanitizedName}': ${err.message}`));
    });

    // Unref child process so node doesn't wait for the opened app
    proc.unref();

    // Small delay to ensure process spawned
    setTimeout(() => {
      resolve({
        success: true,
        message: `Successfully launched ${validation.sanitizedName}`,
      });
    }, 250);
  });
}

async function openFolder(folderPath) {
  const sanitized = sanitizePath(folderPath || process.cwd());
  if (!fs.existsSync(sanitized)) {
    throw new Error(`Folder path does not exist: ${sanitized}`);
  }

  logger.info('DESKTOP', `Opening folder in explorer: ${sanitized}`);

  return new Promise((resolve, reject) => {
    execFile('explorer.exe', [sanitized], (err) => {
      if (err) {
        // explorer.exe sometimes exits with non-zero even when opening correctly
        logger.warn('DESKTOP', 'Explorer invocation warning', { error: err.message });
      }
      resolve({
        success: true,
        message: `Opened folder: ${sanitized}`,
      });
    });
  });
}

async function openUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') {
    throw new Error('Valid URL string is required');
  }

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (err) {
    throw new Error(`Invalid URL format: ${urlStr}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Only HTTP and HTTPS URLs are allowed. Got protocol: ${parsed.protocol}`);
  }

  logger.info('DESKTOP', `Opening web URL in default browser: ${urlStr}`);

  return new Promise((resolve) => {
    // On Windows, use start command safely through cmd with empty title argument
    execFile('cmd.exe', ['/c', 'start', '', parsed.href], (err) => {
      if (err) {
        logger.error('DESKTOP', 'Failed to open URL', { error: err.message });
        resolve({
          success: false,
          message: `Failed to open URL: ${err.message}`,
        });
      } else {
        resolve({
          success: true,
          message: `Opened URL: ${parsed.href}`,
        });
      }
    });
  });
}

module.exports = {
  openApplication,
  openFolder,
  openUrl,
};
