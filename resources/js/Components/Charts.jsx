/**
 * กราฟที่วาดด้วย SVG ล้วน ไม่ต้องพึ่งไลบรารีภายนอก
 * ทำให้ขนาดไฟล์เล็กและทำงานได้แม้ไม่มีอินเทอร์เน็ต
 */

const PALETTE = ['#34d399', '#22d3ee', '#fbbf24', '#fb7185', '#a78bfa', '#60a5fa'];

/** กราฟโดนัทแสดงสัดส่วน เช่น จำนวนโดรนแยกตามสถานะ */
export function DonutChart({ data = [], size = 148, thickness = 18, centerLabel, centerValue }) {
    const entries = data.filter((entry) => entry.value > 0);
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);

    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;

    return (
        <div className="flex flex-wrap items-center justify-center gap-5">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={thickness}
                        className="text-zinc-800"
                    />

                    {total > 0 &&
                        entries.map((entry, index) => {
                            const length = (entry.value / total) * circumference;
                            const dash = `${length} ${circumference - length}`;
                            const segment = (
                                <circle
                                    key={entry.label}
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    fill="none"
                                    stroke={entry.color ?? PALETTE[index % PALETTE.length]}
                                    strokeWidth={thickness}
                                    strokeDasharray={dash}
                                    strokeDashoffset={-offset}
                                    strokeLinecap="butt"
                                >
                                    <title>{`${entry.label}: ${entry.value}`}</title>
                                </circle>
                            );

                            offset += length;

                            return segment;
                        })}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-semibold tabular-nums text-zinc-100">{centerValue ?? total}</span>
                    {centerLabel && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                            {centerLabel}
                        </span>
                    )}
                </div>
            </div>

            <ul className="space-y-1.5">
                {data.map((entry, index) => (
                    <li key={entry.label} className="flex items-center gap-2 text-xs">
                        <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: entry.color ?? PALETTE[index % PALETTE.length] }}
                        />
                        <span className="text-zinc-400">{entry.label}</span>
                        <span className="ml-auto pl-3 font-mono tabular-nums text-zinc-200">{entry.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** กราฟแท่งแนวนอน เช่น จำนวนโดรนแยกตามชนิดอากาศยาน */
export function BarChart({ data = [] }) {
    const max = Math.max(1, ...data.map((entry) => entry.value));

    if (data.length === 0) {
        return <p className="py-6 text-center text-sm text-zinc-500">ยังไม่มีข้อมูล</p>;
    }

    return (
        <ul className="space-y-3">
            {data.map((entry, index) => (
                <li key={entry.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-zinc-400">{entry.label}</span>
                        <span className="font-mono tabular-nums text-zinc-200">{entry.value}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${(entry.value / max) * 100}%`,
                                backgroundColor: entry.color ?? PALETTE[index % PALETTE.length],
                            }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** กราฟเส้นขนาดเล็กสำหรับแสดงแนวโน้มค่า telemetry */
export function Sparkline({ points = [], width = 240, height = 56, color = '#22d3ee' }) {
    if (points.length < 2) {
        return <div className="flex h-14 items-center justify-center text-xs text-zinc-600">กำลังรอสัญญาณ…</div>;
    }

    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;

    const coordinates = points.map((point, index) => {
        const x = (index / (points.length - 1)) * width;
        const y = height - ((point - min) / range) * (height - 6) - 3;

        return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" preserveAspectRatio="none">
            <polyline
                points={`0,${height} ${coordinates.join(' ')} ${width},${height}`}
                fill={color}
                fillOpacity="0.12"
                stroke="none"
            />
            <polyline
                points={coordinates.join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}
