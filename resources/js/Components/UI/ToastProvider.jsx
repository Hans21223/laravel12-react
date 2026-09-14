import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import Icon from '@/Components/Icon';

const ToastContext = createContext(null);

const TONES = {
    success: { ring: 'ring-emerald-500/30', text: 'text-emerald-400', icon: 'check' },
    error: { ring: 'ring-rose-500/30', text: 'text-rose-400', icon: 'alert' },
    info: { ring: 'ring-cyan-500/30', text: 'text-cyan-400', icon: 'activity' },
};

let toastSequence = 0;

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast ต้องอยู่ภายใน <ToastProvider>');
    }

    return context;
}

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    // เก็บ timer ไว้เคลียร์ตอน unmount กันการอัปเดต state หลังคอมโพเนนต์ถูกถอดออก
    const timers = useRef(new Map());

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));

        const timer = timers.current.get(id);

        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
    }, []);

    const push = useCallback(
        (message, type = 'success', duration = 4000) => {
            if (!message) {
                return null;
            }

            const id = ++toastSequence;

            setToasts((current) => [...current, { id, message, type }].slice(-4));

            timers.current.set(
                id,
                setTimeout(() => dismiss(id), duration),
            );

            return id;
        },
        [dismiss],
    );

    useEffect(() => {
        const pending = timers.current;

        return () => {
            pending.forEach(clearTimeout);
            pending.clear();
        };
    }, []);

    const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

    return (
        <ToastContext.Provider value={value}>
            {children}

            <div
                className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
                role="status"
                aria-live="polite"
            >
                {toasts.map((toast) => {
                    const tone = TONES[toast.type] ?? TONES.info;

                    return (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex w-full max-w-md animate-toast-in items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/95 px-4 py-3 shadow-xl shadow-black/40 ring-1 ${tone.ring} backdrop-blur`}
                        >
                            <Icon name={tone.icon} className={`mt-0.5 h-4 w-4 shrink-0 ${tone.text}`} />
                            <p className="flex-1 text-sm text-zinc-200">{toast.message}</p>
                            <button
                                type="button"
                                onClick={() => dismiss(toast.id)}
                                className="shrink-0 rounded p-0.5 text-zinc-500 transition hover:text-zinc-200"
                                aria-label="ปิดการแจ้งเตือน"
                            >
                                <Icon name="close" className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
