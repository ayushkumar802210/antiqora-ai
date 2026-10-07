/**
 * Antiqora AI Top Navigation Header
 * Displays branding, system status badge, active screen sharing status, recent chat switcher, and quick toggles.
 */

import React, { useState } from 'react';
import { CoreState, Conversation } from '../types';
import {
  Volume2,
  VolumeX,
  Settings,
  Activity,
  Plus,
  MonitorOff,
  MessageSquare,
  Trash2,
  X,
} from 'lucide-react';

interface HeaderProps {
  coreState: CoreState;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
  onNewChat: () => void;
  isScreenSharingActive: boolean;
  onStopScreenSharing: () => void;
  activeAgentName?: string;
  isElectron: boolean;
  conversations: Conversation[];
  onSelectConversation: (conv: Conversation) => void;
  onDeleteConversation: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  coreState,
  isMuted,
  onToggleMute,
  onOpenSettings,
  onOpenDiagnostics,
  onNewChat,
  isScreenSharingActive,
  onStopScreenSharing,
  activeAgentName,
  isElectron,
  conversations,
  onSelectConversation,
  onDeleteConversation,
}) => {
  const [showRecentChats, setShowRecentChats] = useState(false);
  const [searchChats, setSearchChats] = useState('');

  const statusDisplayMap: Record<CoreState, { label: string; color: string }> = {
    IDLE: { label: 'Ready', color: 'bg-cyan-500' },
    LISTENING: { label: 'Listening...', color: 'bg-emerald-500' },
    THINKING: { label: 'Thinking...', color: 'bg-purple-500' },
    PROCESSING: { label: 'Working...', color: 'bg-blue-500' },
    EXECUTING: { label: 'Executing Tool...', color: 'bg-amber-500' },
    ERROR: { label: 'Attention Needed', color: 'bg-rose-500' },
  };

  const status = statusDisplayMap[coreState] || statusDisplayMap.IDLE;

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchChats.toLowerCase())
  );

  return (
    <header className="h-16 border-b border-slate-800/80 bg-antiqora-950/70 backdrop-blur-md px-6 flex items-center justify-between z-20 relative">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-glow-cyan">
            <span className="font-bold text-white text-base tracking-tighter">AQ</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-widest text-white uppercase">
                Antiqora AI
              </h1>
              {isElectron && (
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded font-mono">
                  DESKTOP
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Your Intelligent Digital Companion
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-antiqora-900 border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${status.color} animate-pulse`} />
          <span className="text-xs font-mono text-slate-300 font-medium">
            {status.label}
          </span>
          {activeAgentName && (
            <>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-xs text-cyan-400 font-mono">
                {activeAgentName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Screen Sharing Alert Pill if active */}
      {isScreenSharingActive && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-600/60 text-amber-300 text-xs font-mono animate-pulse">
          <span>SCREEN SHARING: ON</span>
          <button
            onClick={onStopScreenSharing}
            className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-black px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors"
            title="Stop Screen Access"
          >
            <MonitorOff className="w-3 h-3" /> Stop
          </button>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Recent Chats Button */}
        <div className="relative">
          <button
            onClick={() => setShowRecentChats(!showRecentChats)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-antiqora-850 hover:bg-antiqora-800 border border-slate-700/80 text-slate-200 text-xs font-medium transition-all shadow-sm"
            title="View Recent Chats"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Recent Chats ({conversations.length})</span>
          </button>

          {/* Recent Chats Popover */}
          {showRecentChats && (
            <div className="absolute right-0 top-11 w-72 rounded-xl bg-antiqora-900 border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">Conversation History</span>
                <button
                  onClick={() => setShowRecentChats(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Search chats..."
                value={searchChats}
                onChange={(e) => setSearchChats(e.target.value)}
                className="w-full p-2 mb-2 rounded-lg bg-antiqora-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
              />

              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredConversations.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-4">No chats found.</p>
                ) : (
                  filteredConversations.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-antiqora-850 cursor-pointer group"
                      onClick={() => {
                        onSelectConversation(c);
                        setShowRecentChats(false);
                      }}
                    >
                      <span className="text-xs text-slate-300 truncate max-w-[180px]">
                        {c.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(c.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-antiqora-850 hover:bg-antiqora-800 border border-slate-700/80 text-slate-200 text-xs font-medium transition-all shadow-sm active:scale-95"
          title="Start a new conversation"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">New Chat</span>
        </button>

        <button
          onClick={onToggleMute}
          className={`p-2 rounded-lg border text-xs transition-colors ${
            isMuted
              ? 'bg-rose-950/50 border-rose-800/60 text-rose-400'
              : 'bg-antiqora-850 border-slate-700/80 text-slate-300 hover:bg-antiqora-800'
          }`}
          title={isMuted ? 'Voice output muted (click to unmute)' : 'Voice output active (click to mute)'}
          aria-label="Toggle text-to-speech audio"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenDiagnostics}
          className="p-2 rounded-lg bg-antiqora-850 hover:bg-antiqora-800 border border-slate-700/80 text-slate-300 text-xs transition-colors"
          title="Open Developer Diagnostics & Telemetry"
          aria-label="Open Diagnostics"
        >
          <Activity className="w-4 h-4 text-emerald-400" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-antiqora-850 hover:bg-antiqora-800 border border-slate-700/80 text-slate-300 text-xs transition-colors"
          title="Open System & AI Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    </header>
  );
};
