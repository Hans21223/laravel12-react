import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocale } from './i18n';
import { Avatar, Field, Icon } from './UI';
import { OrganizationChooser } from './Organizations';

export function OrganizationSettings({ user, toast }) {
    const { t, date } = useLocale();
    const [invites, setInvites] = useState([]),
        [form, setForm] = useState({
            label: '',
            email: '',
            max_uses: 1,
            days: 7,
        }),
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
            const { data } = await axios.post(
                '/api/organization/invites',
                form,
            );
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
    return (
        <div className="organization-settings">
            <OrganizationChooser user={user} />
            {user.role === 'manager' && (
                <section className="panel invite-panel">
                    <div className="panel-heading">
                        <h3>{t('employeeInvitations')}</h3>
                        <Icon name="shield" />
                    </div>
                    <div className="settings-body">
                        <p className="settings-hint">{t('invitationHelp')}</p>
                        <form onSubmit={create} className="invite-form">
                            <Field label={t('inviteLabel')}>
                                <input
                                    required
                                    maxLength={100}
                                    value={form.label}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            label: e.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <Field label={t('restrictEmail')}>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            email: e.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <Field label={t('allowedUses')}>
                                <input
                                    required
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={form.max_uses}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            max_uses: Number(e.target.value),
                                        })
                                    }
                                />
                            </Field>
                            <Field label={t('validDays')}>
                                <input
                                    required
                                    type="number"
                                    min={1}
                                    max={14}
                                    value={form.days}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            days: Number(e.target.value),
                                        })
                                    }
                                />
                            </Field>
                            <button className="btn primary" disabled={busy}>
                                {t('generateInvite')}
                            </button>
                        </form>
                        {key && (
                            <div className="invite-key" role="status">
                                <strong>{t('copyKeyNow')}</strong>
                                <code>{key}</code>
                                <button
                                    className="btn secondary"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(
                                                key,
                                            );
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
                        <div className="invite-list">
                            {invites.map((invite) => (
                                <div className="invite-row" key={invite.id}>
                                    <div>
                                        <strong>{invite.label}</strong>
                                        <small>
                                            {invite.email ||
                                                t('anyInvitedEmail')}{' '}
                                            · {invite.uses}/{invite.max_uses} ·{' '}
                                            {date(invite.expires_at)}
                                        </small>
                                    </div>
                                    {invite.revoked_at ? (
                                        <small>{t('revoked')}</small>
                                    ) : (
                                        <button
                                            className="btn ghost"
                                            disabled={busy}
                                            onClick={() => revoke(invite.id)}
                                        >
                                            {t('revoke')}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
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
                .get('/api/organization/members', {
                    params: { search, page },
                    signal: controller.signal,
                })
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
        } catch {
            toast(t('error'), 'error');
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="panel directory-panel">
            <div className="panel-heading">
                <h3>
                    {t('employeeDirectory')}{' '}
                    {data && <span className="count-tag">{data.total}</span>}
                </h3>
                <div className="directory-search">
                    <Icon name="search" size={16} />
                    <input
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
                <button
                    className="btn secondary"
                    onClick={() => setRevision((r) => r + 1)}
                >
                    {t('retry')}
                </button>
            ) : !data ? (
                <p className="settings-body" role="status">
                    {t('loading')}
                </p>
            ) : (
                <>
                    <div className="employee-grid">
                        {data.data.map((member) => (
                            <article
                                className={`employee-card ${member.suspended ? 'suspended' : ''}`}
                                key={member.id}
                            >
                                <div className="employee-identity">
                                    <Avatar
                                        name={member.user.name}
                                        src={member.user.avatar_url}
                                    />
                                    <span>
                                        <strong>{member.user.name}</strong>
                                        <small>
                                            {t(member.role)} ·{' '}
                                            {t(`dept${member.department}`)}
                                        </small>
                                    </span>
                                </div>
                                <a
                                    href={`mailto:${member.user.email}`}
                                    className="employee-email"
                                >
                                    {member.user.email}
                                </a>
                                <div className="employee-actions">
                                    {member.user_id !== user.id &&
                                        !member.suspended && (
                                            <button
                                                className="btn secondary"
                                                onClick={() =>
                                                    onMessage(member.user)
                                                }
                                            >
                                                <Icon
                                                    name="comment"
                                                    size={16}
                                                />
                                                {t('messageEmployee')}
                                            </button>
                                        )}
                                    {member.suspended && (
                                        <span>{t('suspended')}</span>
                                    )}
                                </div>
                                {user.id === user.organization?.owner_user_id &&
                                    member.user_id !== user.id && (
                                        <div className="member-access">
                                            <select
                                                aria-label={`${t('accountRole')} ${member.user.name}`}
                                                value={member.role}
                                                disabled={busy}
                                                onChange={(e) =>
                                                    access(member, {
                                                        role: e.target.value,
                                                    })
                                                }
                                            >
                                                <option value="employee">
                                                    {t('employee')}
                                                </option>
                                                <option value="manager">
                                                    {t('manager')}
                                                </option>
                                            </select>
                                            <button
                                                className="btn ghost"
                                                disabled={busy}
                                                onClick={() =>
                                                    access(member, {
                                                        suspended:
                                                            !member.suspended,
                                                    })
                                                }
                                            >
                                                {t(
                                                    member.suspended
                                                        ? 'restoreAccess'
                                                        : 'suspendAccess',
                                                )}
                                            </button>
                                        </div>
                                    )}
                            </article>
                        ))}
                    </div>
                    <div className="directory-pages">
                        <button
                            className="btn secondary"
                            disabled={page === 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            <Icon name="left" size={16} />
                        </button>
                        <span>
                            {data.current_page}/{data.last_page}
                        </span>
                        <button
                            className="btn secondary"
                            disabled={page >= data.last_page}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            <Icon name="right" size={16} />
                        </button>
                    </div>
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
    return (
        <section className="panel database-panel">
            <div className="database-toolbar">
                <div>
                    <span className="eyebrow">{t('readOnlyDatabase')}</span>
                    <h2>{data?.engine.toUpperCase() || t('database')}</h2>
                    <code>{data?.database}</code>
                </div>
                <button
                    className="btn secondary"
                    onClick={() => setRevision((v) => v + 1)}
                >
                    <Icon name="refresh" size={16} />
                    {t('refresh')}
                </button>
            </div>
            {error ? (
                <p role="alert" className="settings-body">
                    {t('forbidden')}
                </p>
            ) : data ? (
                <>
                    <div className="database-tabs">
                        {data.tables.map((name) => (
                            <button
                                className={name === table ? 'selected' : ''}
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
                    <div className="database-table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    {data.columns.map((column) => (
                                        <th key={column}>{column}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.data.map((row) => (
                                    <tr key={row.id}>
                                        {data.columns.map((column) => (
                                            <td key={column}>
                                                {row[column] === null ? (
                                                    <em>NULL</em>
                                                ) : (
                                                    String(row[column])
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="directory-pages">
                        <span>
                            {data.rows.total} {t('databaseRows')}
                        </span>
                        <button
                            className="btn secondary"
                            disabled={page === 1}
                            onClick={() => setPage((v) => v - 1)}
                        >
                            <Icon name="left" size={16} />
                        </button>
                        <span>
                            {page}/{data.rows.last_page}
                        </span>
                        <button
                            className="btn secondary"
                            disabled={page >= data.rows.last_page}
                            onClick={() => setPage((v) => v + 1)}
                        >
                            <Icon name="right" size={16} />
                        </button>
                    </div>
                </>
            ) : (
                <p className="settings-body">{t('loading')}</p>
            )}
        </section>
    );
}
