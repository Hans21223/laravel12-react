import { Head, usePage } from '@inertiajs/react';

import Icon from '@/Components/Icon';
import Button from '@/Components/UI/Button';
import { Card, CardBody, CardHeader } from '@/Components/UI/Card';
import AppLayout from '@/Layouts/AppLayout';

const SHORTCUTS = [
    { href: '/drone-system', icon: 'radar', label: 'ศูนย์บัญชาการ', description: 'ควบคุมและติดตามอากาศยาน' },
    { href: '/fleet', icon: 'database', label: 'ฐานข้อมูลฝูงบิน', description: 'จัดการข้อมูลอากาศยาน' },
    { href: '/profile', icon: 'user', label: 'โปรไฟล์', description: 'แก้ไขข้อมูลบัญชีผู้ใช้' },
];

export default function Dashboard() {
    const { auth } = usePage().props;

    return (
        <AppLayout title="MEMBER_DASHBOARD" subtitle="พื้นที่สำหรับสมาชิกที่เข้าสู่ระบบแล้ว">
            <Head title="แดชบอร์ด" />

            <div className="grid gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="WELCOME_BACK" icon="check" />
                    <CardBody>
                        <p className="text-lg text-zinc-100">
                            สวัสดี <span className="font-semibold text-emerald-400">{auth.user.name}</span>
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                            คุณเข้าสู่ระบบเรียบร้อยแล้ว · {auth.user.email}
                        </p>

                        <div className="mt-5 grid gap-2 sm:grid-cols-3">
                            {SHORTCUTS.map((shortcut) => (
                                <a
                                    key={shortcut.href}
                                    href={shortcut.href}
                                    className="group rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 transition hover:border-zinc-700 hover:bg-zinc-800"
                                >
                                    <Icon name={shortcut.icon} className="h-4 w-4 text-emerald-400" />
                                    <p className="mt-2 text-sm font-medium text-zinc-100">{shortcut.label}</p>
                                    <p className="mt-0.5 text-xs text-zinc-500">{shortcut.description}</p>
                                </a>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="ACCOUNT" icon="user" accent="text-cyan-400" />
                    <CardBody className="space-y-3">
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between gap-3">
                                <dt className="text-zinc-500">ชื่อ</dt>
                                <dd className="truncate text-zinc-200">{auth.user.name}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-zinc-500">อีเมล</dt>
                                <dd className="truncate text-zinc-200">{auth.user.email}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-zinc-500">ยืนยันอีเมล</dt>
                                <dd className={auth.user.email_verified_at ? 'text-emerald-400' : 'text-amber-400'}>
                                    {auth.user.email_verified_at ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}
                                </dd>
                            </div>
                        </dl>

                        <Button href="/profile" variant="outline" icon="pencil" className="w-full">
                            แก้ไขโปรไฟล์
                        </Button>
                    </CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}
