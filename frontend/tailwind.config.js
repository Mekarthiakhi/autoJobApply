/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Neumorphism Base Palette */
        'neumo-bg': '#0A0D14',      /* Deep space black background */
        'neumo-surface': '#111827', /* Card surface */
        'neumo-border': '#1E2A3A',  /* Subtle blue-dark border */
        'neumo-light': '#1A2332',   /* Light raised surface */
        'neumo-highlight': '#242E3F', /* Highlight for depth */
        
        /* Accent Colors */
        'accent-primary': '#4F8EF7',   /* Electric blue */
        'accent-success': '#10B981',   /* Mint green */
        'accent-warning': '#F59E0B',   /* Amber */
        'accent-error': '#EF4444',     /* Red */
        'accent-info': '#3B82F6',      /* Info blue */
        
        /* Legacy colors for compatibility */
        'space-dark': '#0A0D14',
        'card-bg': '#111827',
        'neon-indigo': '#4F8EF7',
        'neon-purple': '#9333ea',
        'neon-emerald': '#10B981',
        'neon-amber': '#F59E0B',
        'neon-cyan': '#06b6d4',
        'neon-rose': '#e11d48',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        /* Neumorphism Shadows */
        'neumo-light': '5px 5px 12px rgba(0, 0, 0, 0.3), -5px -5px 12px rgba(255, 255, 255, 0.05)',
        'neumo-inset': 'inset 5px 5px 12px rgba(0, 0, 0, 0.3), inset -5px -5px 12px rgba(255, 255, 255, 0.05)',
        'neumo-down': '8px 8px 16px rgba(0, 0, 0, 0.4), 2px 2px 4px rgba(0, 0, 0, 0.2)',
        'neumo-up': 'inset 2px 2px 4px rgba(255, 255, 255, 0.1), inset -2px -2px 4px rgba(0, 0, 0, 0.3)',
        
        /* Glow effects */
        'glow-blue': '0 0 20px rgba(79, 142, 247, 0.4)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-indigo': '0 0 12px rgba(99, 102, 241, 0.8)',
        'glow-purple': '0 0 12px rgba(168, 85, 247, 0.8)',
        'glow-emerald': '0 0 12px rgba(16, 185, 129, 0.8)',
        'glow-cyan': '0 0 12px rgba(6, 182, 212, 0.8)',
        'glow-rose': '0 0 12px rgba(244, 63, 94, 0.8)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}

