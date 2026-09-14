import Icon from '@/Components/Icon';

const ACCENTS = {
    emerald: 'text-emerald-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    zinc: 'text-zinc-400',
};

export function StatCard({ label, value, unit, icon, accent = 'emerald', hint }) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
                {icon && <Icon name={icon} className={`h-4 w-4 ${ACCENTS[accent] ?? ACCENTS.emerald}`} />}
            </div>

            <p className="mt-2 flex items-baseline gap-1">
                <span className={`text-2xl font-semibold tabular-nums ${ACCENTS[accent] ?? ACCENTS.emerald}`}>
                    {value}
                </span>
                {unit && <span className="text-xs text-zinc-500">{unit}</span>}
            </p>

            {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
        </div>
    );
}

/** แถบแสดงระดับ เช่น แบตเตอรี่หรือสัญญาณ */
export function Meter({ value, max = 100, tone, className = '' }) {
    const percent = Math.max(0, Math.min(100, (value / max) * 100));

    const autoTone = percent < 20 ? 'bg-rose-500' : percent < 45 ? 'bg-amber-400' : 'bg-emerald-400';

    return (
        <div
            className={`h-1.5 w-full overflow-hidden rounded-full bg-zinc-800 ${className}`}
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                className={`h-full rounded-full transition-all duration-500 ${tone ?? autoTone}`}
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}

export function EmptyState({ icon = 'radar', title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="rounded-full border border-zinc-800 bg-zinc-900 p-3.5">
                <Icon name={icon} className="h-6 w-6 text-zinc-600" />
            </div>
            <h3 className="mt-3 font-mono text-sm uppercase tracking-[0.12em] text-zinc-400">{title}</h3>
            {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
