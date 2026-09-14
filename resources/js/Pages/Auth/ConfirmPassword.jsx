import { Head, useForm } from '@inertiajs/react';

import Button from '@/Components/UI/Button';
import { TextField } from '@/Components/UI/Field';
import GuestLayout from '@/Layouts/GuestLayout';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });

    const submit = (event) => {
        event.preventDefault();

        post('/confirm-password', { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout
            title="ยืนยันรหัสผ่าน"
            description="พื้นที่นี้เป็นส่วนที่ต้องการความปลอดภัยสูง กรุณายืนยันรหัสผ่านก่อนดำเนินการต่อ"
        >
            <Head title="ยืนยันรหัสผ่าน" />

            <form onSubmit={submit} className="space-y-4">
                <TextField
                    label="รหัสผ่าน"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    autoFocus
                    value={data.password}
                    onChange={(event) => setData('password', event.target.value)}
                    error={errors.password}
                />

                <Button type="submit" className="w-full" loading={processing}>
                    ยืนยันรหัสผ่าน
                </Button>
            </form>
        </GuestLayout>
    );
}
