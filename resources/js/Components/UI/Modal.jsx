import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { Fragment } from 'react';

import Icon from '@/Components/Icon';

const WIDTHS = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
};

export default function Modal({
    show = false,
    onClose,
    title,
    description,
    icon,
    accent = 'text-emerald-400',
    maxWidth = 'lg',
    closeable = true,
    children,
}) {
    const handleClose = () => {
        if (closeable) {
            onClose?.();
        }
    };

    return (
        <Transition show={show} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 translate-y-3 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-3 sm:scale-95"
                        >
                            <DialogPanel
                                className={`w-full ${WIDTHS[maxWidth] ?? WIDTHS.lg} overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50`}
                            >
                                <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
                                    <div className="flex min-w-0 items-start gap-3">
                                        {icon && <Icon name={icon} className={`mt-0.5 h-5 w-5 shrink-0 ${accent}`} />}
                                        <div className="min-w-0">
                                            <DialogTitle className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-zinc-100">
                                                {title}
                                            </DialogTitle>
                                            {description && (
                                                <p className="mt-1 text-xs text-zinc-500">{description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {closeable && (
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                                            aria-label="ปิดหน้าต่าง"
                                        >
                                            <Icon name="close" className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="px-5 py-4">{children}</div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
