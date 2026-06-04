/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        secondary: {
          50: '#fef7e7',
          100: '#fcedc2',
          200: '#f9d889',
          300: '#f5bd46',
          400: '#f2a318',
          500: '#e6870b',
          600: '#c86507',
          700: '#a04509',
          800: '#84360f',
          900: '#702c10',
        },
        // Indian saree palette — deep Banarasi maroon, marigold, and zari gold.
        // Used across the auth screens and available app-wide.
        maroon: {
          50: '#fbf3f3',
          100: '#f6e1e1',
          200: '#edc2c4',
          300: '#df979b',
          400: '#cd6469',
          500: '#b94047',
          600: '#9c2f37',
          700: '#7d2128',
          800: '#5e1b21',
          900: '#4a1418',
        },
        marigold: {
          50: '#fff8eb',
          100: '#fdecc8',
          200: '#fbd789',
          300: '#f9bd4b',
          400: '#f7a31e',
          500: '#e6870b',
          600: '#c86507',
          700: '#a4480a',
          800: '#85380f',
          900: '#702f10',
        },
        zari: {
          DEFAULT: '#c9a227',
          light: '#e6c757',
          dark: '#9a7b13',
        },
      },
      screens: {
        'xs': '475px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // `standalone:` variant — applies only when the site is launched as an
    // installed PWA (display-mode: standalone). Used by the mobile bottom nav.
    function ({ addVariant }) {
      addVariant('standalone', '@media all and (display-mode: standalone)')
    },
  ],
}