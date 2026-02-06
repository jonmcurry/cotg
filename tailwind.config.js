/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Century of the Game - Modern Vintage palette
        charcoal: {
          DEFAULT: '#121212',
          light: '#2C2C2C',
          dark: '#0A0A0A',
        },
        burgundy: {
          DEFAULT: '#800020',
          light: '#9A1535',
          dark: '#5C0017',
        },
        gold: {
          DEFAULT: '#C5A059',
          light: '#D4B87A',
          dark: '#A88539',
        },
        cream: {
          DEFAULT: '#F5F5F0',
          light: '#FAFAF7',
          dark: '#E8E5D3',
        },
        leather: {
          DEFAULT: '#8B4513',
          light: '#A0522D',
          dark: '#6B3410',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        serif: ['Crimson Text', 'serif'],
        sans: ['Source Sans 3', 'sans-serif'],
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'soft': '0 2px 20px -4px rgba(0, 0, 0, 0.06)',
        'lift': '0 8px 30px -6px rgba(0, 0, 0, 0.12)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        slideUp: 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
