import { Head, Link, useForm } from '@inertiajs/react';

import Button from '@/Components/UI/Button';
import { TextField } from '@/Components/UI/Field';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event) => {
        event.preventDefault();

        post('/login', { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout title="เข้าสู่ระบบ" description="กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ">
            <Head title="เข้าสู่ระบบ" />

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

                <TextField
                    label="รหัสผ่าน"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    value={data.password}
                    onChange={(event) => setData('password', event.target.value)}
                    error={errors.password}
                />

                <label className="flex items-center gap-2 text-sm text-zinc-400">
                    <input
                        type="checkbox"
                        name="remember"
                        checked={data.remember}
                        onChange={(event) => setData('remember', event.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950"
                    />
                    จดจำการเข้าสู่ระบบ
                </label>

                <Button type="submit" className="w-full" loading={processing}>
                    เข้าสู่ระบบ
                </Button>

                <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-4 text-sm">
                    <Link href="/register" className="text-zinc-400 transition hover:text-zinc-100">
                        ยังไม่มีบัญชี?
                    </Link>

                    {canResetPassword && (
                        <Link href="/forgot-password" className="text-emerald-400 transition hover:text-emerald-300">
                            ลืมรหัสผ่าน?
                        </Link>
                    )}
                </div>
            </form>
        </GuestLayout>
    );
}
