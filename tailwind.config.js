/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        arena: {
          dark: '#08090C',
          card: '#111318',
          border: '#1f242e',
          red: '#E50914',
          redHover: '#B20710',
          redGlow: '#FF1E27',
          gold: '#E5B842',
          goldLight: '#F7D479',
          silver: '#C0C0C0',
          silverLight: '#E8E8E8',
          blue: '#1E6BFF',
          green: '#00E676',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'red-glow': '0 0 25px rgba(229, 9, 20, 0.45)',
        'gold-glow': '0 0 25px rgba(229, 184, 66, 0.45)',
        'blue-glow': '0 0 25px rgba(30, 107, 255, 0.45)',
        'green-glow': '0 0 25px rgba(0, 230, 118, 0.45)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

