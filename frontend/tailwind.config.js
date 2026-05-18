/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#006193",
        "primary-container": "#007bb9",
        "on-primary": "#ffffff",
        "secondary": "#42617c",
        "secondary-container": "#bddefd",
        "on-secondary": "#ffffff",
        "background": "#f9f9f9",
        "on-background": "#1a1c1c",
        "surface": "#f9f9f9",
        "on-surface": "#1a1c1c",
        "surface-variant": "#e2e2e2",
        "outline": "#6f7881",
        "error": "#ba1a1a",
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
      },
      borderRadius: {
        'lg': '1rem',
        'xl': '1.25rem',
      }
    },
  },
  plugins: [],
}
