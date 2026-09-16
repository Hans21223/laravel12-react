import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocale } from './i18n';
import { Avatar, Field, Icon } from './UI';
import { OrganizationChooser } from './Organizations';

export const settingsBody = 'p-[25px] max-md:p-5';
export const settingsHint = 'm-0 text-[12px] leading-[1.6] text-muted';
const pagerButton = 'btn secondary';

export function Pager({ page, lastPage, onPage, children }) {
    return (
        <div className="flex items-center justify-end gap-3 border-t border-t-line px-6 py-4 text-[12px] text-muted">
            {children}
            <button className={pagerButton} disabled={page === 1} onClick={() => onPage(page - 1)}>
                <Icon name="left" size={16} />
            </button>
            <span>
                {page}/{lastPage}
            </span>
            <button className={pagerButton} disabled={page >= lastPage} onClick={() => onPage(page + 1)}>
                <Icon name="right" size={16} />
            </button>
        </div>
    );
}

function OrganizationProfile({ user, toast }) {
    const { t } = useLocale();
    const org = user.organization;
    const owner = org?.owner_user_id === user.id;
    const [name, setName] = useState(org?.name || ''),
        [managers, setManagers] = useState([]),
        [target, setTarget] = useState(''),
        [confirmName, setConfirmName] = useState(''),
        [leaving, setLeaving] = useState(false),
        [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!owner) return;
        axios
            .get('/api/organization/members', { params: { role: 'manager' } })
            .then(({ data }) =>
                setManagers(data.data.filter((m) => m.role === 'manager' && !m.suspended && m.user_id !== user.id)),
            )
            .catch(() => {});
    }, [owner, user.id]);
    const failure = (error) =>
        toast(
            t(
                error.response?.status === 409
                    ? owner
                        ? 'legacyCannotClose'
                        : /reassign/i.test(error.response?.data?.message || '')
                          ? 'pendingAssignments'
                          : 'ownerCannotLeave'
                    : error.response?.status === 422
                      ? 'validation'
                      : 'error',
            ),
            'error',
        );
    async function act(request, success, reload = false) {
        setBusy(true);
        try {
            await request();
            toast(t(success));
            if (reload) location.assign(reload);
        } catch (error) {
            failure(error);
        } finally {
            setBusy(false);
        }
    }
    const heading = (title, icon) => (
        <div className="panel-heading border-b border-b-line">
            <h3>{title}</h3>
            <Icon name={icon} />
        </div>
    );
    if (!org) return null;
    if (!owner)
        return (
            <section className="panel">
                {heading(t('leaveOrganization'), 'logout')}
                <div className={settingsBody}>
                    <p className={settingsHint}>{t('leaveHelp')}</p>
                    {leaving ? (
                        <div className="flex flex-wrap gap-2">
                            <button
                                className="btn danger"
                                disabled={busy}
                                onClick={() => act(() => axios.post('/api/organization/leave'), 'success', '/organizations')}
                            >
                                {t(busy ? 'working' : 'leaveConfirm')}
                            </button>
                            <button className="btn ghost" disabled={busy} onClick={() => setLeaving(false)}>
                                {t('cancel')}
                            </button>
                        </div>
                    ) : (
                        <button className="btn secondary text-[#b04f4c]" onClick={() => setLeaving(true)}>
                            <Icon name="logout" size={16} />
                            {t('leaveOrganization')}
                        </button>
                    )}
                </div>
            </section>
        );
    return (
        <section className="panel">
            {heading(t('organizationProfile'), 'layers')}
            <div className={`${settingsBody} grid gap-7`}>
                <p className={`${settingsHint} !my-0`}>{t('organizationProfileHelp')}</p>
                <form
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        act(() => axios.patch('/api/organization', { name }), 'organizationRenamed', '/approvals?view=organizations');
                    }}
                >
                    <Field label={t('organizationName')} className="mb-0 min-w-[220px] flex-1">
                        <input required minLength={3} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
                    </Field>
                    <button className="btn primary" disabled={busy || name.trim() === org.name || name.trim().length < 3}>
                        {t('saveName')}
                    </button>
                </form>
                <div>
                    <h4 className="mb-1 text-[13px] font-semibold">{t('transferOwnership')}</h4>
                    <p className={`${settingsHint} !mt-0`}>{t('transferHelp')}</p>
                    {managers.length ? (
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                aria-label={t('chooseNewOwner')}
                                className="min-w-[220px] flex-1 px-3 py-2.5"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                            >
                                <option value="">{t('chooseNewOwner')}</option>
                                {managers.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.user.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                className="btn secondary"
                                disabled={busy || !target}
                                onClick={() =>
                                    act(() => axios.post('/api/organization/transfer', { membership: Number(target) }), 'ownershipTransferred', '/approvals?view=organizations')
                                }
                            >
                                {t('transferButton')}
                            </button>
                        </div>
                    ) : (
                        <p className="text-[12px] text-signal">{t('noOtherManagers')}</p>
                    )}
                </div>
                <div className="rounded-[5px] border border-[#f0d6d4] bg-[#fff8f7] p-4 dark:border-[#5b3440] dark:bg-[#2a1d27]">
                    <h4 className="mb-1 text-[13px] font-semibold text-[#b04f4c]">{t('closeOrganization')}</h4>
                    <p className={`${settingsHint} !mt-0`}>{t(org.is_legacy ? 'legacyCannotClose' : 'closeHelp')}</p>
                    {!org.is_legacy && (
                    <div className="flex flex-wrap items-end gap-3">
                        <Field label={t('typeNameToConfirm')} className="mb-0 min-w-[220px] flex-1">
                            <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={org.name} autoComplete="off" />
                        </Field>
                        <button
                            className="btn danger"
                            disabled={busy || confirmName !== org.name}
                            onClick={() =>
                                act(() => axios.delete('/api/organization', { data: { confirm_name: confirmName } }), 'organizationClosed', '/organizations')
                            }
                        >
                            {t('closeOrganization')}
                        </button>
                    </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export function OrganizationSettings({ user, toast }) {
    const { t, date } = useLocale();
    const [invites, setInvites] = useState([]),
        [form, setForm] = useState({ label: '', email: '', max_uses: 1, days: 7 }),
        [key, setKey] = useState(''),
        [busy, setBusy] = useState(false);
    async function load() {
        try {
            setInvites((await axios.get('/api/organization/invites')).data);
        } catch {
            toast(t('error'), 'error');
        }
    }
    useEffect(() => {
        if (user.role === 'manager') load();
    }, [user.role]);
    async function create(event) {
        event.preventDefault();
        setBusy(true);
        try {
            const { data } = await axios.post('/api/organization/invites', form);
            setKey(data.key);
            setForm({ label: '', email: '', max_uses: 1, days: 7 });
            await load();
        } catch {
            toast(t('validation'), 'error');
        } finally {
            setBusy(false);
        }
    }
    async function revoke(id) {
        setBusy(true);
        try {
            await axios.delete(`/api/organization/invites/${id}`);
            await load();
            toast(t('success'));
        } catch {
            toast(t('error'), 'error');
        } finally {
            setBusy(false);
        }
    }
    const field = (name, props = {}) => (
        <input
            value={form[name]}
            onChange={(e) => setForm({ ...form, [name]: props.type === 'number' ? Number(e.target.value) : e.target.value })}
            {...props}
        />
    );
    return (
        <div className="grid gap-6">
            <OrganizationChooser user={user} />
            {user.role === 'manager' && (
                <section className="panel">
                    <div className="panel-heading">
                        <h3>{t('employeeInvitations')}</h3>
                        <Icon name="shield" />
                    </div>
                    <div className={settingsBody}>
                        <p className={settingsHint}>{t('invitationHelp')}</p>
                        <form onSubmit={create} className="grid grid-cols-2 gap-x-[18px] gap-y-0 max-sm:grid-cols-1 [&>button]:justify-self-start">
                            <Field label={t('inviteLabel')}>{field('label', { required: true, maxLength: 100 })}</Field>
                            <Field label={t('restrictEmail')}>{field('email', { type: 'email' })}</Field>
                            <Field label={t('allowedUses')}>{field('max_uses', { required: true, type: 'number', min: 1, max: 20 })}</Field>
                            <Field label={t('validDays')}>{field('days', { required: true, type: 'number', min: 1, max: 14 })}</Field>
                            <button className="btn primary" disabled={busy}>
                                {t('generateInvite')}
                            </button>
                        </form>
                        {key && (
                            <div className="mx-0 my-[22px] grid gap-3 border border-brand bg-brand-tint p-[18px]" role="status">
                                <strong>{t('copyKeyNow')}</strong>
                                <code className="text-brand [overflow-wrap:anywhere]">{key}</code>
                                <button
                                    className="btn secondary justify-self-start"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(key);
                                            toast(t('copied'));
                                        } catch {
                                            toast(t('copyManually'), 'error');
                                        }
                                    }}
                                >
                                    <Icon name="file" size={14} />
                                    {t('copy')}
                                </button>
                            </div>
                        )}
                        <div className="mt-6">
                            {invites.map((invite) => (
                                <div className="flex items-center justify-between gap-3.5 border-t border-t-line px-0 py-[15px]" key={invite.id}>
                                    <div>
                                        <strong>{invite.label}</strong>
                                        <small className="mt-1 block text-muted [overflow-wrap:anywhere]">
                                            {invite.email || t('anyInvitedEmail')} · {invite.uses}/{invite.max_uses} · {date(invite.expires_at)}
                                        </small>
                                    </div>
                                    {invite.revoked_at ? (
                                        <small className="text-muted">{t('revoked')}</small>
                                    ) : (
                                        <button className="btn ghost" disabled={busy} onClick={() => revoke(invite.id)}>
                                            {t('revoke')}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
            <OrganizationProfile user={user} toast={toast} />
        </div>
    );
}

export function EmployeeDirectory({ user, onMessage, toast }) {
    const { t } = useLocale();
    const [search, setSearch] = useState(''),
        [page, setPage] = useState(1),
        [data, setData] = useState(null),
        [error, setError] = useState(false),
        [revision, setRevision] = useState(0),
        [busy, setBusy] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            axios
                .get('/api/organization/members', { params: { search, page }, signal: controller.signal })
                .then(({ data }) => {
                    setData(data);
                    setError(false);
                })
                .catch((e) => {
                    if (!axios.isCancel(e)) setError(true);
                });
        }, 200);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [search, page, revision]);
    async function access(member, fields) {
        setBusy(true);
        try {
            await axios.patch(`/api/organization/members/${member.id}`, {
                role: member.role,
                suspended: member.suspended,
                ...fields,
            });
            setRevision((r) => r + 1);
            toast(t('success'));
        } catch (error) {
            toast(t(error.response?.status === 409 ? 'pendingAssignments' : 'error'), 'error');
        } finally {
            setBusy(false);
        }
    }
    const owner = user.id === user.organization?.owner_user_id;
    return (
        <section className="panel">
            <div className="panel-heading flex-wrap gap-[18px]">
                <h3>
                    {t('employeeDirectory')} {data && <span>{data.total}</span>}
                </h3>
                <div className="flex items-center gap-2 max-sm:w-full">
                    <Icon name="search" size={16} />
                    <input
                        className="max-w-[220px] !text-[12px] max-sm:w-full max-sm:max-w-none"
                        value={search}
                        maxLength={100}
                        aria-label={t('searchEmployees')}
                        placeholder={t('searchEmployees')}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>
            {error ? (
                <button className="btn secondary" onClick={() => setRevision((r) => r + 1)}>
                    {t('retry')}
                </button>
            ) : !data ? (
                <p className={settingsBody} role="status">
                    {t('loading')}
                </p>
            ) : (
                <>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(245px,1fr))] gap-[18px] p-6 max-sm:p-4">
                        {data.data.map((member) => (
                            <article
                                className={`rounded-[5px] border border-line bg-surface p-5 ${member.suspended ? 'opacity-65' : ''}`}
                                key={member.id}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar name={member.user.name} src={member.user.avatar_url} />
                                    <span>
                                        <strong className="block">{member.user.name}</strong>
                                        <small className="mt-1 block text-muted">
                                            {t(member.role)} · {t(`dept${member.department}`)}
                                            {member.user_id === user.organization?.owner_user_id && ` · ${t('ownerBadge')}`}
                                        </small>
                                    </span>
                                </div>
                                <a href={`mailto:${member.user.email}`} className="mx-0 my-[18px] block text-[12px] text-muted [overflow-wrap:anywhere]">
                                    {member.user.email}
                                </a>
                                <div className="flex min-h-9 items-center gap-2">
                                    {member.user_id !== user.id && !member.suspended && (
                                        <button className="btn secondary" onClick={() => onMessage(member.user)}>
                                            <Icon name="comment" size={16} />
                                            {t('messageEmployee')}
                                        </button>
                                    )}
                                    {member.suspended && <span>{t('suspended')}</span>}
                                </div>
                                {owner && member.user_id !== user.id && (
                                    <div className="mt-[15px] flex items-center gap-2 border-t border-t-line pt-[15px]">
                                        <select
                                            className="w-full min-w-0 !text-[12px]"
                                            aria-label={`${t('accountRole')} ${member.user.name}`}
                                            value={member.role}
                                            disabled={busy}
                                            onChange={(e) => access(member, { role: e.target.value })}
                                        >
                                            <option value="employee">{t('employee')}</option>
                                            <option value="manager">{t('manager')}</option>
                                        </select>
                                        <button
                                            className="btn ghost shrink-0 p-2 text-[11px]"
                                            disabled={busy}
                                            onClick={() => access(member, { suspended: !member.suspended })}
                                        >
                                            {t(member.suspended ? 'restoreAccess' : 'suspendAccess')}
                                        </button>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                    <Pager page={data.current_page} lastPage={data.last_page} onPage={setPage} />
                </>
            )}
        </section>
    );
}

export function DatabaseViewer() {
    const { t } = useLocale();
    const [table, setTable] = useState('approval_requests'),
        [page, setPage] = useState(1),
        [data, setData] = useState(null),
        [error, setError] = useState(false),
        [revision, setRevision] = useState(0);
    useEffect(() => {
        let active = true;
        axios
            .get('/api/organization/database', { params: { table, page } })
            .then(({ data }) => {
                if (active) {
                    setData(data);
                    setError(false);
                }
            })
            .catch(() => {
                if (active) setError(true);
            });
        return () => {
            active = false;
        };
    }, [table, page, revision]);
    const cell = 'max-w-[420px] overflow-hidden text-ellipsis whitespace-nowrap border border-line px-[18px] py-[13px]';
    return (
        <section className="panel">
            <div className="flex items-center justify-between gap-5 p-6 max-sm:p-[18px] max-sm:[&>div]:min-w-0">
                <div>
                    <span className="eyebrow">{t('readOnlyDatabase')}</span>
                    <h2 className="m-0 text-[24px] font-[650]">{data?.engine.toUpperCase() || t('database')}</h2>
                    <code className="text-[11px] text-muted [overflow-wrap:anywhere]">{data?.database}</code>
                </div>
                <button className="btn secondary" onClick={() => setRevision((v) => v + 1)}>
                    <Icon name="refresh" size={16} />
                    {t('refresh')}
                </button>
            </div>
            {error ? (
                <p role="alert" className={settingsBody}>
                    {t('forbidden')}
                </p>
            ) : data ? (
                <>
                    <div className="flex gap-1.5 overflow-x-auto px-6 pb-4 pt-0">
                        {data.tables.map((name) => (
                            <button
                                className={`whitespace-nowrap border px-[13px] py-[9px] [font:11px_ui-monospace,monospace] ${name === table ? 'border-brand bg-brand-tint text-brand' : 'border-line'}`}
                                key={name}
                                onClick={() => {
                                    setTable(name);
                                    setPage(1);
                                }}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                    <div className="max-h-[520px] overflow-auto">
                        <table className="min-w-full border-collapse text-left [font:11px_ui-monospace,monospace]">
                            <thead>
                                <tr>
                                    {data.columns.map((column) => (
                                        <th key={column} className={`${cell} sticky top-0 bg-surface-alt font-semibold text-brand`}>
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.data.map((row) => (
                                    <tr key={row.id}>
                                        {data.columns.map((column) => (
                                            <td key={column} className={cell}>
                                                {row[column] === null ? <em className="text-muted">NULL</em> : String(row[column])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pager page={page} lastPage={data.rows.last_page} onPage={setPage}>
                        <span>
                            {data.rows.total} {t('databaseRows')}
                        </span>
                    </Pager>
                </>
            ) : (
                <p className={settingsBody}>{t('loading')}</p>
            )}
        </section>
    );
}
