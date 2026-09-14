import { Head, Link, useForm } from '@inertiajs/react';

import Button from '@/Components/UI/Button';
import { TextField } from '@/Components/UI/Field';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event) => {
        event.preventDefault();

        post('/register', { onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <GuestLayout title="สมัครสมาชิก" description="สร้างบัญชีใหม่เพื่อเข้าใช้งานระบบ">
            <Head title="สมัครสมาชิก" />

            <form onSubmit={submit} className="space-y-4">
                <TextField
                    label="ชื่อ"
                    name="name"
                    autoComplete="name"
                    required
                    autoFocus
                    value={data.name}
                    onChange={(event) => setData('name', event.target.value)}
                    error={errors.name}
                />

                <TextField
                    label="อีเมล"
                    type="email"
                    name="email"
                    autoComplete="username"
                    required
                    value={data.email}
                    onChange={(event) => setData('email', event.target.value)}
                    error={errors.email}
                />

                <TextField
                    label="รหัสผ่าน"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    required
                    value={data.password}
                    onChange={(event) => setData('password', event.target.value)}
                    error={errors.password}
                />

                <TextField
                    label="ยืนยันรหัสผ่าน"
                    type="password"
                    name="password_confirmation"
                    autoComplete="new-password"
                    required
                    value={data.password_confirmation}
                    onChange={(event) => setData('password_confirmation', event.target.value)}
                    error={errors.password_confirmation}
                />

                <Button type="submit" className="w-full" loading={processing}>
                    สมัครสมาชิก
                </Button>

                <div className="border-t border-zinc-800 pt-4 text-sm">
                    <Link href="/login" className="text-zinc-400 transition hover:text-zinc-100">
                        มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
