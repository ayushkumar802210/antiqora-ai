/**
 * Antiqora AI Command Input Dock
 * [ + ] [ Voice ] [ Search ] [ Camera/Screen ] [ Message Input ]
 */

import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Search,
  Monitor,
  Paperclip,
  Send,
  Loader2,
  X,
} from 'lucide-react';

interface InputBarProps {
  onSendMessage: (text: string) => void;
  onVoiceToggle: () => void;
  isListening: boolean;
  onCaptureScreen: () => void;
  onUploadFile: (file: File) => void;
  isLoading: boolean;
  isScreenSharingActive: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  onVoiceToggle,
  isListening,
  onCaptureScreen,
  onUploadFile,
  isLoading,
  isScreenSharingActive,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isLoading) return;

    if (selectedFile) {
      onUploadFile(selectedFile);
      setSelectedFile(null);
    }

    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const insertSearchPrefix = () => {
    setInputText((prev) => (prev.startsWith('Search for ') ? prev : `Search for ${prev}`));
  };

  return (
    <div className="border-t border-slate-800/80 bg-antiqora-950/80 backdrop-blur-md px-4 md:px-8 py-3 z-20">
      {/* File Preview Chip if selected */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 max-w-fit px-3 py-1 rounded-lg bg-antiqora-850 border border-slate-700 text-xs text-slate-200">
          <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono truncate max-w-xs">{selectedFile.name}</span>
          <span className="text-[10px] text-slate-500 font-mono">
            ({Math.round(selectedFile.size / 1024)} KB)
          </span>
          <button
            onClick={() => setSelectedFile(null)}
            className="text-slate-400 hover:text-white ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-5xl mx-auto">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg"
        />

        {/* 1. [ + ] Attach Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl bg-antiqora-900 hover:bg-antiqora-850 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors shrink-0"
          title="Attach document or image for intelligence analysis"
          aria-label="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* 2. [ Voice ] Button */}
        <button
          type="button"
          onClick={onVoiceToggle}
          className={`p-2.5 rounded-xl border transition-all shrink-0 relative ${
            isListening
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-glow-emerald animate-pulse'
              : 'bg-antiqora-900 hover:bg-antiqora-850 border-slate-800 text-slate-300 hover:text-emerald-400'
          }`}
          title={isListening ? 'Stop Voice Listening' : 'Speak to Antiqora AI'}
          aria-label="Toggle voice input"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isListening && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        {/* 3. [ Search ] Trigger */}
        <button
          type="button"
          onClick={insertSearchPrefix}
          className="p-2.5 rounded-xl bg-antiqora-900 hover:bg-antiqora-850 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors shrink-0 hidden sm:flex"
          title="Web research mode"
          aria-label="Insert search prefix"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* 4. [ Camera/Screen ] Screen Vision Trigger */}
        <button
          type="button"
          onClick={onCaptureScreen}
          className={`p-2.5 rounded-xl border transition-colors shrink-0 hidden sm:flex ${
            isScreenSharingActive
              ? 'bg-amber-950/70 border-amber-500 text-amber-400'
              : 'bg-antiqora-900 hover:bg-antiqora-850 border-slate-800 text-slate-300 hover:text-amber-400'
          }`}
          title="Capture and analyze screen content"
          aria-label="Screen Vision Capture"
        >
          <Monitor className="w-4 h-4" />
        </button>

        {/* 5. Message Input Area */}
        <div className="flex-1 relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening to your voice...'
                : 'Ask Antiqora AI, search live web, or command system...'
            }
            rows={1}
            disabled={isLoading}
            className="w-full resize-none py-2.5 pl-4 pr-10 rounded-xl bg-antiqora-900/90 border border-slate-800 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none transition-all"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={isLoading || (!inputText.trim() && !selectedFile)}
          className={`p-2.5 rounded-xl transition-all shrink-0 ${
            inputText.trim() || selectedFile
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-glow-cyan hover:brightness-110 active:scale-95'
              : 'bg-antiqora-900 border border-slate-800 text-slate-600 cursor-not-allowed'
          }`}
          aria-label="Send Message"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
};
