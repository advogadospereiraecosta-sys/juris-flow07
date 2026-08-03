/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // === NEUTROS JURÍDICOS ===
        ink: {
          50: '#F7F7F8',
          100: '#EEEFF1',
          200: '#D6D8DC',
          300: '#B0B4BC',
          400: '#7A7F89',
          500: '#525762',
          600: '#363A42',
          700: '#252830',
          800: '#181B22',
          900: '#0E1014',
          950: '#070809',
        },
        // === PRIMÁRIA — "Vara" ===
        vara: {
          50: '#F0F4F9',
          100: '#DDE6F0',
          200: '#BFD0E2',
          300: '#94B0CC',
          400: '#6B8FB5',
          500: '#4D739E',
          600: '#3D5B82',
          700: '#334966',
          800: '#2E3F54',
          900: '#293547',
          950: '#1A2230',
        },
        // === ACENTO POSITIVO — "Procedência" ===
        procede: {
          50: '#F0FBF1',
          100: '#D8F4DB',
          200: '#B2E8B8',
          300: '#7FD48A',
          400: '#4DBA5E',
          500: '#2F9F44',
          600: '#218037',
          700: '#1B6630',
          800: '#185029',
          900: '#154223',
        },
        // === ALERTA — "Prazo Fatal" ===
        prazo: {
          50: '#FFF8E6',
          100: '#FFEEB3',
          200: '#FFDC73',
          300: '#FFC638',
          400: '#FFAE0A',
          500: '#E88A00',
          600: '#C66A00',
          700: '#A04F00',
          800: '#7F4000',
          900: '#5F3000',
        },
        // === ERRO — "Improcedência" ===
        improcede: {
          50: '#FEF2F2',
          100: '#FEE1E1',
          200: '#FFC6C6',
          300: '#FE9D9D',
          400: '#FB6565',
          500: '#E14040',
          600: '#C72A2A',
          700: '#A02020',
          800: '#841D1D',
          900: '#681A1A',
        },
        // === INFO ===
        ciente: {
          50: '#F0F6FB',
          100: '#DAE9F4',
          200: '#B9D2E6',
          300: '#88B0D2',
          400: '#5B8DB9',
          500: '#3F70A0',
          600: '#335A82',
          700: '#2D4968',
          800: '#283D55',
          900: '#223244',
        },
      },
      fontFamily: {
        sans: ['var(--vf-font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--vf-font-serif)', 'Georgia', 'serif'],
        mono: ['var(--vf-font-mono)', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.4)',
        md: '0 4px 12px rgb(0 0 0 / 0.5)',
        lg: '0 12px 32px rgb(0 0 0 / 0.6)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
