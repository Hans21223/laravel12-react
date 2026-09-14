import { Link } from '@inertiajs/react';

import Icon from '@/Components/Icon';

/**
 * แถบแบ่งหน้า ใช้ links ที่ Laravel paginator ส่งมาให้โดยตรง
 */
export default function Pagination({ meta }) {
    if (!meta || meta.last_page <= 1) {
        return null;
    }

    const { links = [], from, to, total } = meta;

    return (
        <nav
            className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3"
            aria-label="แบ่งหน้า"
        >
            <p className="font-mono text-xs text-zinc-500">
                แสดง <span className="text-zinc-300">{from ?? 0}</span>–<span className="text-zinc-300">{to ?? 0}</span>{' '}
                จาก <span className="text-zinc-300">{total}</span> ยูนิต
            </p>

            <div className="flex flex-wrap items-center gap-1">
                {links.map((link, index) => {
                    const isPrevious = index === 0;
                    const isNext = index === links.length - 1;

                    const content = isPrevious ? (
                        <Icon name="chevronLeft" className="h-4 w-4" />
                    ) : isNext ? (
                        <Icon name="chevronRight" className="h-4 w-4" />
                    ) : (
                        link.label
                    );

                    const base =
                        'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-mono text-xs transition';

                    if (!link.url) {
                        return (
                            <span key={index} className={`${base} cursor-not-allowed text-zinc-700`} aria-disabled>
                                {content}
                            </span>
                        );
                    }

                    return (
                        <Link
                            key={index}
                            href={link.url}
                            preserveScroll
                            preserveState
                            aria-current={link.active ? 'page' : undefined}
                            className={`${base} ${
                                link.active
                                    ? 'bg-emerald-500 font-semibold text-zinc-950'
                                    : 'text-zinc-400 ring-1 ring-inset ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-100'
                            }`}
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
