import { Head, useForm } from '@inertiajs/react';

import Button from '@/Components/UI/Button';
import { TextField } from '@/Components/UI/Field';
import GuestLayout from '@/Layouts/GuestLayout';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit = (event) => {
        event.preventDefault();

        post('/reset-password', { onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <GuestLayout title="ตั้งรหัสผ่านใหม่" description="กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ">
            <Head title="ตั้งรหัสผ่านใหม่" />

            <form onSubmit={submit} className="space-y-4">
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
                    label="รหัสผ่านใหม่"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    required
                    autoFocus
                    value={data.password}
                    onChange={(event) => setData('password', event.target.value)}
                    error={errors.password}
                />

                <TextField
                    label="ยืนยันรหัสผ่านใหม่"
                    type="password"
                    name="password_confirmation"
                    autoComplete="new-password"
                    required
                    value={data.password_confirmation}
                    onChange={(event) => setData('password_confirmation', event.target.value)}
                    error={errors.password_confirmation}
                />

                <Button type="submit" className="w-full" loading={processing}>
                    บันทึกรหัสผ่านใหม่
                </Button>
            </form>
        </GuestLayout>
    );
}
