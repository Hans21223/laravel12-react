import { useForm } from '@inertiajs/react';
import { useRef } from 'react';

import Button from '@/Components/UI/Button';
import { Card, CardBody, CardHeader } from '@/Components/UI/Card';
import { TextField } from '@/Components/UI/Field';

export default function UpdatePasswordForm() {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event) => {
        event.preventDefault();

        put('/password', {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (formErrors) => {
                if (formErrors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (formErrors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <Card>
            <CardHeader
                title="UPDATE_PASSWORD"
                icon="lock"
                accent="text-cyan-400"
                subtitle="ใช้รหัสผ่านที่ยาวและคาดเดายากเพื่อความปลอดภัย"
            />

            <CardBody>
                <form onSubmit={submit} className="space-y-4">
                    <TextField
                        ref={currentPasswordInput}
                        label="รหัสผ่านปัจจุบัน"
                        type="password"
                        autoComplete="current-password"
                        value={data.current_password}
                        onChange={(event) => setData('current_password', event.target.value)}
                        error={errors.current_password}
                    />

                    <TextField
                        ref={passwordInput}
                        label="รหัสผ่านใหม่"
                        type="password"
                        autoComplete="new-password"
                        value={data.password}
                        onChange={(event) => setData('password', event.target.value)}
                        error={errors.password}
                    />

                    <TextField
                        label="ยืนยันรหัสผ่านใหม่"
                        type="password"
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(event) => setData('password_confirmation', event.target.value)}
                        error={errors.password_confirmation}
                    />

                    <div className="flex items-center gap-3">
                        <Button type="submit" loading={processing} icon="check">
                            เปลี่ยนรหัสผ่าน
                        </Button>
                        {recentlySuccessful && <p className="text-sm text-emerald-400">บันทึกเรียบร้อย</p>}
                    </div>
                </form>
            </CardBody>
        </Card>
    );
}
