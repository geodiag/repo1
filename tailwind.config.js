/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bleu-france': '#000091',
        'bleu-france-hover': '#1212ff',
        'rouge-marianne': '#e1000f',
        'fond-gris': '#f6f6f6',
      },
      fontFamily: {
        sans: ['"Public Sans"', 'Arial', 'sans-serif'], 
      },
      boxShadow: {
        'dsfr': '0 2px 6px rgba(0, 0, 145, 0.16)',
      }
    },
  },
  plugins: [],
}