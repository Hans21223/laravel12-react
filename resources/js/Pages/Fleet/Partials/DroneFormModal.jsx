import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

import Button from '@/Components/UI/Button';
import { SelectField, TextField } from '@/Components/UI/Field';
import Modal from '@/Components/UI/Modal';

const BLANK = {
    drone_code: '',
    model_name: '',
    aircraft_type: '',
    payload_module: '',
    battery_capacity: 10000,
    max_speed: 60,
    status: 'Standby',
};

/**
 * ฟอร์มเดียวใช้ได้ทั้งเพิ่มและแก้ไข
 * ถ้ามี prop `drone` เข้ามาจะเป็นโหมดแก้ไข
 */
export default function DroneFormModal({ show, onClose, drone = null, options }) {
    const isEditing = Boolean(drone);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(BLANK);

    // เติมค่าเดิมลงฟอร์มทุกครั้งที่เปิดหน้าต่าง
    useEffect(() => {
        if (!show) {
            return;
        }

        clearErrors();

        setData(
            drone
                ? {
                      drone_code: drone.drone_code ?? '',
                      model_name: drone.model_name ?? '',
                      aircraft_type: drone.aircraft_type ?? '',
                      payload_module: drone.payload_module ?? '',
                      battery_capacity: drone.battery_capacity ?? 10000,
                      max_speed: drone.max_speed ?? 60,
                      status: drone.status ?? 'Standby',
                  }
                : {
                      ...BLANK,
                      aircraft_type: options.aircraftTypes[0] ?? '',
                      payload_module: options.payloadModules[0] ?? '',
                  },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, drone]);

    const close = () => {
        reset();
        clearErrors();
        onClose();
    };

    const submit = (event) => {
        event.preventDefault();

        const config = {
            preserveScroll: true,
            onSuccess: () => close(),
        };

        if (isEditing) {
            put(`/drones/${drone.id}`, config);
        } else {
            post('/drones', config);
        }
    };

    return (
        <Modal
            show={show}
            onClose={close}
            maxWidth="xl"
            icon={isEditing ? 'pencil' : 'plus'}
            title={isEditing ? `แก้ไขยูนิต ${drone?.drone_code}` : 'ลงทะเบียนยูนิตใหม่'}
            description={
                isEditing
                    ? 'แก้ไขข้อมูลแล้วบันทึกกลับเข้าฐานข้อมูล'
                    : 'กรอกข้อมูลอากาศยานเพื่อบันทึกเข้าสู่ฐานข้อมูลฝูงบิน'
            }
        >
            <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                        label="รหัสเรียกขาน"
                        required
                        value={data.drone_code}
                        onChange={(event) => setData('drone_code', event.target.value.toUpperCase())}
                        error={errors.drone_code}
                        placeholder="DN-05"
                        hint="ใช้ได้เฉพาะ A-Z, 0-9 และ -"
                        autoFocus
                        maxLength={32}
                    />

                    <TextField
                        label="ชื่อรุ่น"
                        required
                        value={data.model_name}
                        onChange={(event) => setData('model_name', event.target.value)}
                        error={errors.model_name}
                        placeholder="Delta-Swarm"
                        maxLength={255}
                    />

                    <SelectField
                        label="ชนิดอากาศยาน"
                        required
                        value={data.aircraft_type}
                        onChange={(event) => setData('aircraft_type', event.target.value)}
                        options={options.aircraftTypes}
                        error={errors.aircraft_type}
                    />

                    <SelectField
                        label="โมดูลอุปกรณ์"
                        required
                        value={data.payload_module}
                        onChange={(event) => setData('payload_module', event.target.value)}
                        options={options.payloadModules}
                        error={errors.payload_module}
                    />

                    <TextField
                        label="ความจุแบตเตอรี่ (mAh)"
                        required
                        type="number"
                        min={500}
                        max={100000}
                        value={data.battery_capacity}
                        onChange={(event) => setData('battery_capacity', event.target.value)}
                        error={errors.battery_capacity}
                    />

                    <TextField
                        label="ความเร็วสูงสุด (km/h)"
                        required
                        type="number"
                        step="0.01"
                        min={1}
                        max={999.99}
                        value={data.max_speed}
                        onChange={(event) => setData('max_speed', event.target.value)}
                        error={errors.max_speed}
                    />

                    {isEditing && (
                        <SelectField
                            label="สถานะ"
                            required
                            containerClassName="sm:col-span-2"
                            value={data.status}
                            onChange={(event) => setData('status', event.target.value)}
                            options={options.statuses.map((status) => ({
                                value: status,
                                label: status.replace('_', ' '),
                            }))}
                            error={errors.status}
                        />
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
                    <Button type="button" variant="ghost" onClick={close}>
                        ยกเลิก
                    </Button>
                    <Button type="submit" loading={processing} icon={isEditing ? 'check' : 'plus'}>
                        {isEditing ? 'บันทึกการแก้ไข' : 'ลงทะเบียนยูนิต'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
