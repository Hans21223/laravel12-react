import Icon from '@/Components/Icon';

export function Card({ className = '', children, ...props }) {
    return (
        <div
            className={`rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-lg shadow-black/20 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ title, subtitle, icon, accent = 'text-emerald-400', actions, className = '' }) {
    return (
        <div
            className={`flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 ${className}`}
        >
            <div className="flex min-w-0 items-center gap-2.5">
                {icon && <Icon name={icon} className={`h-4 w-4 shrink-0 ${accent}`} />}
                <div className="min-w-0">
                    <h2 className="truncate font-mono text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                        {title}
                    </h2>
                    {subtitle && <p className="truncate text-xs text-zinc-500">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    );
}

export function CardBody({ className = '', children }) {
    return <div className={`p-4 ${className}`}>{children}</div>;
}

export default Card;
