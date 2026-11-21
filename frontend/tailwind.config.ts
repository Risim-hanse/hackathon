import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        paper: '#f8fafc',
        alert: '#b91c1c',
        caution: '#b45309',
        safe: '#047857',
        focus: '#1d4ed8',
      },
      fontSize: {
        base: ['18px', { lineHeight: '1.6' }],
        lg: ['20px', { lineHeight: '1.6' }],
        xl: ['24px', { lineHeight: '1.4' }],
        '2xl': ['30px', { lineHeight: '1.3' }],
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      },
    },
  },
  plugins: [],
} satisfies Config
