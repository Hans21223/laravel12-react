import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.{js,jsx,ts,tsx}',
    ],

    theme: {
        extend: {
            fontFamily: {
                // ใช้ฟอนต์ของเครื่องผู้ใช้ทั้งหมด ไม่ต้องโหลดจากอินเทอร์เน็ต
                sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Noto Sans Thai', 'Tahoma', 'sans-serif'],
                mono: ['ui-monospace', 'Cascadia Mono', 'Consolas', 'Menlo', 'monospace'],
            },
            keyframes: {
                'scan-line': {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(1000%)' },
                },
                'grid-drift': {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '0 40px' },
                },
                'ping-slow': {
                    '0%': { transform: 'scale(1)', opacity: '0.6' },
                    '80%, 100%': { transform: 'scale(2.2)', opacity: '0' },
                },
                'toast-in': {
                    '0%': { transform: 'translateY(-8px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
            animation: {
                'scan-line': 'scan-line 4s linear infinite',
                'grid-drift': 'grid-drift 0.9s linear infinite',
                'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                'toast-in': 'toast-in 0.18s ease-out',
            },
        },
    },

    plugins: [forms],
};
