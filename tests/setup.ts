/**
 * Vitest Global Setup & Browser Polyfills
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill window.speechSynthesis
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    value: {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn(() => []),
    },
  });

  // Polyfill SpeechSynthesisUtterance
  class MockSpeechSynthesisUtterance {
    text: string;
    rate = 1.0;
    pitch = 1.0;
    voice = null;
    onend: (() => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    constructor(text = '') {
      this.text = text;
    }
  }
  (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

  // Polyfill scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
}
