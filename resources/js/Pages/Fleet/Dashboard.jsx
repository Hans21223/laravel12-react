import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DonutChart, Sparkline } from '@/Components/Charts';
import Icon from '@/Components/Icon';
import { StatusBadge } from '@/Components/UI/Badge';
import Button from '@/Components/UI/Button';
import { Card, CardHeader } from '@/Components/UI/Card';
import { EmptyState, Meter, StatCard } from '@/Components/UI/Stat';
import { useToast } from '@/Components/UI/ToastProvider';
import AppLayout from '@/Layouts/AppLayout';
import DroneFormModal from '@/Pages/Fleet/Partials/DroneFormModal';
import HudViewport from '@/Pages/Fleet/Partials/HudViewport';

const AIRBORNE = ['In_Flight', 'Returning'];

const STATUS_COLORS = {
    Standby: '#a1a1aa',
    In_Flight: '#22d3ee',
    Returning: '#fbbf24',
    Maintenance: '#fb7185',
};

let logSequence = 0;

const makeLog = (src, msg, level = 'info') => ({
    id: ++logSequence,
    time: new Date().toLocaleTimeString('th-TH'),
    src,
    msg,
    level,
});

/** แปลงข้อมูลจากเซิร์ฟเวอร์ให้เป็นตัวเลขพร้อมใช้ในการจำลอง */
const toUnit = (drone) => ({
    ...drone,
    battery_level: Number(drone.battery_level),
    altitude: Number(drone.altitude),
    speed: Number(drone.speed),
    heading: Number(drone.heading),
    latitude: Number(drone.latitude),
    longitude: Number(drone.longitude),
    signal_strength: Number(drone.signal_strength),
    max_speed: Number(drone.max_speed),
    pitch: 0,
    roll: 0,
});

