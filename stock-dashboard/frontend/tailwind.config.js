/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#121212',
        accent: '#333333',
        muted: '#888888',
      },
      fontSize: {
        'xs-mono': '0.65rem',
        'sm-mono': '0.75rem',
      }
    },
  },
  plugins: [],
}
