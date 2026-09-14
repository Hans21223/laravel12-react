import React from 'react';
import { useLocale } from './i18n';
import {
    Avatar,
    Badge,
    Empty,
    Icon,
    TechnicalArt,
    Priority,
    TypeIcon,
} from './UI';

export function Stats({ summary, onFilter }) {
    const { t, number } = useLocale();
    const spark = (key) => {
        const values = (summary.weeks || []).map((w) => Number(w[key] || 0));
        const max = Math.max(1, ...values);
        return values
            .map(
                (v, i) =>
                    `${i ? 'L' : 'M'}${2 + i * 16} ${28 - (v / max) * 24}`,
            )
            .join(' ');
    };
    return (
        <div className="stats-grid">
            {[
                ['total', 'layers', 'totalHint'],
                ['pending', 'clock', 'pendingHint'],
                ['approved', 'check', 'approvedHint'],
                ['rejected', 'close', 'rejectedHint'],
            ].map(([key, icon, hint]) => (
                <button
                    key={key}
                    className={`stat-card ${key}`}
                    onClick={() => onFilter(key === 'total' ? '' : key)}
                >
                    <div className="stat-top">
                        <span>{t(key)}</span>
                        <span className="stat-icon">
                            <Icon name={icon} size={17} />
                        </span>
                    </div>
                    <div className="stat-value">
                        {number(
                            key === 'total'
                                ? summary.total
                                : summary.counts?.[key],
                        )}
                        <svg viewBox="0 0 84 32" aria-hidden="true">
                            <path
                                d={spark(key)}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            />
                        </svg>
                    </div>
                    <small>{t(hint)}</small>
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
    return (
        <div className="charts-grid">
            <section className="panel activity-chart">
                <div className="panel-heading">
                    <div>
                        <h3>{t('activity')}</h3>
                        <p>{t('lastWeeks')}</p>
                    </div>
                    <div className="chart-legend">
                        <span>
                            <i />
                            {t('submitted')}
                        </span>
                        <span>
                            <i />
                            {t('approved')}
                        </span>
                    </div>
                </div>
                <div
                    className="bar-chart"
                    role="img"
                    aria-label={t('chartLabel')}
                >
                    <div className="chart-axis">
                        {[max, Math.round(max / 2), 0].map((n, i) => (
                            <span key={i}>{number(n)}</span>
                        ))}
                    </div>
                    <div className="chart-plot">
                        <div className="chart-gridline line-top" />
                        <div className="chart-gridline line-mid" />
                        <div className="chart-gridline line-bottom" />
                        {weeks.map((w) => (
                            <div className="bar-group" key={w.week}>
                                <div
                                    className="bar-pair"
                                    tabIndex={0}
                                    aria-label={`${date(w.week)}: ${w.total} ${t('submitted')}, ${w.approved} ${t('approved')}`}
                                >
                                    <div className="chart-tooltip">
                                        {date(w.week)}
                                        <strong>
                                            {w.total} {t('submitted')} ·{' '}
                                            {w.approved} {t('approved')}
                                        </strong>
                                    </div>
                                    <div
                                        className="bar submitted-bar"
                                        style={{
                                            height: `${(w.total / max) * 100}%`,
                                            minHeight: w.total ? 4 : 0,
                                        }}
                                    />
                                    <div
                                        className="bar approved-bar"
                                        style={{
                                            height: `${(w.approved / max) * 100}%`,
                                            minHeight: w.approved ? 4 : 0,
                                        }}
                                    />
                                </div>
                                <span>{date(w.week)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <section className="panel distribution">
                <div className="panel-heading">
                    <h3>{t('distribution')}</h3>
                    <Icon name="layers" size={18} />
                </div>
                <div className="donut-wrap">
                    <div
                        className="donut"
                        style={{
                            background: total
                                ? `conic-gradient(#244e80 0 ${leave}%, #86a4ca ${leave}% ${leave + budget}%, #d3dce8 ${leave + budget}% 100%)`
                                : 'var(--line)',
                        }}
                    >
                        <div>
                            <strong>{number(total)}</strong>
                            <span>{t('requestCount')}</span>
                        </div>
                    </div>
                </div>
                <div className="donut-legend">
                    {['leave', 'budget', 'document'].map((type) => (
                        <div key={type}>
                            <i className={type} />
                            <span>{t(type)}</span>
                            <strong>{number(types[type])}</strong>
                            <small>
                                {Math.round(
                                    ((types[type] || 0) / Math.max(total, 1)) *
                                        100,
                                )}
                                %
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
    return (
        <div className="table-scroll">
            <table className="request-table">
                <thead>
                    <tr>
                        <th>{t('request')}</th>
                        <th>{t('requester')}</th>
                        <th>{t('status')}</th>
                        <th>{t('priority')}</th>
                        {!compact && <th>{t('due')}</th>}
                        <th>
                            <span className="sr-only">{t('details')}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((item) => (
                        <tr key={item.id} onClick={() => onOpen(item.id)}>
                            <td>
                                <div className="request-cell">
                                    <TypeIcon type={item.type} />
                                    <div>
                                        <button
                                            className="request-title"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpen(item.id);
                                            }}
                                        >
                                            {item.title}
                                        </button>
                                        <small>
                                            REQ-
                                            {String(item.id).padStart(4, '0')}
                                            <span>·</span>
                                            {t(item.type)}
                                        </small>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className="person-cell">
                                    <Avatar
                                        src={item.owner?.avatar_url}
                                        name={item.owner?.name}
                                        small
                                    />
                                    <div>
                                        <strong>{item.owner?.name}</strong>
                                        <small>
                                            {t(`dept${item.department}`)}
                                        </small>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <Badge status={item.status} />
                            </td>
                            <td>
                                <Priority value={item.priority} />
                            </td>
                            {!compact && (
                                <td className="date-cell">
                                    {date(item.due_date)}
                                </td>
                            )}
                            <td>
                                <Icon name="right" size={16} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
export default function Dashboard({
    summary,
    user,
    onNavigate,
    onNew,
    onOpen,
    onFilter,
}) {
    const { t, date, number } = useLocale();
    return (
        <>
            <div className="page-heading">
                <div>
                    <div className="eyebrow">{t('overviewLabel')}</div>
                    <h1>{t('greeting')}</h1>
                    <p>{t('greetingSub')}</p>
                </div>
                <div className="overview-actions">
                    <button className="btn primary" onClick={() => onNew()}>
                        <Icon name="plus" size={17} />
                        {t('newRequest')}
                    </button>
                    <span className="date-chip">
                        <Icon name="calendar" size={16} />
                        {date(new Date().toISOString(), { year: 'numeric' })}
                    </span>
                </div>
            </div>
            <Stats summary={summary} onFilter={onFilter} />
            <section className="hero-banner">
                <div>
                    <span className="hero-kicker">
                        <span />
                        {t(user.role === 'manager' ? 'review' : 'workspace')}
                    </span>
                    <h2>
                        {t(
                            user.role === 'manager'
                                ? 'attention'
                                : 'employeeHero',
                        )}
                    </h2>
                    <p>
                        {user.role === 'manager' && (
                            <strong>{number(summary.review_count)} </strong>
                        )}
                        {t(
                            user.role === 'manager'
                                ? 'attentionSub'
                                : 'employeeHeroSub',
                        )}
                    </p>
                    <button
                        className="btn hero-button"
                        onClick={() =>
                            user.role === 'manager'
                                ? onNavigate('review')
                                : onNew()
                        }
                    >
                        {t(
                            user.role === 'manager'
                                ? 'reviewNow'
                                : 'createFirst',
                        )}
                        <Icon name="arrow" size={17} />
                    </button>
                </div>
                <TechnicalArt />
            </section>
            <Charts summary={summary} />
            <section className="panel recent-panel">
                <div className="panel-heading">
                    <div className="flex items-center gap-2">
                        <h3>{t('recent')}</h3>
                        <span className="count-pill">
                            {summary.recent?.length || 0}
                        </span>
                    </div>
                    <button
                        className="text-link"
                        onClick={() => onNavigate('requests')}
                    >
                        {t('viewAll')}
                        <Icon name="arrow" size={15} />
                    </button>
                </div>
                {summary.recent?.length ? (
                    <RequestTable
                        rows={summary.recent}
                        onOpen={onOpen}
                        compact
                    />
                ) : (
                    <Empty onCreate={onNew} />
                )}
            </section>
        </>
    );
}
