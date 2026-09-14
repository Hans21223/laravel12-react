import { useForm } from '@inertiajs/react';

import Button from '@/Components/UI/Button';
import Modal from '@/Components/UI/Modal';

export default function DeleteDroneModal({ drone, onClose }) {
    const { delete: destroy, processing } = useForm();

    const confirm = () => {
        destroy(`/drones/${drone.id}`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Modal
            show={Boolean(drone)}
            onClose={onClose}
            maxWidth="md"
            icon="alert"
            accent="text-rose-400"
            title="ยืนยันการถอนยูนิต"
            description="การลบนี้ไม่สามารถย้อนกลับได้"
        >
            <p className="text-sm text-zinc-400">
                ต้องการถอนยูนิต{' '}
                <span className="font-mono font-semibold text-zinc-100">{drone?.drone_code}</span>{' '}
                ({drone?.model_name}) ออกจากฐานข้อมูลใช่หรือไม่?
            </p>

            <div className="mt-5 flex justify-end gap-2 border-t border-zinc-800 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>
                    ยกเลิก
                </Button>
                <Button type="button" variant="danger" icon="trash" loading={processing} onClick={confirm}>
                    ถอนยูนิตออก
                </Button>
            </div>
        </Modal>
    );
}
