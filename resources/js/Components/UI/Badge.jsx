const TONES = {
    emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/30',
    amber: 'bg-amber-500/10 text-amber-400 ring-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-400 ring-rose-500/30',
    zinc: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/30',
    violet: 'bg-violet-500/10 text-violet-400 ring-violet-500/30',
};

/** สีประจำแต่ละสถานะของโดรน ใช้ร่วมกันทุกหน้าเพื่อให้อ่านง่ายเหมือนกันหมด */
export const STATUS_TONES = {
    Standby: 'zinc',
    In_Flight: 'cyan',
    Returning: 'amber',
    Maintenance: 'rose',
};

export default function Badge({ tone = 'zinc', dot = false, className = '', children }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-medium ring-1 ring-inset ${
                TONES[tone] ?? TONES.zinc
            } ${className}`}
        >
            {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            {children}
        </span>
    );
}

export function StatusBadge({ status, dot = true }) {
    return (
        <Badge tone={STATUS_TONES[status] ?? 'zinc'} dot={dot}>
            {status?.replace('_', ' ') ?? 'UNKNOWN'}
        </Badge>
    );
}
