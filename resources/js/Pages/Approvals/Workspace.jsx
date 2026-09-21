import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import Settings, { accents, defaultPreferences } from './Settings';
import { Head, router, usePage } from '@inertiajs/react';
import { LocaleProvider, useLocale } from './i18n';
import {
    Avatar,
    Badge,
    CountPill,
    DialogFooter,
    Empty,
    Field,
    Icon,
    LanguagePicker,
    LiveStatus,
    Logo,
    Modal,
    PageHeading,
    Priority,
    TypeIcon,
} from './UI';
import Dashboard, { Charts, RequestTable } from './Dashboard';
import { errorText, RequestDetail, RequestForm } from './RequestDialogs';
import { RouteSummary } from './Workflow';
import {
    OrganizationSettings,
    EmployeeDirectory,
    DatabaseViewer,
} from './OrganizationPanels';
import Messages from './Messages';
import Messenger from './Messenger';
import VisualDebug, { useVisualTrace, CrudDemo } from './VisualDebug';
import { useWorkspaceCalls } from './Calls';
import { connectRealtime, onRealtime } from '../../realtime';

const views = [
    'organizations',
    'employees',
    'messages',
    'database',
    'debug',
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
    organizations: 'layers',
    employees: 'users',
    messages: 'comment',
    database: 'database',
    debug: 'monitor',
    overview: 'grid',
    requests: 'layers',
    mine: 'file',
    review: 'inbox',
    insights: 'chart',
    notifications: 'bell',
    settings: 'settings',
    help: 'help',
};
const initialView = (start = 'overview') => {
    const value = new URLSearchParams(location.search).get('view');
    return views.includes(value) ? value : start;
};
const requestId = (id) => `REQ-${String(id).padStart(4, '0')}`;

