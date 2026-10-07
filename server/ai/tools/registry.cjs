/**
 * Antiqora AI Secure Tool Registry & Implementations
 * 14 verified tools with Zod schema validation and 4-tier permission gates
 */

const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger.cjs');
const storage = require('../../storage.cjs');
const { performWebResearch } = require('../../services/webSearch.cjs');
const { parseFileContent, safeWriteFile } = require('../../services/fileParser.cjs');
const { getRealSystemStatus } = require('../../services/systemInfo.cjs');
const { openApplication, openFolder, openUrl } = require('../../services/desktopAutomator.cjs');
const { sanitizePath } = require('../safety/sanitizer.cjs');

// Tool definitions with Zod schemas & permission levels
const tools = [
  // 1. web_search
  {
    id: 'web_search',
    name: 'Web Search',
    description: 'Searches the live web for real-time information, news, documentation, or facts.',
    category: 'web',
    permissionLevel: 0,
    timeoutMs: 15000,
    schema: z.object({
      query: z.string().min(1, 'Query cannot be empty'),
    }),
    async execute(args) {
      const research = await performWebResearch(args.query, storage.getSettings());
      return {
        toolId: 'web_search',
        success: research.sources.length > 0 || !research.error,
        message: `Found ${research.sources.length} sources for "${args.query}"`,
        data: research,
      };
    },
  },

  // 2. open_url
  {
    id: 'open_url',
    name: 'Open URL',
    description: 'Opens a web URL in the user default browser.',
    category: 'web',
    permissionLevel: 1,
    timeoutMs: 8000,
    schema: z.object({
      url: z.string().url('Must be a valid URL starting with http:// or https://'),
    }),
    async execute(args) {
      const res = await openUrl(args.url);
      return {
        toolId: 'open_url',
        success: res.success,
        message: res.message,
      };
    },
  },

  // 3. read_file
  {
    id: 'read_file',
    name: 'Read File',
    description: 'Reads and parses the text/content of a local file (supports PDF, DOCX, XLSX, TXT, MD, code).',
    category: 'file',
    permissionLevel: 0,
    timeoutMs: 10000,
    schema: z.object({
      filePath: z.string().min(1, 'File path is required'),
    }),
    async execute(args) {
      const parsed = await parseFileContent(args.filePath);
      return {
        toolId: 'read_file',
        success: true,
        message: `Successfully read file: ${parsed.metadata.fileName}`,
        data: parsed,
      };
    },
  },

  // 4. search_files
  {
    id: 'search_files',
    name: 'Search Files',
    description: 'Searches for files matching a pattern within a directory.',
    category: 'file',
    permissionLevel: 0,
    timeoutMs: 10000,
    schema: z.object({
      directory: z.string().default('.'),
      query: z.string().min(1, 'Search query is required'),
      maxResults: z.number().optional().default(20),
    }),
    async execute(args) {
      const safeDir = sanitizePath(args.directory);
      if (!fs.existsSync(safeDir)) {
        throw new Error(`Directory not found: ${safeDir}`);
      }

      const results = [];
      function scan(currentDir, depth = 0) {
        if (depth > 3 || results.length >= (args.maxResults || 20)) return;
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const fullPath = path.join(currentDir, entry.name);
          if (entry.name.toLowerCase().includes(args.query.toLowerCase())) {
            results.push({
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
            });
          }
          if (entry.isDirectory()) {
            scan(fullPath, depth + 1);
          }
        }
      }
      scan(safeDir);

      return {
        toolId: 'search_files',
        success: true,
        message: `Found ${results.length} files matching "${args.query}"`,
        data: { query: args.query, directory: safeDir, results },
      };
    },
  },

  // 5. summarize_file
  {
    id: 'summarize_file',
    name: 'Summarize File',
    description: 'Extracts key content and metadata from a document for summarization.',
    category: 'file',
    permissionLevel: 0,
    timeoutMs: 12000,
    schema: z.object({
      filePath: z.string().min(1, 'File path is required'),
    }),
    async execute(args) {
      const parsed = await parseFileContent(args.filePath);
      return {
        toolId: 'summarize_file',
        success: true,
        message: `Extracted content for summarization: ${parsed.metadata.fileName}`,
        data: {
          metadata: parsed.metadata,
          sampleContent: parsed.content.substring(0, 4000),
          charCount: parsed.charCount,
        },
      };
    },
  },

  // 6. analyze_image
  {
    id: 'analyze_image',
    name: 'Analyze Image',
    description: 'Inspects and prepares a local image for AI visual understanding.',
    category: 'vision',
    permissionLevel: 0,
    timeoutMs: 10000,
    schema: z.object({
      imagePath: z.string().min(1, 'Image path is required'),
    }),
    async execute(args) {
      const parsed = await parseFileContent(args.imagePath);
      if (!parsed.metadata.isImage) {
        throw new Error(`File is not a supported image: ${args.imagePath}`);
      }
      return {
        toolId: 'analyze_image',
        success: true,
        message: `Prepared image for visual analysis: ${parsed.metadata.fileName}`,
        data: {
          fileName: parsed.metadata.fileName,
          mime: parsed.metadata.mime,
          dataUrl: parsed.metadata.dataUrl,
        },
      };
    },
  },

  // 7. capture_screen
  {
    id: 'capture_screen',
    name: 'Capture Screen',
    description: 'Captures a screenshot of the active desktop screen for visual inspection.',
    category: 'vision',
    permissionLevel: 1,
    timeoutMs: 10000,
    schema: z.object({
      source: z.string().optional().default('primary'),
    }),
    async execute() {
      // In web mode, screen capture requires client getDisplayMedia bridge.
      // In Electron mode, electron desktopCapturer provides full screen buffer.
      return {
        toolId: 'capture_screen',
        success: true,
        message: 'Screen capture request triggered through secure bridge.',
        data: { requiresClientCapture: true },
      };
    },
  },

  // 8. open_application
  {
    id: 'open_application',
    name: 'Open Application',
    description: 'Launches an approved local desktop application (e.g., notepad, calc, code, chrome).',
    category: 'system',
    permissionLevel: 1,
    timeoutMs: 8000,
    schema: z.object({
      applicationName: z.string().min(1, 'Application name is required'),
    }),
    async execute(args) {
      const res = await openApplication(args.applicationName);
      return {
        toolId: 'open_application',
        success: res.success,
        message: res.message,
      };
    },
  },

  // 9. open_folder
  {
    id: 'open_folder',
    name: 'Open Folder',
    description: 'Opens a local directory in Windows File Explorer.',
    category: 'system',
    permissionLevel: 1,
    timeoutMs: 8000,
    schema: z.object({
      folderPath: z.string().min(1, 'Folder path is required'),
    }),
    async execute(args) {
      const res = await openFolder(args.folderPath);
      return {
        toolId: 'open_folder',
        success: res.success,
        message: res.message,
      };
    },
  },

  // 10. create_file
  {
    id: 'create_file',
    name: 'Create File',
    description: 'Creates a new local file with specified text content safely.',
    category: 'file',
    permissionLevel: 1,
    timeoutMs: 10000,
    schema: z.object({
      filePath: z.string().min(1, 'File path is required'),
      content: z.string(),
      overwrite: z.boolean().optional().default(false),
    }),
    async execute(args) {
      const res = await safeWriteFile(args.filePath, args.content, args.overwrite);
      return {
        toolId: 'create_file',
        success: true,
        message: `Successfully created file: ${res.path} (${res.bytesWritten} bytes)`,
        data: res,
      };
    },
  },

  // 11. move_file
  {
    id: 'move_file',
    name: 'Move File',
    description: 'Moves a file from source to target path (Level 2 Permission required).',
    category: 'file',
    permissionLevel: 2,
    timeoutMs: 8000,
    schema: z.object({
      sourcePath: z.string().min(1, 'Source path is required'),
      targetPath: z.string().min(1, 'Target path is required'),
    }),
    async execute(args) {
      const safeSource = sanitizePath(args.sourcePath);
      const safeTarget = sanitizePath(args.targetPath);
      if (!fs.existsSync(safeSource)) {
        throw new Error(`Source file does not exist: ${safeSource}`);
      }
      fs.renameSync(safeSource, safeTarget);
      return {
        toolId: 'move_file',
        success: true,
        message: `Moved file from ${safeSource} to ${safeTarget}`,
      };
    },
  },

  // 12. copy_file
  {
    id: 'copy_file',
    name: 'Copy File',
    description: 'Copies a file to another location.',
    category: 'file',
    permissionLevel: 2,
    timeoutMs: 8000,
    schema: z.object({
      sourcePath: z.string().min(1, 'Source path is required'),
      targetPath: z.string().min(1, 'Target path is required'),
    }),
    async execute(args) {
      const safeSource = sanitizePath(args.sourcePath);
      const safeTarget = sanitizePath(args.targetPath);
      if (!fs.existsSync(safeSource)) {
        throw new Error(`Source file does not exist: ${safeSource}`);
      }
      fs.copyFileSync(safeSource, safeTarget);
      return {
        toolId: 'copy_file',
        success: true,
        message: `Copied file to ${safeTarget}`,
      };
    },
  },

  // 13. rename_file
  {
    id: 'rename_file',
    name: 'Rename File',
    description: 'Renames a local file.',
    category: 'file',
    permissionLevel: 2,
    timeoutMs: 8000,
    schema: z.object({
      filePath: z.string().min(1, 'File path is required'),
      newName: z.string().min(1, 'New file name is required'),
    }),
    async execute(args) {
      const safeOld = sanitizePath(args.filePath);
      if (!fs.existsSync(safeOld)) {
        throw new Error(`File does not exist: ${safeOld}`);
      }
      const dir = path.dirname(safeOld);
      const safeNew = path.join(dir, path.basename(args.newName));
      fs.renameSync(safeOld, safeNew);
      return {
        toolId: 'rename_file',
        success: true,
        message: `Renamed file to ${path.basename(safeNew)}`,
      };
    },
  },

  // 14. system_information
  {
    id: 'system_information',
    name: 'System Information',
    description: 'Reads real operating system, CPU, memory, uptime, and host specs.',
    category: 'system',
    permissionLevel: 0,
    timeoutMs: 5000,
    schema: z.object({}),
    async execute() {
      const settings = storage.getSettings();
      const status = getRealSystemStatus(Boolean(settings.geminiApiKey || settings.openAiApiKey), settings.aiProvider);
      return {
        toolId: 'system_information',
        success: true,
        message: `System specs retrieved: ${status.platform}`,
        data: status,
      };
    },
  },
];

