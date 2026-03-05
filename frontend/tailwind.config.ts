import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0A0A0A',
          1: '#111111',
          2: '#1A1A1A',
          3: '#222222',
          4: '#2A2A2A',
        },
        accent: {
          DEFAULT: '#E05A13',
          hover: '#C84E0B',
          light: '#F2A15D',
          muted: '#8C340C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(224, 90, 19, 0.45)',
        'glow-sm': '0 0 10px -3px rgba(224, 90, 19, 0.34)',
      },
    },
  },
  plugins: [],
} satisfies Config
