import React from 'react';
import { useLocale } from './i18n';
import { RouteSummary } from './Workflow';
import {
    Avatar,
    Badge,
    CountPill,
    Empty,
    Icon,
    PageHeading,
    Priority,
    TechnicalArt,
    TypeIcon,
} from './UI';

const statTones = {
    total: {
        icon: 'bg-[#edf1f7] text-[#67809c] dark:bg-[#263851] dark:text-[#95afd0]',
        spark: 'text-[#5379a5]',
        bar: 'after:bg-[#5b789c]',
    },
    pending: {
        icon: 'bg-[#fcf5e7] text-[#bb954d]',
        spark: 'text-[#baa46f]',
        bar: 'after:bg-[#c2a15c]',
    },
    approved: {
        icon: 'bg-[#eaf0f7] text-[#558a62]',
        spark: 'text-[#5379a5]',
        bar: 'after:bg-[#648e80]',
    },
    rejected: {
        icon: 'bg-[#faf0ed] text-[#b77d6d]',
        spark: 'text-[#bb777e]',
        bar: 'after:bg-signal',
    },
};

export function Stats({ summary, onFilter }) {
    const { t, number } = useLocale();
    const spark = (key) => {
        const values = (summary.weeks || []).map((w) => Number(w[key] || 0));
        const max = Math.max(1, ...values);
        return values
            .map((v, i) => `${i ? 'L' : 'M'}${2 + i * 16} ${28 - (v / max) * 24}`)
            .join(' ');
    };
    return (
        <div className="mb-[23px] grid grid-cols-4 gap-[15px] max-xl:gap-[11px] max-lg:grid-cols-2 max-md:mb-[18px] max-md:gap-3 2xl:gap-[22px]">
            {[
                ['total', 'layers', 'totalHint'],
                ['pending', 'clock', 'pendingHint'],
                ['approved', 'check', 'approvedHint'],
                ['rejected', 'close', 'rejectedHint'],
            ].map(([key, icon, hint]) => (
                <button
                    key={key}
                    className={`relative overflow-hidden rounded-[5px] border border-line bg-surface px-[18px] pb-4 pt-[17px] text-left shadow-card after:absolute after:bottom-0 after:left-[18px] after:h-0.5 after:w-7 after:content-[''] hover:-translate-y-0.5 hover:border-[#9db2ca] hover:[box-shadow:0_3px_16px_#23426c09] dark:hover:border-[#48668b] max-xl:px-3.5 max-xl:pb-3.5 max-lg:px-[17px] max-lg:pb-[17px] max-md:px-4 max-md:pb-4 2xl:px-[22px] 2xl:pb-[22px] print:break-inside-avoid ${statTones[key].bar}`}
                    onClick={() => onFilter(key === 'total' ? '' : key)}
                >
                    <div className="flex items-center justify-between text-[11px] text-muted">
                        <span className="font-technical text-[11px] font-[550] tracking-[0.4px]">
                            {t(key)}
                        </span>
                        <span
                            className={`grid size-[27px] place-items-center rounded ${statTones[key].icon}`}
                        >
                            <Icon name={icon} size={17} />
                        </span>
                    </div>
                    <div className="mx-0 mb-1.5 mt-[7px] flex items-center justify-between font-technical text-[31px] font-medium leading-[1.4] tracking-[-0.6px] max-xl:text-[28px]">
                        {number(key === 'total' ? summary.total : summary.counts?.[key])}
                        <svg
                            viewBox="0 0 84 32"
                            aria-hidden="true"
                            className={`h-7 w-[66px] opacity-75 max-xl:w-[45px] max-lg:w-[70px] max-md:w-[55px] ${statTones[key].spark}`}
                        >
                            <path d={spark(key)} fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    </div>
                    <small className="text-[10px] text-muted">{t(hint)}</small>
                </button>
            ))}
        </div>
    );
}

