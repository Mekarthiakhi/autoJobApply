/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#13141c', /* Darker navy background */
        'card-bg': '#1e1e2e', /* Solid card background */
        'neon-indigo': '#4f46e5',
        'neon-purple': '#9333ea',
        'neon-emerald': '#10b981',
        'neon-amber': '#f59e0b',
        'neon-cyan': '#06b6d4',
        'neon-rose': '#e11d48',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'glow-indigo': '0 0 12px rgba(99, 102, 241, 0.8)',
        'glow-purple': '0 0 12px rgba(168, 85, 247, 0.8)',
        'glow-emerald': '0 0 12px rgba(16, 185, 129, 0.8)',
        'glow-amber': '0 0 12px rgba(245, 158, 11, 0.8)',
        'glow-cyan': '0 0 12px rgba(6, 182, 212, 0.8)',
        'glow-rose': '0 0 12px rgba(244, 63, 94, 0.8)',
      }
    },
  },
  plugins: [],
}