function SidebarNav({ user, view, summary, notifications, navigate, onClose, inDialog = false }) {
    const { t } = useLocale();
    const secondary = ['insights', 'notifications', ...(user.tenancy_enabled ? ['organizations', ...(user.role === 'manager' ? ['database'] : []), 'debug'] : []), 'help'];
    const [toolsOpen, setToolsOpen] = useState(() => secondary.includes(view));
    useEffect(() => {
        if (secondary.includes(view)) setToolsOpen(true);
    }, [view]);
    const link = (key, badge) => (
        <button
            key={key}
            className="workspace-nav-link"
            onClick={() => navigate(key)}
            aria-current={view === key ? 'page' : undefined}
        >
            <Icon name={navIcons[key]} size={19} />
            <span>{t(key)}</span>
            {badge}
        </button>
    );
    // Dialogs render outside .accord, where the original nav labels used the sans font.
    const label = `px-3.5 text-[9px] font-[650] tracking-[1.5px] text-[#7c8fa9] !mb-[11px] ${inDialog ? 'font-sans' : 'font-mono'}`;
    return (
        <>
            <div
                className={`flex items-center justify-between pb-[31px] pl-[9px] pr-1 text-[#f7f9fc] [@media_(max-height:800px)_and_(min-width:761px)]:pb-[22px] ${inDialog ? 'max-md:hidden' : ''}`}
            >
                <Logo />
            </div>
            <button
                type="button"
                className={`mx-0.5 flex items-center gap-2.5 rounded-xl border border-[#ffffff12] bg-[#ffffff06] px-3 py-3.5 text-left hover:bg-white/5 ${inDialog ? 'max-md:mb-[22px] max-md:mt-[18px]' : 'mb-7'}`}
                onClick={() =>
                    navigate(user.tenancy_enabled ? 'organizations' : 'settings')
                }
            >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-signal font-technical text-[13px] font-bold text-white shadow-sm">
                    AE
                </span>
                <div className="min-w-0 flex-1">
                    <strong className="block text-[12px] font-[550] text-[#e4ebf4]">
                        {user.organization?.name || 'AE Operations'}
                    </strong>
                    <small className="mt-px block text-[10px] text-[#8196b1]">
                        {t('team')}
                    </small>
                </div>
                <Icon name="down" size={14} className="shrink-0 text-[#92a9c5]" />
            </button>
            <p className={label}>{t('mainMenu')}</p>
            <nav aria-label={t('mainMenu')} className="flex shrink-0 flex-col gap-1">
                {[
                    'overview',
                    'mine',
                    ...(user.role === 'manager' ? ['review'] : []),
                    'requests',
                ].map((key) =>
                    link(
                        key,
                        key === 'review' && summary?.review_count > 0 && (
                            <b
                                className={`ml-auto rounded-sm border px-1.5 py-px text-[10px] font-semibold ${view === key ? 'border-transparent bg-[#ffffff18] text-[#d4e1f2]' : 'border-[#ffffff0b] bg-[#ffffff14]'}`}
                            >
                                {summary.review_count}
                            </b>
                        ),
                    ),
                )}
            </nav>
            {user.tenancy_enabled && <>
                <p className={`${label} !mt-7`}>{t('teamNavigation')}</p>
                <nav aria-label={t('teamNavigation')} className="flex shrink-0 flex-col gap-1">
                    {['employees', 'messages'].map(key => link(key))}
                </nav>
            </>}
            <div className="mt-6 border-t border-white/10 pt-4">
                {link('settings')}
                <button className="workspace-nav-link" aria-expanded={toolsOpen} aria-controls={inDialog ? 'mobile-workspace-tools' : 'workspace-tools'} onClick={() => setToolsOpen(value => !value)}>
                    <Icon name="grid" size={19} />
                    <span>{t('workspaceTools')}</span>
                    <Icon name="down" size={14} className={`ml-auto transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            <nav aria-label={t('workspaceTools')} id={inDialog ? 'mobile-workspace-tools' : 'workspace-tools'} className="mt-1 flex shrink-0 flex-col gap-1 border-l border-white/10 pl-2" hidden={!toolsOpen} style={!toolsOpen ? { display: 'none' } : undefined}>
                {secondary.map((key) =>
                    link(
                        key,
                        key === 'notifications' && notifications.unread > 0 && (
                            <i className="ml-auto size-1.5 rounded-full bg-[#d56971]" />
                        ),
                    ),
                )}
            </nav>
            <div
                className={`mt-auto ${inDialog ? 'max-md:pt-[25px]' : `pt-[35px] [@media_(max-height:800px)_and_(min-width:761px)]:pt-5`}`}
            >
                <button
                    className={`flex w-full items-center gap-2.5 border-t border-t-[#ffffff13] px-0.5 py-[18px] text-left [@media_(max-height:800px)_and_(min-width:761px)]:py-[15px]`}
                    onClick={() => navigate('settings')}
                >
                    <Avatar
                        name={user.name}
                        src={user.avatar_url}
                        className="size-[33px] rounded-[5px] bg-[#dce6f3] text-[11px] text-[#2d4a70]"
                    />
                    <span className="min-w-0 flex-1">
                        <strong className="block truncate text-[11px] font-[550] text-[#eff3f9]">
                            {user.name}
                        </strong>
                        <small className="mt-0.5 block text-[10px] text-[#8499b5]">
                            {t(user.role)}
                        </small>
                    </span>
                    <Icon name="settings" size={16} className="text-[#9cb0cb]" />
                </button>
            </div>
        </>
    );
}

function Topbar({ user, view, notifications, navigate, onMenu, onSearch, onReadAll, onNotificationOpen }) {
    const { t } = useLocale();
    const menuItem =
        'flex w-full items-center gap-2.5 !rounded-[3px] px-3 py-[11px] text-left data-[focus]:bg-brand-tint';
    const notificationIcons = { approved: 'check', rejected: 'close', commented: 'comment' };
    return (
        <header className="workspace-topbar">
            <div className="flex items-center gap-3 whitespace-nowrap text-[13px] text-muted max-md:gap-[9px]">
                <button
                    className="icon-button !hidden max-md:!inline-flex"
                    aria-label={t('openMenu')}
                    onClick={onMenu}
                >
                    <Icon name="menu" className="text-[#b6bfb9]" />
                </button>
                <span className="max-md:hidden">{t('workspace')}</span>
                <Icon name="right" size={13} className="text-[#b6bfb9] max-md:hidden" />
                <strong className="font-semibold text-ink">{t(view)}</strong>
            </div>
            <div className="flex items-center gap-[18px] max-xl:gap-[13px] max-lg:gap-2.5 max-md:gap-3">
                <button
                    className="workspace-search"
                    onClick={onSearch}
                >
                    <Icon name="search" size={17} />
                    <span className="max-xl:hidden">{t('search')}</span>
                    <kbd className="ml-2 rounded border border-line px-[5px] py-0.5 text-[9px] text-[#a1aaa5] max-lg:hidden">
                        Ctrl K
                    </kbd>
                </button>
                <LanguagePicker />
                <Menu as="div" className="relative">
                    <MenuButton
                        className="icon-button relative"
                        aria-label={t('notifications')}
                    >
                        <Icon name="bell" />
                        {notifications.unread > 0 && (
                            <i className="absolute right-[3px] top-1.5 size-[5px] rounded-full border border-surface bg-signal" />
                        )}
                    </MenuButton>
                    <MenuItems className="absolute right-0 top-[calc(100%_+_12px)] z-[70] w-[340px] max-w-[calc(100vw_-_24px)] rounded-[5px] border border-t-[3px] border-line border-t-[#c64250] bg-surface p-[7px] [box-shadow:0_16px_48px_#09162730]">
                        <div className="mb-[5px] flex items-center justify-between gap-2 border-b border-b-line p-3">
                            <strong>{t('notifications')}</strong>
                            {notifications.unread > 0 && (
                                <CountPill>
                                    {notifications.unread} {t('unread')}
                                </CountPill>
                            )}
                        </div>
                        {notifications.items.length ? (
                            <>
                                {notifications.items.slice(0, 5).map((n) => (
                                    <MenuItem key={n.id}>
                                        <button
                                            className={`${menuItem} !items-start`}
                                            onClick={() => onNotificationOpen(n)}
                                        >
                                            <Icon
                                                name={notificationIcons[n.action] || 'inbox'}
                                                size={17}
                                                className={`mt-px shrink-0 ${n.action === 'rejected' ? 'text-[#b47d70]' : 'text-brand'}`}
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[12px] font-semibold">
                                                    {t(`notification${n.action[0].toUpperCase() + n.action.slice(1)}`)}
                                                </span>
                                                <span className="mt-0.5 block truncate text-[11px] text-muted">
                                                    {n.title}
                                                </span>
                                            </span>
                                            {!n.read_at && (
                                                <i className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" />
                                            )}
                                        </button>
                                    </MenuItem>
                                ))}
                                <div className="mt-[5px] flex items-center gap-1 border-t border-t-line pt-[5px]">
                                    <MenuItem>
                                        <button
                                            className={`${menuItem} flex-1`}
                                            onClick={() => navigate('notifications')}
                                        >
                                            <Icon name="inbox" size={16} />
                                            {t('viewAllNotifications')}
                                        </button>
                                    </MenuItem>
                                    <MenuItem>
                                        <button
                                            className={`${menuItem} !w-auto shrink-0 disabled:opacity-40`}
                                            onClick={onReadAll}
                                            disabled={!notifications.unread}
                                        >
                                            <Icon name="check" size={16} />
                                            {t('readAll')}
                                        </button>
                                    </MenuItem>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-muted">
                                <Icon name="bell" size={24} />
                                <span className="text-[12px]">{t('noNotifications')}</span>
                            </div>
                        )}
                    </MenuItems>
                </Menu>

                <span className="h-[23px] w-px bg-line max-md:hidden" />
                <Menu as="div" className="relative">
                    <MenuButton
                        className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-surface-alt data-[open]:bg-surface-alt"
                        aria-label={t('accountMenu')}
                    >
                        <Avatar name={user.name} src={user.avatar_url} small />
                        <span className="max-w-[130px] truncate text-[12px] font-semibold max-xl:hidden">{user.name}</span>
                        <Icon name="down" size={12} />
                    </MenuButton>
                    <MenuItems className="absolute right-0 top-[calc(100%_+_12px)] z-[70] w-[270px] max-w-[calc(100vw_-_24px)] rounded-[5px] border border-t-[3px] border-line border-t-[#c64250] bg-surface p-[7px] [box-shadow:0_16px_48px_#09162730]">
                        <div className="mb-[5px] border-b border-b-line p-3 [overflow-wrap:anywhere]">
                            <strong className="block">{user.name}</strong>
                            <small className="my-[5px] block text-muted">{user.email}</small>
                            <span className="text-[11px] text-brand">{t(user.role)}</span>
                        </div>
                        <MenuItem>
                            <button className={menuItem} onClick={() => navigate('settings')}>
                                <Icon name="settings" size={17} />
                                {t('profileAndSettings')}
                            </button>
                        </MenuItem>
                        <MenuItem>
                            <button className={menuItem} onClick={() => navigate('notifications')}>
                                <Icon name="bell" size={17} />
                                {t('notifications')}
                            </button>
                        </MenuItem>
                        <MenuItem>
                            <button
                                className={`${menuItem} text-[#c64250]`}
                                onClick={() => router.post('/logout')}
                            >
                                <Icon name="logout" size={17} />
                                {t('logout')}
                            </button>
                        </MenuItem>
                    </MenuItems>
                </Menu>
            </div>
        </header>
    );
}

function Pagination({ listing, page, setPage, listLoading }) {
    const { t, number } = useLocale();
    const pageButton = 'icon-button size-[29px] border border-line';
    return (
        <div className="flex items-center justify-between border-t border-t-line px-5 py-3.5 text-[10px] text-muted">
            <span>
                {t('showing')} {listing.from || 0}–{listing.to || 0} {t('of')}{' '}
                {number(listing.total)}
            </span>
            <div className="flex items-center gap-3">
                <button
                    className={pageButton}
                    aria-label={t('previous')}
                    disabled={page <= 1 || listLoading}
                    onClick={() => setPage((p) => p - 1)}
                >
                    <Icon name="left" size={17} />
                </button>
                <span>
                    {t('page')} {page} / {listing.last_page}
                </span>
                <button
                    className={pageButton}
                    aria-label={t('next')}
                    disabled={page >= listing.last_page || listLoading}
                    onClick={() => setPage((p) => p + 1)}
                >
                    <Icon name="right" size={17} />
                </button>
            </div>
        </div>
    );
}

function KanbanBoard({ rows, status, onOpen }) {
    const { t, date } = useLocale();
    return (
        <div className="px-5 pb-5 pt-2">
            <p className="mb-3 text-[10px] text-muted">{t('boardHint')}</p>
            <div className="flex min-h-[300px] gap-[13px] overflow-x-auto pb-3">
                {['draft', 'pending', 'approved', 'rejected', 'cancelled']
                    .filter((s) => !status || status === s)
                    .map((s) => {
                        const cards = rows.filter((r) => r.status === s);
                        return (
                            <div
                                className="min-w-[220px] flex-1 rounded-lg bg-surface-alt p-[11px]"
                                key={s}
                            >
                                <header className="mb-[15px] flex items-center justify-between">
                                    <Badge status={s} />
                                    <b className="text-[10px] font-medium text-muted">
                                        {cards.length}
                                    </b>
                                </header>
                                {cards.map((r) => (
                                    <button
                                        className="mb-2.5 block w-full rounded-[5px] border border-line bg-surface p-[13px] text-left shadow-card hover:-translate-y-0.5 hover:border-[#a4b8a8] compact:p-3"
                                        key={r.id}
                                        onClick={() => onOpen(r.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <TypeIcon type={r.type} box="sm" />
                                            <small className="font-code text-[9px] text-muted">
                                                {requestId(r.id)}
                                            </small>
                                        </div>
                                        <strong className="mx-0 mb-[11px] mt-[13px] block text-[12px] font-semibold">
                                            {r.title}
                                        </strong>
                                        <RouteSummary item={r} />
                                        <Priority value={r.priority} />
                                        <footer className="mt-[13px] flex items-center justify-between border-t border-t-line pt-2.5 text-[9px] text-muted">
                                            <Avatar
                                                src={r.owner?.avatar_url}
                                                name={r.owner?.name}
                                                small
                                            />
                                            <span>{date(r.due_date)}</span>
                                        </footer>
                                    </button>
                                ))}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}

function RequestsView({
    view,
    heading,
    listing,
    listLoading,
    listError,
    filters,
    display,
    setDisplay,
    exporting,
    onExport,
    onNew,
    onOpen,
    onReload,
}) {
    const { t, number } = useLocale();
    const { search, setSearch, status, setStatus, type, setType, priority, setPriority, sort, setSort, page, setPage } = filters;
    const filtered = !!(search || status || type || priority);
    const select =
        'min-h-9 max-w-[185px] !rounded-lg bg-[length:13px] bg-[position:right_8px_center] py-2 pl-3 pr-7 !text-[12px] max-md:max-w-[145px] max-md:!text-[11px]';
    const toggle = (value, icon) => (
        <button
            className={`!rounded-sm p-1.5 ${display === value ? 'bg-surface-alt text-ink' : 'text-muted'}`}
            aria-label={t(value)}
            onClick={() => setDisplay(value)}
        >
            <Icon name={icon} size={18} />
        </button>
    );
    return (
        <>
            {heading(
                view,
                view === 'mine' ? 'mineSub' : view === 'review' ? 'reviewSub' : 'requestSub',
                <button className="btn primary" onClick={onNew}>
                    <Icon name="plus" size={18} />
                    {t('newRequest')}
                </button>,
            )}
            <section className="panel">
                <div className="flex gap-[22px] overflow-x-auto border-b border-b-line px-[22px] max-md:gap-5 max-md:px-4">
                    {['', 'pending', 'approved', 'rejected', 'draft', 'cancelled']
                        .filter((s) => view !== 'review' || ['', 'pending'].includes(s))
                        .map((s) => (
                            <button
                                key={s}
                                className={`flex items-center gap-[7px] whitespace-nowrap border-b-2 px-0 pb-3.5 pt-[18px] text-[11px] ${status === s ? 'border-b-signal font-semibold text-brand' : 'border-b-transparent text-muted'}`}
                                onClick={() => {
                                    setStatus(s);
                                    setPage(1);
                                }}
                            >
                                {t(s || 'allStatuses')}
                                {s === status && (
                                    <span className="rounded-[3px] bg-brand-tint px-[5px] py-px text-[9px]">
                                        {number(listing.total)}
                                    </span>
                                )}
                            </button>
                        ))}
                </div>
                <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-[18px] max-xl:gap-2.5 max-md:flex-wrap max-md:p-[15px]">
                    <label className="flex w-[380px] items-center gap-[9px] !rounded-xl border border-line px-3 text-muted max-md:w-full max-md:min-w-[150px] max-md:flex-1">
                        <Icon name="search" size={18} />
                        <input
                            className="w-full !border-0 !bg-transparent px-0 py-[9px] !text-[11px]"
                            value={search}
                            maxLength={180}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('search')}
                            aria-label={t('search')}
                        />
                    </label>
                    <div className="flex items-center gap-3 max-md:gap-2">
                        <button
                            className="btn secondary min-h-9 px-[11px] py-2 text-[11px] max-md:w-9 max-md:gap-0 max-md:p-2 max-md:text-[0px]"
                            onClick={onExport}
                            disabled={exporting}
                        >
                            <Icon name="download" size={16} />
                            {t('export')}
                        </button>
                        <div className="flex gap-[3px] rounded-[3px] border border-line p-[3px]">
                            {toggle('list', 'list')}
                            {toggle('board', 'board')}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-[9px] px-5 pb-4 pt-0 text-muted max-xl:gap-[7px] max-md:px-[15px] max-md:pb-[15px]">
                    <Icon name="filter" size={16} className="max-md:hidden" />
                    <select
                        className={select}
                        value={type}
                        aria-label={t('type')}
                        onChange={(e) => {
                            setType(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">{t('allTypes')}</option>
                        {['leave', 'budget', 'document'].map((s) => (
                            <option key={s} value={s}>
                                {t(s)}
                            </option>
                        ))}
                    </select>
                    <select
                        className={select}
                        value={priority}
                        aria-label={t('priority')}
                        onChange={(e) => {
                            setPriority(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">{t('allPriorities')}</option>
                        {['normal', 'high', 'urgent'].map((s) => (
                            <option key={s} value={s}>
                                {t(s)}
                            </option>
                        ))}
                    </select>
                    <select
                        className={select}
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
                    {filtered && (
                        <button
                            className="text-link text-[10px]"
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
                    <span className="ml-auto text-[10px] max-md:hidden">
                        {listLoading ? t('syncing') : `${number(listing.total)} ${t('requestCount')}`}
                    </span>
                </div>
                {listError ? (
                    <div className="flex flex-col items-center gap-3 px-[25px] py-[60px] text-center text-muted">
                        <p className="text-[12px]">{errorText(listError, t)}</p>
                        <button className="btn secondary mt-[5px]" onClick={onReload}>
                            {t('retry')}
                        </button>
                    </div>
                ) : listLoading && !listing.data.length ? (
                    <div className="flex flex-col items-center gap-3 px-[25px] py-[60px] text-center text-muted">
                        {t('loading')}
                    </div>
                ) : listing.data.length ? (
                    display === 'list' ? (
                        <RequestTable rows={listing.data} onOpen={onOpen} />
                    ) : (
                        <KanbanBoard rows={listing.data} status={status} onOpen={onOpen} />
                    )
                ) : (
                    <Empty
                        filtered={filtered || view === 'review'}
                        onCreate={view === 'review' ? null : onNew}
                    />
                )}
                <Pagination listing={listing} page={page} setPage={setPage} listLoading={listLoading} />
            </section>
        </>
    );
}

function InsightsView({ summary, heading }) {
    const { t, number, money } = useLocale();
    const decided = (summary.counts.approved || 0) + (summary.counts.rejected || 0);
    return (
        <>
            {heading('insights', 'insightsSub')}
            <div className="mb-6 grid grid-cols-3 gap-5 max-lg:gap-3 max-md:grid-cols-1">
                {[
                    ['approvalRate', `${Math.round(((summary.counts.approved || 0) / Math.max(1, decided)) * 100)}%`, 'resolved', 'check'],
                    ['approvedBudget', money(summary.approved_budget), 'currencyNote', 'wallet'],
                    ['overdue', number(summary.overdue), 'overdueHint', 'clock'],
                ].map(([key, value, hint, icon]) => (
                    <div className="panel p-[23px] max-lg:p-[17px] max-md:p-5" key={key}>
                        <span className="flex items-center gap-2.5 text-[12px] text-muted">
                            <Icon name={icon} />
                            {t(key)}
                        </span>
                        <strong className="mx-0 mb-2 mt-3.5 block font-technical text-[31px] font-[550] tracking-[-1px] max-lg:text-[24px] max-md:text-[30px]">
                            {value}
                        </strong>
                        <small className="text-[10px] text-muted">{t(hint)}</small>
                    </div>
                ))}
            </div>
            <Charts summary={summary} />
            <div className="panel flex gap-[15px] p-6 text-brand">
                <Icon name="shield" className="shrink-0" />
                <div>
                    <h3 className="text-[14px] font-semibold">{t('securityTitle')}</h3>
                    <p className="mt-2 text-[12px] leading-[1.8] text-muted">{t('securitySub')}</p>
                </div>
            </div>
        </>
    );
}

function NotificationsView({ notifications, heading, onReadAll, onOpen }) {
    const { t, date } = useLocale();
    const icons = { approved: 'check', rejected: 'close', commented: 'comment' };
    return (
        <>
            {heading(
                'notifications',
                'notificationsSub',
                <button
                    className="btn secondary"
                    onClick={onReadAll}
                    disabled={!notifications.unread}
                >
                    <Icon name="check" size={17} />
                    {t('readAll')}
                </button>,
            )}
            <section className="panel">
                <div className="panel-heading">
                    <h3>
                        {t('notifications')}{' '}
                        <CountPill>
                            {notifications.unread} {t('unread')}
                        </CountPill>
                    </h3>
                    <LiveStatus label={t('live')} />
                </div>
                {notifications.items.length ? (
                    notifications.items.map((n) => (
                        <button
                            className={`flex w-full items-center gap-[17px] border-t border-t-line py-[21px] text-left hover:bg-surface-alt max-md:gap-3 max-md:py-[18px] ${
                                n.read_at
                                    ? 'px-6 max-md:px-[15px]'
                                    : 'border-l-2 border-l-[#5f83ac] bg-brand-tint pl-[22px] pr-6 max-md:pl-[13px] max-md:pr-[15px]'
                            }`}
                            key={n.id}
                            onClick={() => onOpen(n)}
                        >
                            <span
                                className={`grid size-10 shrink-0 place-items-center rounded-[5px] border border-line bg-surface max-md:size-[34px] ${n.action === 'rejected' ? 'text-[#b47d70]' : 'text-brand'}`}
                            >
                                <Icon name={icons[n.action] || 'inbox'} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <strong className="block text-[12px] font-semibold max-md:text-[11px]">
                                    {t(`notification${n.action[0].toUpperCase() + n.action.slice(1)}`)}
                                </strong>
                                <p className="mx-0 mb-1.5 mt-[3px] text-[12px] text-muted [overflow-wrap:anywhere] max-md:text-[11px]">
                                    {n.title}
                                </p>
                                <small className="text-[10px] text-muted max-md:text-[9px]">
                                    {requestId(n.approval_request_id)} ·{' '}
                                    {date(n.created_at, { hour: '2-digit', minute: '2-digit' })}
                                </small>
                            </div>
                            {!n.read_at && <i className="size-1.5 rounded-full bg-signal" />}
                            <Icon name="right" size={16} className="text-muted" />
                        </button>
                    ))
                ) : (
                    <div className="flex flex-col items-center gap-3 px-[25px] py-[60px] text-center text-muted">
                        <Icon name="bell" size={32} />
                        <h3 className="font-technical text-[18px] font-[550] tracking-[-0.3px] text-ink">
                            {t('noNotifications')}
                        </h3>
                        <p className="text-[12px]">{t('allRead')}</p>
                    </div>
                )}
                <p className="border-t border-t-line px-6 py-[17px] text-[10px] text-muted max-md:p-[15px] max-md:text-[9px]">
                    {t('notificationTip')}
                </p>
            </section>
        </>
    );
}

function HelpView({ heading }) {
    const { t } = useLocale();
    return (
        <>
            {heading('help', 'guideSub')}
            <div className="mb-[23px] grid grid-cols-3 gap-5 max-lg:grid-cols-1">
                {[1, 2, 3].map((n) => (
                    <section className="panel relative p-[26px]" key={n}>
                        <span className="absolute right-5 top-4 text-[35px] font-light text-line">
                            0{n}
                        </span>
                        <Icon
                            name={['file', 'shield', 'bell'][n - 1]}
                            size={30}
                            className="mb-[30px] text-brand max-lg:mb-5"
                        />
                        <h3 className="text-[16px] font-semibold">{t(`step${n}`)}</h3>
                        <p className="mt-3 text-[12px] leading-[1.85] text-muted">{t(`step${n}Sub`)}</p>
                    </section>
                ))}
            </div>
            <section className="panel mb-[23px] p-[26px]">
                <h3 className="mb-3 text-[14px] font-semibold">{t('securityTitle')}</h3>
                <p className="mt-[9px] text-[12px] leading-[1.8] text-muted">{t('securitySub')}</p>
                <p className="mt-[9px] text-[12px] leading-[1.8] text-muted">{t('currencyNote')}</p>
            </section>
            <section className="panel max-w-[640px] p-[25px]">
                <h3 className="mb-3 text-[14px] font-semibold">{t('shortcuts')}</h3>
                {[
                    ['Ctrl / ⌘ + K', 'shortcutSearch'],
                    ['N', 'shortcutNew'],
                    ['Esc', 'shortcutClose'],
                ].map(([key, text]) => (
                    <div
                        key={key}
                        className="flex items-center justify-between border-b border-b-line px-0 py-3.5 text-[12px] text-muted last:border-0"
                    >
                        <span>{t(text)}</span>
                        <kbd className="rounded border border-line bg-surface-alt px-2 py-1 text-[10px]">
                            {key}
                        </kbd>
                    </div>
                ))}
            </section>
        </>
    );
}

function Toasts({ items, onDismiss, lifted }) {
    const { t } = useLocale();
    return (
        <div
            className={`fixed bottom-[25px] right-[25px] z-[100] flex w-[calc(100%_-_40px)] max-w-[430px] flex-col gap-[9px] max-md:bottom-[15px] max-md:right-[15px] max-md:w-[400px] max-md:max-w-[calc(100%_-_30px)] print:!hidden ${lifted ? 'mb-[72px]' : ''}`}
            aria-live="polite"
        >
            {items.map((item) => (
                <div
                    className={`flex animate-enter items-center gap-[11px] rounded-[10px] border bg-surface px-4 py-[15px] text-[12px] text-ink [box-shadow:0_8px_35px_#142a2720] max-md:text-[11px] ${item.tone === 'error' ? 'border-[#dbbcb4]' : 'border-[#ceddcf]'}`}
                    key={item.id}
                    role={item.tone === 'error' ? 'alert' : 'status'}
                >
                    <Icon
                        name={item.tone === 'error' ? 'close' : 'check'}
                        size={20}
                        className={`shrink-0 ${item.tone === 'error' ? 'text-[#b57565]' : 'text-[#6b936e]'}`}
                    />
                    <span>{item.message}</span>
                    <button
                        className="ml-auto p-[5px] text-muted"
                        aria-label={t('close')}
                        onClick={() => onDismiss(item.id)}
                    >
                        <Icon name="close" size={15} />
                    </button>
                </div>
            ))}
        </div>
    );
}

function WorkspaceContent({ initialUser, realtime }) {
    if (initialUser.organization)
        axios.defaults.headers.common['X-Organization-ID'] = String(
            initialUser.organization.id,
        );
    const { t, money, locale, setLocale } = useLocale();
    const [user, setUser] = useState(initialUser),
        [view, setView] = useState(() => initialView(initialUser.preferences?.start_view)),
        [theme, setTheme] = useState(
            () =>
                initialUser.preferences?.theme ||
                localStorage.getItem('accord.theme') ||
                'light',
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
        [display, setDisplay] = useState(
            initialUser.preferences?.default_view || 'list',
        );
    const preferences = { ...defaultPreferences, ...user.preferences };
    const [chatPeer, setChatPeer] = useState(null);
    const [systemDark, setSystemDark] = useState(
        () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
    const resolvedTheme =
        theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const changed = (event) => setSystemDark(event.matches);
        media.addEventListener('change', changed);
        return () => media.removeEventListener('change', changed);
    }, []);
    useEffect(() => {
        setDisplay(preferences.default_view);
        setPage(1);
    }, [preferences.default_view, preferences.page_size]);
    useEffect(() => {
        document.documentElement.dataset.reduceMotion = String(
            preferences.reduce_motion,
        );
        return () => delete document.documentElement.dataset.reduceMotion;
    }, [preferences.reduce_motion]);
    // The accent colour drives primary buttons and highlights across the workspace.
    useEffect(() => {
        const [signal, hover] = accents[preferences.accent] ?? accents.red;
        document.documentElement.style.setProperty('--signal', signal);
        document.documentElement.style.setProperty('--signal-hover', hover);
        return () => {
            document.documentElement.style.removeProperty('--signal');
            document.documentElement.style.removeProperty('--signal-hover');
        };
    }, [preferences.accent]);
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
    const calls = useWorkspaceCalls(user, toast);
    const traces = useVisualTrace(preferences.visual_debug);
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
        document.documentElement.dataset.accordTheme = resolvedTheme;
        return () => delete document.documentElement.dataset.accordTheme;
    }, [theme, resolvedTheme]);
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
        window.scrollTo({
            top: 0,
            behavior:
                document.documentElement.dataset.reduceMotion === 'true'
                    ? 'instant'
                    : 'smooth',
        });
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
                !document.activeElement?.closest('[role="menu"]') &&
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
        per_page: preferences.page_size,
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
    }, [
        view,
        debounced,
        status,
        type,
        priority,
        sort,
        page,
        refresh,
        preferences.page_size,
    ]);
    // A short heads-up when something new lands in your inbox; the bell keeps the history.
    const lastNotice = useRef(null);
    useEffect(() => {
        const top = notifications.items[0];
        if (!top) return;
        const previous = lastNotice.current;
        lastNotice.current = top.id;
        if (previous === null || top.id <= previous || top.read_at) return;
        toast(
            `${t(`notification${top.action[0].toUpperCase()}${top.action.slice(1)}`)} · ${top.title}`,
        );
    }, [notifications.items]);
    const reload = () => setRefresh((r) => r + 1);
    const openDetail = useRef(null);
    openDetail.current = detail?.id;
    useEffect(() => {
        if (!realtime) return;
        let stop,
            cancelled = false;
        connectRealtime(realtime, user.organization?.id ?? 0, user.id)
            .then((disconnect) => (cancelled ? disconnect() : (stop = disconnect)))
            .catch(() => {});
        return () => {
            cancelled = true;
            stop?.();
        };
    }, [realtime?.key, user.id, user.organization?.id]);
    useEffect(
        () =>
            onRealtime(['approvals'], ({ reference }) => {
                reload();
                if (reference && openDetail.current === reference) open(reference);
            }),
        [],
    );
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
        <PageHeading
            eyebrow={`AE / ${t('workspace')}`}
            title={t(title)}
            sub={t(sub)}
            actions={actions}
        />
    );
    const navProps = { user, view, summary, notifications, navigate };
    return (
        <div
            className="accord flex min-h-screen bg-canvas"
            data-theme={resolvedTheme}
            data-density={preferences.density}
        >
            <Head title={t(view)} />
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-surface focus:px-5 focus:py-3 focus:text-ink focus:shadow-lg">{t('skipToContent')}</a>
            <aside
                className="workspace-sidebar"
            >
                <SidebarNav {...navProps} />
            </aside>
            {mobile && (
                <Modal
                    title={t('workspace')}
                    onClose={() => setMobile(false)}
                    width="max-w-[690px] max-md:max-w-[310px]"
                    className="!bg-[#14253d] max-md:m-auto max-md:min-h-[80vh] max-md:px-[17px] max-md:pb-[15px] max-md:pt-0 max-md:!text-[#d7e4d9] [&_.icon-button]:max-md:text-[#c1d3c5]"
                    headingClassName="max-md:border-[#ffffff18] max-md:pl-[5px] max-md:pr-0"
                >
                    <SidebarNav {...navProps} inDialog />
                </Modal>
            )}
            <div className="ml-[248px] w-[calc(100%_-_248px)] min-w-0 max-xl:ml-[224px] max-xl:w-[calc(100%_-_224px)] max-md:ml-0 max-md:w-full print:m-0 print:w-full">
                <Topbar
                    {...navProps}
                    onMenu={() => setMobile(true)}
                    onSearch={() => setSearchModal(true)}
                    onReadAll={readAll}
                    onNotificationOpen={notificationOpen}
                />
                <main
                    className="m-auto max-w-[1560px] px-9 pb-0 pt-9 max-xl:px-7 max-md:px-[18px] max-md:pt-[25px] print:px-0"
                    id="main-content"
                    tabIndex={-1}
                >
                    {error && (
                        <div
                            className="mb-5 flex items-center gap-2.5 rounded-lg border border-[#ebd6c3] bg-[#fff5ed] px-4 py-[13px] text-[12px] text-[#9a7255]"
                            role="alert"
                        >
                            <Icon name="refresh" size={17} />
                            <span>{errorText(error, t)}</span>
                            <button className="ml-auto font-semibold underline" onClick={reload}>
                                {t('retry')}
                            </button>
                        </div>
                    )}
                    {loading && !summary ? (
                        <div aria-label={t('loading')}>
                            <div className="mb-[25px] h-[70px] w-[70%] animate-[pulse_1.5s_infinite] rounded-[10px] bg-line" />
                            <div className="mb-[25px] flex h-[160px] gap-5">
                                {[1, 2, 3, 4].map((x) => (
                                    <i key={x} className="flex-1 animate-[pulse_1.5s_infinite] rounded-[10px] bg-line" />
                                ))}
                            </div>
                            <div className="mb-[25px] h-[160px] animate-[pulse_1.5s_infinite] rounded-[10px] bg-line" />
                        </div>
                    ) : (
                        <>
                            {view === 'overview' && summary && (
                                <Dashboard
                                    summary={summary}
                                    user={user}
                                    onNavigate={navigate}
                                    onNew={(type) => setForm(['leave', 'budget', 'document'].includes(type) ? { type } : {})}
                                    onOpen={open}
                                    onFilter={filterBy}
                                />
                            )}
                            {['requests', 'mine', 'review'].includes(view) && (
                                <RequestsView
                                    view={view}
                                    heading={heading}
                                    listing={listing}
                                    listLoading={listLoading}
                                    listError={listError}
                                    filters={{ search, setSearch, status, setStatus, type, setType, priority, setPriority, sort, setSort, page, setPage }}
                                    display={display}
                                    setDisplay={setDisplay}
                                    exporting={exporting}
                                    onExport={exportCsv}
                                    onNew={() => setForm({})}
                                    onOpen={open}
                                    onReload={reload}
                                />
                            )}
                            {view === 'insights' && summary && (
                                <InsightsView summary={summary} heading={heading} />
                            )}
                            {view === 'notifications' && (
                                <NotificationsView
                                    notifications={notifications}
                                    heading={heading}
                                    onReadAll={readAll}
                                    onOpen={notificationOpen}
                                />
                            )}
                            {user.tenancy_enabled && view === 'organizations' && (
                                <>
                                    {heading('organizations', 'organizationIntro')}
                                    <OrganizationSettings user={user} toast={toast} />
                                </>
                            )}
                            {user.tenancy_enabled && view === 'employees' && (
                                <>
                                    {heading('employees', 'directoryIntro')}
                                    <EmployeeDirectory
                                        user={user}
                                        toast={toast}
                                        onMessage={(person) => {
                                            setChatPeer(person);
                                            navigate('messages');
                                        }}
                                    />
                                </>
                            )}
                            {user.tenancy_enabled && view === 'messages' && (
                                <>
                                    {heading('messages', 'chatIntro')}
                                    <Messages
                                        user={user}
                                        peer={chatPeer}
                                        setPeer={setChatPeer}
                                        onDirectory={() => navigate('employees')}
                                        onCall={calls.start}
                                        callsAvailable={calls.available}
                                        toast={toast}
                                    />
                                </>
                            )}
                            {user.tenancy_enabled && view === 'database' && (
                                <>
                                    {heading('database', 'databaseScopeHelp')}
                                    <DatabaseViewer />
                                </>
                            )}
                            {user.tenancy_enabled && view === 'debug' && (
                                <>
                                    {heading('debug', 'debugIntro')}
                                    <CrudDemo />
                                    <VisualDebug
                                        enabled={preferences.visual_debug}
                                        traces={traces}
                                        onSettings={() => navigate('settings')}
                                    />
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
                            {view === 'help' && <HelpView heading={heading} />}
                        </>
                    )}
                    <footer className="flex items-center justify-between gap-[15px] px-0 py-6 font-mono text-[8px] tracking-[0.25px] text-muted max-md:py-[22px] max-md:text-[7px] print:!hidden">
                        <span className="max-md:max-w-[68%]">
                            ANAHEIM ELECTRONICS <span className="mx-1.5 my-0 text-signal">·</span>{' '}
                            {t('overviewLabel')}
                        </span>
                        <LiveStatus offline={!!error} label={t(error ? 'offline' : 'live')} />
                    </footer>
                </main>
            </div>
            {user.tenancy_enabled && view !== 'messages' && (
                <Messenger
                    user={user}
                    peer={chatPeer}
                    setPeer={setChatPeer}
                    onDirectory={() => navigate('employees')}
                    onExpand={() => navigate('messages')}
                    onCall={calls.start}
                    callsAvailable={calls.available}
                    toast={toast}
                />
            )}
            {calls.panel}
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
                    footer={
                        <DialogFooter>
                            <kbd className="rounded border border-line bg-surface-alt px-2 py-1 text-[10px]">
                                Ctrl / ⌘ K
                            </kbd>
                            <button
                                type="submit"
                                form="search-form"
                                className="btn primary"
                            >
                                <Icon name="search" size={17} />
                                {t('findAnything')}
                            </button>
                        </DialogFooter>
                    }
                >
                    <form
                        id="search-form"
                        onSubmit={(e) => {
                            e.preventDefault();
                            navigate('requests');
                            const term = new FormData(e.currentTarget).get('q');
                            setSearch(term);
                            setSearchModal(false);
                        }}
                    >
                        <div className="p-[25px] max-md:px-[18px] max-md:py-5">
                            <Field label={t('searchHelp')}>
                                <input
                                    autoFocus
                                    name="q"
                                    maxLength={180}
                                    placeholder={t('search')}
                                />
                            </Field>
                        </div>
                    </form>
                </Modal>
            )}
            <Toasts
                lifted={user.tenancy_enabled}
                items={toastItems}
                onDismiss={(id) => setToastItems((items) => items.filter((x) => x.id !== id))}
            />
        </div>
    );
}

export default function Workspace() {
    const { auth, realtime } = usePage().props;
    return (
        <LocaleProvider initial={auth.user.locale}>
            <WorkspaceContent initialUser={auth.user} realtime={realtime} />
        </LocaleProvider>
    );
}
