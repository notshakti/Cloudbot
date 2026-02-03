/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'Sora', 'sans-serif'],
      },
      colors: {
        primary: '#6366f1',
        secondary: '#a855f7',
        accent: '#06b6d4',
        dark: '#0f172a',
        'dark-card': '#1a1f3a',
      },
    },
  },
  plugins: [],
};
