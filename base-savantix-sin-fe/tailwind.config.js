/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Savante - basada en #003153 (Prussian Blue)
        brand: {
          50:  '#e6ecf2',
          100: '#c0d0dd',
          200: '#96b0c5',
          300: '#6b8fac',
          400: '#4c789d',
          500: '#2e618e',
          600: '#1a4870',
          700: '#003153',  // PRINCIPAL - azul oficial Savante
          800: '#002844',
          900: '#001f35',
        },
      },
    },
  },
  plugins: [],
}
