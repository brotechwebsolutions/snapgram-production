/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        instagram: {
          purple: '#833AB4',
          pink:   '#C13584',
          red:    '#E1306C',
          orange: '#FD1D1D',
          yellow: '#FCAF45',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease-in-out',
        'slide-up':     'slideUp 0.3s ease-out',
        'slide-down':   'slideDown 0.3s ease-out',
        'scale-in':     'scaleIn 0.2s ease-out',
        'shimmer':      'shimmer 1.5s infinite',
        'bounce-once':  'bounceOnce 0.4s ease-out',
        'spin-slow':    'spin 3s linear infinite',
        'story-progress': 'storyProgress linear forwards',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { transform: 'translateY(10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        scaleIn:   { from: { transform: 'scale(0.95)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        bounceOnce:{ '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.3)' } },
        storyProgress: { from: { width: '0%' }, to: { width: '100%' } },
      },
      backgroundImage: {
        'instagram-gradient': 'linear-gradient(135deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D)',
        'instagram-gradient-45': 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
}
