<?php

namespace App\Http\Requests;

use App\Models\Drone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDroneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * ทำรหัสเรียกขานเป็นตัวพิมพ์ใหญ่ก่อนตรวจสอบ
     * เพื่อไม่ให้ "dn-05" หลุดกฎ unique ไปชนกับ "DN-05" ที่มีอยู่แล้ว
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->drone_code)) {
            $this->merge(['drone_code' => strtoupper(trim($this->drone_code))]);
        }
    }

    public function rules(): array
    {
        return [
            'drone_code' => ['required', 'string', 'max:32', 'regex:/^[A-Z0-9-]+$/', Rule::unique('drone_fleets', 'drone_code')],
            'model_name' => ['required', 'string', 'max:255'],
            'aircraft_type' => ['required', Rule::in(Drone::AIRCRAFT_TYPES)],
            'payload_module' => ['required', Rule::in(Drone::PAYLOAD_MODULES)],
            'battery_capacity' => ['required', 'integer', 'min:500', 'max:100000'],
            'max_speed' => ['required', 'numeric', 'min:1', 'max:999.99'],
        ];
    }

    public function attributes(): array
    {
        return [
            'drone_code' => 'รหัสเรียกขาน',
            'model_name' => 'ชื่อรุ่น',
            'aircraft_type' => 'ชนิดอากาศยาน',
            'payload_module' => 'โมดูลอุปกรณ์',
            'battery_capacity' => 'ความจุแบตเตอรี่',
            'max_speed' => 'ความเร็วสูงสุด',
        ];
    }

    public function messages(): array
    {
        return [
            'drone_code.unique' => 'รหัสเรียกขานนี้ถูกใช้งานใน Database แล้ว',
            'drone_code.regex' => 'รหัสเรียกขานใช้ได้เฉพาะ A-Z, 0-9 และเครื่องหมาย -',
        ];
    }
}
