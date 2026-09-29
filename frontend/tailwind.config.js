/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary navy/indigo for headers and CTAs
        primary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        // Danger / phishing signals
        phish: {
          light:  '#FEE2E2',
          DEFAULT:'#EF4444',
          dark:   '#B91C1C',
          bg:     '#FEF2F2',
          border: '#FECACA',
        },
        // Safe / legitimate signals
        legit: {
          light:  '#CCFBF1',
          DEFAULT:'#14B8A6',
          dark:   '#0F766E',
          bg:     '#F0FDFA',
          border: '#99F6E4',
        },
        // Warnings / suspicious signals
        warn: {
          light:  '#FEF3C7',
          DEFAULT:'#F59E0B',
          dark:   '#B45309',
          bg:     '#FFFBEB',
          border: '#FDE68A',
        },
        // Admin accent (purple)
        admin: {
          light:  '#F3E8FF',
          DEFAULT:'#A855F7',
          dark:   '#7C3AED',
          bg:     '#FAF5FF',
          border: '#DDD6FE',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
