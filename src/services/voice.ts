/**
 * Antiqora AI Voice & Speech Engine
 * Web Speech API STT and TTS with audio filters and permission protection.
 */

// Safe regex filter for speech synthesis — prevents reading sensitive strings
const SENSITIVE_SPEECH_PATTERNS = [
  /AIza[0-9A-Za-z-_]{30,}/g,
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /[a-f0-9]{32,64}/gi, // raw hashes / tokens
];

export function sanitizeTextForSpeech(text: string): string {
  if (!text) return '';
  let clean = text;

  // Filter out URLs
  clean = clean.replace(/https?:\/\/[^\s]+/g, ' [web link] ');

  // Filter out code blocks and backticks
  clean = clean.replace(/```[\s\S]*?```/g, ' [code omitted] ');
  clean = clean.replace(/`([^`]+)`/g, '$1');

  // Filter out secrets / keys
  SENSITIVE_SPEECH_PATTERNS.forEach((pattern) => {
    clean = clean.replace(pattern, ' [redacted key] ');
  });

  // Filter out markdown formatting except brackets used for placeholders
  clean = clean.replace(/[*_#~>]/g, '');

  return clean.replace(/\s+/g, ' ').trim();
}

// Typing for SpeechRecognition Web API
interface IWindowSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class VoiceEngine {
  private recognition: any = null;
  private isListening = false;
  private isMuted = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private timeoutId: any = null;

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const win = window as IWindowSpeech;
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechClass) {
      try {
        this.recognition = new SpeechClass();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      } catch (e) {
        console.warn('Speech recognition could not be initialized:', e);
      }
    }
  }

  public isSpeaking(): boolean {
    return Boolean(this.currentUtterance);
  }

  public isSpeechSupported(): boolean {
    return Boolean(this.recognition);
  }

  public isTtsSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopSpeaking();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Listen to user microphone and invoke callbacks
   */
  public startListening({
    onTranscript,
    onError,
    onEnd,
  }: {
    onTranscript: (transcript: string, isFinal: boolean) => void;
    onError: (errorMsg: string) => void;
    onEnd: () => void;
  }): boolean {
    if (!this.recognition) {
      onError('Speech recognition is not supported in this environment.');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    try {
      this.isListening = true;

      // Auto-timeout after 12s of silence to avoid dangling mic
      this.timeoutId = setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
          onEnd();
        }
      }, 12000);

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (final) {
          onTranscript(final.trim(), true);
          this.stopListening();
          onEnd();
        } else if (interim) {
          onTranscript(interim.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        clearTimeout(this.timeoutId);
        const errType = event.error;

        if (errType === 'not-allowed' || errType === 'permission-denied') {
          onError('Microphone permission is required.');
        } else if (errType === 'no-speech') {
          onError('No speech detected.');
        } else if (errType === 'network') {
          onError('Speech service network error.');
        } else {
          onError(`Speech recognition error: ${errType || 'unknown'}`);
        }
        onEnd();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        clearTimeout(this.timeoutId);
        onEnd();
      };

      this.recognition.start();
      return true;
    } catch (err: unknown) {
      this.isListening = false;
      clearTimeout(this.timeoutId);
      const msg = err instanceof Error ? err.message : 'Microphone access failed';
      onError(msg);
      onEnd();
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
    clearTimeout(this.timeoutId);
  }

  /**
   * Speak sanitized text via SpeechSynthesis
   */
  public speak(
    text: string,
    options: { rate?: number; onEnd?: () => void; onError?: (err: string) => void } = {}
  ) {
    if (this.isMuted || !this.isTtsSupported()) return;

    this.stopSpeaking();

    const safeText = sanitizeTextForSpeech(text);
    if (!safeText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(safeText);
      utterance.rate = options.rate || 1.0;
      utterance.pitch = 1.0;

      // Select preferred voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        options.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          options.onError?.(e.error);
        }
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err: unknown) {
      console.warn('TTS speak failure:', err);
    }
  }

  public stopSpeaking() {
    if (this.isTtsSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.currentUtterance = null;
  }

  public pauseSpeaking() {
    if (this.isTtsSupported()) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // ignore
      }
    }
  }

  public resumeSpeaking() {
    if (this.isTtsSupported()) {
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }
    }
  }
}

export const voiceEngine = new VoiceEngine();
