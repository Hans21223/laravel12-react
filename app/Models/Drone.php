<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Drone extends Model
{
    /** @use HasFactory<\Database\Factories\DroneFactory> */
    use HasFactory;

    /**
     * ใช้ตารางเดิมที่สร้างไว้ตั้งแต่ต้นโปรเจกต์
     */
    protected $table = 'drone_fleets';

    /**
     * สถานะที่ระบบรองรับ
     */
    public const STATUS_STANDBY = 'Standby';

    public const STATUS_IN_FLIGHT = 'In_Flight';

    public const STATUS_RETURNING = 'Returning';

    public const STATUS_MAINTENANCE = 'Maintenance';

    public const STATUSES = [
        self::STATUS_STANDBY,
        self::STATUS_IN_FLIGHT,
        self::STATUS_RETURNING,
        self::STATUS_MAINTENANCE,
    ];

    /**
     * ชนิดอากาศยานที่เลือกได้
     */
    public const AIRCRAFT_TYPES = [
        'Quad-Copter',
        'Hexa-Copter',
        'Octo-Copter',
        'Fixed-Wing',
        'VTOL',
    ];

    /**
     * โมดูลอุปกรณ์เสริมที่เลือกได้
     */
    public const PAYLOAD_MODULES = [
        'Optical Camera',
        'Thermal Imaging',
        'LiDAR Scanner',
        'Multispectral Sensor',
        'Delivery Cargo',
    ];

    /**
     * สถานะที่ถือว่ากำลังลอยอยู่กลางอากาศ
     */
    public const AIRBORNE_STATUSES = [
        self::STATUS_IN_FLIGHT,
        self::STATUS_RETURNING,
    ];

    protected $fillable = [
        'drone_code',
        'model_name',
        'aircraft_type',
        'battery_capacity',
        'max_speed',
        'payload_module',
        'status',
        'battery_level',
        'altitude',
        'speed',
        'heading',
        'latitude',
        'longitude',
        'signal_strength',
        'last_contact_at',
    ];

    protected function casts(): array
    {
        return [
            'battery_capacity' => 'integer',
            'max_speed' => 'float',
            'battery_level' => 'integer',
            'altitude' => 'float',
            'speed' => 'float',
            'heading' => 'float',
            'latitude' => 'float',
            'longitude' => 'float',
            'signal_strength' => 'integer',
            'last_contact_at' => 'datetime',
        ];
    }

    /**
     * เก็บรหัสเรียกขานเป็นตัวพิมพ์ใหญ่เสมอ เพื่อให้กฎ unique ทำงานตรงไปตรงมา
     */
    public function setDroneCodeAttribute(?string $value): void
    {
        $this->attributes['drone_code'] = $value === null ? null : strtoupper(trim($value));
    }

    public function isAirborne(): bool
    {
        return in_array($this->status, self::AIRBORNE_STATUSES, true);
    }

    /**
     * ค้นหาจากรหัสเรียกขาน, ชื่อรุ่น หรือโมดูลอุปกรณ์
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (blank($term)) {
            return $query;
        }

        $term = '%'.str_replace('%', '\%', $term).'%';

        return $query->where(function (Builder $query) use ($term) {
            $query->where('drone_code', 'like', $term)
                ->orWhere('model_name', 'like', $term)
                ->orWhere('payload_module', 'like', $term);
        });
    }

    public function scopeStatus(Builder $query, ?string $status): Builder
    {
        return blank($status) ? $query : $query->where('status', $status);
    }

    public function scopeAircraftType(Builder $query, ?string $type): Builder
    {
        return blank($type) ? $query : $query->where('aircraft_type', $type);
    }
}
