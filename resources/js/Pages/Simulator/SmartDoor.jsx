import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Icon from '@/Components/Icon';
import Badge from '@/Components/UI/Badge';
import Button from '@/Components/UI/Button';
import { Card, CardHeader } from '@/Components/UI/Card';
import { EmptyState, StatCard } from '@/Components/UI/Stat';
import AppLayout from '@/Layouts/AppLayout';

const PIN_CODE = '2468';
const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 15;
const AUTO_LOCK_SECONDS = 20;

// ต้องเขียนชื่อคลาสเต็มๆ ไว้ตรงนี้ Tailwind จึงจะเก็บคลาสเหล่านี้ไว้ตอน build
const LEVELS = {
    info: { color: 'text-zinc-400', icon: 'activity' },
    success: { color: 'text-emerald-400', icon: 'check' },
    warning: { color: 'text-amber-400', icon: 'motion' },
    danger: { color: 'text-rose-400', icon: 'alert' },
};

let logSequence = 0;

export default function SmartDoor() {
    const [locked, setLocked] = useState(true);
    const [motion, setMotion] = useState(false);
    const [pin, setPin] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState(0);
    const [autoLockIn, setAutoLockIn] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [filter, setFilter] = useState('all');
    const [logs, setLogs] = useState([]);

    // เก็บ timer ไว้เคลียร์ตอนออกจากหน้า กัน setState หลัง unmount
    const motionTimer = useRef(null);

    const addLog = useCallback((action, level = 'info') => {
        setLogs((previous) =>
            [
                {
                    id: ++logSequence,
                    time: new Date().toLocaleTimeString('th-TH'),
                    action,
                    level,
                },
                ...previous,
            ].slice(0, 50),
        );
    }, []);

    useEffect(() => {
        addLog('ระบบเริ่มทำงาน · เซ็นเซอร์พร้อมใช้งาน', 'info');

        return () => clearTimeout(motionTimer.current);
    }, [addLog]);

    // นาฬิกากลางสำหรับนับถอยหลังทั้งหน้า (ตัวเดียวพอ ไม่ต้องตั้งหลาย interval)
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(interval);
    }, []);

    const lockedOut = lockoutUntil > now;
    const lockoutRemaining = lockedOut ? Math.ceil((lockoutUntil - now) / 1000) : 0;

    // ล็อกอัตโนมัติเมื่อครบเวลา
    useEffect(() => {
        if (locked || autoLockIn === 0) {
            return;
        }

        if (autoLockIn <= now) {
            setLocked(true);
            setAutoLockIn(0);
            addLog('🔒 ล็อกอัตโนมัติเมื่อครบกำหนดเวลา', 'success');
        }
    }, [now, autoLockIn, locked, addLog]);

    const autoLockRemaining = !locked && autoLockIn > now ? Math.ceil((autoLockIn - now) / 1000) : 0;

    const lock = () => {
        setLocked(true);
        setAutoLockIn(0);
        setPin('');
        addLog('🔒 ล็อกประตูด้วยตนเอง', 'success');
    };

    const submitPin = () => {
        if (lockedOut) {
            return;
        }

        if (pin === PIN_CODE) {
            setLocked(false);
            setPin('');
            setAttempts(0);
            setAutoLockIn(Date.now() + AUTO_LOCK_SECONDS * 1000);
            addLog('🔓 ปลดล็อกสำเร็จ · รหัสผ่านถูกต้อง', 'success');

            return;
        }

        const nextAttempts = attempts + 1;

        setAttempts(nextAttempts);
        setPin('');

        if (nextAttempts >= MAX_ATTEMPTS) {
            setLockoutUntil(Date.now() + LOCKOUT_SECONDS * 1000);
            setAttempts(0);
            addLog(`🚨 ใส่รหัสผิดครบ ${MAX_ATTEMPTS} ครั้ง · ระงับการใช้งาน ${LOCKOUT_SECONDS} วินาที`, 'danger');

            return;
        }

        addLog(`❌ รหัสไม่ถูกต้อง (ครั้งที่ ${nextAttempts}/${MAX_ATTEMPTS})`, 'warning');
    };

    const pressKey = (key) => {
        if (lockedOut) {
            return;
        }

        if (key === 'clear') {
            setPin('');

            return;
        }

        if (key === 'back') {
            setPin((current) => current.slice(0, -1));

            return;
        }

        setPin((current) => (current.length >= 4 ? current : current + key));
    };

    const simulateMotion = () => {
        setMotion(true);
        addLog('⚠️ เซ็นเซอร์ PIR ตรวจพบการเคลื่อนไหวหน้าประตู', 'warning');

        if (!locked) {
            addLog('ℹ️ ประตูยังไม่ล็อกขณะตรวจพบการเคลื่อนไหว', 'info');
        }

        clearTimeout(motionTimer.current);
        motionTimer.current = setTimeout(() => setMotion(false), 3000);
    };

    const visibleLogs = useMemo(
        () => (filter === 'all' ? logs : logs.filter((log) => log.level === filter)),
        [logs, filter],
    );

    const stats = useMemo(
        () => ({
            unlocks: logs.filter((log) => log.action.includes('ปลดล็อก')).length,
            alerts: logs.filter((log) => log.level === 'danger' || log.level === 'warning').length,
        }),
        [logs],
    );

    return (
        <AppLayout title="SMART_DOOR_SECURITY" subtitle="ระบบควบคุมประตูอัจฉริยะพร้อมเซ็นเซอร์ตรวจจับการเคลื่อนไหว">
            <Head title="ประตูอัจฉริยะ" />

            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="สถานะประตู"
                    value={locked ? 'LOCKED' : 'UNLOCKED'}
                    icon={locked ? 'lock' : 'unlock'}
                    accent={locked ? 'emerald' : 'rose'}
                />
                <StatCard
                    label="เซ็นเซอร์ PIR"
                    value={motion ? 'DETECTED' : 'CLEAR'}
                    icon="motion"
                    accent={motion ? 'amber' : 'zinc'}
                />
                <StatCard label="ปลดล็อกสำเร็จ" value={stats.unlocks} icon="check" accent="cyan" />
                <StatCard label="การแจ้งเตือน" value={stats.alerts} icon="alert" accent={stats.alerts ? 'rose' : 'zinc'} />
            </div>

            <div className="grid gap-5 lg:grid-cols-5">
                <div className="space-y-5 lg:col-span-3">
                    {/* สถานะประตู */}
                    <Card>
                        <CardHeader
                            title="DOOR_CONTROL"
                            icon="door"
                            accent={locked ? 'text-emerald-400' : 'text-rose-400'}
                            actions={
                                autoLockRemaining > 0 && (
                                    <Badge tone="amber" dot>
                                        ล็อกอัตโนมัติใน {autoLockRemaining}s
                                    </Badge>
                                )
                            }
                        />

                        <div
                            className={`flex flex-col items-center gap-4 p-8 transition-colors ${
                                locked ? 'bg-emerald-500/5' : 'bg-rose-500/5'
                            }`}
                        >
                            <div
                                className={`relative flex h-24 w-24 items-center justify-center rounded-2xl ring-1 transition ${
                                    locked
                                        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30'
                                        : 'bg-rose-500/10 text-rose-400 ring-rose-500/30'
                                }`}
                            >
                                {motion && (
                                    <span className="absolute inset-0 animate-ping-slow rounded-2xl bg-current opacity-20" />
                                )}
                                <Icon name={locked ? 'lock' : 'unlock'} className="h-10 w-10" strokeWidth={1.4} />
                            </div>

                            <div className="text-center">
                                <p
                                    className={`font-mono text-lg font-semibold tracking-[0.1em] ${
                                        locked ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                >
                                    {locked ? 'SECURE' : 'UNSECURE'}
                                </p>
                                <p className="mt-1 text-sm text-zinc-500">
                                    {locked ? 'ประตูถูกล็อกอยู่ · ต้องใส่รหัสเพื่อเข้า' : 'ประตูปลดล็อกแล้ว'}
                                </p>
                            </div>

                            {!locked && (
                                <Button variant="secondary" icon="lock" onClick={lock}>
                                    ล็อกประตูทันที
                                </Button>
                            )}
                        </div>
                    </Card>

                    {/* แป้นกดรหัส */}
                    <Card>
                        <CardHeader
                            title="ACCESS_KEYPAD"
                            icon="shield"
                            accent="text-cyan-400"
                            subtitle={`รหัสสาธิต: ${PIN_CODE}`}
                        />

                        <div className="p-4">
                            {lockedOut ? (
                                <div className="flex flex-col items-center gap-2 rounded-lg bg-rose-500/10 p-6 text-center ring-1 ring-inset ring-rose-500/30">
                                    <Icon name="alert" className="h-6 w-6 text-rose-400" />
                                    <p className="font-mono text-sm text-rose-400">ระบบถูกระงับชั่วคราว</p>
                                    <p className="text-xs text-zinc-500">ลองใหม่ได้ในอีก {lockoutRemaining} วินาที</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 flex justify-center gap-2.5">
                                        {[0, 1, 2, 3].map((index) => (
                                            <span
                                                key={index}
                                                className={`h-3.5 w-3.5 rounded-full ring-1 transition ${
                                                    index < pin.length
                                                        ? 'bg-cyan-400 ring-cyan-400'
                                                        : 'bg-transparent ring-zinc-700'
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    <div className="mx-auto grid max-w-[15rem] grid-cols-3 gap-2">
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map(
                                            (key) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => pressKey(key)}
                                                    className="rounded-lg border border-zinc-800 bg-zinc-900 py-3 font-mono text-sm text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 active:scale-95"
                                                >
                                                    {key === 'clear' ? 'C' : key === 'back' ? '←' : key}
                                                </button>
                                            ),
                                        )}
                                    </div>

                                    <Button
                                        className="mx-auto mt-4 w-full max-w-[15rem]"
                                        icon="unlock"
                                        disabled={pin.length < 4 || !locked}
                                        onClick={submitPin}
                                    >
                                        {locked ? 'ปลดล็อกประตู' : 'ประตูปลดล็อกอยู่แล้ว'}
                                    </Button>

                                    {attempts > 0 && (
                                        <p className="mt-2 text-center text-xs text-amber-400">
                                            ใส่รหัสผิด {attempts}/{MAX_ATTEMPTS} ครั้ง
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </Card>

                    {/* เซ็นเซอร์ */}
                    <Card>
                        <CardHeader title="PIR_SENSOR_TEST" icon="motion" accent="text-amber-400" />
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                            <div>
                                <p className="text-sm text-zinc-300">จำลองคนเดินผ่านหน้าประตู</p>
                                <p className="text-xs text-zinc-500">สถานะจะกลับเป็นปกติเองใน 3 วินาที</p>
                            </div>
                            <Button
                                variant={motion ? 'secondary' : 'outline'}
                                icon="motion"
                                disabled={motion}
                                onClick={simulateMotion}
                            >
                                {motion ? 'กำลังตรวจจับ…' : 'จำลองการเคลื่อนไหว'}
                            </Button>
                        </div>

                        {motion && (
                            <div className="flex items-center gap-2 border-t border-zinc-800 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400">
                                <Icon name="alert" className="h-4 w-4" />
                                ตรวจพบการเคลื่อนไหวหน้าประตู!
                            </div>
                        )}
                    </Card>
                </div>

                {/* บันทึกเหตุการณ์ */}
                <Card className="lg:col-span-2">
                    <CardHeader
                        title="SECURITY_LOGS"
                        icon="clock"
                        subtitle={`${logs.length} เหตุการณ์`}
                        actions={
                            <select
                                value={filter}
                                onChange={(event) => setFilter(event.target.value)}
                                aria-label="กรองบันทึกเหตุการณ์"
                                className="rounded-lg border-zinc-700 bg-zinc-900 py-1 pl-2 pr-7 text-xs text-zinc-300 focus:border-emerald-500 focus:ring-emerald-500"
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="success">สำเร็จ</option>
                                <option value="warning">เตือน</option>
                                <option value="danger">อันตราย</option>
                                <option value="info">ข้อมูล</option>
                            </select>
                        }
                    />

                    {visibleLogs.length === 0 ? (
                        <EmptyState icon="clock" title="ยังไม่มีเหตุการณ์" description="การกระทำทั้งหมดจะถูกบันทึกที่นี่" />
                    ) : (
                        <ul className="max-h-[38rem] divide-y divide-zinc-800/70 overflow-y-auto">
                            {visibleLogs.map((log) => {
                                const level = LEVELS[log.level] ?? LEVELS.info;

                                return (
                                    <li key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                                        <Icon name={level.icon} className={`mt-0.5 h-4 w-4 shrink-0 ${level.color}`} />
                                        <p className="flex-1 text-sm text-zinc-300">{log.action}</p>
                                        <span className="shrink-0 font-mono text-[11px] text-zinc-600">{log.time}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
