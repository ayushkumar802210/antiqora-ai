import { describe, it, expect } from 'vitest';
// @ts-ignore
import { orchestrator } from '../server/ai/orchestrator.cjs';
// @ts-ignore
import storage from '../server/storage.cjs';
// @ts-ignore
import GeminiProvider from '../server/ai/providers/gemini.cjs';
// @ts-ignore
import OpenAIProvider from '../server/ai/providers/openai.cjs';
// @ts-ignore
import LocalProvider from '../server/ai/providers/local.cjs';

describe('AI Providers & Orchestrator Suite', () => {
  describe('Provider Configuration Boundaries', () => {
    it('detects unconfigured Gemini provider when key is empty', () => {
      const p = new GeminiProvider('');
      expect(p.isConfigured()).toBe(false);
    });

    it('detects unconfigured OpenAI provider when key is empty', () => {
      const p = new OpenAIProvider('');
      expect(p.isConfigured()).toBe(false);
    });

    it('Local provider is always operational without cloud credentials', () => {
      const p = new LocalProvider();
      expect(p.isConfigured()).toBe(true);
    });

    it('Local provider returns honest configuration prompt and never fabricates', async () => {
      const p = new LocalProvider();
      const res = await p.generateResponse({ messages: [{ role: 'user', content: 'What is the theory of relativity?' }] });
      expect(res.content).toContain('AI Provider Not Configured');
      expect(res.provider).toBe('local');
    });
  });

  describe('Intent Analysis & Tool Dispatch', () => {
    it('correctly maps system status questions to system_information tool', () => {
      const intent = orchestrator.detectToolIntent('Show system information and cpu usage');
      expect(intent).not.toBeNull();
      expect(intent?.toolId).toBe('system_information');
    });

    it('correctly maps application launch commands', () => {
      const intent = orchestrator.detectToolIntent('Open notepad');
      expect(intent).not.toBeNull();
      expect(intent?.toolId).toBe('open_application');
      expect(intent?.args?.applicationName).toBe('notepad');
    });

    it('correctly maps file reading intent', () => {
      const intent = orchestrator.detectToolIntent('Read file "package.json"');
      expect(intent).not.toBeNull();
      expect(intent?.toolId).toBe('read_file');
      expect(intent?.args?.filePath).toBe('package.json');
    });

    it('correctly maps search queries to web_search', () => {
      const intent = orchestrator.detectToolIntent('Search for latest Mars rover images');
      expect(intent).not.toBeNull();
      expect(intent?.toolId).toBe('web_search');
      expect(intent?.args?.query).toBe('latest Mars rover images');
    });
  });

  describe('Memory and Storage Persistence', () => {
    let savedMemId = '';

    it('saves user memory items', () => {
      const item = storage.addLongTermMemory({
        key: 'Programming Language',
        value: 'TypeScript',
        category: 'preference',
      });
      expect(item.id).toBeDefined();
      expect(item.key).toBe('Programming Language');
      savedMemId = item.id;
    });

    it('retrieves saved memory items', () => {
      const memories = storage.getLongTermMemories();
      const found = memories.find((m: any) => m.id === savedMemId);
      expect(found).toBeDefined();
      expect(found.value).toBe('TypeScript');
    });

    it('deletes memory item by ID', () => {
      storage.deleteLongTermMemory(savedMemId);
      const memories = storage.getLongTermMemories();
      const found = memories.find((m: any) => m.id === savedMemId);
      expect(found).toBeUndefined();
    });
  });
});
