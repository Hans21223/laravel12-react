import React, { useEffect, useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import { LocaleProvider, useLocale } from './i18n';
import { Field, Icon, LanguagePicker, Logo, PageHeading } from './UI';

const statusLabels = {
    closed: 'statusClosed',
    failed: 'statusFailed',
    provisioning: 'statusProvisioning',
};

export function OrganizationChooser({ user }) {
    const { t } = useLocale();
    const [mode, setMode] = useState('create'),
        [name, setName] = useState(''),
        [key, setKey] = useState(''),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(''),
        [organizations, setOrganizations] = useState(user.organizations || []);
    // The API also returns failed setups the owner can retry or remove.
    const reload = () =>
        axios
            .get('/api/organizations')
            .then(({ data }) => setOrganizations(data.filter((org) => !org.suspended)))
            .catch(() => {});
    useEffect(() => {
        reload();
    }, []);
    async function run(request) {
        setBusy(true);
        setError('');
        try {
            await request();
            location.assign('/approvals');
        } catch (error) {
            setError(t('organizationError'));
            setBusy(false);
            reload();
        }
    }
    async function discard(id) {
        setBusy(true);
        try {
            await axios.delete(`/api/organizations/${id}`);
            await reload();
        } catch {
            setError(t('organizationError'));
        } finally {
            setBusy(false);
        }
    }
    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await axios.post(
                mode === 'create' ? '/api/organizations' : '/api/organizations/join',
                mode === 'create' ? { name } : { invitation_key: key },
            );
            location.assign('/approvals');
        } catch (error) {
            setError(
                t(
                    error.response?.status === 422
                        ? mode === 'join'
                            ? 'inviteInvalid'
                            : 'organizationLimit'
                        : 'organizationError',
                ),
            );
            setBusy(false);
            reload();
        }
    }
    return (
        <div className="grid grid-cols-[minmax(220px,0.8fr)_minmax(320px,1.2fr)] items-start gap-6 max-lg:grid-cols-1 [&>:only-child]:col-[1/-1] [&>:only-child]:m-auto [&>:only-child]:w-full [&>:only-child]:max-w-[720px]">
            {!!organizations.length && (
                <section className="panel p-6">
                    <h2 className="mx-0 mb-5 mt-0 text-[20px] font-[650]">{t('yourOrganizations')}</h2>
                    {organizations.map((org) => {
                        const ready = org.status === 'ready';
                        const Row = ready ? 'button' : 'div';
                        return (
                            <Row
                                key={org.id}
                                className="flex w-full items-center gap-3.5 border-b border-b-line px-0 py-4 text-left"
                                {...(ready && {
                                    disabled: busy,
                                    onClick: () => run(() => axios.post(`/api/organizations/${org.id}/switch`)),
                                })}
                            >
                                <span className="grid size-11 shrink-0 place-items-center bg-brand-tint font-bold text-brand">
                                    {org.name.slice(0, 2).toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <strong className="block [overflow-wrap:anywhere]">{org.name}</strong>
                                    <small className="mt-[3px] block text-muted [overflow-wrap:anywhere]">
                                        {t(org.role)}
                                        {org.owner_user_id === user.id && ` · ${t('ownerBadge')}`}
                                        {statusLabels[org.status] && (
                                            <b className={`font-semibold ${org.status === 'failed' ? 'text-signal' : ''}`}>
                                                {' '}
                                                · {t(statusLabels[org.status])}
                                            </b>
                                        )}
                                    </small>
                                </span>
                                {ready && <Icon name="arrow" />}
                                {org.status === 'failed' && (
                                    <span className="flex shrink-0 gap-1">
                                        <button
                                            className="btn secondary min-h-8 px-2.5 py-1.5 text-[11px]"
                                            disabled={busy}
                                            onClick={() => run(() => axios.post(`/api/organizations/${org.id}/retry`))}
                                        >
                                            {t('retrySetup')}
                                        </button>
                                        <button
                                            className="btn ghost min-h-8 px-2.5 py-1.5 text-[11px]"
                                            disabled={busy}
                                            onClick={() => discard(org.id)}
                                        >
                                            {t('removeSetup')}
                                        </button>
                                    </span>
                                )}
                            </Row>
                        );
                    })}
                </section>
            )}
            <section className="panel">
                <div className="flex border-b border-b-line">
                    {['create', 'join'].map((value) => (
                        <button
                            key={value}
                            aria-pressed={mode === value}
                            className={`flex-1 border-b-2 px-3 py-[18px] ${mode === value ? 'border-b-signal font-semibold text-brand' : 'border-b-transparent text-muted'}`}
                            onClick={() => {
                                setMode(value);
                                setError('');
                            }}
                            disabled={busy}
                        >
                            {t(value === 'create' ? 'createOrganization' : 'joinOrganization')}
                        </button>
                    ))}
                </div>
                <form onSubmit={submit} className="p-[30px] max-sm:p-[22px]">
                    <Icon name={mode === 'create' ? 'layers' : 'shield'} size={30} className="mb-5 text-brand" />
                    <h2 className="mx-0 mb-5 mt-0 text-[20px] font-[650]">
                        {t(mode === 'create' ? 'yourOwnWorkspace' : 'joinYourTeam')}
                    </h2>
                    <p className="mx-0 mb-6 mt-0 leading-[1.7] text-muted">
                        {t(mode === 'create' ? 'createOrganizationHelp' : 'joinOrganizationHelp')}
                    </p>
                    {mode === 'create' ? (
                        <Field label={t('organizationName')}>
                            <input
                                required
                                minLength={3}
                                maxLength={100}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="organization"
                                disabled={busy}
                            />
                        </Field>
                    ) : (
                        <Field label={t('invitationKey')}>
                            <input
                                required
                                maxLength={200}
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                autoComplete="off"
                                spellCheck="false"
                                placeholder="AE-…"
                                disabled={busy}
                            />
                        </Field>
                    )}
                    {error && (
                        <p role="alert" className="mx-0 my-2.5 text-signal">
                            {error}
                        </p>
                    )}
                    <button className="btn primary" disabled={busy}>
                        {t(busy ? 'working' : mode === 'create' ? 'createOrganization' : 'joinOrganization')}
                        <Icon name="arrow" size={16} />
                    </button>
                </form>
            </section>
        </div>
    );
}

function Content({ user }) {
    const { t } = useLocale();
    return (
        <div className="accord min-h-screen bg-canvas">
            <Head title={t('organizations')} />
            <header className="flex items-center justify-between gap-5 bg-[#14273f] px-[5vw] py-[22px] text-white max-sm:flex-wrap max-sm:p-5">
                <Logo />
                <div className="flex items-center gap-[15px]">
                    <LanguagePicker />
                    <button className="btn ghost" onClick={() => router.post('/logout')}>
                        {t('signOut')}
                    </button>
                </div>
            </header>
            <main className="m-auto max-w-[1200px] px-6 py-14 max-sm:px-4 max-sm:py-7">
                <PageHeading
                    eyebrow={`AE / ${t('organizations')}`}
                    title={t('chooseOrganization')}
                    sub={t('organizationIntro')}
                />
                <OrganizationChooser user={user} />
            </main>
        </div>
    );
}

export default function Organizations() {
    const user = usePage().props.auth.user;
    return (
        <LocaleProvider initial={user.locale}>
            <Content user={user} />
        </LocaleProvider>
    );
}
