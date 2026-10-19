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
          // Bare `bg-primary` / `text-primary` resolve to this. Without a
          // DEFAULT those classes generate no CSS at all — which is how the
          // Add to Cart button once shipped white-on-white.
          // Brand plum #520160. The 50–500 tints mix it with white, 700–900
          // with black, so hover/tint classes stay in the same family.
          DEFAULT: '#520160',
          50: '#f6f2f7',
          100: '#eee6f0',
          200: '#d4c0d7',
          300: '#b18db7',
          400: '#8f5a98',
          500: '#6c2778',
          600: '#520160',
          700: '#42014d',
          800: '#35013e',
          900: '#290130',
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