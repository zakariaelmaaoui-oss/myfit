/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: { 950: '#03040a', 900: '#060914', 800: '#0a0f1f', 700: '#10172c', 600: '#18213b' },
        neon: { blue: '#38bdf8', cyan: '#5eead4', violet: '#8b5cf6', purple: '#a855f7', pink: '#e879f9' },
        rank: { e: '#94a3b8', d: '#34d399', c: '#38bdf8', b: '#8b5cf6', a: '#f59e0b', s: '#f43f5e' },
      },
      fontFamily: {
        display: ['Orbitron', 'Rajdhani', 'system-ui', 'sans-serif'],
        ui: ['Rajdhani', 'Inter', '"Noto Sans Arabic"', 'system-ui', 'sans-serif'],
        body: ['Inter', '"Noto Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(56,189,248,.35), 0 0 24px rgba(56,189,248,.25), inset 0 0 24px rgba(56,189,248,.06)',
        'glow-violet': '0 0 0 1px rgba(139,92,246,.45), 0 0 28px rgba(139,92,246,.3), inset 0 0 24px rgba(139,92,246,.08)',
      },
      keyframes: {
        shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(200%)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        flicker: { '0%,19%,21%,23%,80%,100%': { opacity: '1' }, '20%,22%': { opacity: '.4' }, '81%': { opacity: '.7' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '60%': { transform: 'scale(1.08)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        spinslow: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        shimmer: 'shimmer 2.4s linear infinite', floaty: 'floaty 4s ease-in-out infinite', scan: 'scan 6s linear infinite',
        flicker: 'flicker 4s linear infinite', pop: 'pop .6s cubic-bezier(.2,.9,.3,1.3) both', rise: 'rise .5s ease both', spinslow: 'spinslow 18s linear infinite',
      },
    },
  },
  plugins: [],
};