export function Charts({ summary }) {
    const { t, date, number } = useLocale();
    const weeks = summary.weeks || [];
    const max = Math.max(1, ...weeks.flatMap((w) => [w.total, w.approved]));
    const types = summary.types || {};
    const total = Object.values(types).reduce((a, b) => a + Number(b), 0);
    const leave = ((types.leave || 0) / Math.max(total, 1)) * 100;
    const budget = ((types.budget || 0) / Math.max(total, 1)) * 100;
    const gridline = 'absolute inset-x-0 border-b border-dashed border-b-line';
    const bar = 'w-4 max-w-[42%] rounded-t-[3px] [transition:height_0.5s_ease]';
    return (
        <div className="mb-[23px] grid grid-cols-[1.65fr_1fr] gap-5 max-xl:grid-cols-[1.5fr_1fr] max-xl:gap-[15px] max-lg:grid-cols-1 max-md:mb-[18px]">
            <section className="panel">
                <div className="panel-heading">
                    <div>
                        <h3>{t('activity')}</h3>
                        <p>{t('lastWeeks')}</p>
                    </div>
                    <div className="flex items-center gap-[15px] text-[9px] text-muted max-xl:gap-2">
                        <span className="flex items-center gap-[5px]">
                            <i className="size-[7px] rounded-sm bg-[#b7c9e0]" />
                            {t('submitted')}
                        </span>
                        <span className="flex items-center gap-[5px]">
                            <i className="size-[7px] rounded-sm bg-[#365f93]" />
                            {t('approved')}
                        </span>
                    </div>
                </div>
                <div
                    className="mb-[7px] flex h-[187px] gap-[17px] pb-5 pl-[22px] pr-6 pt-[13px] max-xl:pl-[17px] max-xl:pr-[15px] max-lg:h-[200px] 2xl:h-[205px]"
                    role="img"
                    aria-label={t('chartLabel')}
                >
                    <div className="flex min-w-3 flex-col justify-between pb-6 text-[9px] text-muted">
                        {[max, Math.round(max / 2), 0].map((n, i) => (
                            <span key={i}>{number(n)}</span>
                        ))}
                    </div>
                    <div className="relative flex min-w-0 flex-1 justify-around gap-5 max-xl:gap-[9px]">
                        <div className={`${gridline} top-0`} />
                        <div className={`${gridline} top-[calc(50%_-_12px)]`} />
                        <div className={`${gridline} bottom-6`} />
                        {weeks.map((w) => (
                            <div
                                className="relative z-[1] flex min-w-0 max-w-[53px] flex-1 flex-col items-center"
                                key={w.week}
                            >
                                <div
                                    className="group relative flex h-[calc(100%_-_24px)] w-full items-end justify-center gap-[5px]"
                                    tabIndex={0}
                                    aria-label={`${date(w.week)}: ${w.total} ${t('submitted')}, ${w.approved} ${t('approved')}`}
                                >
                                    <div className="absolute bottom-full z-[5] hidden whitespace-nowrap rounded-md bg-ink px-2.5 py-2 text-[9px] text-surface [box-shadow:0_4px_18px_#0002] group-hover:block group-focus:block">
                                        {date(w.week)}
                                        <strong className="mt-[3px] block font-medium">
                                            {w.total} {t('submitted')} · {w.approved} {t('approved')}
                                        </strong>
                                    </div>
                                    <div
                                        className={`${bar} bg-[#b7c9e0]`}
                                        style={{
                                            height: `${(w.total / max) * 100}%`,
                                            minHeight: w.total ? 4 : 0,
                                        }}
                                    />
                                    <div
                                        className={`${bar} bg-[#365f93]`}
                                        style={{
                                            height: `${(w.approved / max) * 100}%`,
                                            minHeight: w.approved ? 4 : 0,
                                        }}
                                    />
                                </div>
                                <span className="mt-2.5 whitespace-nowrap text-[9px] text-muted">
                                    {date(w.week)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <section className="panel max-lg:grid max-lg:grid-cols-2 max-lg:items-center max-lg:pb-[15px]">
                <div className="panel-heading pb-[3px] max-lg:col-span-2">
                    <h3>{t('distribution')}</h3>
                    <Icon name="layers" size={18} />
                </div>
                <div className="flex h-[131px] items-center justify-center max-lg:h-[150px] 2xl:h-[150px]">
                    <div
                        className="grid size-[117px] -rotate-90 place-items-center rounded-full"
                        style={{
                            background: total
                                ? `conic-gradient(#244e80 0 ${leave}%, #86a4ca ${leave}% ${leave + budget}%, #d3dce8 ${leave + budget}% 100%)`
                                : 'var(--line)',
                        }}
                    >
                        <div className="flex size-[90px] rotate-90 flex-col items-center justify-center rounded-full bg-surface">
                            <strong className="text-[25px] font-semibold leading-[1.2] tracking-[-1px]">
                                {number(total)}
                            </strong>
                            <span className="mt-0.5 text-[9px] text-muted">{t('requestCount')}</span>
                        </div>
                    </div>
                </div>
                <div className="px-[25px] pb-[17px] pt-px max-lg:py-0 max-lg:pl-0 max-lg:pr-[25px]">
                    {['leave', 'budget', 'document'].map((type) => (
                        <div key={type} className="mt-2 flex items-center gap-[7px] text-[10px]">
                            <i
                                className={`size-[7px] rounded-sm ${{ leave: 'bg-[#244e80]', budget: 'bg-[#86a4ca]', document: 'bg-[#d3dce8]' }[type]}`}
                            />
                            <span className="text-muted">{t(type)}</span>
                            <strong className="ml-auto text-[11px] font-semibold">{number(types[type])}</strong>
                            <small className="w-[30px] text-right text-[9px] text-muted">
                                {Math.round(((types[type] || 0) / Math.max(total, 1)) * 100)}%
                            </small>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

export function RequestTable({ rows, onOpen, compact = false }) {
    const { t, date } = useLocale();
    const th = 'px-4 py-2.5 text-[10px] font-[550] tracking-[0.3px] text-muted first:pl-[21px] max-xl:px-3 compact:py-[9px]';
    const td = 'border-b border-b-line px-4 py-[15px] text-[11px] text-muted first:pl-[21px] max-xl:px-3 compact:py-[9px] 2xl:py-[18px] [tr:last-child_&]:border-b-0';
    return (
        <div className="relative overflow-x-auto">
            <table
                className={`w-full border-collapse whitespace-nowrap text-left ${compact ? 'max-md:min-w-[650px]' : 'max-md:min-w-[720px]'}`}
            >
                <thead className="border-y border-y-line bg-surface-alt">
                    <tr>
                        <th className={th}>{t('request')}</th>
                        <th className={th}>{t('requester')}</th>
                        <th className={th}>{t('status')}</th>
                        <th className={th}>{t('priority')}</th>
                        {!compact && <th className={th}>{t('due')}</th>}
                        <th className={th}>
                            <span className="sr-only">{t('details')}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((item) => (
                        <tr
                            key={item.id}
                            className="cursor-pointer [transition:background_0.12s] hover:bg-surface-alt"
                            onClick={() => onOpen(item.id)}
                        >
                            <td className={td}>
                                <div className="flex max-w-[380px] items-center gap-[11px] max-xl:max-w-[280px]">
                                    <TypeIcon type={item.type} />
                                    <div className="min-w-0">
                                        <button
                                            className="block max-w-full truncate text-left text-[11px] font-semibold tracking-[-0.1px] text-ink hover:text-brand hover:underline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpen(item.id);
                                            }}
                                        >
                                            {item.title}
                                        </button>
                                        <small className="mt-1 block font-code text-[9px] text-muted">
                                            REQ-{String(item.id).padStart(4, '0')}
                                            <span className="mx-[7px] my-0">·</span>
                                            {t(item.type)}
                                        </small>
                                        <RouteSummary item={item} />
                                    </div>
                                </div>
                            </td>
                            <td className={td}>
                                <div className="flex items-center gap-2">
                                    <Avatar src={item.owner?.avatar_url} name={item.owner?.name} small />
                                    <div>
                                        <strong className="block text-[10px] font-medium text-ink">
                                            {item.owner?.name}
                                        </strong>
                                        <small className="mt-0.5 block text-[9px] text-muted">
                                            {t(`dept${item.department}`)}
                                        </small>
                                    </div>
                                </div>
                            </td>
                            <td className={td}>
                                <Badge status={item.status} />
                            </td>
                            <td className={td}>
                                <Priority value={item.priority} className="max-xl:text-[9px]" />
                            </td>
                            {!compact && (
                                <td className={`${td} font-code !text-[10px]`}>{date(item.due_date)}</td>
                            )}
                            <td className={td}>
                                <Icon name="right" size={16} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function Dashboard({ summary, user, onNavigate, onNew, onOpen, onFilter }) {
    const { t, date, number } = useLocale();
    const manager = user.role === 'manager';
    return (
        <>
            <PageHeading
                eyebrow={t('overviewLabel')}
                title={t('greeting')}
                sub={t('greetingSub')}
                compactTitle
                actions={
                    <div className="flex shrink-0 flex-col items-end gap-2.5 max-md:pt-4">
                        <button
                            className="btn primary max-md:min-h-9 max-md:w-9 max-md:gap-0 max-md:p-[9px] max-md:text-[0px] max-md:[&_svg]:size-[18px]"
                            onClick={() => onNew()}
                        >
                            <Icon name="plus" size={17} />
                            {t('newRequest')}
                        </button>
                        <span className="flex items-center gap-2 whitespace-nowrap text-[10px] text-muted max-lg:hidden">
                            <Icon name="calendar" size={16} />
                            {date(new Date().toISOString(), { year: 'numeric' })}
                        </span>
                    </div>
                }
            />
            <Stats summary={summary} onFilter={onFilter} />
            <section className="relative mb-[23px] flex min-h-[214px] items-center overflow-hidden rounded-[5px] border border-[#2b4a6c] bg-[linear-gradient(110deg,#1a304f,#203f63_65%,#294a6d)] px-[30px] py-7 text-[#f4f7fc] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(#ffffff03_1px,transparent_1px),linear-gradient(90deg,#ffffff03_1px,transparent_1px)] before:bg-[length:26px_26px] before:content-[''] after:absolute after:left-[30px] after:top-0 after:h-[3px] after:w-11 after:bg-signal after:content-[''] dark:border-[#355378] dark:bg-[linear-gradient(110deg,#193252,#204164)] max-md:mb-[18px] max-md:min-h-[218px] max-md:p-6 max-md:after:left-6">
                <div className="z-[1] max-w-[68%] max-xl:max-w-[71%] max-lg:max-w-[82%] max-md:max-w-[90%]">
                    <span className="inline-flex items-center gap-[7px] font-mono text-[9px] font-semibold tracking-[1px] text-[#9cb7d5]">
                        <span className="size-[5px] bg-[#d36770]" />
                        {t(manager ? 'review' : 'workspace')}
                    </span>
                    <h2 className="mx-0 mb-[7px] mt-2 font-technical text-[27px] font-[550] tracking-[-0.5px] max-xl:text-[25px]">
                        {t(manager ? 'attention' : 'employeeHero')}
                    </h2>
                    <p className="max-w-[490px] text-[12px] leading-[1.7] text-[#a8bbd2] max-md:text-[11px]">
                        {manager && (
                            <strong className="font-[650] text-[#eaf1fc]">{number(summary.review_count)} </strong>
                        )}
                        {t(manager ? 'attentionSub' : 'employeeHeroSub')}
                    </p>
                    <button
                        className="btn mt-[17px] min-h-[35px] !rounded-[3px] border-[#c6d6e9] bg-[#e7eef8] px-3 py-2 text-[11px] text-[#233e61] shadow-none hover:bg-white hover:text-[#213a5d] hover:[box-shadow:0_4px_10px_#3e5b3310]"
                        onClick={() => (manager ? onNavigate('review') : onNew())}
                    >
                        {t(manager ? 'reviewNow' : 'createFirst')}
                        <Icon name="arrow" size={17} />
                    </button>
                </div>
                <TechnicalArt />
            </section>
            <Charts summary={summary} />
            <section className="panel">
                <div className="panel-heading">
                    <div className="flex items-center gap-2">
                        <h3>{t('recent')}</h3>
                        <CountPill>{summary.recent?.length || 0}</CountPill>
                    </div>
                    <button className="text-link max-md:text-[10px]" onClick={() => onNavigate('requests')}>
                        {t('viewAll')}
                        <Icon name="arrow" size={15} />
                    </button>
                </div>
                {summary.recent?.length ? (
                    <RequestTable rows={summary.recent} onOpen={onOpen} compact />
                ) : (
                    <Empty onCreate={onNew} />
                )}
            </section>
        </>
    );
}
