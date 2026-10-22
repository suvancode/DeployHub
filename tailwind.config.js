/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        devtoys: {
          main: '#1F2023',
          sidebar: '#191A1D',
          content: '#232428',
          card: '#2D2E33',
          cardHover: '#383A40',
          border: '#414249',
          primary: '#F2F2F3',
          secondary: '#B7B8C0',
          muted: '#858792',
          accent: '#55B8E8',
          accentHover: '#42a8da',
          success: '#3CCB9A',
          warning: '#E9B65C',
          error: '#EF6B73',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'monospace'],
        sans: ['Segoe UI Variable', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xs': '3px',
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '6px',
        'lg': '8px',
        'xl': '10px',
      },
      fontSize: {
        '2xs': ['11px', '14px'],
        'xs': ['12px', '16px'],
        'sm': ['13px', '18px'],
        'base': ['14px', '20px'],
        'lg': ['16px', '22px'],
        'xl': ['18px', '24px'],
      }
    },
  },
  plugins: [],
}
