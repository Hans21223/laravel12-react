import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

import ToastProvider from '@/Components/UI/ToastProvider';

const appName = 'Anaheim Electronics';

// รวมทุกหน้าไว้ล่วงหน้า รองรับทั้ง .jsx และ .tsx
const pages = import.meta.glob('./Pages/**/*.{jsx,tsx}');

createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),

    resolve: (name) => {
        const page = pages[`./Pages/${name}.jsx`] ?? pages[`./Pages/${name}.tsx`];

        if (!page) {
            throw new Error(
                `ไม่พบหน้า "${name}" — ตรวจสอบว่ามีไฟล์ resources/js/Pages/${name}.jsx หรือ .tsx อยู่จริง`,
            );
        }

        return page();
    },

    setup({ el, App, props }) {
        createRoot(el).render(
            <ToastProvider>
                <App {...props} />
            </ToastProvider>,
        );
    },

    progress: {
        color: '#c6424c',
        showSpinner: true,
    },
});
