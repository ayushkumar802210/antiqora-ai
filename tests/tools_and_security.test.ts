import { describe, it, expect } from 'vitest';
// @ts-ignore
import { sanitizePath, validateApplicationName, checkDangerousPatterns } from '../server/ai/safety/sanitizer.cjs';
// @ts-ignore
import { toolRegistry } from '../server/ai/tools/registry.cjs';

describe('Security & Tool Validation Suite', () => {
  describe('Path Traversal & Sanitization', () => {
    it('normalizes safe relative and absolute paths', () => {
      const p = sanitizePath('package.json');
      expect(p).toContain('package.json');
    });

    it('rejects null-byte injection attacks', () => {
      expect(() => sanitizePath('test\0.txt')).toThrow('null-byte');
    });

    it('rejects empty or non-string paths', () => {
      expect(() => sanitizePath('')).toThrow();
      expect(() => sanitizePath(null as any)).toThrow();
    });
  });

  describe('Desktop Application Allowlist', () => {
    it('allows approved safe desktop applications', () => {
      const notepad = validateApplicationName('notepad');
      expect(notepad.valid).toBe(true);
      expect(notepad.sanitizedName).toBe('notepad');

      const calc = validateApplicationName('calc.exe');
      expect(calc.valid).toBe(true);
      expect(calc.sanitizedName).toBe('calc');
    });

    it('rejects unapproved or dangerous application names', () => {
      const dangerous = validateApplicationName('malware.exe');
      expect(dangerous.valid).toBe(false);
      expect(dangerous.reason).toContain('not in the approved desktop allowlist');
    });
  });

  describe('Destructive Shell Pattern Detection', () => {
    it('flags dangerous commands', () => {
      expect(checkDangerousPatterns('rm -rf /').safe).toBe(false);
      expect(checkDangerousPatterns('format c:').safe).toBe(false);
      expect(checkDangerousPatterns('del /f /s /q test').safe).toBe(false);
    });

    it('passes safe natural language inputs', () => {
      expect(checkDangerousPatterns('Please read the file and summarize it').safe).toBe(true);
      expect(checkDangerousPatterns('What is the weather today?').safe).toBe(true);
    });
  });

  describe('Tool Registry & Input Schema Validation', () => {
    it('rejects malformed arguments for tools', async () => {
      await expect(
        toolRegistry.executeTool('open_url', { url: 'not-a-valid-url' })
      ).rejects.toThrow('Invalid arguments for tool');
    });

    it('rejects missing required parameters', async () => {
      await expect(
        toolRegistry.executeTool('read_file', {})
      ).rejects.toThrow('filePath');
    });

    it('rejects unknown tool IDs', async () => {
      await expect(
        toolRegistry.executeTool('non_existent_tool', {})
      ).rejects.toThrow("Unknown tool: 'non_existent_tool'");
    });

    it('successfully executes system_information tool', async () => {
      const result = await toolRegistry.executeTool('system_information', {});
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.cpu).toBeDefined();
      expect(result.data.platform).toBeDefined();
    });

    it('requires confirmation for Level 2 file modification tools', async () => {
      const result = await toolRegistry.executeTool('move_file', {
        sourcePath: 'source.txt',
        targetPath: 'dest.txt',
      }, { confirmed: false });

      expect(result.requiresConfirmation).toBe(true);
      expect(result.confirmationDetails?.level).toBe(2);
    });
  });
});
