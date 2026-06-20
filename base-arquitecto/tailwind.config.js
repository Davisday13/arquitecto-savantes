/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e8edf0',
          100: '#c5d1da',
          200: '#9eb2c0',
          300: '#7793a6',
          400: '#5a7b93',
          500: '#3d6380',
          600: '#2a4d66',
          700: '#1a3a4a',
          800: '#152e3c',
          900: '#0f222e',
        },
      },
    },
  },
  plugins: [],
}
