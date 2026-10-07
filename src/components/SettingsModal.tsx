/**
 * Antiqora AI Settings & Configuration Modal
 * Configures AI models, provider keys, speech rate, permissions, and developer diagnostics.
 */

import React, { useState } from 'react';
import { AppSettings } from '../types';
import {
  X,
  Sliders,
  Shield,
  Activity,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (newSettings: Partial<AppSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSaveStatus('Settings successfully applied!');
    setTimeout(() => {
      setSaveStatus(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="max-w-xl w-full rounded-2xl bg-antiqora-900 border border-slate-700/80 p-6 shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                System & AI Settings
              </h2>
              <p className="text-xs text-slate-400">Configure provider intelligence and desktop controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-antiqora-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 text-xs text-slate-200">
          {/* Section 1: AI Provider */}
          <div className="p-4 rounded-xl bg-antiqora-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold uppercase tracking-wider text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Engine Provider</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini' },
                { id: 'openai', label: 'OpenAI GPT' },
                { id: 'local', label: 'Offline / Local' },
              ].map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, aiProvider: prov.id as any })}
                  className={`py-2 px-3 rounded-lg border text-center transition-all ${
                    formData.aiProvider === prov.id
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-antiqora-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {prov.label}
                </button>
              ))}
            </div>

            {/* Gemini API Key */}
            {formData.aiProvider === 'gemini' && (
              <div className="space-y-1.5 pt-2">
                <label className="text-slate-400 font-medium flex items-center justify-between">
                  <span>Gemini API Key</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline text-[10px]"
                  >
                    Get free key at Google AI Studio ↗
                  </a>
                </label>
                <div className="relative">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={formData.geminiApiKey}
                    onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                    placeholder="AIza..."
                    className="w-full p-2.5 pr-9 rounded-lg bg-antiqora-900 border border-slate-700 font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* OpenAI API Key */}
            {formData.aiProvider === 'openai' && (
              <div className="space-y-1.5 pt-2">
                <label className="text-slate-400 font-medium">OpenAI API Key</label>
                <div className="relative">
                  <input
                    type={showOpenAiKey ? 'text' : 'password'}
                    value={formData.openAiApiKey}
                    onChange={(e) => setFormData({ ...formData, openAiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full p-2.5 pr-9 rounded-lg bg-antiqora-900 border border-slate-700 font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showOpenAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Security & Permissions */}
          <div className="p-4 rounded-xl bg-antiqora-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-semibold uppercase tracking-wider text-[11px]">
              <Shield className="w-3.5 h-3.5" />
              <span>Permission Policies</span>
            </div>

            <label className="flex items-center justify-between p-2 rounded-lg bg-antiqora-900 border border-slate-800/80 cursor-pointer">
              <div>
                <span className="font-medium text-slate-200 block">Auto-allow Level 0 (Read-Only)</span>
                <span className="text-[10px] text-slate-500">
                  Allow reading files and viewing hardware stats without prompting
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.autoConfirmLevel0}
                onChange={(e) => setFormData({ ...formData, autoConfirmLevel0: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-antiqora-900 border border-slate-800/80 cursor-pointer">
              <div>
                <span className="font-medium text-slate-200 block">Auto-allow Level 1 (Safe Actions)</span>
                <span className="text-[10px] text-slate-500">
                  Allow launching approved apps (Notepad, Calc) and opening folders without prompting
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.autoConfirmLevel1}
                onChange={(e) => setFormData({ ...formData, autoConfirmLevel1: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          {/* Section 3: Speech & Voice Output */}
          <div className="p-4 rounded-xl bg-antiqora-950 border border-slate-800 space-y-3">
            <span className="text-slate-300 font-semibold uppercase tracking-wider text-[11px] block">
              Speech Synthesis (TTS)
            </span>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Speech Rate ({formData.ttsRate}x):</span>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={formData.ttsRate}
                onChange={(e) => setFormData({ ...formData, ttsRate: parseFloat(e.target.value) })}
                className="w-40 accent-cyan-500"
              />
            </div>

            <label className="flex items-center justify-between cursor-pointer pt-1">
              <span className="text-slate-400">Auto-speak assistant responses:</span>
              <input
                type="checkbox"
                checked={formData.autoSpeakResponse}
                onChange={(e) => setFormData({ ...formData, autoSpeakResponse: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          {/* Section 4: Diagnostics */}
          <div className="p-4 rounded-xl bg-antiqora-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold uppercase tracking-wider text-[11px]">
              <Activity className="w-3.5 h-3.5" />
              <span>Developer Telemetry</span>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-400">Enable Developer Diagnostics Panel:</span>
              <input
                type="checkbox"
                checked={formData.developerDiagnostics}
                onChange={(e) => setFormData({ ...formData, developerDiagnostics: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          {saveStatus && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-600/60 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{saveStatus}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-antiqora-850 hover:bg-antiqora-800 border border-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-semibold shadow-glow-cyan"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
