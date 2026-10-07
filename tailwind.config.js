/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        antiqora: {
          950: '#07090e',
          900: '#0b0f19',
          850: '#111726',
          800: '#161f33',
          700: '#222f4c',
          600: '#32456e',
          accent: {
            blue: '#3b82f6',
            cyan: '#06b6d4',
            purple: '#8b5cf6',
            emerald: '#10b981',
            amber: '#f59e0b',
            rose: '#f43f5e',
          },
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-blue': '0 0 30px -5px rgba(59, 130, 246, 0.35)',
        'glow-purple': '0 0 30px -5px rgba(139, 92, 246, 0.35)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
        'spin-reverse-slow': 'spin-reverse 15s linear infinite',
      },
      keyframes: {
        'spin-reverse': {
          to: {
            transform: 'rotate(-360deg)',
          },
        },
      },
    },
  },
  plugins: [],
};
