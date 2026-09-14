import { Link } from '@inertiajs/react';

import Icon from '@/Components/Icon';

export default function GuestLayout({ title, description, children }) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-10">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" aria-hidden="true" />

            <div className="relative w-full max-w-md">
                <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
                        <Icon name="shield" className="h-5 w-5 text-emerald-400" />
                    </span>
                    <span className="font-mono text-base font-bold tracking-[0.18em] text-zinc-100">A.E.G.I.S.</span>
                </Link>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur">
                    {title && (
                        <div className="mb-5">
                            <h1 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100">
                                {title}
                            </h1>
                            {description && <p className="mt-1.5 text-sm text-zinc-500">{description}</p>}
                        </div>
                    )}

                    {children}
                </div>

                <p className="mt-6 text-center font-mono text-[11px] text-zinc-600">
                    ระบบจำกัดสิทธิ์ · เข้าถึงได้เฉพาะผู้ได้รับอนุญาต
                </p>
            </div>
        </div>
    );
}
