import React, { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useLocale } from './i18n';

const paths = {
    database:
        'M3 5c0-4 18-4 18 0s-18 4-18 0 M3 5v14c0 4 18 4 18 0V5 M3 12c0 4 18 4 18 0',
    phone: 'M4 3h4l2 5-3 2c2 4 3 5 7 7l2-3 5 2v4c-9 5-22-8-17-17Z',
    video: 'M2 5h13v14H2z m13 5 7-4v12l-7-4',
    users: 'M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M3 21v-2a8 8 0 0 1 16 0v2 M18 3a4 4 0 0 1 0 8 M22 21v-2a7 7 0 0 0-3-6',
    camera: 'M8 5 10 2h4l2 3h5v16H3V5z M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    monitor: 'M2 3h20v14H2z M8 21h8 M12 17v4',
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    layers: 'm12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5',
    file: 'M14 2H5a1 1 0 0 0-1 1v18h16V8z M14 2v6h6 M8 12h8 M8 16h5',
    inbox: 'M4 4h16l2 12v4H2v-4z M2 15h6l2 3h4l2-3h6',
    chart: 'M4 3v17h17 M8 15v-4 M13 15V6 M18 15V9',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
    settings:
        'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
    help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    plus: 'M12 5v14 M5 12h14',
    search: 'm21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    arrow: 'M4 12h16 m-6-6 6 6-6 6',
    down: 'm6 9 6 6 6-6',
    left: 'm15 6-6 6 6 6',
    right: 'm9 6 6 6-6 6',
    check: 'm5 12 4 4L19 6',
    close: 'm6 6 12 12 M6 18 18 6',
    clock: 'M12 6v6l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    calendar: 'M4 5h16v16H4z M4 10h16 M8 2v6 M16 2v6',
    leaf: 'M20 3C5 2 2 10 6 16s15 3 14-13Z M4 21 15 10',
    wallet: 'M3 6h18v15H3z M3 6V3h15v3 M16 12h5v4h-5z',
    filter: 'M4 6h16 M7 12h10 M10 18h4 M8 4v4 M16 10v4 M12 16v4',
    download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',
    list: 'M8 5h13 M8 12h13 M8 19h13 M3 5h.01 M3 12h.01 M3 19h.01',
    board: 'M3 4h5v16H3z M10 4h5v10h-5z M17 4h5v13h-5z',
    edit: 'm16 3 5 5-12 12-6 1 1-6z M13 6l5 5',
    trash: 'M3 6h18 M8 6V3h8v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
    comment: 'M3 3h18v14H8l-5 4z',
    send: 'm3 3 19 9-19 9 4-9z M7 12h15',
    external: 'M14 3h7v7 M21 3 10 14 M10 3H3v18h18v-7',
    logout: 'M9 3H3v18h6 M9 12h12 m-5-5 5 5-5 5',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
    moon: 'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10',
    shield: 'm12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6z m-5 10 3 3 6-6',
    globe: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M2 12h20 M12 2c-6 5-6 15 0 20 6-5 6-15 0-20',
    menu: 'M3 6h18 M3 12h18 M3 18h18',
    spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
    user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    refresh:
        'M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 14-2l1 3 M4 15l1 3a8 8 0 0 0 14-2',
};
export function Icon({ name, size = 20, ...props }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d={paths[name] || paths.file} />
        </svg>
    );
}
const logoVariants = {
    sidebar: {
        root: 'gap-2.5 max-xl:gap-[7px]',
        mark: 'h-[38px] w-[46px] max-xl:w-10 [&>svg]:h-8 [&>svg]:w-[46px] max-xl:[&>svg]:w-10',
        name: 'text-[18px] tracking-[2.2px] max-xl:text-[16px] max-xl:tracking-[1.6px]',
        sub: 'text-[8px] tracking-[3px] max-xl:text-[7px] max-xl:tracking-[2.4px]',
    },
    auth: {
        root: 'relative z-[1] gap-2.5 max-xl:gap-[7px]',
        mark: 'h-[46px] w-16 [&>svg]:h-[43px] [&>svg]:w-16',
        name: 'text-[23px] tracking-[3px]',
        sub: 'text-[10px] tracking-[3.7px]',
    },
    mobile: {
        root: 'gap-[7px]',
        mark: 'h-[38px] w-[46px] [&>svg]:h-8 [&>svg]:w-[46px]',
        name: 'text-[17px] tracking-[1.8px]',
        sub: 'text-[7px] tracking-[2.7px]',
    },
};
export function Logo({ compact = false, variant = 'sidebar' }) {
    const v = logoVariants[variant];
    return (
        <div
            className={`flex items-center font-[650] leading-none ${v.root}`}
            aria-label="Anaheim Electronics"
        >
            <span
                className={`flex shrink-0 items-center justify-center ${v.mark}`}
            >
                <AEMark />
            </span>
            {!compact && (
                <span className="flex min-w-0 flex-col gap-[3px] font-technical leading-none">
                    <strong className={`font-[750] ${v.name}`}>ANAHEIM</strong>
                    <small className={`font-[450] ${v.sub}`}>ELECTRONICS</small>
                </span>
            )}
        </div>
    );
}
export function AEMark() {
    return (
        <svg viewBox="0 0 82 48" fill="currentColor" aria-hidden="true">
            <path d="M1 44 24 4h11l12 40H35l-2-9H18l-5 9H1Zm22-19h7l-3-12-4 12ZM47 4h34l-5 10H53l-3 6h23l-5 10H46l-3 5h23l-5 9H31l5-10 3-9 3-11 5-10Z" />
        </svg>
    );
}
export function TechnicalArt({ variant = 'hero' }) {
    const auth = variant === 'auth';
    return (
        <div
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#8aaed7] ${
                auth
                    ? 'right-1/2 h-[286px] w-[440px] translate-x-1/2 opacity-85'
                    : 'right-[3px] h-[244px] w-[360px] max-xl:right-[-30px] max-xl:w-[330px] max-xl:opacity-75 max-lg:right-[-90px] max-lg:opacity-35 max-md:right-[-108px] max-md:opacity-25'
            }`}
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 400 260"
                fill="none"
                className="size-full motion-safe:animate-drawing-in"
            >
                <defs>
                    <pattern
                        id="ae-grid"
                        width="22"
                        height="22"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M22 0H0V22"
                            stroke="currentColor"
                            strokeWidth=".45"
                            opacity=".2"
                        />
                    </pattern>
                </defs>
                <path fill="url(#ae-grid)" d="M0 0h400v260H0z" />
                <g stroke="currentColor" strokeWidth=".8" opacity=".55">
                    <circle cx="220" cy="130" r="96" />
                    <circle cx="220" cy="130" r="79" strokeDasharray="3 5" />
                    <path d="M220 12v28m0 180v28M102 130h28m180 0h28M144 54l17 17m118 118 17 17M144 206l17-17m118-118 17-17" />
                    <path d="m168 84 52-30 52 30v91l-52 31-52-31z M168 84l52 30 52-30 M220 114v92 M168 129l52 31 52-31" />
                    <path d="M126 58H72l-20 20H15M311 177h39l23 23h27M125 207H62l-18 17H0" />
                </g>
                <g stroke="currentColor" strokeWidth="1.5">
                    <path d="m189 106 31-18 31 18v48l-31 18-31-18z" />
                    <path d="m189 106 31 18 31-18M220 124v48" />
                </g>
                <g fill="currentColor">
                    <circle cx="126" cy="58" r="3" />
                    <circle cx="311" cy="177" r="3" />
                    <circle cx="125" cy="207" r="3" />
                    <path d="M212 31h16v3h-16zM316 122h3v16h-3z" />
                </g>
                <g className="stroke-[#d4717c]" strokeWidth="2">
                    <path d="M155 91V70h22M287 171v21h-22" />
                    <path d="M36 95h28m-28 6h17M340 217h28m-28 6h17" />
                </g>
                <g
                    fill="currentColor"
                    opacity=".65"
                    fontSize="7"
                    fontFamily="monospace"
                    letterSpacing="1"
                >
                    <text x="15" y="68">
                        AE / SYSTEMS
                    </text>
                    <text x="15" y="247">
                        ENGINEERING DIVISION
                    </text>
                    <text x="301" y="35">
                        01 — 03
                    </text>
                </g>
            </svg>
            <span
                className={`absolute bottom-[23px] right-[19px] items-center gap-[9px] border border-[#678cb744] bg-[#142b47b0] px-2.5 py-[7px] text-[#c2d6ed] -skew-x-6 max-md:hidden [&>svg]:h-6 [&>svg]:w-[34px] ${auth ? 'hidden' : 'flex'}`}
            >
                <AEMark />
                <span className="font-technical text-[6px] leading-[1.6] tracking-[1.2px]">
                    ANAHEIM
                    <br />
                    ELECTRONICS
                </span>
            </span>
        </div>
    );
}
export const typeIcons = { leave: 'leaf', budget: 'wallet', document: 'file' };
const typeTones = {
    document: 'border-[#dfe6f1] bg-[#edf2f9] text-[#6486af]',
    leave: 'border-[#e0e8ea] bg-[#edf2f3] text-[#69898d]',
    budget: 'border-[#ece5d5] bg-[#f6f2e9] text-[#a78e57]',
};
const typeSizes = { sm: 'h-[29px] w-7', md: 'h-[35px] w-[34px]', lg: 'size-[49px]' };
export function TypeIcon({ type, size = 18, box = 'md' }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded border ${typeSizes[box]} ${typeTones[type] || 'border-[#e9e8dd] bg-[#f6f5ed] text-[#a3986d]'}`}
        >
            <Icon name={typeIcons[type]} size={size} />
        </span>
    );
}
const statusTones = {
    pending: 'border-[#eee2c8] bg-[#fbf6e9] text-[#8b6a24] dark:border-[#55452b] dark:bg-[#332c22] dark:text-[#e5bf79]',
    approved: 'border-[#e0ede2] bg-[#edf5f1] text-[#426f5c] dark:border-[#2e5147] dark:bg-[#1c332f] dark:text-[#93cbb0]',
    rejected: 'border-[#f0dce0] bg-[#fbeced] text-[#a84b58] dark:border-[#5a3542] dark:bg-[#372530] dark:text-[#eaa0ae]',
    cancelled: 'border-[#ebe2ef] bg-[#f4eff7] text-[#80698b] dark:border-[#493b57] dark:bg-[#2c2436] dark:text-[#bfa9d1]',
};
export function Badge({ status }) {
    const { t } = useLocale();
    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-medium leading-[1.1] ${statusTones[status] || 'border-line bg-surface-alt text-muted'}`}
        >
            <span className="size-1 rounded-full bg-current" />
            {t(status)}
        </span>
    );
}
const priorityLevels = { low: 0, normal: 1, high: 2, urgent: 3 };
export function Priority({ value, className = '' }) {
    const { t } = useLocale();
    const level = priorityLevels[value] ?? 0;
    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] ${value === 'urgent' ? 'text-[#ad7762]' : 'text-muted'} ${className}`}
        >
            <span className="inline-flex h-2.5 items-end gap-0.5">
                {['h-1', 'h-[7px]', 'h-2.5'].map((height, i) => (
                    <i
                        key={height}
                        className={`w-0.5 rounded-[1px] bg-current ${height} ${i < level ? '' : 'opacity-25'}`}
                    />
                ))}
            </span>
            {t(value)}
        </span>
    );
}
const avatarTones = [
    'bg-[#e8e4ed] text-[#796587]',
    'bg-[#e7ecdf] text-[#667550]',
    'bg-[#eee5df] text-[#956f58]',
    'bg-[#e0e9ed] text-[#5e7f90]',
];
export const avatarTone = (name = '') => avatarTones[name.length % 4];
export function Avatar({ name = '', small = false, src, className }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center overflow-hidden font-[650] ${
                className ||
                `${small ? 'size-8 rounded-full text-[10px]' : 'size-10 rounded-full text-[12px]'} ${avatarTone(name)}`
            }`}
        >
            {src && !failed ? (
                <img
                    src={src}
                    alt=""
                    className="size-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join('')
                    .toUpperCase()
            )}
        </span>
    );
}
export function LanguagePicker({ className = 'text-ink' }) {
    const { locale, setLocale, t } = useLocale();
    return (
        <div className="flex items-center gap-1 text-muted">
            <Icon name="globe" size={17} />
            {/* Options get their own colors: the open list is not drawn on the picker's background. */}
            <select
                className={`min-w-[62px] rounded !border-0 !bg-transparent bg-[length:12px] bg-[position:right_3px_center] !py-[5px] !pl-[3px] !pr-[22px] !text-[11px] [&>option]:bg-surface [&>option]:text-ink ${className}`}
                aria-label={t('language')}
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
            >
                <option value="en">English</option>
                <option value="th">ไทย</option>
                <option value="ja">日本語</option>
            </select>
        </div>
    );
}
export function Modal({
    open = true,
    onClose,
    title,
    children,
    className = '',
    width = 'max-w-[690px]',
    headingClassName = '',
}) {
    const { t } = useLocale();
    return (
        <Dialog
            open={open}
            onClose={onClose}
            className="accord-dialog relative z-[70]"
        >
            <div className="fixed inset-0 bg-[#08132480] backdrop-blur-[4px] print:hidden" />
            <div className="fixed inset-0 flex items-start justify-center overflow-y-auto px-5 py-10 max-md:px-2.5 max-md:py-[18px]">
                <DialogPanel
                    className={`relative my-auto w-full animate-enter rounded-[20px] bg-surface text-ink shadow-[0_24px_90px_#08162e50] ${width} ${className}`}
                >
                    <div
                        className={`flex items-center justify-between gap-[18px] rounded-t-[20px] border-b border-b-line px-7 py-5 max-md:px-5 max-md:py-4 ${headingClassName}`}
                    >
                        <DialogTitle className="font-sans text-[19px] font-semibold tracking-[-0.4px]">
                            {title}
                        </DialogTitle>
                        <button
                            type="button"
                            className="icon-button"
                            onClick={onClose}
                            aria-label={t('close')}
                        >
                            <Icon name="close" />
                        </button>
                    </div>
                    {children}
                </DialogPanel>
            </div>
        </Dialog>
    );
}
export function Empty({ filtered = false, onCreate }) {
    const { t } = useLocale();
    return (
        <div className="flex flex-col items-center gap-3 px-[25px] py-[60px] text-center text-muted">
            <span className="mb-2 grid size-[75px] place-items-center rounded-[5px] border border-line bg-brand-tint text-brand">
                <Icon name={filtered ? 'search' : 'inbox'} size={32} />
            </span>
            <h3 className="font-technical text-[18px] font-[550] tracking-[-0.3px] text-ink">
                {t(filtered ? 'noResults' : 'noRequests')}
            </h3>
            <p className="text-[12px]">{t(filtered ? 'noResultsSub' : 'emptySub')}</p>
            {onCreate && (
                <button className="btn primary mt-[5px]" onClick={onCreate}>
                    <Icon name="plus" size={17} />
                    {t('newRequest')}
                </button>
            )}
        </div>
    );
}
const fieldControls =
    '[&>:is(input,select,textarea)]:w-full [&>:is(input,select,textarea)]:px-3 [&>:is(input,select,textarea)]:py-2.5 [&>:is(input,select,textarea)]:leading-[1.6] max-md:[&>:is(input,select,textarea)]:min-w-0 max-md:[&>:is(input,select,textarea)]:text-[14px] [&>select]:pr-7 [&_:is(input,select,textarea):focus]:border-[#6e91be] [&_:is(input,select,textarea):focus]:[box-shadow:0_0_0_3px_#6e91be12] [&_:is(input,select,textarea):focus]:outline-0 [&_[aria-invalid=true]]:border-[#ce8c83] [&_textarea]:min-h-[72px] [&_textarea]:resize-y';
