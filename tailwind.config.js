/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fire: '#e55353',
        police: '#2b3a7b',
        health: '#63936e',
        headerBg: '#fdf49b'
      }
    },
  },
  plugins: [],
}