import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import { LocaleProvider, useLocale } from './i18n';
import { Field, Icon, LanguagePicker, Logo } from './UI';
import '../../../css/accord.css';
import '../../../css/anaheim.css';
import '../../../css/organization.css';

export function OrganizationChooser({ user }) {
    const { t } = useLocale();
    const [mode, setMode] = useState('create'),
        [name, setName] = useState(''),
        [key, setKey] = useState(''),
        [busy, setBusy] = useState(false),
        [error, setError] = useState('');
    async function enter(id) {
        setBusy(true);
        setError('');
        try {
            await axios.post(`/api/organizations/${id}/switch`);
            location.assign('/approvals');
        } catch {
            setError(t('organizationError'));
            setBusy(false);
        }
    }
    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await axios.post(
                mode === 'create'
                    ? '/api/organizations'
                    : '/api/organizations/join',
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
        }
    }
    return (
        <div className="organization-chooser">
            {!!user.organizations?.length && (
                <section className="panel org-memberships">
                    <h2>{t('yourOrganizations')}</h2>
                    {user.organizations.map((org) => (
                        <button
                            key={org.id}
                            className="org-membership"
                            disabled={busy || org.status !== 'ready'}
                            onClick={() => enter(org.id)}
                        >
                            <span className="org-tile">
                                {org.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span>
                                <strong>{org.name}</strong>
                                <small>{t(org.role)}</small>
                            </span>
                            <Icon name="arrow" />
                        </button>
                    ))}
                </section>
            )}
            <section className="panel org-onboarding">
                <div className="org-mode-tabs">
                    {['create', 'join'].map((value) => (
                        <button
                            key={value}
                            aria-pressed={mode === value}
                            className={mode === value ? 'selected' : ''}
                            onClick={() => {
                                setMode(value);
                                setError('');
                            }}
                            disabled={busy}
                        >
                            {t(
                                value === 'create'
                                    ? 'createOrganization'
                                    : 'joinOrganization',
                            )}
                        </button>
                    ))}
                </div>
                <form onSubmit={submit}>
                    <Icon
                        name={mode === 'create' ? 'layers' : 'shield'}
                        size={30}
                    />
                    <h2>
                        {t(
                            mode === 'create'
                                ? 'yourOwnWorkspace'
                                : 'joinYourTeam',
                        )}
                    </h2>
                    <p>
                        {t(
                            mode === 'create'
                                ? 'createOrganizationHelp'
                                : 'joinOrganizationHelp',
                        )}
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
                        <p role="alert" className="route-warning">
                            {error}
                        </p>
                    )}
                    <button className="btn primary" disabled={busy}>
                        {t(
                            busy
                                ? 'working'
                                : mode === 'create'
                                  ? 'createOrganization'
                                  : 'joinOrganization',
                        )}
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
        <div className="accord organizations-page">
            <Head title={t('organizations')} />
            <header className="organizations-header">
                <Logo />
                <div>
                    <LanguagePicker />
                    <button
                        className="btn ghost"
                        onClick={() => router.post('/logout')}
                    >
                        {t('signOut')}
                    </button>
                </div>
            </header>
            <main>
                <div className="page-heading">
                    <div>
                        <div className="eyebrow">AE / {t('organizations')}</div>
                        <h1>{t('chooseOrganization')}</h1>
                        <p>{t('organizationIntro')}</p>
                    </div>
                </div>
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
