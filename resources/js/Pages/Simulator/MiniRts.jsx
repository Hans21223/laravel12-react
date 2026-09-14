import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useReducer } from 'react';

import { BarChart } from '@/Components/Charts';
import Icon from '@/Components/Icon';
import Badge from '@/Components/UI/Badge';
import Button from '@/Components/UI/Button';
import { Card, CardHeader } from '@/Components/UI/Card';
import { EmptyState, StatCard } from '@/Components/UI/Stat';
import AppLayout from '@/Layouts/AppLayout';

let logSequence = 0;

const COSTS = {
    peons: { gold: 20, wood: 10 },
    soldiers: { gold: 50, wood: 50 },
    farmUpgrade: { gold: 120, wood: 80 },
    barracksUpgrade: { gold: 150, wood: 120 },
};

const INITIAL_STATE = {
    resources: { gold: 50, wood: 50 },
    units: { peons: 0, soldiers: 0 },
    upgrades: { farm: 1, barracks: 1 },
    score: { raids: 0, plunder: 0, losses: 0 },
    logs: [],
};

const LOG_STYLES = {
    success: 'text-emerald-400',
    danger: 'text-rose-400',
    warning: 'text-amber-400',
    info: 'text-zinc-300',
};

function withLog(state, action, level = 'info') {
    const time = new Date().toLocaleTimeString('th-TH');

    // เก็บแค่ 12 รายการล่าสุดเพื่อไม่ให้หน้าจอยาวเกิน
    return {
        ...state,
        logs: [{ id: ++logSequence, time, action, level }, ...state.logs].slice(0, 12),
    };
}

const canAfford = (resources, cost) => resources.gold >= cost.gold && resources.wood >= cost.wood;

const pay = (resources, cost) => ({
    gold: resources.gold - cost.gold,
    wood: resources.wood - cost.wood,
});

/**
 * รวม resources / units / upgrades / logs ไว้ใน reducer เดียว
 * ทำให้ "เช็คราคา → หักทรัพยากร → เพิ่มยูนิต" เกิดขึ้นเป็นก้อนเดียวแบบ atomic
 * จึงกดรัวๆ พร้อมกับรายได้อัตโนมัติแล้วทรัพยากรไม่มีทางติดลบ
 */
function gameReducer(state, action) {
    switch (action.type) {
        case 'GATHER':
            return withLog(
                {
                    ...state,
                    resources: {
                        ...state.resources,
                        [action.resource]: state.resources[action.resource] + action.amount,
                    },
                },
                action.log,
            );

        case 'TRAIN': {
            const cost = COSTS[action.unit];

            if (!canAfford(state.resources, cost)) {
                return withLog(
                    state,
                    `ทรัพยากรไม่พอ (ต้องการ ${cost.gold} Gold, ${cost.wood} Wood)`,
                    'warning',
                );
            }

            return withLog(
                {
                    ...state,
                    resources: pay(state.resources, cost),
                    units: { ...state.units, [action.unit]: state.units[action.unit] + 1 },
                },
                action.log,
                'success',
            );
        }

        case 'UPGRADE': {
            const cost = COSTS[action.cost];

            if (!canAfford(state.resources, cost)) {
                return withLog(state, `ทรัพยากรไม่พออัปเกรด (ต้องการ ${cost.gold} Gold, ${cost.wood} Wood)`, 'warning');
            }

            return withLog(
                {
                    ...state,
                    resources: pay(state.resources, cost),
                    upgrades: { ...state.upgrades, [action.building]: state.upgrades[action.building] + 1 },
                },
                action.log,
                'success',
            );
        }

        case 'RAID': {
            if (state.units.soldiers < 3) {
                return withLog(state, 'ต้องมีทหารอย่างน้อย 3 หน่วยจึงจะออกโจมตีได้', 'warning');
            }

            // โอกาสสำเร็จเพิ่มขึ้นตามจำนวนทหารและระดับค่ายทหาร
            const power = state.units.soldiers * state.upgrades.barracks;
            const success = Math.random() < Math.min(0.9, 0.35 + power * 0.04);
            const losses = success ? Math.min(state.units.soldiers, 1) : Math.min(state.units.soldiers, 2);
            const plunder = success ? 40 + power * 6 : 0;

            const next = {
                ...state,
                resources: {
                    gold: state.resources.gold + plunder,
                    wood: state.resources.wood + Math.round(plunder / 2),
                },
                units: { ...state.units, soldiers: state.units.soldiers - losses },
                score: {
                    raids: state.score.raids + 1,
                    plunder: state.score.plunder + plunder,
                    losses: state.score.losses + losses,
                },
            };

            return withLog(
                next,
                success
                    ? `บุกสำเร็จ! ได้ ${plunder} Gold · สูญเสียทหาร ${losses} หน่วย`
                    : `บุกล้มเหลว · สูญเสียทหาร ${losses} หน่วย`,
                success ? 'success' : 'danger',
            );
        }

        // รายได้จากคนงาน (ไม่บันทึก log เพื่อไม่ให้ log ท่วมหน้าจอ)
        case 'PASSIVE_INCOME': {
            const income = state.units.peons * 2 * state.upgrades.farm;

            if (income === 0) {
                return state;
            }

            return {
                ...state,
                resources: {
                    gold: state.resources.gold + income,
                    wood: state.resources.wood + income,
                },
            };
        }

        case 'RESET':
            return withLog(INITIAL_STATE, 'เริ่มเกมใหม่', 'info');

        default:
            return state;
    }
}

