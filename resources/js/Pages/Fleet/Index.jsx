import { Head, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BarChart, DonutChart } from '@/Components/Charts';
import Icon from '@/Components/Icon';
import { StatusBadge } from '@/Components/UI/Badge';
import Button from '@/Components/UI/Button';
import { Card, CardHeader } from '@/Components/UI/Card';
import Pagination from '@/Components/UI/Pagination';
import { EmptyState, Meter, StatCard } from '@/Components/UI/Stat';
import AppLayout from '@/Layouts/AppLayout';
import DeleteDroneModal from '@/Pages/Fleet/Partials/DeleteDroneModal';
import DroneFormModal from '@/Pages/Fleet/Partials/DroneFormModal';

const COLUMNS = [
    { key: 'drone_code', label: 'รหัสเรียกขาน', sortable: true },
    { key: 'model_name', label: 'ชื่อรุ่น', sortable: true },
    { key: 'aircraft_type', label: 'ชนิด', sortable: true },
    { key: 'payload_module', label: 'โมดูล', sortable: true },
    { key: 'battery_level', label: 'แบตเตอรี่', sortable: true },
    { key: 'max_speed', label: 'ความเร็วสูงสุด', sortable: true },
    { key: 'status', label: 'สถานะ', sortable: true },
    { key: 'actions', label: '', sortable: false },
];

const STATUS_COLORS = {
    Standby: '#a1a1aa',
    In_Flight: '#22d3ee',
    Returning: '#fbbf24',
    Maintenance: '#fb7185',
};

