import { Head, Link, usePage } from '@inertiajs/react';

import Icon from '@/Components/Icon';
import Button from '@/Components/UI/Button';

const MODULES = [
    {
        href: '/drone-system',
        icon: 'radar',
        accent: 'text-emerald-400 ring-emerald-500/30 bg-emerald-500/10',
        title: 'ศูนย์บัญชาการ',
        code: 'COMMAND_CENTER',
        description: 'ติดตามอากาศยานแบบเรียลไทม์ สั่งขึ้นบิน–ลงจอด และบันทึกค่า telemetry ลงฐานข้อมูลอัตโนมัติ',
    },
    {
        href: '/fleet',
        icon: 'database',
        accent: 'text-cyan-400 ring-cyan-500/30 bg-cyan-500/10',
        title: 'ฐานข้อมูลฝูงบิน',
        code: 'FLEET_DATABASE',
        description: 'ค้นหา กรอง เรียงลำดับ และจัดการข้อมูลอากาศยานทั้งหมด พร้อมกราฟสรุปภาพรวม',
    },
    {
        href: '/smart-door',
        icon: 'door',
        accent: 'text-amber-400 ring-amber-500/30 bg-amber-500/10',
        title: 'ประตูอัจฉริยะ',
        code: 'SMART_DOOR',
        description: 'ระบบล็อกด้วยรหัส PIN เซ็นเซอร์ตรวจจับการเคลื่อนไหว และบันทึกเหตุการณ์ความปลอดภัย',
    },
    {
        href: '/mini-rts',
        icon: 'sword',
        accent: 'text-rose-400 ring-rose-500/30 bg-rose-500/10',
        title: 'Mini RTS',
        code: 'BASE_BUILDER',
        description: 'เกมจำลองการจัดการทรัพยากร สร้างกองทัพ อัปเกรดฐาน และส่งกองทัพออกโจมตี',
    },
];

const STACK = ['Laravel 12', 'Inertia.js', 'React 18', 'Tailwind CSS', 'SQLite'];

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <div className="relative min-h-screen overflow-hidden bg-zinc-950">
            <Head title="ยินดีต้อนรับ" />

            <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" aria-hidden="true" />
            <div
                className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]"
                aria-hidden="true"
            />

            <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">
                <header className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/30">
                            <Icon name="shield" className="h-4 w-4 text-emerald-400" />
                        </span>
                        <span className="font-mono text-sm font-bold tracking-[0.18em] text-zinc-100">A.E.G.I.S.</span>
                    </div>

                    <nav className="flex items-center gap-2">
                        {auth?.user ? (
                            <Button href="/dashboard" variant="outline" size="sm" icon="gauge">
                                แดชบอร์ด
                            </Button>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:text-zinc-100"
                                >
                                    เข้าสู่ระบบ
                                </Link>
                                <Button href="/register" size="sm">
                                    สมัครสมาชิก
                                </Button>
                            </>
                        )}
                    </nav>
                </header>

                <section className="py-16 text-center sm:py-24">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-[11px] tracking-[0.14em] text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </span>
                        SYSTEM ONLINE
                    </span>

                    <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-50 sm:text-6xl">
                        ระบบจัดการฝูงโดรน
                        <span className="mt-2 block bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                            A.E.G.I.S. Platform
                        </span>
                    </h1>

                    <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-400">
                        เว็บแอปพลิเคชันแบบ Single Page Application ที่รวมศูนย์บัญชาการอากาศยาน ฐานข้อมูลฝูงบิน
                        และระบบจำลองการทำงานไว้ในที่เดียว
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <Button href="/drone-system" size="lg" icon="radar">
                            เข้าสู่ศูนย์บัญชาการ
                        </Button>
                        <Button href="/fleet" size="lg" variant="outline" icon="database">
                            ดูฐานข้อมูลฝูงบิน
                        </Button>
                    </div>

                    <ul className="mt-10 flex flex-wrap items-center justify-center gap-2">
                        {STACK.map((item) => (
                            <li
                                key={item}
                                className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 font-mono text-[11px] text-zinc-400"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="grid gap-4 pb-16 sm:grid-cols-2">
                    {MODULES.map((module) => (
                        <Link
                            key={module.href}
                            href={module.href}
                            className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900"
                        >
                            <div className="flex items-start gap-4">
                                <span
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${module.accent}`}
                                >
                                    <Icon name={module.icon} className="h-5 w-5" />
                                </span>

                                <div className="min-w-0">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                                        {module.code}
                                    </p>
                                    <h2 className="mt-1 text-lg font-semibold text-zinc-100">{module.title}</h2>
                                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{module.description}</p>
                                </div>

                                <Icon
                                    name="chevronRight"
                                    className="ml-auto h-4 w-4 shrink-0 text-zinc-700 transition group-hover:translate-x-0.5 group-hover:text-zinc-400"
                                />
                            </div>
                        </Link>
                    ))}
                </section>

                <footer className="border-t border-zinc-900 pt-6 text-center">
                    <p className="font-mono text-[11px] text-zinc-600">
                        A.E.G.I.S. — UAV FLEET MANAGEMENT · สร้างด้วย Laravel + Inertia + React
                    </p>
                </footer>
            </div>
        </div>
    );
}