export default function MiniRts() {
    const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
    const { resources, units, upgrades, score, logs } = state;

    // คนงานฟาร์มทรัพยากรอัตโนมัติทุก 2 วินาที
    useEffect(() => {
        if (units.peons === 0) {
            return;
        }

        const interval = setInterval(() => dispatch({ type: 'PASSIVE_INCOME' }), 2000);

        return () => clearInterval(interval);
    }, [units.peons]);

    const incomePerTick = units.peons * 2 * upgrades.farm;

    const armyData = useMemo(
        () => [
            { label: 'คนงาน (Peon)', value: units.peons, color: '#22d3ee' },
            { label: 'ทหาร (Soldier)', value: units.soldiers, color: '#fb7185' },
        ],
        [units],
    );

    const actions = [
        {
            label: 'ขุดทอง',
            detail: '+10 Gold',
            icon: 'gold',
            onClick: () => dispatch({ type: 'GATHER', resource: 'gold', amount: 10, log: '⛏️ ขุดทองด้วยตัวเอง +10' }),
        },
        {
            label: 'ตัดไม้',
            detail: '+10 Wood',
            icon: 'wood',
            onClick: () => dispatch({ type: 'GATHER', resource: 'wood', amount: 10, log: '🪓 ตัดไม้ด้วยตัวเอง +10' }),
        },
    ];

    return (
        <AppLayout
            title="MINI_BASE_BUILDER"
            subtitle="เกมจำลองการจัดการทรัพยากรและกองทัพแบบเรียลไทม์"
            actions={
                <Button variant="outline" icon="refresh" onClick={() => dispatch({ type: 'RESET' })}>
                    เริ่มใหม่
                </Button>
            }
        >
            <Head title="Mini RTS" />

            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Gold" value={resources.gold} icon="gold" accent="amber" />
                <StatCard label="Wood" value={resources.wood} icon="wood" accent="emerald" />
                <StatCard
                    label="รายได้อัตโนมัติ"
                    value={incomePerTick}
                    unit="/ 2 วินาที"
                    icon="activity"
                    accent="cyan"
                    hint={`คนงาน ${units.peons} × ฟาร์มระดับ ${upgrades.farm}`}
                />
                <StatCard label="บุกสำเร็จ" value={score.raids} icon="sword" accent="rose" hint={`ปล้นได้รวม ${score.plunder} Gold`} />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-2">
                    <Card>
                        <CardHeader title="COMMAND_CENTER" icon="terminal" subtitle="เก็บทรัพยากรด้วยตัวเอง" />
                        <div className="grid gap-2 p-4 sm:grid-cols-2">
                            {actions.map((action) => (
                                <button
                                    key={action.label}
                                    type="button"
                                    onClick={action.onClick}
                                    className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-800 active:scale-[0.99]"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-amber-400">
                                        <Icon name={action.icon} className="h-4 w-4" />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-medium text-zinc-100">{action.label}</span>
                                        <span className="block font-mono text-xs text-zinc-500">{action.detail}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="BARRACKS" icon="sword" accent="text-rose-400" subtitle="สร้างยูนิตและอัปเกรดฐาน" />

                        <div className="grid gap-2 p-4 sm:grid-cols-2">
                            <TrainCard
                                title="สร้างคนงาน"
                                subtitle="Peon · เก็บทรัพยากรอัตโนมัติ"
                                icon="worker"
                                cost={COSTS.peons}
                                resources={resources}
                                onClick={() =>
                                    dispatch({ type: 'TRAIN', unit: 'peons', log: '👷 สร้างคนงานสำเร็จ (Peon)' })
                                }
                            />

                            <TrainCard
                                title="สร้างทหาร"
                                subtitle="Soldier · ใช้ในการบุกโจมตี"
                                icon="sword"
                                cost={COSTS.soldiers}
                                resources={resources}
                                onClick={() =>
                                    dispatch({ type: 'TRAIN', unit: 'soldiers', log: '⚔️ สร้างทหารสำเร็จ (Soldier)' })
                                }
                            />

                            <TrainCard
                                title={`อัปเกรดฟาร์ม → Lv.${upgrades.farm + 1}`}
                                subtitle="เพิ่มผลผลิตของคนงานทุกคน"
                                icon="wood"
                                cost={COSTS.farmUpgrade}
                                resources={resources}
                                onClick={() =>
                                    dispatch({
                                        type: 'UPGRADE',
                                        building: 'farm',
                                        cost: 'farmUpgrade',
                                        log: `🌾 อัปเกรดฟาร์มเป็นระดับ ${upgrades.farm + 1}`,
                                    })
                                }
                            />

                            <TrainCard
                                title={`อัปเกรดค่ายทหาร → Lv.${upgrades.barracks + 1}`}
                                subtitle="เพิ่มโอกาสสำเร็จในการบุก"
                                icon="shield"
                                cost={COSTS.barracksUpgrade}
                                resources={resources}
                                onClick={() =>
                                    dispatch({
                                        type: 'UPGRADE',
                                        building: 'barracks',
                                        cost: 'barracksUpgrade',
                                        log: `🛡️ อัปเกรดค่ายทหารเป็นระดับ ${upgrades.barracks + 1}`,
                                    })
                                }
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 p-4">
                            <div>
                                <p className="text-sm text-zinc-300">ส่งกองทัพออกโจมตี</p>
                                <p className="text-xs text-zinc-500">
                                    ต้องมีทหารอย่างน้อย 3 หน่วย · ยิ่งมีทหารและค่ายระดับสูง โอกาสสำเร็จยิ่งมาก
                                </p>
                            </div>
                            <Button
                                variant="danger"
                                icon="sword"
                                disabled={units.soldiers < 3}
                                onClick={() => dispatch({ type: 'RAID' })}
                            >
                                บุกโจมตี
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="ARMY_STATUS" icon="chart" accent="text-cyan-400" />
                        <div className="p-4">
                            <BarChart data={armyData} />

                            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
                                <Badge tone="emerald">ฟาร์ม Lv.{upgrades.farm}</Badge>
                                <Badge tone="violet">ค่ายทหาร Lv.{upgrades.barracks}</Badge>
                                <Badge tone="rose">สูญเสียทหารสะสม {score.losses}</Badge>
                            </div>
                        </div>
                    </Card>
                </div>

                <Card className="lg:col-span-1">
                    <CardHeader title="ACTION_LOGS" icon="clock" subtitle="12 รายการล่าสุด" />

                    {logs.length === 0 ? (
                        <EmptyState icon="terminal" title="ยังไม่มีการกระทำ" description="เริ่มจากการขุดทองหรือตัดไม้" />
                    ) : (
                        <ul className="divide-y divide-zinc-800/70">
                            {logs.map((log) => (
                                <li key={log.id} className="px-4 py-2.5">
                                    <p className={`text-sm ${LOG_STYLES[log.level] ?? LOG_STYLES.info}`}>{log.action}</p>
                                    <p className="mt-0.5 font-mono text-[11px] text-zinc-600">{log.time}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

function TrainCard({ title, subtitle, icon, cost, resources, onClick }) {
    const affordable = resources.gold >= cost.gold && resources.wood >= cost.wood;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition active:scale-[0.99] ${
                affordable
                    ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-800'
                    : 'border-zinc-800/60 bg-zinc-900/30 opacity-60'
            }`}
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-emerald-400">
                <Icon name={icon} className="h-4 w-4" />
            </span>

            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-100">{title}</span>
                <span className="block truncate text-xs text-zinc-500">{subtitle}</span>
                <span className="mt-1 flex gap-2 font-mono text-[11px]">
                    <span className={resources.gold >= cost.gold ? 'text-amber-400' : 'text-rose-400'}>
                        {cost.gold} Gold
                    </span>
                    <span className={resources.wood >= cost.wood ? 'text-emerald-400' : 'text-rose-400'}>
                        {cost.wood} Wood
                    </span>
                </span>
            </span>
        </button>
    );
}
