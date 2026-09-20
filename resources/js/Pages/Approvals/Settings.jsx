import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { Avatar, avatarTone, Field, Icon } from './UI';
import { useLocale } from './i18n';
import { errorText } from './RequestDialogs';

export const defaultPreferences = {
    theme: 'light',
    density: 'comfortable',
    page_size: 8,
    default_view: 'list',
    reduce_motion: false,
    visual_debug: false,
};

const body = 'p-[25px] max-md:p-5 max-xs:p-[19px] [&>.btn]:mt-1';
const hint = 'm-0 mb-4 text-[12px] leading-[1.6] text-muted';
const errorLine = 'mt-2 block text-[12px] text-[#d14858]';

function Group({ title, children }) {
    return (
        <section className="mb-7">
            <h3 className="mb-2.5 px-1 text-[12px] font-semibold text-muted">{title}</h3>
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {children}
            </div>
        </section>
    );
}

// One line per setting: icon, name, current value. Long forms open underneath.
function Row({ icon, title, description, control, children, danger = false, onClick }) {
    const { t } = useLocale();
    const [open, setOpen] = useState(false);
    const expandable = !!children;
    const Tag = expandable || onClick ? 'button' : 'div';
    return (
        <div>
            <Tag
                type={expandable || onClick ? 'button' : undefined}
                onClick={expandable ? () => setOpen((value) => !value) : onClick}
                aria-expanded={expandable ? open : undefined}
                className={`flex w-full items-center gap-4 px-5 py-4 text-left max-xs:px-4 ${expandable || onClick ? 'hover:bg-surface-alt' : ''}`}
            >
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${danger ? 'bg-[#f7e7e6] text-[#b2564e] dark:bg-[#4a2b30]' : 'bg-brand-tint text-brand'}`}>
                    <Icon name={icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                    <strong className={`block text-[13px] font-semibold ${danger ? 'text-[#b2564e]' : ''}`}>{title}</strong>
                    {description && (
                        <small className="mt-0.5 block text-[12px] leading-[1.6] text-muted">{description}</small>
                    )}
                </span>
                {control && <span className="shrink-0" onClick={(e) => e.stopPropagation()}>{control}</span>}
                {expandable && (
                    <Icon name="down" size={18} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                )}
                {onClick && !control && <Icon name="right" size={18} className="shrink-0 text-muted" />}
            </Tag>
            {expandable && open && (
                <div className="border-t border-t-line bg-surface-alt px-5 py-5 max-xs:px-4" aria-label={title}>
                    {children}
                </div>
            )}
        </div>
    );
}

function Switch({ checked, onChange, label }) {
    return (
        <input
            type="checkbox"
            className="settings-toggle"
            checked={checked}
            aria-label={label}
            onChange={(e) => onChange(e.target.checked)}
        />
    );
}

const rowSelect =
    'rounded-lg border border-line bg-surface px-3 py-2 text-[12px] text-ink';

function Toggle({ label, help, checked, onChange }) {
    return (
        <label className="mt-5 flex cursor-pointer first:mt-0 items-center justify-between gap-[18px]">
            <span>
                <strong className="block text-[13px] font-semibold">{label}</strong>
                <small className="mt-[5px] block text-[12px] leading-normal text-muted">{help}</small>
            </span>
            <input
                type="checkbox"
                className="settings-toggle"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </label>
    );
}

function ProfilePhoto({ user, setUser, toast }) {
    const { t } = useLocale();
    const input = useRef(null);
    const [file, setFile] = useState(null),
        [preview, setPreview] = useState(null),
        [busy, setBusy] = useState(false),
        [error, setError] = useState('');
    useEffect(() => {
        if (!file) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    function select(event) {
        const chosen = event.target.files?.[0];
        event.target.value = '';
        setError('');
        if (!chosen) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(chosen.type) || chosen.size > 2 * 1024 * 1024) {
            setError(t('photoRules'));
            return;
        }
        setFile(chosen);
    }
    async function save(remove = false) {
        setBusy(true);
        setError('');
        try {
            let response;
            if (remove) response = await axios.delete('/api/approvals/profile-photo');
            else {
                const data = new FormData();
                data.append('photo', file);
                response = await axios.post('/api/approvals/profile-photo', data);
            }
            setUser((current) => ({ ...current, ...response.data }));
            setFile(null);
            toast(t(remove ? 'photoRemoved' : 'photoSaved'));
        } catch (e) {
            setError(e.response?.status === 422 || e.response?.status === 413 ? t('photoRules') : errorText(e, t));
        } finally {
            setBusy(false);
        }
    }
    const photoButton = 'btn px-[11px] py-2 text-[12px]';
    return (
        <section className="relative mb-[22px] border-b border-b-line pb-[22px]" aria-label={t('profilePhoto')}>
            <div className="mb-[18px] flex items-center gap-[13px]">
                <button
                    type="button"
                    className="relative shrink-0 rounded-lg"
                    onClick={() => input.current?.click()}
                    disabled={busy}
                    aria-label={t('choosePhoto')}
                >
                    <Avatar
                        name={user.name}
                        src={preview || user.avatar_url}
                        className={`size-[76px] rounded-md border-[3px] border-surface text-[22px] [box-shadow:0_0_0_1px_var(--line)] max-xs:size-16 ${avatarTone(user.name)}`}
                    />
                    <span className="absolute -bottom-1 -right-1 grid size-[26px] place-items-center rounded-md border-2 border-surface bg-[#c64250] text-white">
                        <Icon name="camera" size={14} />
                    </span>
                </button>
                <div>
                    <strong className="block text-[14px] font-semibold">{user.name}</strong>
                    <small className="mt-[3px] block text-[11px] text-muted">
                        {t(user.role)} · {t(`dept${user.department}`)}
                    </small>
                </div>
            </div>
            <input
                ref={input}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={select}
                disabled={busy}
                aria-label={t('choosePhoto')}
                tabIndex={-1}
            />
            <div className="flex flex-wrap gap-2">
                <button type="button" className={`${photoButton} secondary`} disabled={busy} onClick={() => input.current?.click()}>
                    {t('choosePhoto')}
                </button>
                {file ? (
                    <>
                        <button type="button" className={`${photoButton} primary`} disabled={busy} onClick={() => save()}>
                            {t(busy ? 'working' : 'uploadPhoto')}
                        </button>
                        <button type="button" className={`${photoButton} secondary`} disabled={busy} onClick={() => setFile(null)}>
                            {t('cancel')}
                        </button>
                    </>
                ) : (
                    user.avatar_url && (
                        <button type="button" className={`${photoButton} secondary`} disabled={busy} onClick={() => save(true)}>
                            {t('removePhoto')}
                        </button>
                    )
                )}
            </div>
            <p className={hint}>{t('photoRules')}</p>
            {file && <p className={hint}>{t('photoPreview')}</p>}
            {error && (
                <p className={errorLine} role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}

function PasswordSettings({ toast }) {
    const { t } = useLocale();
    const [values, setValues] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [busy, setBusy] = useState(false),
        [errors, setErrors] = useState({});
    async function save(event) {
        event.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            await axios.put('/api/approvals/password', values);
            setValues({ current_password: '', password: '', password_confirmation: '' });
            toast(t('passwordSaved'));
        } catch (e) {
            if (e.response?.status === 422) setErrors(e.response.data.errors || {});
            else toast(errorText(e, t), 'error');
        } finally {
            setBusy(false);
        }
    }
    return (
        <form onSubmit={save}>
                <div>
                    {Object.keys(values).map((key) => (
                        <Field
                            key={key}
                            label={t({ current_password: 'currentPassword', password: 'newPassword', password_confirmation: 'confirmNewPassword' }[key])}
                        >
                            <input
                                type="password"
                                autoComplete={key === 'current_password' ? 'current-password' : 'new-password'}
                                required
                                minLength={key === 'current_password' ? 1 : 12}
                                value={values[key]}
                                aria-invalid={!!errors[key]}
                                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                            />
                            {errors[key] && (
                                <span className={errorLine} role="alert">
                                    {t(key === 'current_password' ? 'currentPasswordError' : 'newPasswordError')}
                                </span>
                            )}
                        </Field>
                    ))}
                    <button className="btn primary" disabled={busy}>
                        {t(busy ? 'working' : 'updatePassword')}
                    </button>
                </div>
        </form>
    );
}

function DeleteAccount() {
    const { t } = useLocale();
    const [password, setPassword] = useState(''),
        [error, setError] = useState(''),
        [busy, setBusy] = useState(false);
    function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        router.delete('/profile', {
            data: { password },
            preserveScroll: true,
            onError: (errors) => {
                const reasons = { owner: 'deleteAccountOwner', member: 'deleteAccountMember', records: 'deleteAccountRecords' };
                setError(t(errors.password ? 'currentPasswordError' : reasons[errors.account] || 'error'));
            },
            onFinish: () => {
                setBusy(false);
                setPassword('');
            },
        });
    }
    return (
        <form onSubmit={submit}>
                <div>
                    <p className={hint}>{t('deleteAccountHelp')}</p>
                    <Field label={t('currentPassword')}>
                        <input
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            aria-invalid={!!error}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {error && (
                            <span className={errorLine} role="alert">
                                {error}
                            </span>
                        )}
                    </Field>
                    <button className="btn danger" disabled={busy || !password}>
                        <Icon name="trash" size={16} />
                        {t(busy ? 'working' : 'deleteAccountButton')}
                    </button>
                </div>
        </form>
    );
}

const themePreview = {
    light: 'border-[#dce4ee] bg-[#f0f3f8]',
    dark: 'border-[#2b3b52] bg-[#0d1828] [&>div>i]:border-[#2f486a] [&>div>i]:bg-[#1d304b] [&>i]:bg-[#172c49]',
    system: 'border-[#2b3b52] bg-[linear-gradient(110deg,#eef2f8_50%,#0b1725_50%)] [&>div>i]:border-[#2f486a] [&>div>i]:bg-[#1d304b] [&>i]:bg-[#172c49]',
};

export default function Settings({ user, setUser, theme, setTheme, toast }) {
    const { t, locale, setLocale } = useLocale();
    const [name, setName] = useState(user.name),
        [department, setDepartment] = useState(user.department),
        [busy, setBusy] = useState(false);
    const [preferences, setPreferences] = useState({ ...defaultPreferences, ...user.preferences });
    async function save(event) {
        event.preventDefault();
        setBusy(true);
        try {
            const { data } = await axios.patch('/api/approvals/preferences', {
                name,
                department,
                locale,
                preferences: { ...preferences, theme },
            });
            setUser((current) => ({ ...current, ...data }));
            toast(t('settingsSaved'));
        } catch (e) {
            toast(errorText(e, t), 'error');
        } finally {
            setBusy(false);
        }
    }
    const change = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));
    async function restoreDefaults() {
        setBusy(true);
        try {
            const { data } = await axios.post('/api/approvals/preferences/reset');
            setPreferences({ ...defaultPreferences });
            setUser((current) => ({ ...current, ...data }));
            setTheme('light');
            setLocale('en');
            toast(t('settingsResetSuccess'));
        } catch (error) {
            toast(errorText(error, t), 'error');
        } finally {
            setBusy(false);
        }
    }
    // Switches and dropdowns apply straight away; only the forms keep a save button.
    async function commit(next) {
        setPreferences(next);
        try {
            const { data } = await axios.patch('/api/approvals/preferences', {
                name,
                department,
                locale,
                preferences: { ...next, theme },
            });
            setUser((current) => ({ ...current, ...data }));
        } catch (e) {
            toast(errorText(e, t), 'error');
        }
    }
    const languages = { en: 'English', th: 'ไทย', ja: '日本語' };
    const [section, setSection] = useState('profile');
    const sections = [
        ['profile', 'user', t('profile')],
        ['security', 'shield', t('securitySettings')],
        ['appearance', 'sun', t('appearance')],
        ['requests', 'list', t('requestPreferences')],
        ['tools', 'monitor', t('settingsGroupTools')],
    ];

    const panels = {
        profile: (
            <>
                <Group title={t('profile')}>
                    <div className="p-5 max-xs:p-4">
                        <form onSubmit={save} id="profile-settings-form">
                            <ProfilePhoto user={user} setUser={setUser} toast={toast} />
                            <Field label={t('fullName')}>
                                <input required minLength={1} maxLength={100} value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
                            </Field>
                            <Field label={t('email')}>
                                <input value={user.email} disabled type="email" />
                            </Field>
                            <Field label={t('department')}>
                                <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                                    {['Operations', 'Engineering', 'Design', 'Finance', 'People', 'Marketing'].map((d) => (
                                        <option key={d} value={d}>
                                            {t(`dept${d}`)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <button className="btn primary" disabled={busy || !name.trim()}>
                                {t(busy ? 'working' : 'save')}
                            </button>
                        </form>
                    </div>
                </Group>
                <Group title={t('language')}>
                    <Row
                        icon="globe"
                        title={t('language')}
                        description={languages[locale]}
                        control={
                            <select className={rowSelect} value={locale} onChange={(e) => setLocale(e.target.value)} aria-label={t('language')}>
                                {Object.entries(languages).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        }
                    />
                </Group>
            </>
        ),
        security: (
            <>
                <Group title={t('securitySettings')}>
                    <Row icon="shield" title={t('updatePassword')} description={t('passwordChangeHint')}>
                        <PasswordSettings toast={toast} />
                    </Row>
                    <Row icon="user" title={`${t('accountRole')}: ${t(user.role)}`} description={t('roleHelp')} />
                    <Row icon="logout" title={t('logout')} description={t('logoutHelp')} onClick={() => router.post('/logout')} />
                </Group>
                <Group title={t('deleteAccount')}>
                    <Row icon="trash" title={t('deleteAccount')} description={t('deleteAccountHelp')} danger>
                        <DeleteAccount />
                    </Row>
                </Group>
            </>
        ),
        appearance: (
            <Group title={t('appearance')}>
                <div className="p-5 max-xs:p-4">
                    <div className="mb-1 text-[12px] font-semibold">{t('theme')}</div>
                    <div className="mt-3 flex gap-2 max-xs:flex-col">
                        {['light', 'dark', 'system'].map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setTheme(mode)}
                                aria-pressed={theme === mode}
                                className={`min-w-0 flex-1 rounded-lg border bg-surface p-2 ${theme === mode ? 'border-brand bg-brand-tint' : 'border-line'}`}
                            >
                                <div
                                    className={`flex h-[68px] overflow-hidden rounded-[5px] border [&>div>i]:mb-1.5 [&>div>i]:block [&>div>i]:h-3 [&>div>i]:rounded-sm [&>div>i]:border [&>i]:h-full [&>i]:w-1/4 ${mode === 'light' ? '[&>div>i]:border-[#dde4ed] [&>div>i]:bg-white [&>i]:bg-[#1e3452]' : ''} ${themePreview[mode]}`}
                                >
                                    <i />
                                    <div className="flex-1 px-[9px] py-3">
                                        <i />
                                        <i />
                                        <i />
                                    </div>
                                </div>
                                <span className="flex flex-wrap items-center gap-[5px] px-1 pb-[3px] pt-[11px] text-[11px]">
                                    <Icon name={{ light: 'sun', dark: 'moon', system: 'monitor' }[mode]} size={16} />
                                    {t(mode)}
                                    {theme === mode && <Icon name="check" size={16} className="ml-auto" />}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                <Row
                    icon="grid"
                    title={t('density')}
                    description={t(preferences.density)}
                    control={
                        <select
                            className={rowSelect}
                            value={preferences.density}
                            aria-label={t('density')}
                            onChange={(e) => commit({ ...preferences, density: e.target.value })}
                        >
                            {['comfortable', 'compact'].map((value) => (
                                <option key={value} value={value}>
                                    {t(value)}
                                </option>
                            ))}
                        </select>
                    }
                />
                <Row
                    icon="refresh"
                    title={t('reduceMotion')}
                    description={t('reduceMotionHelp')}
                    control={
                        <Switch
                            label={t('reduceMotion')}
                            checked={preferences.reduce_motion}
                            onChange={(value) => commit({ ...preferences, reduce_motion: value })}
                        />
                    }
                />
            </Group>
        ),
        requests: (
            <Group title={t('requestPreferences')}>
                <Row
                    icon="list"
                    title={t('rowsPerPage')}
                    description={t('preferencesHelp')}
                    control={
                        <select
                            className={rowSelect}
                            value={preferences.page_size}
                            aria-label={t('rowsPerPage')}
                            onChange={(e) => commit({ ...preferences, page_size: Number(e.target.value) })}
                        >
                            {[8, 16, 24].map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    }
                />
                <Row
                    icon="board"
                    title={t('defaultView')}
                    description={t(preferences.default_view)}
                    control={
                        <select
                            className={rowSelect}
                            value={preferences.default_view}
                            aria-label={t('defaultView')}
                            onChange={(e) => commit({ ...preferences, default_view: e.target.value })}
                        >
                            {['list', 'board'].map((value) => (
                                <option key={value} value={value}>
                                    {t(value)}
                                </option>
                            ))}
                        </select>
                    }
                />
            </Group>
        ),
        tools: (
            <Group title={t('settingsGroupTools')}>
                {user.tenancy_enabled && (
                    <Row
                        icon="monitor"
                        title={t('visualDebug')}
                        description={t('enableDebugHelp')}
                        control={
                            <Switch
                                label={t('traceEnabled')}
                                checked={preferences.visual_debug}
                                onChange={(value) => commit({ ...preferences, visual_debug: value })}
                            />
                        }
                    />
                )}
                <Row
                    icon="refresh"
                    title={t('resetSettings')}
                    description={t('resetSettingsHelp')}
                    control={
                        <button type="button" className="btn secondary" disabled={busy} onClick={restoreDefaults}>
                            {t('restoreDefaults')}
                        </button>
                    }
                />
            </Group>
        ),
    };

    return (
        <div className="flex gap-8 max-lg:flex-col max-lg:gap-5">
            {/* Categories on the left, like a browser settings page; a scrollable strip on phones. */}
            <nav
                aria-label={t('settings')}
                className="w-[212px] shrink-0 self-start max-lg:flex max-lg:w-full max-lg:gap-2 max-lg:overflow-x-auto max-lg:pb-1 lg:sticky lg:top-[92px]"
            >
                {sections.map(([key, icon, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setSection(key)}
                        aria-current={section === key ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[13px] font-semibold max-lg:shrink-0 max-lg:whitespace-nowrap lg:mb-1 lg:w-full ${
                            section === key
                                ? 'bg-brand-tint text-brand'
                                : 'text-muted hover:bg-surface-alt hover:text-ink'
                        }`}
                    >
                        <Icon name={icon} size={18} />
                        {label}
                    </button>
                ))}
            </nav>
            <div className="min-w-0 max-w-[880px] flex-1">{panels[section]}</div>
        </div>
    );
}
