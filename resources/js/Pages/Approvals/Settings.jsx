import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { Avatar, Field, Icon } from './UI';
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
        if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(chosen.type) ||
            chosen.size > 2 * 1024 * 1024
        ) {
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
            if (remove)
                response = await axios.delete('/api/approvals/profile-photo');
            else {
                const data = new FormData();
                data.append('photo', file);
                response = await axios.post(
                    '/api/approvals/profile-photo',
                    data,
                );
            }
            setUser((current) => ({ ...current, ...response.data }));
            setFile(null);
            toast(t(remove ? 'photoRemoved' : 'photoSaved'));
        } catch (e) {
            setError(
                e.response?.status === 422 || e.response?.status === 413
                    ? t('photoRules')
                    : errorText(e, t),
            );
        } finally {
            setBusy(false);
        }
    }
    return (
        <section
            className="profile-photo-editor"
            aria-label={t('profilePhoto')}
        >
            <div className="settings-avatar">
                <button
                    type="button"
                    className="photo-picker"
                    onClick={() => input.current?.click()}
                    disabled={busy}
                    aria-label={t('choosePhoto')}
                >
                    <Avatar name={user.name} src={preview || user.avatar_url} />
                    <span className="photo-camera">
                        <Icon name="camera" size={14} />
                    </span>
                </button>
                <div>
                    <strong>{user.name}</strong>
                    <small>
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
            <div className="photo-actions">
                <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={() => input.current?.click()}
                >
                    {t('choosePhoto')}
                </button>
                {file ? (
                    <>
                        <button
                            type="button"
                            className="btn primary"
                            disabled={busy}
                            onClick={() => save()}
                        >
                            {t(busy ? 'working' : 'uploadPhoto')}
                        </button>
                        <button
                            type="button"
                            className="btn secondary"
                            disabled={busy}
                            onClick={() => setFile(null)}
                        >
                            {t('cancel')}
                        </button>
                    </>
                ) : (
                    user.avatar_url && (
                        <button
                            type="button"
                            className="btn secondary"
                            disabled={busy}
                            onClick={() => save(true)}
                        >
                            {t('removePhoto')}
                        </button>
                    )
                )}
            </div>
            <p className="settings-hint">{t('photoRules')}</p>
            {file && <p className="settings-hint">{t('photoPreview')}</p>}
            {error && (
                <p className="settings-error" role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}

function PasswordSettings({ toast }) {
    const { t } = useLocale();
    const [values, setValues] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [busy, setBusy] = useState(false),
        [errors, setErrors] = useState({});
    async function save(event) {
        event.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            await axios.put('/api/approvals/password', values);
            setValues({
                current_password: '',
                password: '',
                password_confirmation: '',
            });
            toast(t('passwordSaved'));
        } catch (e) {
            if (e.response?.status === 422)
                setErrors(e.response.data.errors || {});
            else toast(errorText(e, t), 'error');
        } finally {
            setBusy(false);
        }
    }
    return (
        <form className="panel settings-card" onSubmit={save}>
            <div className="panel-heading">
                <h3>{t('securitySettings')}</h3>
                <Icon name="shield" size={19} />
            </div>
            <div className="settings-body">
                <p className="settings-hint">{t('passwordChangeHint')}</p>
                {Object.keys(values).map((key) => (
                    <Field
                        key={key}
                        label={t(
                            {
                                current_password: 'currentPassword',
                                password: 'newPassword',
                                password_confirmation: 'confirmNewPassword',
                            }[key],
                        )}
                    >
                        <input
                            type="password"
                            autoComplete={
                                key === 'current_password'
                                    ? 'current-password'
                                    : 'new-password'
                            }
                            required
                            minLength={key === 'current_password' ? 1 : 12}
                            value={values[key]}
                            aria-invalid={!!errors[key]}
                            onChange={(e) =>
                                setValues({ ...values, [key]: e.target.value })
                            }
                        />
                        {errors[key] && (
                            <span className="settings-error" role="alert">
                                {t(
                                    key === 'current_password'
                                        ? 'currentPasswordError'
                                        : 'newPasswordError',
                                )}
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

export default function Settings({ user, setUser, theme, setTheme, toast }) {
    const { t, locale, setLocale } = useLocale();
    const [name, setName] = useState(user.name),
        [department, setDepartment] = useState(user.department),
        [busy, setBusy] = useState(false);
    const [preferences, setPreferences] = useState({
        ...defaultPreferences,
        ...user.preferences,
    });
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
    const change = (key, value) =>
        setPreferences((current) => ({ ...current, [key]: value }));
    async function restoreDefaults() {
        setBusy(true);
        try {
            const { data } = await axios.post(
                '/api/approvals/preferences/reset',
            );
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
    return (
        <div className="settings-grid expanded-settings">
            <div>
                <form
                    className="panel settings-card"
                    onSubmit={save}
                    id="profile-settings-form"
                >
                    <div className="panel-heading">
                        <h3>{t('profile')}</h3>
                        <Icon name="user" size={19} />
                    </div>
                    <div className="settings-body">
                        <ProfilePhoto
                            user={user}
                            setUser={setUser}
                            toast={toast}
                        />
                        <Field label={t('fullName')}>
                            <input
                                required
                                minLength={1}
                                maxLength={100}
                                value={name}
                                autoComplete="name"
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
                <PasswordSettings toast={toast} />
            </div>
            <div>
                <section className="panel settings-card">
                    <div className="panel-heading">
                        <h3>{t('appearance')}</h3>
                        <Icon name="sun" size={19} />
                    </div>
                    <div className="theme-choices">
                        {['light', 'dark', 'system'].map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setTheme(mode)}
                                aria-pressed={theme === mode}
                                className={theme === mode ? 'selected' : ''}
                            >
                                <div
                                    className={`theme-preview ${mode === 'system' ? 'dark system' : mode}`}
                                >
                                    <i />
                                    <div>
                                        <i />
                                        <i />
                                        <i />
                                    </div>
                                </div>
                                <span>
                                    <Icon
                                        name={
                                            {
                                                light: 'sun',
                                                dark: 'moon',
                                                system: 'monitor',
                                            }[mode]
                                        }
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
                    <div className="settings-body preference-fields">
                        <Field label={t('density')}>
                            <select
                                value={preferences.density}
                                onChange={(e) =>
                                    change('density', e.target.value)
                                }
                            >
                                {['comfortable', 'compact'].map((value) => (
                                    <option key={value} value={value}>
                                        {t(value)}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <label className="settings-toggle">
                            <span>
                                <strong>{t('reduceMotion')}</strong>
                                <small>{t('reduceMotionHelp')}</small>
                            </span>
                            <input
                                type="checkbox"
                                checked={preferences.reduce_motion}
                                onChange={(e) =>
                                    change('reduce_motion', e.target.checked)
                                }
                            />
                        </label>
                    </div>
                </section>
                <section className="panel settings-card">
                    <div className="panel-heading">
                        <h3>{t('requestPreferences')}</h3>
                        <Icon name="list" size={19} />
                    </div>
                    <div className="settings-body">
                        <Field label={t('rowsPerPage')}>
                            <select
                                value={preferences.page_size}
                                onChange={(e) =>
                                    change('page_size', Number(e.target.value))
                                }
                            >
                                {[8, 16, 24].map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label={t('defaultView')}>
                            <select
                                value={preferences.default_view}
                                onChange={(e) =>
                                    change('default_view', e.target.value)
                                }
                            >
                                {['list', 'board'].map((value) => (
                                    <option key={value} value={value}>
                                        {t(value)}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <p className="settings-hint">{t('preferencesHelp')}</p>
                        <button
                            type="submit"
                            form="profile-settings-form"
                            className="btn primary"
                            disabled={busy || !name.trim()}
                        >
                            {t(busy ? 'working' : 'save')}
                        </button>
                    </div>
                </section>
                {user.tenancy_enabled && (
                    <section className="panel settings-card">
                        <div className="panel-heading">
                            <h3>{t('visualDebug')}</h3>
                            <Icon name="monitor" size={19} />
                        </div>
                        <div className="settings-body">
                            <label className="settings-toggle">
                                <span>
                                    <strong>{t('traceEnabled')}</strong>
                                    <small>{t('enableDebugHelp')}</small>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={preferences.visual_debug}
                                    onChange={(e) =>
                                        change('visual_debug', e.target.checked)
                                    }
                                />
                            </label>
                            <button
                                type="submit"
                                form="profile-settings-form"
                                className="btn primary"
                                disabled={busy}
                            >
                                {t('save')}
                            </button>
                        </div>
                    </section>
                )}
                <section className="panel settings-card">
                    <div className="panel-heading">
                        <h3>{t('resetSettings')}</h3>
                        <Icon name="refresh" size={19} />
                    </div>
                    <div className="settings-body">
                        <p className="settings-hint">
                            {t('resetSettingsHelp')}
                        </p>
                        <button
                            type="button"
                            className="btn secondary"
                            disabled={busy}
                            onClick={restoreDefaults}
                        >
                            {t('restoreDefaults')}
                        </button>
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
