/**
 * Antiqora AI Developer Diagnostics & Live Telemetry Panel
 * Real-time structured log streams and tool execution performance audit.
 */

import React, { useState } from 'react';
import { X, Activity, RefreshCw, Terminal, CheckCircle2, XCircle } from 'lucide-react';

interface DiagnosticsModalProps {
  logs: Array<{ id: string; timestamp: number; level: string; category: string; message: string }>;
  toolAudits: Array<{ id: string; timestamp: number; toolId: string; success: boolean }>;
  onRefresh: () => void;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  logs,
  toolAudits,
  onRefresh,
  onClose,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'ALL') return true;
    return log.level === filterLevel;
  });

  const levelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-rose-400 bg-rose-950/60 border-rose-800';
      case 'WARN':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      case 'INFO':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-800';
      case 'DEBUG':
        return 'text-slate-400 bg-slate-900 border-slate-800';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="max-w-3xl w-full rounded-2xl bg-antiqora-900 border border-slate-700/80 p-6 shadow-2xl flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Developer Diagnostics & Telemetry
              </h2>
              <p className="text-xs text-slate-400">Live operational logs and tool execution audit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-antiqora-850 hover:bg-antiqora-800 border border-slate-700 text-slate-300 transition-colors"
              title="Refresh log feed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-antiqora-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 py-2.5 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">Filter Level:</span>
          {['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors ${
                filterLevel === lvl
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-antiqora-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
          <span className="ml-auto font-mono text-slate-500 text-[11px]">
            {filteredLogs.length} events logged
          </span>
        </div>

        {/* Log Viewer */}
        <div className="flex-1 overflow-y-auto p-3 rounded-xl bg-antiqora-950 border border-slate-800 font-mono text-[11px] space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-12">No logs captured yet.</div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 rounded-lg bg-antiqora-900/60 border border-slate-800/80 flex items-start gap-2.5 hover:bg-antiqora-900 transition-colors"
              >
                <span className="text-slate-500 shrink-0 text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded border text-[9px] font-bold tracking-wider shrink-0 ${levelColor(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>
                <span className="text-slate-400 font-bold shrink-0">[{log.category}]</span>
                <span className="text-slate-200 break-all select-text">{log.message}</span>
              </div>
            ))
          )}
        </div>

        {/* Tool Audit Section */}
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Recent Tool Executions ({toolAudits.length})</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-mono">
            {toolAudits.slice(-5).map((aud) => (
              <div
                key={aud.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-antiqora-950 border border-slate-800 text-[11px] shrink-0"
              >
                {aud.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span className="text-slate-300">{aud.toolId}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
