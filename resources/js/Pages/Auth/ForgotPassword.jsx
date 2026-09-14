import { Head, Link, useForm } from '@inertiajs/react';

import Button from '@/Components/UI/Button';
import { TextField } from '@/Components/UI/Field';
import GuestLayout from '@/Layouts/GuestLayout';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit = (event) => {
        event.preventDefault();

        post('/forgot-password');
    };

    return (
        <GuestLayout
            title="ลืมรหัสผ่าน"
            description="กรอกอีเมลของคุณ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้"
        >
            <Head title="ลืมรหัสผ่าน" />

            {status && (
                <div className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <TextField
                    label="อีเมล"
                    type="email"
                    name="email"
                    autoComplete="username"
                    required
                    autoFocus
                    value={data.email}
                    onChange={(event) => setData('email', event.target.value)}
                    error={errors.email}
                />

                <Button type="submit" className="w-full" loading={processing}>
                    ส่งลิงก์ตั้งรหัสผ่านใหม่
                </Button>

                <div className="border-t border-zinc-800 pt-4 text-sm">
                    <Link href="/login" className="text-zinc-400 transition hover:text-zinc-100">
                        กลับไปหน้าเข้าสู่ระบบ
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