export function Field({ label, error, children, hint, className = 'mb-[18px]' }) {
    return (
        <label className={`flex flex-col gap-[7px] ${fieldControls} ${className}`}>
            <span className="text-[12px] font-semibold text-ink">{label}</span>
            {children}
            {error && (
                <small className="text-[10px] font-normal text-[#b5655a]" role="alert">
                    {error}
                </small>
            )}
            {hint && !error && (
                <small className="text-[10px] font-normal text-muted">{hint}</small>
            )}
        </label>
    );
}
export function PageHeading({ eyebrow, title, sub, actions, compactTitle = false }) {
    return (
        <div className="page-heading max-md:[&>.btn]:mt-5 max-md:[&>.btn]:px-3 max-md:[&>.btn]:text-[11px] print:[&>.btn]:!hidden">
            <div>
                <div className="eyebrow max-md:text-[8px]">{eyebrow}</div>
                <h1
                    className="page-title"
                >
                    {title}
                </h1>
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted max-md:max-w-[360px] max-md:text-[13px]">
                    {sub}
                </p>
            </div>
            {actions}
        </div>
    );
}

export function LiveStatus({ offline = false, label }) {
    return (
        <span className="inline-flex items-center gap-[5px] text-[9px] text-muted">
            <i
                className={`size-[5px] rounded-[1px] [box-shadow:0_0_0_3px_#668aab10] ${offline ? 'bg-[#be856f]' : 'bg-[#668aab]'}`}
            />
            {label}
        </span>
    );
}

export function CountPill({ children }) {
    return (
        <span className="inline-flex min-w-[21px] items-center justify-center rounded border border-line bg-surface-alt px-1.5 py-px text-[10px] font-medium text-muted">
            {children}
        </span>
    );
}

export function DialogFooter({ children, className = '' }) {
    return (
        <div
            className={`sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-b-[20px] border-t border-t-line bg-surface-alt px-[25px] py-[18px] max-md:px-[18px] max-md:py-[15px] max-md:[&_.btn]:px-[11px] max-md:[&_.btn]:py-2.5 max-md:[&_.btn]:text-[11px] ${className}`}
        >
            {children}
        </div>
    );
}
