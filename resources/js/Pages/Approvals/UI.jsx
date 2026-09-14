import React from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useLocale } from './i18n';

const paths = {
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
export function Logo({ compact = false }) {
    return (
        <div className="accord-logo" aria-label="Anaheim Electronics">
            <span className="logo-mark">
                <AEMark />
            </span>
            {!compact && (
                <span className="ae-wordmark">
                    <strong>ANAHEIM</strong>
                    <small>ELECTRONICS</small>
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
export function TechnicalArt() {
    return (
        <div className="technical-art" aria-hidden="true">
            <svg viewBox="0 0 400 260" fill="none">
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
                <g className="technical-accent" strokeWidth="2">
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
            <span className="technical-plate">
                <AEMark />
                <span>
                    ANAHEIM
                    <br />
                    ELECTRONICS
                </span>
            </span>
        </div>
    );
}
export const typeIcons = { leave: 'leaf', budget: 'wallet', document: 'file' };
export function TypeIcon({ type, size = 18 }) {
    return (
        <span className={`type-icon ${type}`}>
            <Icon name={typeIcons[type]} size={size} />
        </span>
    );
}
export function Badge({ status }) {
    const { t } = useLocale();
    return (
        <span className={`status-badge ${status}`}>
            <span />
            {t(status)}
        </span>
    );
}
export function Priority({ value }) {
    const { t } = useLocale();
    return (
        <span className={`priority ${value}`}>
            <span className="priority-bars">
                <i />
                <i />
                <i />
            </span>
            {t(value)}
        </span>
    );
}
export function Avatar({ name = '', small = false }) {
    return (
        <span
            className={`avatar ${small ? 'small' : ''} tone-${name.length % 4}`}
        >
            {name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => s[0])
                .join('')
                .toUpperCase()}
        </span>
    );
}
export function LanguagePicker() {
    const { locale, setLocale, t } = useLocale();
    return (
        <div className="language-picker">
            <Icon name="globe" size={17} />
            <select
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
}) {
    const { t } = useLocale();
    return (
        <Dialog open={open} onClose={onClose} className="accord-dialog">
            <div className="dialog-backdrop" />
            <div className="dialog-scroll">
                <DialogPanel className={`dialog-panel ${className}`}>
                    <div className="dialog-heading">
                        <DialogTitle>{title}</DialogTitle>
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
        <div className="empty-state">
            <span className="empty-illustration">
                <Icon name={filtered ? 'search' : 'inbox'} size={32} />
            </span>
            <h3>{t(filtered ? 'noResults' : 'noRequests')}</h3>
            <p>{t(filtered ? 'noResultsSub' : 'emptySub')}</p>
            {onCreate && (
                <button className="btn primary" onClick={onCreate}>
                    <Icon name="plus" size={17} />
                    {t('newRequest')}
                </button>
            )}
        </div>
    );
}
export function Field({ label, error, children, hint }) {
    return (
        <label className="form-field">
            <span>{label}</span>
            {children}
            {error && (
                <small className="field-error" role="alert">
                    {error}
                </small>
            )}
            {hint && !error && <small className="field-hint">{hint}</small>}
        </label>
    );
}
export function OrbitArt() {
    return (
        <div className="orbit-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <span className="orbit-point point-one">
                <Icon name="check" size={24} />
            </span>
            <span className="orbit-point point-two">
                <Icon name="file" size={20} />
            </span>
            <span className="orbit-point point-three">
                <Icon name="spark" size={18} />
            </span>
            <span className="orbit-center">
                <Icon name="layers" size={40} />
            </span>
        </div>
    );
}
