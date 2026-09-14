import { Head, Link, useForm } from '@inertiajs/react';

import Button from '@/Components/UI/Button';
import GuestLayout from '@/Layouts/GuestLayout';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (event) => {
        event.preventDefault();

        post('/email/verification-notification');
    };

    return (
        <GuestLayout
            title="ยืนยันอีเมล"
            description="ขอบคุณที่สมัครสมาชิก กรุณากดลิงก์ยืนยันในอีเมลที่เราเพิ่งส่งไปให้"
        >
            <Head title="ยืนยันอีเมล" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                    ส่งลิงก์ยืนยันใหม่ไปยังอีเมลของคุณแล้ว
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <Button type="submit" className="w-full" loading={processing}>
                    ส่งอีเมลยืนยันอีกครั้ง
                </Button>

                <div className="border-t border-zinc-800 pt-4 text-sm">
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="text-zinc-400 transition hover:text-zinc-100"
                    >
                        ออกจากระบบ
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
