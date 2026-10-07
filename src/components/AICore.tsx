/**
 * Antiqora AI Animated Core
 * Dynamic visualization representing the 6 authentic application states:
 * IDLE | LISTENING | THINKING | PROCESSING | EXECUTING | ERROR
 */

import React from 'react';
import { CoreState } from '../types';
import { motion } from 'framer-motion';

interface AICoreProps {
  state: CoreState;
  size?: 'sm' | 'md' | 'lg';
}

export const AICore: React.FC<AICoreProps> = ({ state, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-44 h-44',
    lg: 'w-64 h-64',
  };

  // State-specific palette and aura
  const stateThemes: Record<
    CoreState,
    {
      primary: string;
      secondary: string;
      glow: string;
      label: string;
      pulseScale: number[];
      pulseDuration: number;
    }
  > = {
    IDLE: {
      primary: '#06b6d4',
      secondary: '#3b82f6',
      glow: 'rgba(6, 182, 212, 0.25)',
      label: 'READY',
      pulseScale: [1, 1.05, 1],
      pulseDuration: 4,
    },
    LISTENING: {
      primary: '#10b981',
      secondary: '#06b6d4',
      glow: 'rgba(16, 185, 129, 0.45)',
      label: 'LISTENING',
      pulseScale: [1, 1.15, 1],
      pulseDuration: 1.5,
    },
    THINKING: {
      primary: '#8b5cf6',
      secondary: '#3b82f6',
      glow: 'rgba(139, 92, 246, 0.4)',
      label: 'THINKING',
      pulseScale: [1, 1.08, 1],
      pulseDuration: 2.2,
    },
    PROCESSING: {
      primary: '#3b82f6',
      secondary: '#06b6d4',
      glow: 'rgba(59, 130, 246, 0.4)',
      label: 'PROCESSING',
      pulseScale: [1, 1.1, 1],
      pulseDuration: 1.8,
    },
    EXECUTING: {
      primary: '#f59e0b',
      secondary: '#ec4899',
      glow: 'rgba(245, 158, 11, 0.45)',
      label: 'EXECUTING',
      pulseScale: [1, 1.2, 1],
      pulseDuration: 1.2,
    },
    ERROR: {
      primary: '#f43f5e',
      secondary: '#e11d48',
      glow: 'rgba(244, 63, 94, 0.5)',
      label: 'ALERT',
      pulseScale: [1, 1.04, 1],
      pulseDuration: 0.8,
    },
  };

  const theme = stateThemes[state] || stateThemes.IDLE;

  return (
    <div className="relative flex flex-col items-center justify-center select-none" aria-label={`AI Core state: ${state}`}>
      {/* Outer Glow Halo */}
      <motion.div
        className={`absolute rounded-full filter blur-xl ${sizeMap[size]}`}
        style={{ backgroundColor: theme.glow }}
        animate={{
          scale: theme.pulseScale,
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: theme.pulseDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Futuristic SVG Ring Core */}
      <div className={`relative ${sizeMap[size]} flex items-center justify-center`}>
        {/* Outer Tech Orbit */}
        <motion.svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          animate={{ rotate: 360 }}
          transition={{
            duration: state === 'EXECUTING' ? 6 : state === 'THINKING' ? 10 : 25,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={theme.primary}
            strokeWidth="1"
            strokeDasharray="4 8"
            strokeOpacity="0.4"
          />
          <circle
            cx="50"
            cy="6"
            r="2.5"
            fill={theme.primary}
            className="filter drop-shadow-[0_0_4px_currentColor]"
          />
          <circle
            cx="94"
            cy="50"
            r="2"
            fill={theme.secondary}
          />
        </motion.svg>

        {/* Counter-rotating Middle Ring */}
        <motion.svg
          className="absolute inset-0 w-full h-full p-2"
          viewBox="0 0 100 100"
          animate={{ rotate: -360 }}
          transition={{
            duration: state === 'EXECUTING' ? 8 : state === 'PROCESSING' ? 12 : 30,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke={theme.secondary}
            strokeWidth="1.5"
            strokeDasharray="16 12 4 12"
            strokeOpacity="0.6"
          />
          <circle
            cx="50"
            cy="12"
            r="2"
            fill={theme.secondary}
          />
        </motion.svg>

        {/* Inner Reactor Sphere */}
        <motion.div
          className="relative w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-tr from-antiqora-900 via-antiqora-850 to-antiqora-800 border border-slate-700/60 shadow-glass"
          animate={{
            scale: theme.pulseScale,
          }}
          transition={{
            duration: theme.pulseDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Inner Light Core */}
          <div
            className="w-8 h-8 rounded-full filter blur-xs animate-pulse"
            style={{
              background: `radial-gradient(circle, #ffffff 10%, ${theme.primary} 70%, transparent 100%)`,
              boxShadow: `0 0 20px ${theme.primary}`,
            }}
          />

          {/* Hologram Grid Accent */}
          <div className="absolute inset-0 rounded-full border border-white/10 opacity-70" />
        </motion.div>
      </div>

      {/* Status Badge */}
      <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-antiqora-900/80 border border-slate-800 backdrop-blur-md">
        <span
          className="w-2 h-2 rounded-full animate-ping"
          style={{ backgroundColor: theme.primary }}
        />
        <span className="text-[11px] font-mono tracking-widest text-slate-300 font-semibold uppercase">
          {theme.label}
        </span>
      </div>
    </div>
  );
};
