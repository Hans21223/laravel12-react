import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

import Button from '@/Components/UI/Button';
import { Card, CardBody, CardHeader } from '@/Components/UI/Card';
import { TextField } from '@/Components/UI/Field';
import Modal from '@/Components/UI/Modal';

export default function DeleteUserForm() {
    const [confirming, setConfirming] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({ password: '' });

    const close = () => {
        setConfirming(false);
        clearErrors();
        reset();
    };

    const submit = (event) => {
        event.preventDefault();

        destroy('/profile', {
            preserveScroll: true,
            onSuccess: close,
            onError: () => passwordInput.current?.focus(),
        });
    };

    return (
        <Card className="border-rose-900/50">
            <CardHeader title="DANGER_ZONE" icon="alert" accent="text-rose-400" subtitle="ลบบัญชีนี้อย่างถาวร" />

            <CardBody>
                <p className="text-sm text-zinc-400">
                    เมื่อลบบัญชีแล้ว ข้อมูลทั้งหมดจะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้
                    กรุณาบันทึกข้อมูลที่ต้องการเก็บไว้ก่อนดำเนินการ
                </p>

                <Button variant="danger" icon="trash" className="mt-4" onClick={() => setConfirming(true)}>
                    ลบบัญชีนี้
                </Button>
            </CardBody>

            <Modal
                show={confirming}
                onClose={close}
                maxWidth="md"
                icon="alert"
                accent="text-rose-400"
                title="ยืนยันการลบบัญชี"
                description="การกระทำนี้ไม่สามารถย้อนกลับได้"
            >
                <form onSubmit={submit} className="space-y-4">
                    <p className="text-sm text-zinc-400">กรุณากรอกรหัสผ่านเพื่อยืนยันว่าคุณต้องการลบบัญชีนี้จริง</p>

                    <TextField
                        ref={passwordInput}
                        label="รหัสผ่าน"
                        type="password"
                        autoComplete="current-password"
                        value={data.password}
                        onChange={(event) => setData('password', event.target.value)}
                        error={errors.password}
                        autoFocus
                    />

                    <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
                        <Button type="button" variant="ghost" onClick={close}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" variant="danger" icon="trash" loading={processing}>
                            ลบบัญชีถาวร
                        </Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
}
