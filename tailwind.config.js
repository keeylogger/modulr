/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        ink: {
          900: '#08090c',
          800: '#0c0e13',
          700: '#111319',
          600: '#161922',
          500: '#1c2030',
        },
        slate: {
          panel: '#13151c',
          line: '#23262f',
        },
        // Per-zone accents
        layout: '#3b82f6', // electric blue
        svg: '#a855f7', // neon purple
        lighting: '#2dd4bf', // emerald cyan
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 40px -12px rgba(0,0,0,0.6)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'flash-line': {
          '0%': { backgroundColor: 'rgba(168,85,247,0.0)' },
          '20%': { backgroundColor: 'rgba(168,85,247,0.28)' },
          '100%': { backgroundColor: 'rgba(168,85,247,0.0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease both',
        'scale-in': 'scale-in 0.28s cubic-bezier(0.16,1,0.3,1) both',
        'flash-line': 'flash-line 1s ease both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
