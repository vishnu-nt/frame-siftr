/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cursor-bg': '#090b10',          // Obsidian deep black
        'cursor-sidebar': '#0f121d',     // Obsidian slate dark sidebar
        'cursor-border': '#1e2436',      // Glass border dark blue/grey
        'cursor-text': '#f8fafc',        // Bright slate text
        'cursor-text-secondary': '#94a3b8', // Slate-400
        'cursor-accent': '#6366f1',      // Neon Indigo
        'cursor-hover': '#1e293b',       // Slate-800 hover
        'cursor-active': '#312e81',      // Indigo active
      },
      fontFamily: {
        'sans': ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        'mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

