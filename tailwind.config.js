/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Century of the Game color palette
        charcoal: {
          DEFAULT: '#2C2C2C',
          light: '#3A3A3A',
          dark: '#1F1F1F',
        },
        burgundy: {
          DEFAULT: '#8B2635',
          light: '#A53646',
          dark: '#6B1D28',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E8C857',
          dark: '#B89020',
        },
        cream: {
          DEFAULT: '#F5F3E8',
          light: '#FDFCF5',
          dark: '#E8E5D3',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        serif: ['Crimson Text', 'serif'],
        sans: ['Source Sans 3', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
