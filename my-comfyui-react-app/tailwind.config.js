/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-main': 'var(--bg-color-main)',
        'bg-panel': 'var(--bg-color-panel)',
        'text-main': 'var(--text-color-main)',
        'accent-primary': 'var(--accent-color-primary)',
        'accent-secondary': 'var(--accent-color-secondary)',
        'border-color': 'var(--border-color)',
      },
    },
  },
  plugins: [],
}
