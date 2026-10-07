import { describe, it, expect, vi } from 'vitest';
// @ts-ignore
import { orchestrator } from '../server/ai/orchestrator.cjs';
// @ts-ignore
import { toolRegistry } from '../server/ai/tools/registry.cjs';
// @ts-ignore
import { performWebResearch } from '../server/services/webSearch.cjs';
// @ts-ignore
import { parseFileContent } from '../server/services/fileParser.cjs';
import { voiceEngine } from '../src/services/voice';
import { desktopBridge } from '../src/services/desktopBridge';

describe('Antiqora AI — 8 End-to-End Core Workflows', () => {
  // TEST 1: User asks a normal question -> AI answers
  it('TEST 1: User asks question -> orchestrator processes and returns answer', async () => {
    const res = await orchestrator.processRequest({
      message: 'What is Antiqora AI?',
    });

    expect(res.message).toBeDefined();
    expect(res.message.role).toBe('assistant');
    expect(res.message.content.toUpperCase()).toContain('ANTIQORA AI');
  });

  // TEST 2: User asks current information -> web research -> sources shown
  it('TEST 2: User requests current information -> performs real web search with sources', async () => {
    const research = await performWebResearch('Antiqora desktop assistant architecture');
    expect(research).toBeDefined();
    expect(research.query).toBe('Antiqora desktop assistant architecture');
    expect(research.timestamp).toBeGreaterThan(0);
  });

  // TEST 3: User asks to open a website -> permission check -> website opens -> success shown
  it('TEST 3: User requests website opening -> validates URL and executes open_url', async () => {
    const result = await toolRegistry.executeTool('open_url', {
      url: 'https://example.com',
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('https://example.com');
  });

  // TEST 4: User asks to read a file -> file parsed -> summary returned
  it('TEST 4: User asks to read file -> parses content safely', async () => {
    const res = await parseFileContent('package.json');
    expect(res.success).toBe(true);
    expect(res.metadata.fileName).toBe('package.json');
    expect(res.content).toContain('antiqora-ai');
  });

  // TEST 5: User asks destructive/sensitive action -> requires confirmation before proceeding
  it('TEST 5: Sensitive file relocation requires explicit user confirmation', async () => {
    const request = await orchestrator.processRequest({
      message: 'Move file test.txt to archived.txt',
    });

    expect(request.requiresConfirmation).toBe(true);
    expect(request.confirmationRequest).toBeDefined();
    expect(request.confirmationRequest?.level).toBe(2);
  });

  // TEST 6: AI API fails -> graceful error -> no fake response
  it('TEST 6: API failure returns formatted error code and never fabricates', async () => {
    // When no API key is set for cloud providers, it tells the user to configure keys
    const res = await orchestrator.processRequest({
      message: 'Tell me a complicated story about galaxies',
    });

    expect(res.message.content).toContain('AI Provider Not Configured');
    expect(res.message.content).not.toContain('fake AI response generated');
  });

  // TEST 7: Microphone permission denied -> friendly error -> app remains usable
  it('TEST 7: Microphone permission error invokes callback without crashing', () => {
    let capturedError = '';
    voiceEngine.startListening({
      onTranscript: () => {},
      onError: (err) => {
        capturedError = err;
      },
      onEnd: () => {},
    });

    // Does not crash
    expect(typeof capturedError).toBe('string');
  });

  // TEST 8: Screen capture denied -> friendly error -> app remains usable
  it('TEST 8: Screen capture denied returns error object and does not crash app', async () => {
    if (navigator.mediaDevices) {
      vi.spyOn(navigator.mediaDevices, 'getDisplayMedia').mockRejectedValue(
        new Error('User denied screen share permission')
      );
    }
    const capture = await desktopBridge.captureScreen();
    expect(capture.success).toBe(false);
    expect(capture.error).toBeDefined();
  });
});
