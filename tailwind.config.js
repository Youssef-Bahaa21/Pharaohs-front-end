/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#121212',
        'primary-green': '#34D399', // Using a Tailwind emerald-400 as the base green
        'secondary': '#9CA3AF', // Using a Tailwind gray-400 as secondary text
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'slideInFromBottom': 'slideInFromBottom 0.5s ease-out forwards',
        'fadeIn': 'fadeIn 0.3s ease-in-out forwards',
      },
    },
  },
  plugins: [],
}