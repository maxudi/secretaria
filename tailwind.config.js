/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        masonic: {
          navy: '#1a365d',
          deep: '#0B192C',
          gold: '#D4AF37',
          parchment: '#F9F8F6',
        },
      },
    },
  },
  plugins: [],
};

