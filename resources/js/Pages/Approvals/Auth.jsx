import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { LocaleProvider, useLocale } from './i18n';
import { Field, Icon, LanguagePicker, Logo, TechnicalArt } from './UI';

// Copy and endpoint for every Breeze authentication screen.
const modes = {
    login: { title: 'signIn', sub: 'signInSub', submit: 'login', action: '/login', icon: 'spark' },
    register: { title: 'registerTitle', sub: 'registerSub', submit: 'register', action: '/register', icon: 'spark' },
    forgot: { title: 'forgotTitle', sub: 'forgotSub', submit: 'sendResetLink', action: '/forgot-password', icon: 'shield' },
    reset: { title: 'resetTitle', sub: 'resetSub', submit: 'resetPasswordButton', action: '/reset-password', icon: 'shield' },
    verify: { title: 'verifyTitle', sub: 'verifySub', submit: 'resendVerification', action: '/email/verification-notification', icon: 'check' },
    confirm: { title: 'confirmTitle', sub: 'confirmSub', submit: 'confirmButton', action: '/confirm-password', icon: 'shield' },
};
const statusMessages = {
    forgot: 'resetLinkSent',
    login: 'passwordResetDone',
    verify: 'verificationSent',
};
const authInput = '!py-[11px] !text-[12px] max-md:!text-[14px]';

