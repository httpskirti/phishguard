/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060A12',
          900: '#0B1220',
          850: '#0E1729',
          800: '#131F37',
          700: '#1D2E50',
          600: '#2A416E',
          500: '#3D5B96',
        },
        phish: {
          light: '#FCA5A5',
          DEFAULT: '#EF4444',
          dark: '#B91C1C',
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.35)',
        },
        legit: {
          light: '#5EEAD4',
          DEFAULT: '#14B8A6',
          dark: '#0F766E',
          bg: 'rgba(20, 184, 166, 0.12)',
          border: 'rgba(20, 184, 166, 0.35)',
        },
        warn: {
          light: '#FDE68A',
          DEFAULT: '#F59E0B',
          dark: '#B45309',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.35)',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
