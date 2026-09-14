import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import Icon from '@/Components/Icon';
import { useToast } from '@/Components/UI/ToastProvider';

const NAV_LINKS = [
    { label: 'ศูนย์บัญชาการ', short: 'COMMAND', href: '/drone-system', icon: 'radar' },
    { label: 'ฐานข้อมูลฝูงบิน', short: 'FLEET_DB', href: '/fleet', icon: 'database' },
    { label: 'ประตูอัจฉริยะ', short: 'SMART_DOOR', href: '/smart-door', icon: 'door' },
    { label: 'Mini RTS', short: 'MINI_RTS', href: '/mini-rts', icon: 'sword' },
];

export default function AppLayout({ title, subtitle, actions, children }) {
    const { auth, flash } = usePage().props;
    const { url } = usePage();
    const toast = useToast();

    const [menuOpen, setMenuOpen] = useState(false);

    // แสดงข้อความจากเซิร์ฟเวอร์เป็น Toast (ตั้งค่าใน HandleInertiaRequests)
    useEffect(() => {
        if (flash?.message) {
            toast.push(flash.message, flash.type ?? 'success');
        }
    }, [flash, toast]);

    // ปิดเมนูมือถือทุกครั้งที่เปลี่ยนหน้า
    useEffect(() => {
        const stop = router.on('navigate', () => setMenuOpen(false));

        return stop;
    }, []);

    const isActive = (href) => url === href || url.startsWith(`${href}?`);

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* พื้นหลังกริดจางๆ ให้ความรู้สึกเป็นจอเรดาร์ */}
            <div className="pointer-events-none fixed inset-0 bg-grid opacity-40" aria-hidden="true" />

            <div className="relative">
                <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
                    <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
                        <Link
                            href="/"
                            className="flex items-center gap-2.5 rounded-lg px-1 py-1 transition hover:opacity-80"
                        >
                            <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/30">
                                <Icon name="shield" className="h-4 w-4 text-emerald-400" />
                            </span>
                            <span className="font-mono text-sm font-bold tracking-[0.16em] text-zinc-100">
                                A.E.G.I.S.
                            </span>
                        </Link>

                        <nav className="ml-4 hidden items-center gap-1 lg:flex">
                            {NAV_LINKS.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs tracking-wide transition ${
                                        isActive(link.href)
                                            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/30'
                                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                                    }`}
                                >
                                    <Icon name={link.icon} className="h-4 w-4" />
                                    {link.short}
                                </Link>
                            ))}
                        </nav>

                        <div className="ml-auto flex items-center gap-2">
                            <span className="hidden items-center gap-2 rounded-lg px-2.5 py-1 font-mono text-[11px] text-emerald-400 ring-1 ring-inset ring-emerald-500/30 sm:inline-flex">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                </span>
                                UPLINK
                            </span>

                            {auth?.user ? (
                                <div className="hidden items-center gap-2 sm:flex">
                                    <Link
                                        href="/profile"
                                        className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100"
                                    >
                                        <Icon name="user" className="h-4 w-4" />
                                        <span className="max-w-[10rem] truncate">{auth.user.name}</span>
                                    </Link>
                                    <Link
                                        href="/logout"
                                        method="post"
                                        as="button"
                                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-900 hover:text-rose-400"
                                        aria-label="ออกจากระบบ"
                                    >
                                        <Icon name="logout" className="h-4 w-4" />
                                    </Link>
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    className="hidden rounded-lg px-3 py-1.5 font-mono text-xs text-zinc-300 ring-1 ring-inset ring-zinc-800 transition hover:bg-zinc-900 hover:text-zinc-100 sm:inline-flex"
                                >
                                    เข้าสู่ระบบ
                                </Link>
                            )}

                            <button
                                type="button"
                                onClick={() => setMenuOpen((open) => !open)}
                                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 lg:hidden"
                                aria-expanded={menuOpen}
                                aria-label="สลับเมนู"
                            >
                                <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {menuOpen && (
                        <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 lg:hidden">
                            <nav className="flex flex-col gap-1">
                                {NAV_LINKS.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                                            isActive(link.href)
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                                        }`}
                                    >
                                        <Icon name={link.icon} className="h-4 w-4" />
                                        {link.label}
                                    </Link>
                                ))}

                                <div className="mt-2 border-t border-zinc-800 pt-2">
                                    {auth?.user ? (
                                        <>
                                            <Link
                                                href="/profile"
                                                className="inline-flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                                            >
                                                <Icon name="user" className="h-4 w-4" />
                                                {auth.user.name}
                                            </Link>
                                            <Link
                                                href="/logout"
                                                method="post"
                                                as="button"
                                                className="inline-flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-900 hover:text-rose-400"
                                            >
                                                <Icon name="logout" className="h-4 w-4" />
                                                ออกจากระบบ
                                            </Link>
                                        </>
                                    ) : (
                                        <Link
                                            href="/login"
                                            className="inline-flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                                        >
                                            <Icon name="user" className="h-4 w-4" />
                                            เข้าสู่ระบบ
                                        </Link>
                                    )}
                                </div>
                            </nav>
                        </div>
                    )}
                </header>

                <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
                    {(title || actions) && (
                        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                            <div>
                                {title && (
                                    <h1 className="font-mono text-lg font-semibold tracking-[0.1em] text-zinc-100">
                                        {title}
                                    </h1>
                                )}
                                {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
                            </div>
                            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                        </div>
                    )}

                    {children}
                </main>

                <footer className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-6">
                    <p className="border-t border-zinc-900 pt-4 font-mono text-[11px] text-zinc-600">
                        A.E.G.I.S. — UAV FLEET MANAGEMENT · Laravel + Inertia + React
                    </p>
                </footer>
            </div>
        </div>
    );
}
