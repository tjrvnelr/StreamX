/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)', surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)', lifted: 'rgb(var(--lifted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)', ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)', dim: 'rgb(var(--dim) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)', 'brand-dark': 'rgb(var(--brand-dark) / <alpha-value>)', 'brand-foreground': 'rgb(var(--brand-foreground) / <alpha-value>)', blue: 'rgb(var(--blue) / <alpha-value>)', mint: 'rgb(var(--mint) / <alpha-value>)',
      },
      boxShadow: {
        soft: '9px 9px 18px var(--shadow-dark), -7px -7px 16px var(--shadow-light)',
        'soft-sm': '5px 5px 12px var(--shadow-dark), -4px -4px 10px var(--shadow-light)',
        'soft-lg': '14px 14px 28px var(--shadow-dark), -10px -10px 24px var(--shadow-light)',
        inset: 'inset 5px 5px 10px var(--shadow-dark), inset -4px -4px 9px var(--shadow-light)',
        'inset-sm': 'inset 3px 3px 7px var(--shadow-dark), inset -3px -3px 7px var(--shadow-light)',
        accent: '0 8px 26px rgb(var(--brand) / 0.2)',
      },
      fontFamily: { sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], display: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      borderRadius: { '4xl': '2rem' },
      keyframes: { 'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } } },
      animation: { 'fade-up': 'fade-up 320ms ease-out both' },
    },
  },
  plugins: [],
}
