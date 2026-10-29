import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* --- новая дизайн-система ЛВС --- */
        bg: '#0A0A0A',
        surface: '#141416',
        'surface-hover': '#1C1C1F',
        primary: '#A8FF35',
        premium: '#D4AF37',
        danger: '#FF453A',
        muted: '#8E8E93',
        /* --- обратная совместимость с лендингом --- */
        ink: '#0A0A0A',
        raised: '#141416',
        neon: '#A8FF35',
        ok: '#A8FF35',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '4xl': '32px',
      },
      boxShadow: {
        glow: '0 0 60px -12px rgba(168, 255, 53, 0.45)',
        'glow-soft': '0 0 40px -16px rgba(168, 255, 53, 0.35)',
        'glow-strong': '0 0 48px -10px rgba(168, 255, 53, 0.6)',
        panel: '0 40px 100px -40px rgba(0, 0, 0, 0.9)',
      },
      opacity: {
        12: '0.12',
        15: '0.15',
        18: '0.18',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'check-draw': {
          from: { strokeDashoffset: '24' },
          to: { strokeDashoffset: '0' },
        },
        'spark-pop': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.3)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'check-draw': 'check-draw 0.4s ease-out forwards',
        spark: 'spark-pop 0.6s ease-out both',
        shimmer: 'shimmer 1.8s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
