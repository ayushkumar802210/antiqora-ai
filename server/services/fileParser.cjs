/**
 * Antiqora AI File Intelligence Service
 * Real content parsing for PDF, DOCX, XLSX, CSV, TXT, MD, and images.
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const logger = require('../utils/logger.cjs');
const { sanitizePath } = require('../ai/safety/sanitizer.cjs');

// Lazy-require pdf-parse to handle any environment variation
let pdfParse = null;
try {
  pdfParse = require('pdf-parse');
} catch {
  logger.warn('FILE_PARSER', 'pdf-parse not available, fallback will be used');
}

async function parseFileContent(filePath, maxChars = 32000) {
  const safePath = sanitizePath(filePath);

  if (!fs.existsSync(safePath)) {
    throw new Error(`File not found: ${safePath}`);
  }

  const stat = fs.statSync(safePath);
  if (stat.isDirectory()) {
    throw new Error(`Path is a directory, not a file: ${safePath}`);
  }

  const ext = path.extname(safePath).toLowerCase();
  const fileName = path.basename(safePath);

  logger.info('FILE_PARSER', `Parsing file: ${fileName} (${ext}, size: ${stat.size} bytes)`);

  let textContent = '';
  let metadata = {
    fileName,
    extension: ext,
    sizeBytes: stat.size,
    lastModified: stat.mtimeMs,
  };

  switch (ext) {
    case '.pdf': {
      if (pdfParse) {
        const dataBuffer = fs.readFileSync(safePath);
        const pdfData = await pdfParse(dataBuffer);
        textContent = pdfData.text || '';
        metadata.pages = pdfData.numpages;
      } else {
        throw new Error('PDF parsing engine not initialized');
      }
      break;
    }

    case '.docx': {
      const docxBuffer = fs.readFileSync(safePath);
      const docxResult = await mammoth.extractRawText({ buffer: docxBuffer });
      textContent = docxResult.value || '';
      break;
    }

    case '.xlsx':
    case '.xls':
    case '.csv': {
      const workbook = XLSX.readFile(safePath);
      const sheetNames = workbook.SheetNames;
      metadata.sheetNames = sheetNames;

      const sheetsText = sheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csvContent = XLSX.utils.sheet_to_csv(sheet);
        return `[Sheet: ${sheetName}]\n${csvContent}`;
      });

      textContent = sheetsText.join('\n\n');
      break;
    }

    case '.txt':
    case '.md':
    case '.json':
    case '.js':
    case '.ts':
    case '.tsx':
    case '.jsx':
    case '.html':
    case '.css':
    case '.py':
    case '.yaml':
    case '.yml':
    case '.xml':
    case '.log': {
      textContent = fs.readFileSync(safePath, 'utf-8');
      break;
    }

    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.webp':
    case '.gif': {
      const imageBuffer = fs.readFileSync(safePath);
      const base64 = imageBuffer.toString('base64');
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      metadata.isImage = true;
      metadata.mime = mime;
      metadata.dataUrl = `data:${mime};base64,${base64}`;
      textContent = `[Image File: ${fileName}, MIME: ${mime}, Size: ${stat.size} bytes]`;
      break;
    }

    default: {
      // Fallback: try reading as text if file is small (< 5MB)
      if (stat.size < 5 * 1024 * 1024) {
        textContent = fs.readFileSync(safePath, 'utf-8');
      } else {
        throw new Error(`Unsupported file type '${ext}' for file '${fileName}'`);
      }
    }
  }

  // Truncate to maxChars to avoid context limit overflow while noting truncation
  const truncated = textContent.length > maxChars;
  const processedText = truncated
    ? textContent.substring(0, maxChars) + `\n\n...[Content truncated. Total character count: ${textContent.length}]`
    : textContent;

  return {
    success: true,
    metadata,
    content: processedText,
    charCount: textContent.length,
    truncated,
  };
}

async function safeWriteFile(filePath, content, allowOverwrite = false) {
  const safePath = sanitizePath(filePath);

  if (fs.existsSync(safePath) && !allowOverwrite) {
    throw new Error(`File '${path.basename(safePath)}' already exists. Overwrite permission required.`);
  }

  const dir = path.dirname(safePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Atomic write using temp file
  const tempPath = `${safePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, content, 'utf-8');
  fs.renameSync(tempPath, safePath);

  logger.info('FILE_PARSER', `Safely written file: ${safePath}`);
  return {
    success: true,
    path: safePath,
    bytesWritten: Buffer.byteLength(content, 'utf-8'),
  };
}

module.exports = {
  parseFileContent,
  safeWriteFile,
};
