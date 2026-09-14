import { Link, useForm, usePage } from '@inertiajs/react';

import Button from '@/Components/UI/Button';
import { Card, CardBody, CardHeader } from '@/Components/UI/Card';
import { TextField } from '@/Components/UI/Field';

export default function UpdateProfileInformationForm({ mustVerifyEmail, status }) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
    });

    const submit = (event) => {
        event.preventDefault();

        patch('/profile');
    };

    return (
        <Card>
            <CardHeader title="PROFILE_INFORMATION" icon="user" subtitle="แก้ไขชื่อและอีเมลของบัญชี" />

            <CardBody>
                <form onSubmit={submit} className="space-y-4">
                    <TextField
                        label="ชื่อ"
                        required
                        autoComplete="name"
                        value={data.name}
                        onChange={(event) => setData('name', event.target.value)}
                        error={errors.name}
                    />

                    <TextField
                        label="อีเมล"
                        type="email"
                        required
                        autoComplete="username"
                        value={data.email}
                        onChange={(event) => setData('email', event.target.value)}
                        error={errors.email}
                    />

                    {mustVerifyEmail && user.email_verified_at === null && (
                        <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-400 ring-1 ring-inset ring-amber-500/30">
                            อีเมลของคุณยังไม่ได้รับการยืนยัน{' '}
                            <Link
                                href="/email/verification-notification"
                                method="post"
                                as="button"
                                className="underline transition hover:text-amber-300"
                            >
                                กดที่นี่เพื่อส่งอีเมลยืนยันอีกครั้ง
                            </Link>
                            {status === 'verification-link-sent' && (
                                <p className="mt-1 text-emerald-400">ส่งลิงก์ยืนยันใหม่แล้ว</p>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <Button type="submit" loading={processing} icon="check">
                            บันทึก
                        </Button>
                        {recentlySuccessful && <p className="text-sm text-emerald-400">บันทึกเรียบร้อย</p>}
                    </div>
                </form>
            </CardBody>
        </Card>
    );
}
