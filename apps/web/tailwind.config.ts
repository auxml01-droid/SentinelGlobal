import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'risk-normal': '#22c55e',
        'risk-atencao': '#eab308',
        'risk-alerta': '#f97316',
        'risk-alto': '#ef4444',
        'risk-critico': '#a855f7',
        'risk-emergencia': '#000000',
        'sentinel': {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a2e',
          600: '#25253d',
          500: '#30304d',
          400: '#4a4a6a',
          300: '#6b6b8a',
          200: '#9393b0',
          100: '#c4c4d6',
          50: '#e8e8f0',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
