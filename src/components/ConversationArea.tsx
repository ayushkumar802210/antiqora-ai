/**
 * Antiqora AI Conversation Area
 * Renders user inputs, AI thoughts, verified tool executions, live web sources, and errors.
 */

import React, { useEffect, useRef } from 'react';
import { AIMessage, WebSource, PermissionRequest } from '../types';
import {
  Bot,
  User,
  ExternalLink,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Globe,
  FileText,
  Terminal,
} from 'lucide-react';

interface ConversationAreaProps {
  messages: AIMessage[];
  onConfirmPermission: (req: PermissionRequest) => void;
  onCancelPermission: (req: PermissionRequest) => void;
  onSelectPrompt: (prompt: string) => void;
}

export const ConversationArea: React.FC<ConversationAreaProps> = ({
  messages,
  onConfirmPermission,
  onCancelPermission,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none overflow-y-auto">
        <div className="max-w-md w-full">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center mx-auto mb-4 shadow-glow-cyan">
            <Bot className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide mb-1">
            How can I assist you today?
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Autonomous desktop assistant capable of live research, file analysis, and safe system automation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            {[
              {
                title: 'Check System Status',
                query: 'Show system information and CPU load',
                icon: Terminal,
              },
              {
                title: 'Search Live Web',
                query: 'Search for latest developments in quantum computing',
                icon: Globe,
              },
              {
                title: 'Inspect Local Files',
                query: 'Read file package.json',
                icon: FileText,
              },
              {
                title: 'Desktop App Control',
                query: 'Open Notepad',
                icon: Wrench,
              },
            ].map((card, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPrompt(card.query)}
                className="p-3 rounded-xl bg-antiqora-900/60 hover:bg-antiqora-850 border border-slate-800/80 hover:border-slate-700 text-left transition-all group active:scale-98"
              >
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-slate-200">{card.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{card.query}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-3 md:gap-4 ${
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {/* Avatar for Assistant */}
          {msg.role === 'assistant' && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shrink-0 shadow-glow-cyan mt-1">
              <Bot className="w-4 h-4 text-white" />
            </div>
          )}

          {/* Message Content Container */}
          <div
            className={`max-w-3xl rounded-2xl p-4 md:p-5 transition-all ${
              msg.role === 'user'
                ? 'bg-antiqora-800 border border-slate-700/80 text-slate-100 shadow-sm ml-12'
                : 'bg-antiqora-900/90 border border-slate-800 text-slate-200 shadow-glass mr-12'
            }`}
          >
            {/* Header row in message */}
            <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-slate-800/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">
                  {msg.role === 'user' ? 'You' : msg.agent || 'Antiqora AI'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <button
                onClick={() => handleCopy(msg.id, msg.content)}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy message text"
                aria-label="Copy message"
              >
                {copiedId === msg.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Tool Executions Badges */}
            {msg.toolResults && msg.toolResults.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {msg.toolResults.map((tr, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-antiqora-950/80 border border-slate-800 text-xs font-mono"
                  >
                    <Wrench className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-semibold text-slate-300">{tr.toolId}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 truncate flex-1">{tr.message}</span>
                    {tr.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Main Message Text */}
            <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap select-text">
              {msg.content}
            </div>

            {/* Web Sources Drawer */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Verified Web Sources ({msg.sources.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {msg.sources.map((src: WebSource, sIdx: number) => (
                    <a
                      key={sIdx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-antiqora-950/90 hover:bg-antiqora-850 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between group"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-xs font-medium text-slate-200 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                          {src.title}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {src.snippet}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Inline Permission Confirmation Card if Pending */}
            {msg.pendingConfirmation && (
              <div className="mt-4 p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Security Confirmation Required (Level {msg.pendingConfirmation.level})</span>
                </div>
                <p className="text-slate-200 mb-3 font-mono">
                  {msg.pendingConfirmation.actionDescription}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onConfirmPermission(msg.pendingConfirmation!)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors"
                  >
                    Allow Action
                  </button>
                  <button
                    onClick={() => onCancelPermission(msg.pendingConfirmation!)}
                    className="px-3 py-1.5 rounded-lg bg-antiqora-800 hover:bg-antiqora-700 text-slate-300 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Avatar for User */}
          {msg.role === 'user' && (
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 mt-1">
              <User className="w-4 h-4 text-slate-200" />
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
