/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b0ff',
          500: '#338ffc',
          600: '#1d70f1',
          700: '#1559de',
          800: '#1848b4',
          900: '#1a408d',
          950: '#152956',
        },
      },
    },
  },
  plugins: [],
}
