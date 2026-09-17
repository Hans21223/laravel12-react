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

function Card({ title, icon, children, className = '' }) {
    return (
        <section className={`panel mb-6 ${className}`}>
            <div className="panel-heading border-b border-b-line">
                <h3>{title}</h3>
                <Icon name={icon} size={19} />
            </div>
            {children}
        </section>
    );
}

function Toggle({ label, help, checked, onChange }) {
    return (
        <label className="mt-5 flex cursor-pointer first:mt-0 items-center justify-between gap-[18px]">
            <span>
                <strong className="block text-[13px] font-semibold">{label}</strong>
                <small className="mt-[5px] block text-[12px] leading-normal text-muted">{help}</small>
            </span>
            <input
                type="checkbox"
                className="size-[19px] shrink-0 [accent-color:#c64250]"
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
            <Card title={t('securitySettings')} icon="shield">
                <div className={body}>
                    <p className={hint}>{t('passwordChangeHint')}</p>
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
            </Card>
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
            <Card title={t('deleteAccount')} icon="trash" className="border-[#f0d6d4] dark:border-[#5b3440]">
                <div className={body}>
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
            </Card>
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
    const saveButton = (
        <button type="submit" form="profile-settings-form" className="btn primary" disabled={busy || !name.trim()}>
            {t(busy ? 'working' : 'save')}
        </button>
    );
    return (
        // Cards flow into as many columns as the screen fits, so wide screens have no empty band.
        <div className="gap-6 lg:columns-2 2xl:columns-3 [&_section]:break-inside-avoid">
            <form onSubmit={save} id="profile-settings-form">
                <Card title={t('profile')} icon="user">
                    <div className={body}>
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
                        <Field label={t('language')}>
                            <select value={locale} onChange={(e) => setLocale(e.target.value)}>
                                <option value="en">English</option>
                                <option value="th">ไทย</option>
                                <option value="ja">日本語</option>
                            </select>
                        </Field>
                        <button className="btn primary" disabled={busy || !name.trim()}>
                            {t(busy ? 'working' : 'save')}
                        </button>
                    </div>
                </Card>
            </form>
            <PasswordSettings toast={toast} />
            <Card title={t('appearance')} icon="sun">
                <div className="flex gap-2 px-[23px] pb-0 pt-[23px] max-xs:px-[19px] max-xs:pt-[19px]">
                    {['light', 'dark', 'system'].map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setTheme(mode)}
                            aria-pressed={theme === mode}
                            className={`min-w-0 flex-1 rounded-lg border p-2 ${theme === mode ? 'border-brand bg-brand-tint' : 'border-line'}`}
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
                <div className={`${body} pt-5`}>
                    <Field label={t('density')}>
                        <select value={preferences.density} onChange={(e) => change('density', e.target.value)}>
                            {['comfortable', 'compact'].map((value) => (
                                <option key={value} value={value}>
                                    {t(value)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Toggle
                        label={t('reduceMotion')}
                        help={t('reduceMotionHelp')}
                        checked={preferences.reduce_motion}
                        onChange={(value) => change('reduce_motion', value)}
                    />
                </div>
            </Card>
            <Card title={t('requestPreferences')} icon="list">
                <div className={body}>
                    <Field label={t('rowsPerPage')}>
                        <select value={preferences.page_size} onChange={(e) => change('page_size', Number(e.target.value))}>
                            {[8, 16, 24].map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('defaultView')}>
                        <select value={preferences.default_view} onChange={(e) => change('default_view', e.target.value)}>
                            {['list', 'board'].map((value) => (
                                <option key={value} value={value}>
                                    {t(value)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <p className={hint}>{t('preferencesHelp')}</p>
                    {saveButton}
                </div>
            </Card>
            {user.tenancy_enabled && (
                <Card title={t('visualDebug')} icon="monitor">
                    <div className={body}>
                        <Toggle
                            label={t('traceEnabled')}
                            help={t('enableDebugHelp')}
                            checked={preferences.visual_debug}
                            onChange={(value) => change('visual_debug', value)}
                        />
                        <button type="submit" form="profile-settings-form" className="btn primary" disabled={busy}>
                            {t('save')}
                        </button>
                    </div>
                </Card>
            )}
            <Card title={t('resetSettings')} icon="refresh">
                <div className={body}>
                    <p className={hint}>{t('resetSettingsHelp')}</p>
                    <button type="button" className="btn secondary" disabled={busy} onClick={restoreDefaults}>
                        {t('restoreDefaults')}
                    </button>
                </div>
            </Card>
            <section className="panel mb-6 p-[25px]">
                <Icon name="shield" size={26} className="mb-[13px] text-brand" />
                <h3 className="text-[13px] font-semibold">
                    {t('accountRole')}: {t(user.role)}
                </h3>
                <p className="mb-5 mt-1.5 text-[12px] text-muted">{t('roleHelp')}</p>
                <button className="btn secondary text-[#b26169]" onClick={() => router.post('/logout')}>
                    <Icon name="logout" size={17} />
                    {t('logout')}
                </button>
            </section>
            <DeleteAccount />
        </div>
    );
}
