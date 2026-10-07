/**
 * Antiqora AI Security Confirmation Modal
 * Strict permission gate for Level 1, 2, and 3 system/file actions.
 */

import React from 'react';
import { PermissionRequest } from '../types';
import { ShieldAlert, AlertTriangle, Check, X } from 'lucide-react';

interface ConfirmationModalProps {
  request: PermissionRequest | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  request,
  onConfirm,
  onCancel,
}) => {
  if (!request) return null;

  const levelColorMap = {
    0: 'text-emerald-400 border-emerald-800 bg-emerald-950/60',
    1: 'text-blue-400 border-blue-800 bg-blue-950/60',
    2: 'text-amber-400 border-amber-800 bg-amber-950/60',
    3: 'text-rose-400 border-rose-800 bg-rose-950/60',
  };

  const levelLabelMap = {
    0: 'Level 0: Read-Only Inspection',
    1: 'Level 1: Safe Reversible Action',
    2: 'Level 2: File/System Modification',
    3: 'Level 3: Sensitive or Destructive Action',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="max-w-md w-full rounded-2xl bg-antiqora-900 border border-slate-700/80 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-600/50 text-amber-400 shadow-glow-amber">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Security Authorization
            </h3>
            <span
              className={`inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded border mt-0.5 ${
                levelColorMap[request.level]
              }`}
            >
              {levelLabelMap[request.level]}
            </span>
          </div>
        </div>

        {/* Action Description */}
        <div className="p-4 rounded-xl bg-antiqora-950 border border-slate-800 space-y-2">
          <p className="text-xs text-slate-400 font-medium">ANTIQORA AI wants to:</p>
          <p className="text-sm font-semibold text-slate-100 font-mono break-all">
            {request.actionDescription}
          </p>
        </div>

        {/* Detailed Argument Inspect */}
        {request.details && Object.keys(request.details).length > 0 && (
          <div className="text-[11px] text-slate-400 space-y-1">
            <span className="font-mono text-slate-500 uppercase tracking-wider block">Parameters:</span>
            <div className="p-2.5 rounded-lg bg-antiqora-950/60 border border-slate-800 font-mono text-slate-300 max-h-28 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{JSON.stringify(request.details, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Warning Note */}
        <div className="flex items-start gap-2 text-xs text-amber-400/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-900/40">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Antiqora AI will not execute this action without your explicit authorization.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-antiqora-850 hover:bg-antiqora-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white text-xs font-semibold shadow-glow-cyan transition-all"
          >
            <Check className="w-4 h-4" /> Allow
          </button>
        </div>
      </div>
    </div>
  );
};
