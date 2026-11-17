/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#123B2B',
          secondary: '#1C6547',
          accent: '#D7B96E',
          background: '#F8F7F2',
          surface: '#FFFFFF',
          text: '#202B24',
          muted: '#7A847D',
          border: '#E8E7DF',
          soft: '#F1EFE6',
          danger: '#B4472F',
          warning: '#C98A2B',
          info: '#2F6E8E',
          success: '#1C6547',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(18,59,43,0.04), 0 8px 24px -12px rgba(18,59,43,0.12)',
        lift: '0 18px 40px -24px rgba(18,59,43,0.35)',
        card: '0 1px 0 rgba(18,59,43,0.04), 0 12px 32px -20px rgba(18,59,43,0.25)',
      },
      borderRadius: {
        xl2: '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: '600px 0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
