import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Head, router, usePage } from '@inertiajs/react';
import { LocaleProvider, useLocale } from './i18n';
import {
    Avatar,
    Badge,
    Empty,
    Field,
    Icon,
    LanguagePicker,
    Logo,
    Modal,
    Priority,
    TypeIcon,
} from './UI';
import Dashboard, { Charts, RequestTable } from './Dashboard';
import { errorText, RequestDetail, RequestForm } from './RequestDialogs';
import '../../../css/accord.css';
import '../../../css/anaheim.css';

const views = [
    'overview',
    'requests',
    'mine',
    'review',
    'insights',
    'notifications',
    'settings',
    'help',
];
const navIcons = {
    overview: 'grid',
    requests: 'layers',
    mine: 'file',
    review: 'inbox',
    insights: 'chart',
    notifications: 'bell',
    settings: 'settings',
    help: 'help',
};
const initialView = () => {
    const value = new URLSearchParams(location.search).get('view');
    return views.includes(value) ? value : 'overview';
};

function WorkspaceContent({ initialUser }) {
    const { t, date, number, money, locale, setLocale } = useLocale();
    const [user, setUser] = useState(initialUser),
        [view, setView] = useState(initialView),
        [theme, setTheme] = useState(
            () => localStorage.getItem('accord.theme') || 'light',
        ),
        [mobile, setMobile] = useState(false);
    const [summary, setSummary] = useState(null),
        [notifications, setNotifications] = useState({ items: [], unread: 0 }),
        [listing, setListing] = useState({
            data: [],
            total: 0,
            current_page: 1,
            last_page: 1,
        });
    const [search, setSearch] = useState(''),
        [debounced, setDebounced] = useState(''),
        [status, setStatus] = useState(''),
        [type, setType] = useState(''),
        [priority, setPriority] = useState(''),
        [sort, setSort] = useState('newest'),
        [page, setPage] = useState(1),
        [display, setDisplay] = useState('list');
    const [loading, setLoading] = useState(true),
        [listLoading, setListLoading] = useState(false),
        [error, setError] = useState(null),
        [listError, setListError] = useState(null),
        [refresh, setRefresh] = useState(0);
    const [detail, setDetail] = useState(null),
        [form, setForm] = useState(null),
        [searchModal, setSearchModal] = useState(false),
        [toastItems, setToastItems] = useState([]),
        [exporting, setExporting] = useState(false);
    const toastId = useRef(0),
        openSequence = useRef(0),
        timers = useRef([]);
    const toast = useCallback((message, tone = 'success') => {
        const id = ++toastId.current;
        setToastItems((items) => [...items.slice(-3), { id, message, tone }]);
        timers.current.push(
            setTimeout(
                () =>
                    setToastItems((items) => items.filter((x) => x.id !== id)),
                5500,
            ),
        );
    }, []);
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebounced(search);
            setPage(1);
        }, 250);
        return () => clearTimeout(timer);
    }, [search]);
    useEffect(() => {
        localStorage.setItem('accord.theme', theme);
        document.documentElement.dataset.accordTheme = theme;
        return () => delete document.documentElement.dataset.accordTheme;
    }, [theme]);
    const navigate = useCallback((next) => {
        setView(next);
        setMobile(false);
        setPage(1);
        setStatus('');
        setType('');
        setPriority('');
        setSearch('');
        setDebounced('');
        history.pushState({}, '', `/approvals?view=${next}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);
    useEffect(() => {
        const pop = () => {
            setView(initialView());
            setPage(1);
        };
        window.addEventListener('popstate', pop);
        return () => window.removeEventListener('popstate', pop);
    }, []);
    useEffect(() => {
        const key = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchModal(true);
            }
            if (
                e.key.toLowerCase() === 'n' &&
                !e.ctrlKey &&
                !e.metaKey &&
                !['INPUT', 'TEXTAREA', 'SELECT'].includes(
                    document.activeElement?.tagName,
                ) &&
                !detail &&
                !form &&
                !searchModal
            ) {
                e.preventDefault();
                setForm({});
            }
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [detail, form, searchModal]);
    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        async function load(initial = false) {
            try {
                const [s, n] = await Promise.all([
                    axios.get('/api/approvals/summary', {
                        signal: controller.signal,
                    }),
                    axios.get('/api/approvals/notifications', {
                        signal: controller.signal,
                    }),
                ]);
                if (active) {
                    setSummary(s.data);
                    setNotifications(n.data);
                    setError(null);
                }
            } catch (e) {
                if (active && !axios.isCancel(e)) setError(e);
            } finally {
                if (active && initial) setLoading(false);
            }
        }
        load(true);
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') load();
        }, 15000);
        const visible = () => {
            if (document.visibilityState === 'visible') load();
        };
        document.addEventListener('visibilitychange', visible);
        return () => {
            active = false;
            controller.abort();
            clearInterval(timer);
            document.removeEventListener('visibilitychange', visible);
        };
    }, [refresh]);
    const params = {
        search: debounced || undefined,
        status: status || undefined,
        type: type || undefined,
        priority: priority || undefined,
        sort,
        page,
        per_page: 8,
        scope: view === 'mine' ? 'mine' : view === 'review' ? 'review' : 'all',
    };
    useEffect(() => {
        if (!['requests', 'mine', 'review'].includes(view)) return;
        const controller = new AbortController();
        let active = true;
        setListLoading(true);
        const load = () =>
            axios
                .get('/api/approvals', { params, signal: controller.signal })
                .then(({ data }) => {
                    if (active) {
                        setListing(data);
                        setListError(null);
                        if (data.current_page > data.last_page)
                            setPage(data.last_page);
                    }
                })
                .catch((e) => {
                    if (active && !axios.isCancel(e)) setListError(e);
                })
                .finally(() => {
                    if (active) setListLoading(false);
                });
        load();
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') load();
        }, 15000);
        return () => {
            active = false;
            controller.abort();
            clearInterval(timer);
        };
    }, [view, debounced, status, type, priority, sort, page, refresh]);
    const reload = () => setRefresh((r) => r + 1);
    async function open(id) {
        const sequence = ++openSequence.current;
        try {
            const { data } = await axios.get(`/api/approvals/${id}`);
            if (sequence === openSequence.current) setDetail(data);
        } catch (e) {
            toast(errorText(e, t), 'error');
        }
    }
    function filterBy(value) {
        navigate('requests');
        setStatus(value);
    }
    async function readAll() {
        try {
            const { data } = await axios.patch(
                '/api/approvals/notifications/read',
            );
            setNotifications(data);
        } catch (e) {
            toast(errorText(e, t), 'error');
        }
    }
    async function notificationOpen(n) {
        try {
            const { data } = await axios.patch(
                '/api/approvals/notifications/read',
                { id: n.id },
            );
            setNotifications(data);
            await open(n.approval_request_id);
        } catch (e) {
            toast(errorText(e, t), 'error');
        }
    }
    async function exportCsv() {
        setExporting(true);
        try {
            const response = await axios.get('/api/approvals/export', {
                params,
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ae-requests-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast(t('exportSuccess'));
        } catch (e) {
            toast(errorText(e, t), 'error');
        } finally {
            setExporting(false);
        }
    }
    const heading = (title, sub, actions) => (
        <div className="page-heading">
            <div>
                <div className="eyebrow">AE / {t('workspace')}</div>
                <h1>{t(title)}</h1>
                <p>{t(sub)}</p>
            </div>
            {actions}
        </div>
    );
    const nav = (
        <>
            <div className="sidebar-brand">
                <Logo />
                <button
                    className="icon-button mobile-close"
                    aria-label={t('closeMenu')}
                    onClick={() => setMobile(false)}
                >
                    <Icon name="close" />
                </button>
            </div>
            <div className="organization">
                <span className="organization-mark">AE</span>
                <div>
                    <strong>AE Operations</strong>
                    <small>{t('team')}</small>
                </div>
                <span className="org-dot" />
            </div>
            <p className="nav-label">{t('mainMenu')}</p>
            <nav>
                {[
                    'overview',
                    'requests',
                    'mine',
                    ...(user.role === 'manager' ? ['review'] : []),
                    'insights',
                ].map((key) => (
                    <button
                        key={key}
                        className={`nav-link ${view === key ? 'active' : ''}`}
                        onClick={() => navigate(key)}
                        aria-current={view === key ? 'page' : undefined}
                    >
                        <Icon name={navIcons[key]} size={19} />
                        <span>{t(key)}</span>
                        {key === 'review' && summary?.review_count > 0 && (
                            <b>{summary.review_count}</b>
                        )}
                    </button>
                ))}
            </nav>
            <p className="nav-label second-label">{t('tools')}</p>
            <nav>
                {['notifications', 'settings', 'help'].map((key) => (
                    <button
                        key={key}
                        className={`nav-link ${view === key ? 'active' : ''}`}
                        onClick={() => navigate(key)}
                    >
                        <Icon name={navIcons[key]} size={19} />
                        <span>{t(key)}</span>
                        {key === 'notifications' &&
                            notifications.unread > 0 && (
                                <i className="nav-notification-dot" />
                            )}
                    </button>
                ))}
            </nav>
            <div className="sidebar-bottom">
                <div className="sidebar-tip">
                    <span>
                        <Icon name="spark" size={17} />
                        {t('workflow')}
                    </span>
                    <p>{t('securityTitle')}</p>
                    <button onClick={() => navigate('help')}>
                        {t('help')}
                        <Icon name="arrow" size={15} />
                    </button>
                </div>
                <button
                    className="sidebar-profile"
                    onClick={() => navigate('settings')}
                >
                    <Avatar name={user.name} />
                    <span>
                        <strong>{user.name}</strong>
                        <small>{t(user.role)}</small>
                    </span>
                    <Icon name="settings" size={16} />
                </button>
            </div>
        </>
    );
    return (
        <div className="accord workspace-shell" data-theme={theme}>
            <Head title={t(view)} />
            <aside className="sidebar">{nav}</aside>
            {mobile && (
                <Modal
                    title={t('workspace')}
                    onClose={() => setMobile(false)}
                    className="mobile-nav-dialog"
                >
                    {nav}
                </Modal>
            )}
            <div className="workspace-main">
                <header className="topbar">
                    <div className="topbar-breadcrumb">
                        <button
                            className="icon-button mobile-menu"
                            aria-label={t('openMenu')}
                            onClick={() => setMobile(true)}
                        >
                            <Icon name="menu" />
                        </button>
                        <span>{t('workspace')}</span>
                        <Icon name="right" size={13} />
                        <strong>{t(view)}</strong>
                    </div>
                    <div className="topbar-actions">
                        <button
                            className="global-search"
                            onClick={() => setSearchModal(true)}
                        >
                            <Icon name="search" size={17} />
                            <span>{t('search')}</span>
                            <kbd>Ctrl K</kbd>
                        </button>
                        <LanguagePicker />
                        <button
                            className="icon-button bell-button"
                            aria-label={t('notifications')}
                            onClick={() => navigate('notifications')}
                        >
                            <Icon name="bell" />
                            {notifications.unread > 0 && <i />}
                        </button>
                        <span className="topbar-divider" />
                        <Avatar name={user.name} small />
                    </div>
                </header>
                <main className="workspace-content" id="main-content">
                    {error && (
                        <div className="error-banner" role="alert">
                            <Icon name="refresh" size={17} />
                            <span>{errorText(error, t)}</span>
                            <button onClick={reload}>{t('retry')}</button>
                        </div>
                    )}
                    {loading && !summary ? (
                        <div
                            className="loading-skeleton"
                            aria-label={t('loading')}
                        >
                            <div />
                            <div className="skeleton-cards">
                                {[1, 2, 3, 4].map((x) => (
                                    <i key={x} />
                                ))}
                            </div>
                            <div />
                        </div>
                    ) : (
                        <>
                            {view === 'overview' && summary && (
                                <Dashboard
                                    summary={summary}
                                    user={user}
                                    onNavigate={navigate}
                                    onNew={() => setForm({})}
                                    onOpen={open}
                                    onFilter={filterBy}
                                />
                            )}
                            {['requests', 'mine', 'review'].includes(view) && (
                                <>
                                    {heading(
                                        view,
                                        view === 'mine'
                                            ? 'mineSub'
                                            : view === 'review'
                                              ? 'reviewSub'
                                              : 'requestSub',
                                        <button
                                            className="btn primary"
                                            onClick={() => setForm({})}
                                        >
                                            <Icon name="plus" size={18} />
                                            {t('newRequest')}
                                        </button>,
                                    )}
                                    <section className="panel requests-panel">
                                        <div className="request-tabs">
                                            {[
                                                '',
                                                'pending',
                                                'approved',
                                                'rejected',
                                                'draft',
                                                'cancelled',
                                            ]
                                                .filter(
                                                    (s) =>
                                                        view !== 'review' ||
                                                        [
                                                            '',
                                                            'pending',
                                                        ].includes(s),
                                                )
                                                .map((s) => (
                                                    <button
                                                        key={s}
                                                        className={
                                                            status === s
                                                                ? 'active'
                                                                : ''
                                                        }
                                                        onClick={() => {
                                                            setStatus(s);
                                                            setPage(1);
                                                        }}
                                                    >
                                                        {t(s || 'allStatuses')}
                                                        {s === status && (
                                                            <span>
                                                                {number(
                                                                    listing.total,
                                                                )}
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                        </div>
                                        <div className="request-toolbar">
                                            <label className="request-search">
                                                <Icon name="search" size={18} />
                                                <input
                                                    value={search}
                                                    maxLength={180}
                                                    onChange={(e) =>
                                                        setSearch(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={t('search')}
                                                    aria-label={t('search')}
                                                />
                                            </label>
                                            <div className="toolbar-buttons">
                                                <button
                                                    className="btn secondary export-button"
                                                    onClick={exportCsv}
                                                    disabled={exporting}
                                                >
                                                    <Icon
                                                        name="download"
                                                        size={16}
                                                    />
                                                    {t('export')}
                                                </button>
                                                <div className="display-toggle">
                                                    <button
                                                        className={
                                                            display === 'list'
                                                                ? 'active'
                                                                : ''
                                                        }
                                                        aria-label={t('list')}
                                                        onClick={() =>
                                                            setDisplay('list')
                                                        }
                                                    >
                                                        <Icon
                                                            name="list"
                                                            size={18}
                                                        />
                                                    </button>
                                                    <button
                                                        className={
                                                            display === 'board'
                                                                ? 'active'
                                                                : ''
                                                        }
                                                        aria-label={t('board')}
                                                        onClick={() =>
                                                            setDisplay('board')
                                                        }
                                                    >
                                                        <Icon
                                                            name="board"
                                                            size={18}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="filter-bar">
                                            <Icon name="filter" size={16} />
                                            <select
                                                value={type}
                                                aria-label={t('type')}
                                                onChange={(e) => {
                                                    setType(e.target.value);
                                                    setPage(1);
                                                }}
                                            >
                                                <option value="">
                                                    {t('allTypes')}
                                                </option>
                                                {[
                                                    'leave',
                                                    'budget',
                                                    'document',
                                                ].map((s) => (
                                                    <option key={s} value={s}>
                                                        {t(s)}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                value={priority}
                                                aria-label={t('priority')}
                                                onChange={(e) => {
                                                    setPriority(e.target.value);
                                                    setPage(1);
                                                }}
                                            >
                                                <option value="">
                                                    {t('allPriorities')}
                                                </option>
                                                {[
                                                    'normal',
                                                    'high',
                                                    'urgent',
                                                ].map((s) => (
                                                    <option key={s} value={s}>
                                                        {t(s)}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                value={sort}
                                                aria-label={t('newest')}
                                                onChange={(e) => {
                                                    setSort(e.target.value);
                                                    setPage(1);
                                                }}
                                            >
                                                {[
                                                    ['newest', 'newest'],
                                                    ['oldest', 'oldest'],
                                                    ['due', 'dueSort'],
                                                    ['amount', 'amountSort'],
                                                ].map(([v, l]) => (
                                                    <option key={v} value={v}>
                                                        {t(l)}
                                                    </option>
                                                ))}
                                            </select>
                                            {(search ||
                                                status ||
                                                type ||
                                                priority) && (
                                                <button
                                                    className="text-link"
                                                    onClick={() => {
                                                        setSearch('');
                                                        setStatus('');
                                                        setType('');
                                                        setPriority('');
                                                        setPage(1);
                                                    }}
                                                >
                                                    {t('reset')}
                                                </button>
                                            )}
                                            <span className="filter-count">
                                                {listLoading
                                                    ? t('syncing')
                                                    : `${number(listing.total)} ${t('requestCount')}`}
                                            </span>
                                        </div>
                                        {listError ? (
                                            <div className="empty-state">
                                                <p>{errorText(listError, t)}</p>
                                                <button
                                                    className="btn secondary"
                                                    onClick={reload}
                                                >
                                                    {t('retry')}
                                                </button>
                                            </div>
                                        ) : listLoading &&
                                          !listing.data.length ? (
                                            <div className="empty-state">
                                                {t('loading')}
                                            </div>
                                        ) : listing.data.length ? (
                                            display === 'list' ? (
                                                <RequestTable
                                                    rows={listing.data}
                                                    onOpen={open}
                                                />
                                            ) : (
                                                <div className="board-wrap">
                                                    <p>{t('boardHint')}</p>
                                                    <div className="kanban">
                                                        {[
                                                            'draft',
                                                            'pending',
                                                            'approved',
                                                            'rejected',
                                                            'cancelled',
                                                        ]
                                                            .filter(
                                                                (s) =>
                                                                    !status ||
                                                                    status ===
                                                                        s,
                                                            )
                                                            .map((s) => (
                                                                <div
                                                                    className="kanban-column"
                                                                    key={s}
                                                                >
                                                                    <header>
                                                                        <Badge
                                                                            status={
                                                                                s
                                                                            }
                                                                        />
                                                                        <b>
                                                                            {
                                                                                listing.data.filter(
                                                                                    (
                                                                                        r,
                                                                                    ) =>
                                                                                        r.status ===
                                                                                        s,
                                                                                )
                                                                                    .length
                                                                            }
                                                                        </b>
                                                                    </header>
                                                                    {listing.data
                                                                        .filter(
                                                                            (
                                                                                r,
                                                                            ) =>
                                                                                r.status ===
                                                                                s,
                                                                        )
                                                                        .map(
                                                                            (
                                                                                r,
                                                                            ) => (
                                                                                <button
                                                                                    className="kanban-card"
                                                                                    key={
                                                                                        r.id
                                                                                    }
                                                                                    onClick={() =>
                                                                                        open(
                                                                                            r.id,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <div>
                                                                                        <TypeIcon
                                                                                            type={
                                                                                                r.type
                                                                                            }
                                                                                        />
                                                                                        <small>
                                                                                            REQ-
                                                                                            {String(
                                                                                                r.id,
                                                                                            ).padStart(
                                                                                                4,
                                                                                                '0',
                                                                                            )}
                                                                                        </small>
                                                                                    </div>
                                                                                    <strong>
                                                                                        {
                                                                                            r.title
                                                                                        }
                                                                                    </strong>
                                                                                    <Priority
                                                                                        value={
                                                                                            r.priority
                                                                                        }
                                                                                    />
                                                                                    <footer>
                                                                                        <Avatar
                                                                                            name={
                                                                                                r
                                                                                                    .owner
                                                                                                    ?.name
                                                                                            }
                                                                                            small
                                                                                        />
                                                                                        <span>
                                                                                            {date(
                                                                                                r.due_date,
                                                                                            )}
                                                                                        </span>
                                                                                    </footer>
                                                                                </button>
                                                                            ),
                                                                        )}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <Empty
                                                filtered={
                                                    !!(
                                                        search ||
                                                        status ||
                                                        type ||
                                                        priority
                                                    ) || view === 'review'
                                                }
                                                onCreate={
                                                    view === 'review'
                                                        ? null
                                                        : () => setForm({})
                                                }
                                            />
                                        )}
                                        <div className="pagination">
                                            <span>
                                                {t('showing')}{' '}
                                                {listing.from || 0}–
                                                {listing.to || 0} {t('of')}{' '}
                                                {number(listing.total)}
                                            </span>
                                            <div>
                                                <button
                                                    className="icon-button"
                                                    aria-label={t('previous')}
                                                    disabled={
                                                        page <= 1 || listLoading
                                                    }
                                                    onClick={() =>
                                                        setPage((p) => p - 1)
                                                    }
                                                >
                                                    <Icon
                                                        name="left"
                                                        size={17}
                                                    />
                                                </button>
                                                <span>
                                                    {t('page')} {page} /{' '}
                                                    {listing.last_page}
                                                </span>
                                                <button
                                                    className="icon-button"
                                                    aria-label={t('next')}
                                                    disabled={
                                                        page >=
                                                            listing.last_page ||
                                                        listLoading
                                                    }
                                                    onClick={() =>
                                                        setPage((p) => p + 1)
                                                    }
                                                >
                                                    <Icon
                                                        name="right"
                                                        size={17}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}
                            {view === 'insights' && summary && (
                                <>
                                    {heading('insights', 'insightsSub')}
                                    <div className="insight-stats">
                                        {[
                                            [
                                                'approvalRate',
                                                `${Math.round(((summary.counts.approved || 0) / Math.max(1, (summary.counts.approved || 0) + (summary.counts.rejected || 0))) * 100)}%`,
                                                'resolved',
                                                'check',
                                            ],
                                            [
                                                'approvedBudget',
                                                money(summary.approved_budget),
                                                'currencyNote',
                                                'wallet',
                                            ],
                                            [
                                                'overdue',
                                                number(summary.overdue),
                                                'overdueHint',
                                                'clock',
                                            ],
                                        ].map(([key, value, hint, icon]) => (
                                            <div
                                                className="panel insight-stat"
                                                key={key}
                                            >
                                                <span>
                                                    <Icon name={icon} />
                                                    {t(key)}
                                                </span>
                                                <strong>{value}</strong>
                                                <small>{t(hint)}</small>
                                            </div>
                                        ))}
                                    </div>
                                    <Charts summary={summary} />
                                    <div className="panel insight-note">
                                        <Icon name="shield" />
                                        <div>
                                            <h3>{t('securityTitle')}</h3>
                                            <p>{t('securitySub')}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                            {view === 'notifications' && (
                                <>
                                    {heading(
                                        'notifications',
                                        'notificationsSub',
                                        <button
                                            className="btn secondary"
                                            onClick={readAll}
                                            disabled={!notifications.unread}
                                        >
                                            <Icon name="check" size={17} />
                                            {t('readAll')}
                                        </button>,
                                    )}
                                    <section className="panel notification-panel">
                                        <div className="panel-heading">
                                            <h3>
                                                {t('notifications')}{' '}
                                                <span className="count-pill">
                                                    {notifications.unread}{' '}
                                                    {t('unread')}
                                                </span>
                                            </h3>
                                            <span className="live-status">
                                                <i />
                                                {t('live')}
                                            </span>
                                        </div>
                                        {notifications.items.length ? (
                                            notifications.items.map((n) => (
                                                <button
                                                    className={`notification-row ${!n.read_at ? 'unread' : ''}`}
                                                    key={n.id}
                                                    onClick={() =>
                                                        notificationOpen(n)
                                                    }
                                                >
                                                    <span
                                                        className={`notification-icon ${n.action}`}
                                                    >
                                                        <Icon
                                                            name={
                                                                n.action ===
                                                                'approved'
                                                                    ? 'check'
                                                                    : n.action ===
                                                                        'rejected'
                                                                      ? 'close'
                                                                      : n.action ===
                                                                          'commented'
                                                                        ? 'comment'
                                                                        : 'inbox'
                                                            }
                                                        />
                                                    </span>
                                                    <div>
                                                        <strong>
                                                            {t(
                                                                `notification${n.action[0].toUpperCase() + n.action.slice(1)}`,
                                                            )}
                                                        </strong>
                                                        <p>{n.title}</p>
                                                        <small>
                                                            REQ-
                                                            {String(
                                                                n.approval_request_id,
                                                            ).padStart(
                                                                4,
                                                                '0',
                                                            )}{' '}
                                                            ·{' '}
                                                            {date(
                                                                n.created_at,
                                                                {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                },
                                                            )}
                                                        </small>
                                                    </div>
                                                    {!n.read_at && <i />}
                                                    <Icon
                                                        name="right"
                                                        size={16}
                                                    />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="empty-state">
                                                <Icon name="bell" size={32} />
                                                <h3>{t('noNotifications')}</h3>
                                                <p>{t('allRead')}</p>
                                            </div>
                                        )}
                                        <p className="notification-tip">
                                            {t('notificationTip')}
                                        </p>
                                    </section>
                                </>
                            )}
                            {view === 'settings' && (
                                <>
                                    {heading('settings', 'profileSub')}
                                    <Settings
                                        user={user}
                                        setUser={setUser}
                                        theme={theme}
                                        setTheme={setTheme}
                                        toast={toast}
                                    />
                                </>
                            )}
                            {view === 'help' && (
                                <>
                                    {heading('help', 'guideSub')}
                                    <div className="guide-grid">
                                        {[1, 2, 3].map((n) => (
                                            <section
                                                className="panel guide-card"
                                                key={n}
                                            >
                                                <span>0{n}</span>
                                                <Icon
                                                    name={
                                                        [
                                                            'file',
                                                            'shield',
                                                            'bell',
                                                        ][n - 1]
                                                    }
                                                    size={30}
                                                />
                                                <h3>{t(`step${n}`)}</h3>
                                                <p>{t(`step${n}Sub`)}</p>
                                            </section>
                                        ))}
                                    </div>
                                    <section className="panel guide-policy">
                                        <h3>{t('securityTitle')}</h3>
                                        <p>{t('securitySub')}</p>
                                        <p>{t('currencyNote')}</p>
                                    </section>
                                    <section className="panel shortcuts">
                                        <h3>{t('shortcuts')}</h3>
                                        {[
                                            ['Ctrl / ⌘ + K', 'shortcutSearch'],
                                            ['N', 'shortcutNew'],
                                            ['Esc', 'shortcutClose'],
                                        ].map(([key, text]) => (
                                            <div key={key}>
                                                <span>{t(text)}</span>
                                                <kbd>{key}</kbd>
                                            </div>
                                        ))}
                                    </section>
                                </>
                            )}
                        </>
                    )}
                    <footer className="workspace-footer">
                        <span>
                            ANAHEIM ELECTRONICS <span>·</span>{' '}
                            {t('overviewLabel')}
                        </span>
                        <span
                            className={`live-status ${error ? 'disconnected' : ''}`}
                        >
                            <i />
                            {t(error ? 'offline' : 'live')}
                        </span>
                    </footer>
                </main>
            </div>
            {detail && !form && (
                <RequestDetail
                    item={detail}
                    user={user}
                    onClose={() => setDetail(null)}
                    onEdit={(item) => setForm({ item })}
                    onChange={(item) => {
                        setDetail(item);
                        reload();
                    }}
                    toast={toast}
                />
            )}{' '}
            {form && (
                <RequestForm
                    item={form.item}
                    initialType={form.type}
                    onClose={() => setForm(null)}
                    onSaved={(item) => {
                        setForm(null);
                        setDetail(item);
                        reload();
                    }}
                    toast={toast}
                />
            )}
            {searchModal && (
                <Modal
                    title={t('findAnything')}
                    onClose={() => setSearchModal(false)}
                    className="search-modal"
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            navigate('requests');
                            const term = new FormData(e.currentTarget).get('q');
                            setSearch(term);
                            setSearchModal(false);
                        }}
                    >
                        <div className="dialog-body">
                            <Field label={t('searchHelp')}>
                                <input
                                    autoFocus
                                    name="q"
                                    maxLength={180}
                                    placeholder={t('search')}
                                />
                            </Field>
                        </div>
                        <div className="dialog-footer">
                            <kbd>Ctrl / ⌘ K</kbd>
                            <button className="btn primary">
                                <Icon name="search" size={17} />
                                {t('findAnything')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
            <div className="toast-stack" aria-live="polite">
                {toastItems.map((item) => (
                    <div
                        className={`accord-toast ${item.tone}`}
                        key={item.id}
                        role={item.tone === 'error' ? 'alert' : 'status'}
                    >
                        <Icon
                            name={item.tone === 'error' ? 'close' : 'check'}
                            size={20}
                        />
                        <span>{item.message}</span>
                        <button
                            aria-label={t('close')}
                            onClick={() =>
                                setToastItems((items) =>
                                    items.filter((x) => x.id !== item.id),
                                )
                            }
                        >
                            <Icon name="close" size={15} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Settings({ user, setUser, theme, setTheme, toast }) {
    const { t, locale, setLocale } = useLocale();
    const [name, setName] = useState(user.name),
        [department, setDepartment] = useState(user.department),
        [busy, setBusy] = useState(false);
    async function save(e) {
        e.preventDefault();
        setBusy(true);
        try {
            const { data } = await axios.patch('/api/approvals/preferences', {
                name,
                department,
                locale,
            });
            setUser(data);
            toast(t('settingsSaved'));
        } catch (error) {
            toast(errorText(error, t), 'error');
        } finally {
            setBusy(false);
        }
    }
    return (
        <div className="settings-grid">
            <form className="panel settings-card" onSubmit={save}>
                <div className="panel-heading">
                    <h3>{t('profile')}</h3>
                    <Icon name="user" size={19} />
                </div>
                <div className="settings-body">
                    <div className="settings-avatar">
                        <Avatar name={name} />
                        <div>
                            <strong>{user.name}</strong>
                            <small>{t(user.role)} · AE Operations</small>
                        </div>
                    </div>
                    <Field label={t('fullName')}>
                        <input
                            required
                            minLength={1}
                            maxLength={100}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </Field>
                    <Field label={t('email')}>
                        <input value={user.email} disabled type="email" />
                    </Field>
                    <Field label={t('department')}>
                        <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                        >
                            {[
                                'Operations',
                                'Engineering',
                                'Design',
                                'Finance',
                                'People',
                                'Marketing',
                            ].map((d) => (
                                <option key={d} value={d}>
                                    {t(`dept${d}`)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('language')}>
                        <select
                            value={locale}
                            onChange={(e) => setLocale(e.target.value)}
                        >
                            <option value="en">English</option>
                            <option value="th">ไทย</option>
                            <option value="ja">日本語</option>
                        </select>
                    </Field>
                    <button
                        className="btn primary"
                        disabled={busy || !name.trim()}
                    >
                        {t(busy ? 'working' : 'save')}
                    </button>
                </div>
            </form>
            <div>
                <section className="panel settings-card">
                    <div className="panel-heading">
                        <h3>{t('appearance')}</h3>
                        <Icon name="sun" size={19} />
                    </div>
                    <div className="theme-choices">
                        {['light', 'dark'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setTheme(mode)}
                                aria-pressed={theme === mode}
                                className={theme === mode ? 'selected' : ''}
                            >
                                <div className={`theme-preview ${mode}`}>
                                    <i />
                                    <div>
                                        <i />
                                        <i />
                                        <i />
                                    </div>
                                </div>
                                <span>
                                    <Icon
                                        name={mode === 'light' ? 'sun' : 'moon'}
                                        size={16}
                                    />
                                    {t(mode)}
                                    {theme === mode && (
                                        <Icon name="check" size={16} />
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
                <section className="panel settings-card account-role">
                    <Icon name="shield" size={26} />
                    <h3>
                        {t('accountRole')}: {t(user.role)}
                    </h3>
                    <p>{t('roleHelp')}</p>
                    <button
                        className="btn secondary"
                        onClick={() => router.post('/logout')}
                    >
                        <Icon name="logout" size={17} />
                        {t('logout')}
                    </button>
                </section>
            </div>
        </div>
    );
}
export default function Workspace() {
    const { auth } = usePage().props;
    return (
        <LocaleProvider initial={auth.user.locale}>
            <WorkspaceContent initialUser={auth.user} />
        </LocaleProvider>
    );
}
