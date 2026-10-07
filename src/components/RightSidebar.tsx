/**
 * Antiqora AI Right Intelligence Sidebar
 * Tabs: SYSTEM STATUS | AI MEMORY | ACTIVE TASKS | RECENT ACTIONS | CONNECTED TOOLS
 * Never displays fake statistics. Grounded in live backend telemetry.
 */

import React, { useState } from 'react';
import {
  SystemStatus,
  MemoryItem,
  ActiveTask,
  Tool,
} from '../types';
import {
  Cpu,
  Database,
  ListTodo,
  History,
  Wrench,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface RightSidebarProps {
  systemStatus: SystemStatus | null;
  memories: MemoryItem[];
  activeTasks: ActiveTask[];
  recentActions: Array<{ id: string; toolId: string; timestamp: number; success: boolean }>;
  tools: Tool[];
  onRefreshStatus: () => void;
  onAddMemory: (key: string, value: string, category: string) => void;
  onDeleteMemory: (id: string) => void;
  onCancelTask: (taskId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

type TabType = 'SYSTEM' | 'MEMORY' | 'TASKS' | 'ACTIONS' | 'TOOLS';

export const RightSidebar: React.FC<RightSidebarProps> = ({
  systemStatus,
  memories,
  activeTasks,
  recentActions,
  tools,
  onRefreshStatus,
  onAddMemory,
  onDeleteMemory,
  onCancelTask,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('SYSTEM');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<'preference' | 'fact' | 'instruction'>('preference');
  const [isAddingMemory, setIsAddingMemory] = useState(false);

  const handleSaveMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKey.trim() && newValue.trim()) {
      onAddMemory(newKey.trim(), newValue.trim(), newCategory);
      setNewKey('');
      setNewValue('');
      setIsAddingMemory(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-antiqora-900 border border-slate-800 text-slate-400 hover:text-cyan-400 p-2 rounded-l-xl z-30 transition-all shadow-lg"
        title="Open Intelligence Inspector"
        aria-label="Open sidebar"
      >
        <Cpu className="w-5 h-5" />
      </button>
    );
  }

  return (
    <aside className="w-80 md:w-96 border-l border-slate-800/80 bg-antiqora-950/90 backdrop-blur-md flex flex-col h-full z-20 shrink-0">
      {/* Sidebar Header & Tabs */}
      <div className="p-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase">
              Intelligence Inspector
            </h2>
          </div>
          <button
            onClick={onToggleOpen}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-antiqora-850 border border-slate-800"
          >
            Hide
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-antiqora-900 rounded-xl border border-slate-800 text-[11px] font-medium">
          {[
            { id: 'SYSTEM', label: 'System', icon: Cpu },
            { id: 'MEMORY', label: 'Memory', icon: Database },
            { id: 'TASKS', label: 'Tasks', icon: ListTodo },
            { id: 'ACTIONS', label: 'Audits', icon: History },
            { id: 'TOOLS', label: 'Tools', icon: Wrench },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center py-1.5 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-antiqora-800 text-cyan-400 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={tab.label}
            >
              <tab.icon className="w-3.5 h-3.5 mb-0.5" />
              <span className="text-[10px] truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* 1. SYSTEM STATUS TAB */}
        {activeTab === 'SYSTEM' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="font-semibold text-slate-300">Live Hardware Telemetry</span>
              <button
                onClick={onRefreshStatus}
                className="text-slate-400 hover:text-cyan-400 transition-colors"
                title="Refresh hardware stats"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {systemStatus ? (
              <div className="space-y-3">
                {/* CPU Card */}
                <div className="p-3 rounded-xl bg-antiqora-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-medium">Processor (CPU)</span>
                    <span className="font-mono text-cyan-400">{systemStatus.cpu.usagePercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${systemStatus.cpu.usagePercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {systemStatus.cpu.model} ({systemStatus.cpu.cores} Cores)
                  </p>
                </div>

                {/* RAM Card */}
                <div className="p-3 rounded-xl bg-antiqora-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-medium">Memory (RAM)</span>
                    <span className="font-mono text-blue-400">
                      {systemStatus.memory.usagePercent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${systemStatus.memory.usagePercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {Math.round(systemStatus.memory.usedBytes / 1024 / 1024)} MB /{' '}
                    {Math.round(systemStatus.memory.totalBytes / 1024 / 1024)} MB
                  </p>
                </div>

                {/* Host & Platform Info */}
                <div className="p-3 rounded-xl bg-antiqora-900 border border-slate-800 space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">OS Platform:</span>
                    <span className="font-mono text-[11px] truncate max-w-[150px]">{systemStatus.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Host Name:</span>
                    <span className="font-mono text-[11px]">{systemStatus.hostname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">System Uptime:</span>
                    <span className="font-mono text-[11px]">
                      {Math.floor(systemStatus.uptimeSeconds / 3600)}h {Math.floor((systemStatus.uptimeSeconds % 3600) / 60)}m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">AI Provider:</span>
                    <span className="font-mono text-[11px] text-cyan-400 capitalize">
                      {systemStatus.aiProvider}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Desktop Bridge:</span>
                    <span className="font-mono text-[11px] text-emerald-400">
                      {systemStatus.desktopConnected ? 'Electron IPC' : 'Web Bridge'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500 font-mono">
                Connecting to hardware daemon...
              </div>
            )}
          </div>
        )}

        {/* 2. AI MEMORY TAB */}
        {activeTab === 'MEMORY' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="font-semibold text-slate-300">Long-Term Memory ({memories.length})</span>
              <button
                onClick={() => setIsAddingMemory(!isAddingMemory)}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            {isAddingMemory && (
              <form onSubmit={handleSaveMemory} className="p-3 rounded-xl bg-antiqora-900 border border-slate-700 space-y-2">
                <input
                  type="text"
                  placeholder="Key (e.g., Preferred IDE)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full p-2 rounded-lg bg-antiqora-950 border border-slate-800 text-xs text-slate-200"
                  required
                />
                <textarea
                  placeholder="Value (e.g., VS Code with Dark theme)"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  rows={2}
                  className="w-full p-2 rounded-lg bg-antiqora-950 border border-slate-800 text-xs text-slate-200 resize-none"
                  required
                />
                <div className="flex items-center justify-between pt-1">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="p-1 rounded bg-antiqora-950 border border-slate-800 text-[11px] text-slate-300"
                  >
                    <option value="preference">Preference</option>
                    <option value="fact">Fact</option>
                    <option value="instruction">Instruction</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingMemory(false)}
                      className="px-2 py-1 rounded text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </form>
            )}

            {memories.length === 0 ? (
              <p className="text-slate-500 text-center py-6">
                No memories saved yet. Ask Antiqora to "remember [fact]" or add one manually.
              </p>
            ) : (
              <div className="space-y-2">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-antiqora-900 border border-slate-800 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400">
                          {m.category}
                        </span>
                        <span className="font-semibold text-slate-200">{m.key}</span>
                      </div>
                      <p className="text-slate-300 text-xs">{m.value}</p>
                    </div>
                    <button
                      onClick={() => onDeleteMemory(m.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. ACTIVE TASKS TAB */}
        {activeTab === 'TASKS' && (
          <div className="space-y-3">
            <span className="font-semibold text-slate-300 block pb-2 border-b border-slate-800/60">
              Active Long-Running Tasks ({activeTasks.length})
            </span>

            {activeTasks.length === 0 ? (
              <p className="text-slate-500 text-center py-6">
                No active background tasks running.
              </p>
            ) : (
              <div className="space-y-2">
                {activeTasks.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-antiqora-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{t.name}</span>
                      <span className="font-mono text-cyan-400">{t.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${t.progress}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{t.currentStep}</p>
                    {t.canCancel && (
                      <button
                        onClick={() => onCancelTask(t.id)}
                        className="text-[11px] text-rose-400 hover:underline"
                      >
                        Cancel Task
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. RECENT ACTIONS / AUDITS */}
        {activeTab === 'ACTIONS' && (
          <div className="space-y-3">
            <span className="font-semibold text-slate-300 block pb-2 border-b border-slate-800/60">
              Tool Execution Audit Log
            </span>

            {recentActions.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No recent actions recorded.</p>
            ) : (
              <div className="space-y-2">
                {recentActions.map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-xl bg-antiqora-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      {act.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span className="text-slate-200 font-medium">{act.toolId}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(act.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. CONNECTED TOOLS */}
        {activeTab === 'TOOLS' && (
          <div className="space-y-3">
            <span className="font-semibold text-slate-300 block pb-2 border-b border-slate-800/60">
              Verified Tool Registry ({tools.length})
            </span>

            <div className="space-y-2">
              {tools.map((t) => (
                <div key={t.id} className="p-2.5 rounded-xl bg-antiqora-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 font-mono">{t.name}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        t.permissionLevel === 0
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : t.permissionLevel === 1
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      Level {t.permissionLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{t.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
