/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Safety orange from the editorial/operations visual system.
        primary: {
          50:  '#FFF4EA',
          100: '#FFE4CF',
          200: '#FFC99E',
          300: '#FDA669',
          400: '#F88935',
          500: '#EF6F19',
          600: '#D95B0F',
          700: '#B8490D',
          800: '#933B12',
          900: '#773313',
          950: '#401706',
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
        // Admin remains visually related but restricted by context.
        admin: {
          light:  '#FFE4CF',
          DEFAULT:'#EF6F19',
          dark:   '#B8490D',
          bg:     '#FFF4EA',
          border: '#FFC99E',
        },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['Archivo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
