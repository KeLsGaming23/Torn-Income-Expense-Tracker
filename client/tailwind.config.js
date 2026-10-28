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
        torn: {
          dark: '#0a0d14',
          card: '#111827',
          cardHover: '#172033',
          border: '#1f293d',
          accent: '#10b981', // emerald
          accentHover: '#059669',
          danger: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
          muted: '#94a3b8'
        }
      }
    },
  },
  plugins: [],
}