export default function FleetDashboard({ drones, stats, options }) {
    const toast = useToast();

    const [units, setUnits] = useState(() => drones.map(toUnit));
    const [selectedId, setSelectedId] = useState(() => drones[0]?.id ?? null);
    const [showForm, setShowForm] = useState(false);
    const [altitudeTrail, setAltitudeTrail] = useState([]);
    const [logs, setLogs] = useState(() => [makeLog('SYS', 'TERMINAL ONLINE · เชื่อมต่อฐานข้อมูลสำเร็จ')]);
    const [syncState, setSyncState] = useState('idle'); // idle | syncing | error

    const addLog = useCallback((src, msg, level) => {
        setLogs((previous) => [makeLog(src, msg, level), ...previous].slice(0, 60));
    }, []);

    // ข้อมูลจากเซิร์ฟเวอร์คือความจริงเสมอ — รีเซ็ตค่าจำลองทุกครั้งที่ props เปลี่ยน
    useEffect(() => {
        setUnits(drones.map(toUnit));

        setSelectedId((current) =>
            current !== null && drones.some((drone) => drone.id === current) ? current : (drones[0]?.id ?? null),
        );
    }, [drones]);

    const selected = units.find((unit) => unit.id === selectedId) ?? null;

    // เก็บประวัติความสูงของยูนิตที่เลือกไว้วาดกราฟ
    useEffect(() => {
        setAltitudeTrail([]);
    }, [selectedId]);

    useEffect(() => {
        if (!selected) {
            return;
        }

        setAltitudeTrail((trail) => [...trail, selected.altitude].slice(-40));
    }, [selected?.altitude, selected?.id]);

    /* ---------------------------------------------------------------
     * การจำลอง telemetry ฝั่งเบราว์เซอร์ (ทุก 1 วินาที)
     * ------------------------------------------------------------- */
    useEffect(() => {
        const interval = setInterval(() => {
            setUnits((previous) =>
                previous.map((unit) => {
                    if (!AIRBORNE.includes(unit.status)) {
                        return unit;
                    }

                    const battery = Math.max(0, unit.battery_level - (Math.random() > 0.75 ? 1 : 0));
                    const landing = battery <= 0;

                    return {
                        ...unit,
                        battery_level: battery,
                        // แบตหมดกลางอากาศ ให้ลงจอดอัตโนมัติ (ตรงกับกติกาฝั่งเซิร์ฟเวอร์)
                        status: landing ? 'Standby' : unit.status,
                        altitude: landing ? 0 : Math.max(5, unit.altitude + (Math.random() * 2 - 1)),
                        speed: landing ? 0 : Math.max(8, Math.min(unit.max_speed, unit.speed + (Math.random() * 4 - 2))),
                        pitch: landing ? 0 : Math.random() * 8 - 4,
                        roll: landing ? 0 : Math.random() * 12 - 6,
                        heading: (unit.heading + (Math.random() * 4 - 2) + 360) % 360,
                        latitude: unit.latitude + (Math.random() * 0.0002 - 0.0001),
                        longitude: unit.longitude + (Math.random() * 0.0002 - 0.0001),
                        signal_strength: Math.max(35, unit.signal_strength - (Math.random() > 0.85 ? 1 : 0)),
                    };
                }),
            );
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    /* ---------------------------------------------------------------
     * บันทึก telemetry ลงฐานข้อมูลทุก 5 วินาที
     * ส่งเป็นชุดเดียว เพื่อไม่ให้ยิงฐานข้อมูลทุกวินาที
     * ------------------------------------------------------------- */
    const unitsRef = useRef(units);
    unitsRef.current = units;

    useEffect(() => {
        let cancelled = false;

        const interval = setInterval(async () => {
            const readings = unitsRef.current
                .filter((unit) => AIRBORNE.includes(unit.status))
                .map((unit) => ({
                    id: unit.id,
                    battery_level: Math.round(unit.battery_level),
                    altitude: Number(unit.altitude.toFixed(2)),
                    speed: Number(unit.speed.toFixed(2)),
                    heading: Number(unit.heading.toFixed(2)),
                    latitude: Number(unit.latitude.toFixed(7)),
                    longitude: Number(unit.longitude.toFixed(7)),
                    signal_strength: Math.round(unit.signal_strength),
                }));

            if (readings.length === 0) {
                return;
            }

            setSyncState('syncing');

            try {
                await axios.post('/api/drones/telemetry', { readings });

                if (!cancelled) {
                    setSyncState('idle');
                }
            } catch (error) {
                if (!cancelled) {
                    setSyncState('error');
                    addLog('SYS', 'บันทึก telemetry ลงฐานข้อมูลไม่สำเร็จ', 'error');
                    console.error('Telemetry sync failed', error);
                }
            }
        }, 5000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [addLog]);

    /* ---------------------------------------------------------------
     * คำสั่งการบิน — บันทึกลงฐานข้อมูลทันที
     * ------------------------------------------------------------- */
    const executeCommand = (command) => {
        if (!selected) {
            return;
        }

        router.post(
            `/drones/${selected.id}/command`,
            { command },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => addLog(selected.drone_code, `COMMAND [${command}] ยืนยันแล้ว`, 'success'),
                onError: (errors) => {
                    const message = errors.command ?? 'ส่งคำสั่งไม่สำเร็จ';

                    addLog(selected.drone_code, `COMMAND [${command}] ถูกปฏิเสธ — ${message}`, 'error');
                    toast.push(message, 'error');
                },
            },
        );
    };

    const statusData = useMemo(
        () =>
            options.statuses.map((status) => ({
                label: status.replace('_', ' '),
                value: stats.byStatus[status] ?? 0,
                color: STATUS_COLORS[status],
            })),
        [options.statuses, stats.byStatus],
    );

    const isAirborne = selected ? AIRBORNE.includes(selected.status) : false;

    return (
        <AppLayout
            title="GLOBAL_TELEMETRY_LINK"
            subtitle="ศูนย์บัญชาการและติดตามอากาศยานแบบเรียลไทม์"
            actions={
                <>
                    <Button variant="outline" icon="database" href="/fleet">
                        ฐานข้อมูล
                    </Button>
                    <Button icon="plus" onClick={() => setShowForm(true)}>
                        ลงทะเบียนยูนิต
                    </Button>
                </>
            }
        >
            <Head title="ศูนย์บัญชาการ" />

            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="ยูนิตทั้งหมด" value={stats.total} icon="drone" accent="emerald" />
                <StatCard label="กำลังปฏิบัติการ" value={stats.airborne} icon="activity" accent="cyan" />
                <StatCard label="แบตเตอรี่เฉลี่ย" value={stats.averageBattery} unit="%" icon="battery" accent="amber" />
                <StatCard
                    label="สถานะการบันทึก"
                    value={syncState === 'error' ? 'ERROR' : syncState === 'syncing' ? 'SYNC' : 'READY'}
                    icon="refresh"
                    accent={syncState === 'error' ? 'rose' : 'emerald'}
                    hint="บันทึก telemetry ทุก 5 วินาที"
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-12">
                {/* คอลัมน์ 1 — รายชื่อฝูงบิน */}
                <Card className="lg:col-span-3">
                    <CardHeader title="FLEET_ROSTER" icon="drone" subtitle={`${units.length} ยูนิต`} />

                    {units.length === 0 ? (
                        <EmptyState
                            icon="radar"
                            title="ไม่มียูนิตในระบบ"
                            description="ลงทะเบียนอากาศยานเพื่อเริ่มปฏิบัติการ"
                            action={
                                <Button icon="plus" onClick={() => setShowForm(true)}>
                                    ลงทะเบียนยูนิต
                                </Button>
                            }
                        />
                    ) : (
                        <ul className="max-h-[30rem] divide-y divide-zinc-800/70 overflow-y-auto">
                            {units.map((unit) => (
                                <li key={unit.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedId(unit.id)}
                                        aria-current={unit.id === selectedId}
                                        className={`w-full px-3 py-2.5 text-left transition ${
                                            unit.id === selectedId
                                                ? 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/30'
                                                : 'hover:bg-zinc-800/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate font-mono text-sm font-semibold text-zinc-100">
                                                {unit.drone_code}
                                            </span>
                                            <StatusBadge status={unit.status} dot={false} />
                                        </div>

                                        <p className="mt-0.5 truncate text-xs text-zinc-500">{unit.model_name}</p>

                                        <div className="mt-2 flex items-center gap-2">
                                            <Meter value={unit.battery_level} className="flex-1" />
                                            <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                                                {Math.round(unit.battery_level)}%
                                            </span>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                {/* คอลัมน์ 2 — จอภาพและค่าการบิน */}
                <Card className="lg:col-span-5">
                    {selected ? (
                        <>
                            <CardHeader
                                title={`TARGET_SIM // ${selected.drone_code}`}
                                icon="radar"
                                accent="text-cyan-400"
                                subtitle={selected.model_name}
                                actions={<StatusBadge status={selected.status} />}
                            />

                            <div className="space-y-4 p-4">
                                <HudViewport drone={selected} />

                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'ALTITUDE', value: selected.altitude.toFixed(1), unit: 'm', tone: 'text-cyan-400' },
                                        { label: 'SPEED', value: selected.speed.toFixed(1), unit: 'km/h', tone: 'text-amber-400' },
                                        { label: 'SIGNAL', value: Math.round(selected.signal_strength), unit: '%', tone: 'text-emerald-400' },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5 text-center"
                                        >
                                            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                                                {item.label}
                                            </p>
                                            <p className={`mt-1 text-xl font-semibold tabular-nums ${item.tone}`}>
                                                {item.value}
                                            </p>
                                            <p className="text-[10px] text-zinc-600">{item.unit}</p>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                                        ALTITUDE_TREND
                                    </p>
                                    <Sparkline points={altitudeTrail} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            icon="alert"
                            title="ไม่มียูนิตที่เลือก"
                            description="เลือกอากาศยานจากรายชื่อฝูงบินเพื่อดูข้อมูลการบิน"
                        />
                    )}
                </Card>

                {/* คอลัมน์ 3 — คำสั่งและบันทึกเหตุการณ์ */}
                <div className="space-y-5 lg:col-span-4">
                    <Card>
                        <CardHeader title="COMMAND_LINK" icon="terminal" accent="text-amber-400" />

                        <div className="space-y-3 p-4">
                            {selected ? (
                                <>
                                    <dl className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-xs">
                                        {[
                                            ['PITCH', `${selected.pitch.toFixed(2)}°`],
                                            ['ROLL', `${selected.roll.toFixed(2)}°`],
                                            ['LAT', selected.latitude.toFixed(6)],
                                            ['LNG', selected.longitude.toFixed(6)],
                                        ].map(([label, value]) => (
                                            <div key={label} className="flex justify-between gap-2">
                                                <dt className="text-zinc-500">{label}</dt>
                                                <dd className="tabular-nums text-cyan-400">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>

                                    <div className="grid gap-2">
                                        <Button
                                            variant="outline"
                                            icon="rocket"
                                            className="justify-start"
                                            disabled={selected.status !== 'Standby' || selected.battery_level < 20}
                                            onClick={() => executeCommand('LAUNCH')}
                                        >
                                            [CMD_01] EXEC_TAKEOFF
                                        </Button>
                                        <Button
                                            variant="outline"
                                            icon="home"
                                            className="justify-start"
                                            disabled={!isAirborne}
                                            onClick={() => executeCommand('RTL')}
                                        >
                                            [CMD_02] RETURN_TO_LAUNCH
                                        </Button>
                                        <Button
                                            variant="danger"
                                            icon="alert"
                                            className="justify-start"
                                            disabled={!isAirborne}
                                            onClick={() => executeCommand('LAND')}
                                        >
                                            [CMD_99] OVERRIDE_LAND
                                        </Button>
                                    </div>

                                    {selected.battery_level < 20 && selected.status === 'Standby' && (
                                        <p className="flex items-start gap-2 rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-400 ring-1 ring-inset ring-rose-500/30">
                                            <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                            แบตเตอรี่ต่ำกว่า 20% ระบบล็อกไม่ให้ขึ้นบิน
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="py-4 text-center font-mono text-xs text-zinc-600">AWAITING CONNECTION…</p>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="STATUS_BREAKDOWN" icon="chart" accent="text-violet-400" />
                        <div className="p-4">
                            <DonutChart data={statusData} centerLabel="UNITS" centerValue={stats.total} size={128} />
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="SYS_AUDIT_LOG" icon="activity" accent="text-emerald-400" />
                        <ul className="max-h-56 space-y-1 overflow-y-auto p-3 font-mono text-[11px]">
                            {logs.map((log) => (
                                <li key={log.id} className="flex gap-2">
                                    <span className="shrink-0 text-zinc-600">[{log.time}]</span>
                                    <span className="shrink-0 text-amber-500/80">&lt;{log.src}&gt;</span>
                                    <span
                                        className={
                                            log.level === 'error'
                                                ? 'text-rose-400'
                                                : log.level === 'success'
                                                  ? 'text-emerald-400'
                                                  : 'text-zinc-300'
                                        }
                                    >
                                        {log.msg}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>

            <DroneFormModal show={showForm} options={options} onClose={() => setShowForm(false)} />
        </AppLayout>
    );
}