function AuthContent({ mode = 'login', status, email = '', token = '' }) {
    const { t } = useLocale();
    const config = modes[mode] || modes.login;
    const [show, setShow] = useState(false);
    const form = useForm({
        name: '',
        email,
        password: '',
        password_confirmation: '',
        remember: false,
        token,
    });
    const needsEmail = ['login', 'register', 'forgot', 'reset'].includes(mode);
    const needsPassword = ['login', 'register', 'reset', 'confirm'].includes(mode);
    const newPassword = mode === 'register' || mode === 'reset';
    function submit(e) {
        e.preventDefault();
        form.post(config.action, {
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    }
    const hasErrors = Object.keys(form.errors).length > 0;
    const statusText = status && statusMessages[mode] && t(statusMessages[mode]);
    return (
        <div
            className="accord grid min-h-screen grid-cols-2 bg-white max-md:block"
            data-theme="light"
        >
            <Head title={t(config.title)} />
            <aside className="relative flex min-h-[760px] flex-col overflow-hidden bg-[linear-gradient(150deg,#13233b,#1b3656)] px-[52px] pb-7 pt-[45px] text-[#f1f5fc] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(#8ab0db06_1px,transparent_1px),linear-gradient(90deg,#8ab0db06_1px,transparent_1px)] before:bg-[length:38px_38px] before:content-[''] after:absolute after:left-[52px] after:top-0 after:h-1 after:w-[65px] after:bg-signal after:content-[''] max-xl:px-[35px] max-xl:after:left-[35px] max-md:hidden">
                <Logo variant="auth" />
                <div className="relative z-[1] mt-[72px] max-lg:mt-[66px]">
                    <span className="eyebrow mb-[23px] text-[#8da8ca] tracking-[1.8px]">
                        {t('overviewLabel')}
                    </span>
                    <h1 className="whitespace-pre-line font-technical text-[clamp(37px,3.5vw,57px)] font-semibold leading-[1.12] tracking-[-1.7px] max-xl:text-[43px] max-lg:text-[38px]">
                        {t('authHeadline')}
                    </h1>
                    <p className="mt-[22px] max-w-[375px] text-[12px] leading-[1.85] text-[#96b0cd]">
                        {t('authSub')}
                    </p>
                </div>
                <div className="relative mt-[27px] h-[295px] w-full max-w-[490px] self-center max-xl:scale-90 max-lg:w-[120%] max-lg:scale-[.78]">
                    <TechnicalArt variant="auth" />
                    <FloatingCard className="left-0 top-8 z-[2] w-[284px] border-l-[3px] border-l-signal bg-[#eef3f9] text-[#2a4465] [&_small]:text-[#8596ab]">
                        <span className="grid size-[33px] place-items-center rounded bg-[#d9e5f0] text-[#4f7399]">
                            <Icon name="check" size={18} />
                        </span>
                        <div>
                            <strong>{t('approved')}</strong>
                            <small>{t('approvedHint')}</small>
                        </div>
                        <span className="ml-auto flex">
                            {['A', 'Y', 'K'].map((letter, i) => (
                                <i
                                    key={letter}
                                    className={`-ml-1.5 grid size-6 place-items-center rounded-[3px] border-2 border-[#eef3f9] text-[8px] not-italic ${['bg-[#cddbec]', 'bg-[#ded4d4]', 'bg-[#bbccde]'][i]}`}
                                >
                                    {letter}
                                </i>
                            ))}
                        </span>
                    </FloatingCard>
                    <FloatingCard className="right-0 top-[211px] w-[260px] border border-[#6389b34d] bg-[#1b3656] text-[#bdcfe5] [&_small]:max-w-[195px] [&_small]:truncate [&_small]:text-[#7f9dbf]">
                        <Icon name="leaf" />
                        <div>
                            <strong>{t('leave')}</strong>
                            <small>{t('submittedSuccess')}</small>
                        </div>
                    </FloatingCard>
                </div>
                <footer className="relative z-[1] mt-auto flex items-center justify-between gap-5 pt-6 font-mono text-[7px] tracking-[0.75px] text-[#7692b3] max-lg:flex-col max-lg:items-start max-lg:gap-2">
                    {t('authFooter')}
                    <span className="whitespace-nowrap tracking-normal">
                        © {new Date().getFullYear()} AE
                    </span>
                </footer>
            </aside>
            <main className="flex min-w-0 flex-col px-[46px] pb-[23px] pt-[31px] max-lg:px-[30px] max-md:min-h-screen max-md:p-6">
                <div className="flex justify-end max-md:items-center max-md:justify-between">
                    <div className="hidden text-[#25466e] max-md:block">
                        <Logo variant="mobile" />
                    </div>
                    <LanguagePicker />
                </div>
                <div className="m-auto w-full max-w-[352px] py-[50px] max-md:max-w-[365px]">
                    <span className="relative mb-[25px] grid size-[51px] place-items-center rounded-[5px] border border-[#dce5f0] bg-[#edf2f9] text-[#6285b0] after:absolute after:-bottom-px after:-left-px after:h-0.5 after:w-3 after:bg-signal after:content-['']">
                        <Icon name={config.icon} size={26} />
                    </span>
                    <h2 className="font-technical text-[34px] font-semibold leading-[1.3] tracking-[-1px] max-md:text-[31px]">
                        {t(config.title)}
                    </h2>
                    <p className="mt-[9px] text-[12px] text-[#8090a4]">
                        {t(config.sub)}
                    </p>
                    <form onSubmit={submit} className="mt-[30px]">
                        {statusText && (
                            <div
                                className="mb-5 rounded-[7px] border border-[#cfe3d6] bg-[#eef7f1] px-3 py-2.5 text-[11px] text-[#3f7556]"
                                role="status"
                            >
                                {statusText}
                            </div>
                        )}
                        {hasErrors && (
                            <div
                                className="mb-5 rounded-[7px] border border-[#f1d7cf] bg-[#fff1ed] px-3 py-2.5 text-[11px] text-[#ac6b59]"
                                role="alert"
                            >
                                {t(mode === 'reset' && form.errors.email ? 'resetInvalid' : 'authError')}
                            </div>
                        )}
                        {mode === 'register' && (
                            <Field
                                className="mb-5"
                                label={t('fullName')}
                                error={form.errors.name && t('invalid')}
                            >
                                <input
                                    className={authInput}
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
                        {needsEmail && (
                            <Field
                                className="mb-5"
                                label={t('email')}
                                error={
                                    form.errors.email &&
                                    (mode === 'register' ? t('invalid') : t('authError'))
                                }
                            >
                                <input
                                    className={authInput}
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) =>
                                        form.setData('email', e.target.value)
                                    }
                                    required
                                    readOnly={mode === 'reset'}
                                    autoComplete="username"
                                    placeholder="you@company.com"
                                    autoFocus={mode !== 'reset'}
                                />
                            </Field>
                        )}
                        {needsPassword && (
                            <Field
                                className="mb-5"
                                label={t(mode === 'reset' ? 'newPassword' : 'password')}
                                error={form.errors.password && t('passwordHint')}
                            >
                                <span className="relative flex">
                                    <input
                                        className="w-full py-[11px] pl-3 pr-10 !text-[12px]"
                                        type={show ? 'text' : 'password'}
                                        value={form.data.password}
                                        onChange={(e) =>
                                            form.setData('password', e.target.value)
                                        }
                                        required
                                        minLength={newPassword ? 12 : undefined}
                                        autoComplete={newPassword ? 'new-password' : 'current-password'}
                                        placeholder={newPassword ? t('passwordHint') : '••••••••'}
                                        autoFocus={mode === 'reset' || mode === 'confirm'}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ba79c]"
                                        aria-label={t(show ? 'hidePassword' : 'showPassword')}
                                        onClick={() => setShow(!show)}
                                    >
                                        <Icon name="eye" size={18} />
                                    </button>
                                </span>
                            </Field>
                        )}
                        {newPassword && (
                            <Field className="mb-5" label={t('confirmPassword')}>
                                <input
                                    className={authInput}
                                    type="password"
                                    value={form.data.password_confirmation}
                                    onChange={(e) =>
                                        form.setData('password_confirmation', e.target.value)
                                    }
                                    required
                                    minLength={12}
                                    autoComplete="new-password"
                                />
                            </Field>
                        )}
                        {mode === 'login' && (
                            <div className="mb-6 mt-px flex items-center justify-between gap-3">
                                <label className="flex items-center gap-[9px] text-[11px] text-[#77889e]">
                                    <input
                                        className="size-3.5 !border-[#d0dae8] p-0 !text-[#315b8b]"
                                        type="checkbox"
                                        checked={form.data.remember}
                                        onChange={(e) =>
                                            form.setData('remember', e.target.checked)
                                        }
                                    />
                                    {t('remember')}
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-[11px] font-semibold text-[#3b638f] hover:underline"
                                >
                                    {t('forgotPassword')}
                                </Link>
                            </div>
                        )}
                        <button
                            className="btn primary w-full justify-between px-[15px] py-3 text-[12px]"
                            disabled={form.processing}
                        >
                            {t(form.processing ? 'working' : config.submit)}
                            <Icon name="arrow" size={18} />
                        </button>
                    </form>
                    <p className="mt-6 text-center text-[11px]">
                        {mode === 'login' || mode === 'register' ? (
                            <>
                                {t(mode === 'register' ? 'haveAccount' : 'noAccount')}{' '}
                                <Link
                                    className="ml-1 font-semibold text-[#3b638f]"
                                    href={mode === 'register' ? '/login' : '/register'}
                                >
                                    {t(mode === 'register' ? 'signInLink' : 'register')}
                                </Link>
                            </>
                        ) : mode === 'verify' || mode === 'confirm' ? (
                            <button
                                type="button"
                                className="font-semibold text-[#3b638f]"
                                onClick={() => router.post('/logout')}
                            >
                                {t('signOut')}
                            </button>
                        ) : (
                            <Link className="font-semibold text-[#3b638f]" href="/login">
                                {t('backToSignIn')}
                            </Link>
                        )}
                    </p>
                    <div className="mt-[34px] flex items-center justify-center gap-[7px] text-[9px] text-[#98a7ba]">
                        <Icon name="shield" size={16} />
                        <span>{t('securityTitle')}</span>
                    </div>
                </div>
                <div className="flex justify-between font-mono text-[8px] text-[#8799b1] max-md:text-[7px] max-md:[&>span:first-child]:max-w-[72%] 2xl:text-[7px]">
                    ANAHEIM ELECTRONICS · {t('workspace')}
                    <span>EN / TH / JP</span>
                </div>
            </main>
        </div>
    );
}
function FloatingCard({ className, children }) {
    return (
        <div
            className={`absolute flex items-center gap-[11px] rounded px-4 py-3.5 shadow-[0_15px_40px_#0f291d30] [&_small]:mt-1 [&_small]:block [&_small]:text-[9px] [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-semibold ${className}`}
        >
            {children}
        </div>
    );
}
export default function Auth(props) {
    return (
        <LocaleProvider>
            <AuthContent {...props} />
        </LocaleProvider>
    );
}
