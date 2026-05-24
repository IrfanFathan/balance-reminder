/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#EAEAEA',
        surface: '#FFFFFF',
        fg: '#1C1C1E',
        muted: '#8E8E93',
        border: '#D1D1D6',
        accent: '#EF4434',
        success: '#10B981',
        whatsapp: '#25D366',
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
      },
    },
  },
  plugins: [],
}