class ToolRegistry {
  constructor() {
    this.toolsMap = new Map();
    tools.forEach((t) => this.toolsMap.set(t.id, t));
  }

  getTool(id) {
    return this.toolsMap.get(id) || null;
  }

  getAllTools() {
    return Array.from(this.toolsMap.values());
  }

  async executeTool(toolId, rawArgs, options = {}) {
    const tool = this.getTool(toolId);
    if (!tool) {
      throw new Error(`Unknown tool: '${toolId}'`);
    }

    // 1. Schema Validation using Zod
    const validationResult = tool.schema.safeParse(rawArgs || {});
    if (!validationResult.success) {
      const issues = validationResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      logger.warn('TOOL_REGISTRY', `Malformed arguments for tool ${toolId}`, { issues, rawArgs });
      throw new Error(`Invalid arguments for tool '${toolId}': ${issues}`);
    }

    const validatedArgs = validationResult.data;

    // 2. Permission Check
    const settings = storage.getSettings();
    const isAutoApproved =
      (tool.permissionLevel === 0 && settings.autoConfirmLevel0) ||
      (tool.permissionLevel === 1 && settings.autoConfirmLevel1) ||
      (options.approvedPermissions && options.approvedPermissions.includes(toolId));

    if (!isAutoApproved && tool.permissionLevel >= 2 && !options.confirmed) {
      // Must prompt for user confirmation
      logger.info('PERMISSION_GATE', `Action requires confirmation: ${toolId}`, { level: tool.permissionLevel });
      return {
        toolId,
        success: false,
        requiresConfirmation: true,
        message: `ANTIQORA AI requires your explicit permission to execute ${tool.name}.`,
        confirmationDetails: {
          action: `${tool.name}: ${JSON.stringify(validatedArgs)}`,
          level: tool.permissionLevel,
          payload: { toolId, arguments: validatedArgs },
        },
      };
    }

    // 3. Execution with Timeout
    logger.info('TOOL_REGISTRY', `Executing tool: ${toolId}`, { args: validatedArgs });
    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool '${toolId}' timed out after ${tool.timeoutMs}ms`)), tool.timeoutMs)
      );

      const result = await Promise.race([tool.execute(validatedArgs, options), timeoutPromise]);

      storage.recordToolExecution({
        toolId,
        arguments: validatedArgs,
        durationMs: Date.now() - startTime,
        success: result.success,
      });

      return result;
    } catch (err) {
      logger.error('TOOL_REGISTRY', `Tool '${toolId}' execution failed`, { error: err.message });
      storage.recordToolExecution({
        toolId,
        arguments: validatedArgs,
        durationMs: Date.now() - startTime,
        success: false,
        error: err.message,
      });
      return {
        toolId,
        success: false,
        message: `Execution failed: ${err.message}`,
        error: err.message,
      };
    }
  }
}

const toolRegistry = new ToolRegistry();
module.exports = {
  toolRegistry,
  tools,
};
