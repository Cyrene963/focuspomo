import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFFDF8',
          100: '#FDF6EC',
          200: '#F5EDE3',
          300: '#EDE3D6',
        },
        coral: {
          400: '#F28076',
          500: '#F06858',
          600: '#E04E3E',
        },
        brown: {
          700: '#5A4538',
          800: '#4A3728',
          900: '#3A2A1C',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'San Francisco',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        'pill': '9999px',
        'card': '16px',
        'tag': '12px',
      },
      animation: {
        'tomato-drop': 'tomatoDrop 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'tomato-bounce': 'tomatoBounce 0.6s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        tomatoDrop: {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '0' },
          '60%': { transform: 'translateY(0) rotate(180deg)', opacity: '1' },
          '75%': { transform: 'translateY(-20px) rotate(200deg)', opacity: '1' },
          '90%': { transform: 'translateY(5px) rotate(210deg)', opacity: '1' },
          '100%': { transform: 'translateY(0) rotate(220deg)', opacity: '1' },
        },
        tomatoBounce: {
          '0%': { transform: 'scale(0) rotate(-10deg)' },
          '50%': { transform: 'scale(1.1) rotate(5deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
