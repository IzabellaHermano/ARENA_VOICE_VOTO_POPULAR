/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        arena: {
          black: '#050810',
          navy: '#081422',
          dark: '#050810',
          card: '#0B1526',
          cardHover: '#101E36',
          border: '#16253D',
          borderLight: '#22385C',
          red: '#F20524',
          redHover: '#D1041F',
          redGlow: '#FF1E27',
          blue: '#00B8F5',
          blueHover: '#009FD4',
          green: '#00E676',
          yellow: '#FFC400',
          gold: '#FFC400',
          goldLight: '#FFE082',
          silver: '#C0C0C0',
          silverLight: '#E8E8E8',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        handwriting: ['Caveat', 'cursive', 'sans-serif'],
      },
      boxShadow: {
        'red-glow': '0 0 25px rgba(242, 5, 36, 0.45)',
        'red-glow-lg': '0 0 35px rgba(242, 5, 36, 0.65)',
        'blue-glow': '0 0 25px rgba(0, 184, 245, 0.45)',
        'green-glow': '0 0 25px rgba(0, 230, 118, 0.55)',
        'yellow-glow': '0 0 25px rgba(255, 196, 0, 0.45)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
};
