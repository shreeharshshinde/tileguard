/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: {
            darkest: '#0b0f19',
            primary: '#0f172a',
            secondary: '#161e2e',
            tertiary: '#1e293b',
            surface: '#243044',
            hover: '#2d3d56',
          },
          border: '#2a364f',
          text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
            muted: '#64748b',
          },
          accent: {
            DEFAULT: '#3b82f6',
            hover: '#2563eb',
            glow: 'rgba(59, 130, 246, 0.25)',
          },
        },
      },
    },
  },
  plugins: [],
};
