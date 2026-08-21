import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'rgb(var(--surface-0-rgb) / <alpha-value>)',
          1: 'rgb(var(--surface-1-rgb) / <alpha-value>)',
          2: 'rgb(var(--surface-2-rgb) / <alpha-value>)',
          3: 'rgb(var(--surface-3-rgb) / <alpha-value>)',
          4: 'rgb(var(--surface-4-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover-rgb) / <alpha-value>)',
          light: 'rgb(var(--accent-light-rgb) / <alpha-value>)',
          muted: 'rgb(var(--accent-muted-rgb) / <alpha-value>)',
        },
        quantum: {
          DEFAULT: 'rgb(var(--quantum-rgb) / <alpha-value>)',
          light: 'rgb(var(--quantum-light-rgb) / <alpha-value>)',
          dark: 'rgb(var(--quantum-dark-rgb) / <alpha-value>)',
          muted: 'rgb(var(--quantum-muted-rgb) / <alpha-value>)',
        },
        'on-quantum': 'rgb(var(--on-quantum-rgb) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
          muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        },
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        merge: 'rgb(var(--merge-rgb) / <alpha-value>)',
        neutral: {
          200: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
          300: 'rgb(var(--text-primary-soft-rgb) / <alpha-value>)',
          400: 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
          500: 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
          600: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
          700: 'rgb(var(--text-disabled-rgb) / <alpha-value>)',
          800: 'rgb(var(--neutral-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--surface-0-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        // Backwards-compatible display alias while legacy `font-serif` classes migrate.
        serif: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        symbol: ['Gambito Chess Symbols', 'Segoe UI Symbol', 'sans-serif'],
      },
      fontSize: {
        'ui-xs': 'var(--text-ui-xs)',
        'ui-sm': 'var(--text-ui-sm)',
        'ui-base': 'var(--text-ui-base)',
        'ui-lg': 'var(--text-ui-lg)',
      },
      boxShadow: {
        subtle: '0 1px 3px rgb(0 0 0 / 0.18)',
        card: '0 6px 8px -6px rgb(0 0 0 / 0.32)',
        board: '0 12px 32px -16px rgb(0 0 0 / 0.68)',
      },
    },
  },
  plugins: [],
} satisfies Config
