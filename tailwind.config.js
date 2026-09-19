import forms from '@tailwindcss/forms';
import plugin from 'tailwindcss/plugin';

/** Anaheim Electronics design system. Colors resolve to CSS variables so light/dark themes switch without extra classes. */
/** @type {import('tailwindcss').Config} */
export default {
    content: ['./resources/views/**/*.blade.php', './resources/js/**/*.{js,jsx}'],
    darkMode: ['variant', '&:is([data-accord-theme="dark"] *)'],
    theme: {
        // Desktop-first breakpoints of the original layout; use max-md:, max-lg: … for narrower screens.
        screens: {
            xs: '601px',
            sm: '641px',
            md: '761px',
            lg: '1001px',
            xl: '1201px',
            '2xl': '1600px',
        },
        extend: {
            colors: {
                canvas: 'var(--bg)',
                surface: { DEFAULT: 'var(--surface)', alt: 'var(--surface-alt)' },
                ink: 'var(--ink)',
                muted: 'var(--muted)',
                line: 'var(--line)',
                brand: { DEFAULT: 'var(--green)', dark: 'var(--green-dark)', tint: 'var(--green-tint)' },
                signal: { DEFAULT: 'var(--signal)', hover: 'var(--signal-hover)' },
                navy: { 950: '#0e1a2c', 900: '#111f33', 850: '#16263e', 800: '#1d314d', 700: '#273750', 600: '#344a68' },
            },
            fontFamily: {
                sans: ['Segoe UI', 'Noto Sans Thai', 'Yu Gothic UI', 'Tahoma', 'sans-serif'],
                technical: ['Segoe UI', 'Noto Sans Thai', 'Yu Gothic UI', 'Tahoma', 'sans-serif'],
                mono: ['ui-monospace', 'Cascadia Code', 'Consolas', 'monospace'],
                code: ['ui-monospace', 'Consolas', 'monospace'],
            },
            boxShadow: { card: 'var(--shadow)' },
            keyframes: {
                enter: { from: { opacity: '0', transform: 'translateY(8px) scale(0.99)' }, to: { opacity: '1', transform: 'translateY(0) scale(1)' } },
                'drawing-in': { from: { opacity: '0', transform: 'translateX(8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
                pulse: { '50%': { opacity: '0.5' } },
            },
            animation: {
                enter: 'enter 0.2s ease-out',
                'drawing-in': 'drawing-in 0.65s ease-out both',
            },
        },
    },
    plugins: [
        forms,
        plugin(({ addVariant }) => {
            addVariant('compact', '[data-density="compact"] &');
            addVariant('motion-reduced', '[data-reduce-motion="true"] &');
        }),
    ],
};
