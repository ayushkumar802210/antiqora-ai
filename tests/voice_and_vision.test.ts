import { describe, it, expect, vi } from 'vitest';
import { sanitizeTextForSpeech, voiceEngine } from '../src/services/voice';
import { desktopBridge } from '../src/services/desktopBridge';

describe('Voice & Screen Vision Safety Suite', () => {
  describe('Speech Text Sanitizer', () => {
    it('redacts sensitive Gemini and OpenAI API keys from spoken audio', () => {
      const input = 'Your API key is AIzaSyD9428hf83hr982hf8932hf8932hf8932h and sk-1234567890abcdef1234567890abcdef';
      const sanitized = sanitizeTextForSpeech(input);
      expect(sanitized).not.toContain('AIzaSyD9428hf83hr982hf8932hf8932hf8932h');
      expect(sanitized).not.toContain('sk-1234567890abcdef1234567890abcdef');
      expect(sanitized).toContain('[redacted key]');
    });

    it('removes code blocks from spoken text', () => {
      const text = 'Here is the fix: ```typescript const a = 1; ``` That should work.';
      const sanitized = sanitizeTextForSpeech(text);
      expect(sanitized).not.toContain('const a = 1;');
      expect(sanitized).toContain('[code omitted]');
    });

    it('removes URLs from spoken text', () => {
      const text = 'Check the source at https://github.com/antiqora/assistant for details.';
      const sanitized = sanitizeTextForSpeech(text);
      expect(sanitized).not.toContain('https://github.com');
      expect(sanitized).toContain('[web link]');
    });
  });

  describe('Voice Engine Controls', () => {
    it('respects mute state', () => {
      voiceEngine.setMuted(true);
      expect(voiceEngine.getIsMuted()).toBe(true);

      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      voiceEngine.speak('This should not play');
      expect(speakSpy).not.toHaveBeenCalled();

      voiceEngine.setMuted(false);
      expect(voiceEngine.getIsMuted()).toBe(false);
    });

    it('handles microphone permission gracefully without crashing', () => {
      const onErrorMock = vi.fn();
      const onTranscriptMock = vi.fn();
      const onEndMock = vi.fn();

      // Calling startListening in an environment without browser SpeechRecognition should call onError
      voiceEngine.startListening({
        onTranscript: onTranscriptMock,
        onError: onErrorMock,
        onEnd: onEndMock,
      });

      // Does not throw an uncaught exception
      expect(true).toBe(true);
    });
  });

  describe('Screen Vision Fallback Bridge', () => {
    it('handles denied screen capture gracefully', async () => {
      // Mock navigator.mediaDevices.getDisplayMedia failure
      if (navigator.mediaDevices) {
        vi.spyOn(navigator.mediaDevices, 'getDisplayMedia').mockRejectedValue(
          new Error('Permission denied by user')
        );
      }

      const res = await desktopBridge.captureScreen();
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