export default function FleetIndex({ drones, filters, stats, options }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [formTarget, setFormTarget] = useState(null); // null | 'create' | drone
    const [deleteTarget, setDeleteTarget] = useState(null);

    const isFirstRender = useRef(true);

    /** ยิง request ใหม่พร้อมตัวกรองที่อัปเดตแล้ว */
    const applyFilters = useCallback((overrides) => {
        router.get(
            '/fleet',
            {
                search: overrides.search || undefined,
                status: overrides.status || undefined,
                type: overrides.type || undefined,
                sort: overrides.sort,
                direction: overrides.direction,
                perPage: overrides.perPage,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }, []);

    // หน่วงการค้นหา 350ms กันการยิง request ทุกตัวอักษร
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        const timer = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                applyFilters({ ...filters, search });
            }
        }, 350);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const toggleSort = (column) => {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';

        applyFilters({ ...filters, sort: column, direction });
    };

    const resetFilters = () => {
        setSearch('');
        router.get('/fleet', {}, { preserveScroll: true, replace: true });
    };

    const hasFilters = Boolean(filters.search || filters.status || filters.type);

    const statusData = options.statuses.map((status) => ({
        label: status.replace('_', ' '),
        value: stats.byStatus[status] ?? 0,
        color: STATUS_COLORS[status],
    }));

    const typeData = Object.entries(stats.byType).map(([label, value]) => ({ label, value }));

    return (
        <AppLayout
            title="FLEET_DATABASE"
            subtitle="ค้นหา จัดการ และแก้ไขข้อมูลอากาศยานทั้งหมดในระบบ"
            actions={
                <>
                    <Button variant="outline" icon="radar" href="/drone-system">
                        ศูนย์บัญชาการ
                    </Button>
                    <Button icon="plus" onClick={() => setFormTarget('create')}>
                        ลงทะเบียนยูนิต
                    </Button>
                </>
            }
        >
            <Head title="ฐานข้อมูลฝูงบิน" />

            {/* การ์ดสรุปภาพรวม */}
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="ยูนิตทั้งหมด" value={stats.total} icon="drone" accent="emerald" />
                <StatCard label="กำลังปฏิบัติการ" value={stats.airborne} icon="activity" accent="cyan" />
                <StatCard label="แบตเตอรี่เฉลี่ย" value={stats.averageBattery} unit="%" icon="battery" accent="amber" />
                <StatCard
                    label="แบตต่ำกว่า 30%"
                    value={stats.lowBattery}
                    icon="alert"
                    accent={stats.lowBattery > 0 ? 'rose' : 'zinc'}
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                {/* ตารางข้อมูล */}
                <Card className="xl:col-span-2">
                    <CardHeader
                        title="UAV_FLEET_DATA_TABLE"
                        icon="database"
                        subtitle={`ทั้งหมด ${drones.total} ยูนิต`}
                        actions={
                            hasFilters && (
                                <Button size="sm" variant="ghost" icon="close" onClick={resetFilters}>
                                    ล้างตัวกรอง
                                </Button>
                            )
                        }
                    />

                    {/* แถบค้นหาและตัวกรอง */}
                    <div className="grid gap-2 border-b border-zinc-800 p-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="relative sm:col-span-2 lg:col-span-2">
                            <Icon
                                name="search"
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="ค้นหารหัส ชื่อรุ่น หรือโมดูล…"
                                aria-label="ค้นหาโดรน"
                                className="block w-full rounded-lg border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>

                        <select
                            value={filters.status ?? ''}
                            onChange={(event) => applyFilters({ ...filters, status: event.target.value })}
                            aria-label="กรองตามสถานะ"
                            className="rounded-lg border-zinc-700 bg-zinc-900 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-emerald-500"
                        >
                            <option value="">ทุกสถานะ</option>
                            {options.statuses.map((status) => (
                                <option key={status} value={status}>
                                    {status.replace('_', ' ')}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.type ?? ''}
                            onChange={(event) => applyFilters({ ...filters, type: event.target.value })}
                            aria-label="กรองตามชนิดอากาศยาน"
                            className="rounded-lg border-zinc-700 bg-zinc-900 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-emerald-500"
                        >
                            <option value="">ทุกชนิด</option>
                            {options.aircraftTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {drones.data.length === 0 ? (
                        <EmptyState
                            icon="database"
                            title="ไม่พบข้อมูล"
                            description={
                                hasFilters
                                    ? 'ไม่มียูนิตที่ตรงกับเงื่อนไขที่เลือก ลองล้างตัวกรองแล้วค้นหาใหม่'
                                    : 'ยังไม่มีอากาศยานในฐานข้อมูล เริ่มต้นด้วยการลงทะเบียนยูนิตแรก'
                            }
                            action={
                                hasFilters ? (
                                    <Button variant="outline" icon="refresh" onClick={resetFilters}>
                                        ล้างตัวกรอง
                                    </Button>
                                ) : (
                                    <Button icon="plus" onClick={() => setFormTarget('create')}>
                                        ลงทะเบียนยูนิต
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[860px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-800">
                                        {COLUMNS.map((column) => (
                                            <th
                                                key={column.key}
                                                scope="col"
                                                className="px-3 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500"
                                            >
                                                {column.sortable ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSort(column.key)}
                                                        className="inline-flex items-center gap-1 transition hover:text-zinc-200"
                                                    >
                                                        {column.label}
                                                        {filters.sort === column.key && (
                                                            <Icon
                                                                name={
                                                                    filters.direction === 'asc'
                                                                        ? 'arrowUp'
                                                                        : 'arrowDown'
                                                                }
                                                                className="h-3 w-3 text-emerald-400"
                                                            />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="sr-only">การจัดการ</span>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-zinc-800/70">
                                    {drones.data.map((drone) => (
                                        <tr key={drone.id} className="transition hover:bg-zinc-800/30">
                                            <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold text-emerald-400">
                                                {drone.drone_code}
                                            </td>
                                            <td className="px-3 py-2.5 text-zinc-200">{drone.model_name}</td>
                                            <td className="whitespace-nowrap px-3 py-2.5 text-zinc-400">
                                                {drone.aircraft_type}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5 text-zinc-400">
                                                {drone.payload_module}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex w-24 flex-col gap-1">
                                                    <span className="font-mono text-xs tabular-nums text-zinc-300">
                                                        {drone.battery_level}%
                                                    </span>
                                                    <Meter value={drone.battery_level} />
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-zinc-400">
                                                {Number(drone.max_speed).toFixed(1)}{' '}
                                                <span className="text-zinc-600">km/h</span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <StatusBadge status={drone.status} />
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormTarget(drone)}
                                                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-cyan-400"
                                                        aria-label={`แก้ไข ${drone.drone_code}`}
                                                    >
                                                        <Icon name="pencil" className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteTarget(drone)}
                                                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-rose-400"
                                                        aria-label={`ลบ ${drone.drone_code}`}
                                                    >
                                                        <Icon name="trash" className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination meta={drones} />
                </Card>

                {/* กราฟสรุป */}
                <div className="space-y-5">
                    <Card>
                        <CardHeader title="STATUS_BREAKDOWN" icon="chart" accent="text-cyan-400" />
                        <div className="p-4">
                            <DonutChart data={statusData} centerLabel="UNITS" centerValue={stats.total} />
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="AIRFRAME_TYPES" icon="drone" accent="text-violet-400" />
                        <div className="p-4">
                            <BarChart data={typeData} />
                        </div>
                    </Card>
                </div>
            </div>

            <DroneFormModal
                show={formTarget !== null}
                drone={formTarget === 'create' ? null : formTarget}
                options={options}
                onClose={() => setFormTarget(null)}
            />

            {deleteTarget && <DeleteDroneModal drone={deleteTarget} onClose={() => setDeleteTarget(null)} />}
        </AppLayout>
    );
}
