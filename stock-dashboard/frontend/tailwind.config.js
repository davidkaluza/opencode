/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-background)',
        surface: 'var(--bg-surface)',
        accent: 'var(--clr-accent)',
        muted: 'var(--clr-muted)',
      },
      fontSize: {
        'xs-mono': '0.78rem',
        'sm-mono': '0.9rem',
        'title-mono': '1.125rem',
        'table-mono': '0.95rem',
      }
    },
  },
  plugins: [],
}
