import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { LocaleProvider, useLocale } from './i18n';
import { Field, Icon, LanguagePicker, Logo, TechnicalArt } from './UI';
import '../../../css/accord.css';
import '../../../css/anaheim.css';

function AuthContent({ mode }) {
    const { t } = useLocale();
    const signup = mode === 'register';
    const [show, setShow] = useState(false);
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        remember: false,
    });
    function submit(e) {
        e.preventDefault();
        form.post(signup ? '/register' : '/login', {
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    }
    return (
        <div className="accord auth-shell" data-theme="light">
            <Head title={t(signup ? 'register' : 'signIn')} />
            <aside className="auth-story">
                <Logo />
                <div className="auth-story-copy">
                    <span className="eyebrow">{t('overviewLabel')}</span>
                    <h1>{t('authHeadline')}</h1>
                    <p>{t('authSub')}</p>
                </div>
                <div className="auth-art">
                    <TechnicalArt />
                    <div className="floating-card floating-one">
                        <span className="floating-check">
                            <Icon name="check" size={18} />
                        </span>
                        <div>
                            <strong>{t('approved')}</strong>
                            <small>{t('approvedHint')}</small>
                        </div>
                        <span className="mini-avatars">
                            <AvatarDot>A</AvatarDot>
                            <AvatarDot>Y</AvatarDot>
                            <AvatarDot>K</AvatarDot>
                        </span>
                    </div>
                    <div className="floating-card floating-two">
                        <Icon name="leaf" />
                        <div>
                            <strong>{t('leave')}</strong>
                            <small>{t('submittedSuccess')}</small>
                        </div>
                    </div>
                </div>
                <footer>
                    {t('authFooter')}
                    <span>© {new Date().getFullYear()} AE</span>
                </footer>
            </aside>
            <main className="auth-main">
                <div className="auth-top">
                    <div className="mobile-logo">
                        <Logo />
                    </div>
                    <LanguagePicker />
                </div>
                <div className="auth-form-wrap">
                    <span className="welcome-icon">
                        <Icon name="spark" size={26} />
                    </span>
                    <h2>{t(signup ? 'registerTitle' : 'signIn')}</h2>
                    <p>{t(signup ? 'registerSub' : 'signInSub')}</p>
                    <form onSubmit={submit}>
                        {Object.keys(form.errors).length > 0 && (
                            <div className="auth-error" role="alert">
                                {t('authError')}
                            </div>
                        )}
                        {signup && (
                            <Field
                                label={t('fullName')}
                                error={form.errors.name && t('invalid')}
                            >
                                <input
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                    required
                                    autoComplete="name"
                                    maxLength={255}
                                    placeholder={t('namePlaceholder')}
                                />
                            </Field>
                        )}
                        <Field
                            label={t('email')}
                            error={
                                form.errors.email &&
                                (signup ? t('invalid') : t('authError'))
                            }
                        >
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData('email', e.target.value)
                                }
                                required
                                autoComplete="username"
                                placeholder="you@company.com"
                                autoFocus
                            />
                        </Field>
                        <Field
                            label={t('password')}
                            error={form.errors.password && t('passwordHint')}
                        >
                            <span className="password-field">
                                <input
                                    type={show ? 'text' : 'password'}
                                    value={form.data.password}
                                    onChange={(e) =>
                                        form.setData('password', e.target.value)
                                    }
                                    required
                                    minLength={signup ? 8 : undefined}
                                    autoComplete={
                                        signup
                                            ? 'new-password'
                                            : 'current-password'
                                    }
                                    placeholder={
                                        signup ? t('passwordHint') : '••••••••'
                                    }
                                />
                                <button
                                    type="button"
                                    aria-label={t(
                                        show ? 'hidePassword' : 'showPassword',
                                    )}
                                    onClick={() => setShow(!show)}
                                >
                                    <Icon name="eye" size={18} />
                                </button>
                            </span>
                        </Field>
                        {signup && (
                            <Field label={t('confirmPassword')}>
                                <input
                                    type="password"
                                    value={form.data.password_confirmation}
                                    onChange={(e) =>
                                        form.setData(
                                            'password_confirmation',
                                            e.target.value,
                                        )
                                    }
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                            </Field>
                        )}
                        {!signup && (
                            <label className="remember">
                                <input
                                    type="checkbox"
                                    checked={form.data.remember}
                                    onChange={(e) =>
                                        form.setData(
                                            'remember',
                                            e.target.checked,
                                        )
                                    }
                                />
                                {t('remember')}
                            </label>
                        )}
                        <button
                            className="btn primary auth-submit"
                            disabled={form.processing}
                        >
                            {t(
                                form.processing
                                    ? 'working'
                                    : signup
                                      ? 'register'
                                      : 'login',
                            )}
                            <Icon name="arrow" size={18} />
                        </button>
                    </form>
                    <p className="auth-switch">
                        {t(signup ? 'haveAccount' : 'noAccount')}{' '}
                        <Link href={signup ? '/login' : '/register'}>
                            {t(signup ? 'signInLink' : 'register')}
                        </Link>
                    </p>
                    <div className="auth-trust">
                        <Icon name="shield" size={16} />
                        <span>{t('securityTitle')}</span>
                    </div>
                </div>
                <div className="auth-bottom">
                    ANAHEIM ELECTRONICS · {t('workspace')}
                    <span>EN / TH / JP</span>
                </div>
            </main>
        </div>
    );
}
const AvatarDot = ({ children }) => <i>{children}</i>;
export default function Auth(props) {
    return (
        <LocaleProvider>
            <AuthContent {...props} />
        </LocaleProvider>
    );
}
