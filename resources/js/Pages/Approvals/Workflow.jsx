import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Avatar, Field, Icon } from './UI';
import { useLocale } from './i18n';

export const currentSteps = (item) =>
    (item.steps || []).filter((step) => step.round === item.approval_round);
export const canReviewRequest = (item, user) =>
    user.role === 'manager' &&
    item.user_id !== user.id &&
    item.status === 'pending' &&
    (item.route_mode !== 'sequential' ||
        currentSteps(item).some(
            (step) => step.status === 'pending' && step.reviewer_id === user.id,
        ));
// Mirrors ApprovalController::reassign: the assignee may delegate, the organization owner may reroute.
export const canReassignStep = (item, step, user) =>
    item.status === 'pending' &&
    item.route_mode === 'sequential' &&
    step.round === item.approval_round &&
    ['pending', 'waiting'].includes(step.status) &&
    (step.reviewer_id === user.id ||
        (user.tenancy_enabled
            ? user.organization?.owner_user_id === user.id
            : user.role === 'manager'));

export function useReviewers(includeSelf = false) {
    const [reviewers, setReviewers] = useState([]);
    const [state, setState] = useState('loading');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setState('loading');
        axios
            .get('/api/approvals/reviewers', {
                params: includeSelf ? { include_self: 1 } : {},
                signal: controller.signal,
            })
            .then(({ data }) => {
                setReviewers(data);
                setState('ready');
            })
            .catch((error) => {
                if (!axios.isCancel(error)) setState('error');
            });
        return () => controller.abort();
    }, [retry, includeSelf]);
    return { reviewers, state, retry: () => setRetry((v) => v + 1) };
}

export function SectionLabel({ number, children }) {
    return (
        <div className="mb-4 flex items-center gap-2.5 text-[10px] tracking-[0.5px] text-muted">
            {number}{' '}
            <span className="text-[12px] font-semibold tracking-normal text-ink">
                {children}
            </span>
        </div>
    );
}

export function FormNote({ icon, children, className = '' }) {
    return (
        <p className={`!mt-[5px] flex items-start gap-[7px] text-[10px] text-muted ${className}`}>
            {icon && <Icon name={icon} size={15} className="shrink-0" />}
            {children}
        </p>
    );
}

export function RouteBuilder({ form, change, busy, error }) {
    const { t } = useLocale();
    const { reviewers, state, retry } = useReviewers();
    const ids = form.reviewer_ids;
    return (
        <section>
            <SectionLabel number="03">{t('approvalRoute')}</SectionLabel>
            <div className="grid grid-cols-2 gap-3 max-xs:grid-cols-1">
                {['standard', 'sequential'].map((mode) => {
                    const selected = form.route_mode === mode;
                    return (
                        <button
                            type="button"
                            key={mode}
                            disabled={busy}
                            className={`flex items-start gap-3 border p-4 text-left text-ink ${selected ? 'border-brand bg-brand-tint [box-shadow:inset_0_3px_var(--green)]' : 'border-line bg-surface'}`}
                            aria-pressed={selected}
                            onClick={() => {
                                change('route_mode', mode);
                                if (mode === 'sequential' && ids.length < 2)
                                    change('reviewer_ids', ['', '']);
                            }}
                        >
                            <Icon
                                name={mode === 'standard' ? 'shield' : 'layers'}
                                className="shrink-0 text-brand"
                            />
                            <span className="flex-1">
                                <strong className="block">
                                    {t(mode === 'standard' ? 'standardRoute' : 'sequentialRoute')}
                                </strong>
                                <small className="mt-[5px] block leading-[1.6] text-muted">
                                    {t(mode === 'standard' ? 'standardRouteHelp' : 'sequentialRouteHelp')}
                                </small>
                            </span>
                            {selected && <Icon name="check" size={16} className="shrink-0 text-brand" />}
                        </button>
                    );
                })}
            </div>
            {form.route_mode === 'sequential' && (
                <div className="mt-4 border border-line bg-surface-alt p-4">
                    <FormNote>{t('routeRules')}</FormNote>
                    {state === 'loading' && <p role="status">{t('loading')}</p>}
                    {state === 'error' && (
                        <button type="button" className="btn secondary" onClick={retry}>
                            {t('retry')}
                        </button>
                    )}
                    {state === 'ready' && reviewers.length < 2 && (
                        <p className="mx-0 my-2.5 text-signal" role="alert">
                            {t('needReviewers')}
                        </p>
                    )}
                    {ids.map((id, index) => (
                        <div className="flex items-center gap-3" key={index}>
                            <span className="grid size-8 shrink-0 place-items-center border border-line text-brand [font:600_13px_ui-monospace,monospace]">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <Field label={`${t('reviewer')} ${index + 1}`} className="mb-[18px] min-w-0 flex-1">
                                <select
                                    value={id}
                                    disabled={busy || state !== 'ready'}
                                    onChange={(e) =>
                                        change(
                                            'reviewer_ids',
                                            ids.map((value, i) =>
                                                i === index ? Number(e.target.value) || '' : value,
                                            ),
                                        )
                                    }
                                >
                                    <option value="">{t('selectReviewer')}</option>
                                    {reviewers.map((person) => (
                                        <option
                                            key={person.id}
                                            value={person.id}
                                            disabled={ids.some(
                                                (chosen, i) => i !== index && Number(chosen) === person.id,
                                            )}
                                        >
                                            {person.name} · {t(`dept${person.department}`)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            {ids.length > 2 && (
                                <button
                                    type="button"
                                    className="icon-button"
                                    disabled={busy}
                                    aria-label={`${t('removeStage')} ${index + 1}`}
                                    onClick={() => change('reviewer_ids', ids.filter((_, i) => i !== index))}
                                >
                                    <Icon name="close" size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                    {ids.length < 4 && (
                        <button
                            type="button"
                            className="btn secondary"
                            disabled={busy || ids.length >= reviewers.length}
                            onClick={() => change('reviewer_ids', [...ids, ''])}
                        >
                            <Icon name="plus" size={15} />
                            {t('addStage')}
                        </button>
                    )}
                    {error && (
                        <p className="mx-0 my-2.5 text-signal" role="alert">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}

const miniTones = { approved: 'bg-brand', pending: 'bg-signal', rejected: 'bg-signal' };

export function RouteSummary({ item }) {
    const { t } = useLocale();
    const steps = currentSteps(item);
    const done = steps.filter((step) => step.status === 'approved').length;
    if (!steps.length && !item.attachments_count) return null;
    return (
        <span className="mt-[5px] flex items-center gap-3 text-[10px] text-muted">
            {steps.length > 0 && (
                <span className="inline-flex items-center gap-[5px]" title={t('approvalProgress')}>
                    <Icon name="layers" size={12} />
                    {done}/{steps.length}
                    <span className="ml-[3px] flex gap-0.5">
                        {steps.map((step) => (
                            <i key={step.id} className={`h-[3px] w-3 ${miniTones[step.status] || 'bg-line'}`} />
                        ))}
                    </span>
                </span>
            )}
            {item.attachments_count > 0 && (
                <span className="inline-flex items-center gap-[5px]" title={t('attachments')}>
                    <Icon name="file" size={12} />
                    {item.attachments_count}
                </span>
            )}
        </span>
    );
}

const nodeTones = {
    approved: 'border-brand bg-brand text-surface',
    pending: 'border-signal bg-surface text-signal [box-shadow:0_0_0_4px_#c6424c15]',
    rejected: 'border-signal bg-signal text-white',
};

function ReassignStage({ item, step, onChange, toast, onDone }) {
    const { t } = useLocale();
    const { reviewers, state } = useReviewers(true);
    const [reviewer, setReviewer] = useState('');
    const [busy, setBusy] = useState(false);
    const taken = new Set(currentSteps(item).map((s) => s.reviewer_id));
    const choices = reviewers.filter((person) => person.id !== item.user_id && !taken.has(person.id));
    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        try {
            const { data } = await axios.post(
                `/api/approvals/${item.id}/steps/${step.id}/reassign`,
                { version: item.version, reviewer_id: Number(reviewer) },
            );
            toast(t('reassignSuccess'));
            onDone();
            onChange(data);
        } catch (error) {
            toast(t(error.response?.status === 409 ? 'stale' : error.response?.status === 422 ? 'reassignInvalid' : 'error'), 'error');
        } finally {
            setBusy(false);
        }
    }
    return (
        <form onSubmit={submit} className="mt-2.5 border-l-2 border-l-signal bg-surface px-3 py-2.5">
            <p className="mb-2 text-[11px] text-muted">{t('reassignHelp')}</p>
            {state === 'ready' && !choices.length ? (
                <p className="text-[11px] text-signal">{t('noOtherReviewers')}</p>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`reassign-${step.id}`}>
                        {t('reassignTo')}
                    </label>
                    <select
                        id={`reassign-${step.id}`}
                        className="min-w-0 flex-1 px-3 py-2"
                        value={reviewer}
                        required
                        disabled={busy || state !== 'ready'}
                        onChange={(e) => setReviewer(e.target.value)}
                    >
                        <option value="">{t(state === 'ready' ? 'reassignTo' : 'loading')}</option>
                        {choices.map((person) => (
                            <option key={person.id} value={person.id}>
                                {person.name} · {t(`dept${person.department}`)}
                            </option>
                        ))}
                    </select>
                    <button className="btn primary min-h-[34px] px-3 py-1.5" disabled={busy || !reviewer}>
                        {t(busy ? 'working' : 'reassign')}
                    </button>
                    <button type="button" className="btn ghost min-h-[34px] px-3 py-1.5" disabled={busy} onClick={onDone}>
                        {t('cancel')}
                    </button>
                </div>
            )}
        </form>
    );
}

export function ApprovalJourney({ item, user, onChange, toast }) {
    const { t, date } = useLocale();
    const [reassigning, setReassigning] = useState(null);
    const steps = currentSteps(item);
    const done = steps.filter((step) => step.status === 'approved').length;
    const previous = (item.steps || []).filter((step) => step.round !== item.approval_round);
    const row = (step) => (
        <li
            key={step.id}
            className={`relative flex items-start gap-3 pb-6 max-xs:gap-2 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:left-[13px] [&:not(:last-child)]:before:top-[26px] [&:not(:last-child)]:before:border-l [&:not(:last-child)]:before:border-l-line [&:not(:last-child)]:before:content-[''] ${['skipped', 'superseded'].includes(step.status) ? 'opacity-65' : ''}`}
        >
            <span
                className={`grid size-7 shrink-0 place-items-center rounded-full border [font:600_12px_ui-monospace,monospace] ${nodeTones[step.status] || 'border-line bg-surface text-muted'}`}
            >
                {step.status === 'approved' ? (
                    <Icon name="check" size={15} />
                ) : step.status === 'rejected' ? (
                    <Icon name="close" size={15} />
                ) : (
                    step.position
                )}
            </span>
            <Avatar name={step.reviewer?.name} src={step.reviewer?.avatar_url} />
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <strong className="block">{step.reviewer?.name || '—'}</strong>
                        <small className="mt-[3px] block text-muted">
                            {t(item.status === 'draft' && step.status === 'waiting' ? 'waitingSubmission' : `step${step.status}`)}
                            {step.status === 'pending' && step.reviewer_id === user.id ? ` · ${t('yourTurn')}` : ''}
                            {step.decided_at ? ` · ${date(step.decided_at, { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </small>
                    </div>
                    {onChange && canReassignStep(item, step, user) && reassigning !== step.id && (
                        <button
                            type="button"
                            className="text-link shrink-0 text-[11px]"
                            onClick={() => setReassigning(step.id)}
                        >
                            <Icon name="refresh" size={13} />
                            {t('reassign')}
                        </button>
                    )}
                </div>
                {step.note && (
                    <p className="mx-0 mb-0 mt-2.5 whitespace-pre-wrap border-l-2 border-l-line bg-surface px-3 py-2.5 [overflow-wrap:anywhere]">
                        {step.note}
                    </p>
                )}
                {reassigning === step.id && (
                    <ReassignStage
                        item={item}
                        step={step}
                        onChange={onChange}
                        toast={toast}
                        onDone={() => setReassigning(null)}
                    />
                )}
            </div>
        </li>
    );
    const caption = 'm-0 px-5 pb-4 pt-0 text-[12px] text-muted';
    return (
        <section
            className="mx-0 my-6 overflow-hidden rounded-[5px] border border-line bg-surface-alt"
            aria-label={t('approvalProgress')}
        >
            <header className="flex items-center justify-between gap-4 bg-brand-tint px-5 py-[18px]">
                <div>
                    <span className="eyebrow font-sans">AE / {t('approvalRoute')}</span>
                    <h3 className="mx-0 mb-0 mt-[5px] text-[17px] font-[650]">
                        {t(steps.length ? 'sequentialRoute' : 'standardRoute')}
                    </h3>
                </div>
                <span className="whitespace-nowrap text-brand [font:600_22px_ui-monospace,monospace]">
                    {steps.length ? `${done} / ${steps.length}` : <Icon name="shield" />}
                </span>
            </header>
            {steps.length ? (
                <>
                    <div
                        className="h-1 bg-line"
                        role="progressbar"
                        aria-label={t('approvalProgress')}
                        aria-valuenow={done}
                        aria-valuemin={0}
                        aria-valuemax={steps.length}
                    >
                        <span
                            className="block h-full bg-brand [transition:width_0.5s_ease]"
                            style={{ width: `${(done / steps.length) * 100}%` }}
                        />
                    </div>
                    <ol className="m-0 list-none px-5 pb-0 pt-[18px]">{steps.map(row)}</ol>
                    <p className={caption}>
                        {t('round')} {item.approval_round} · {t('allStagesRequired')}
                    </p>
                </>
            ) : (
                <p className={`${caption} !pt-[15px]`}>{t('standardRouteHelp')}</p>
            )}
            {previous.length > 0 && (
                <details className="border-t border-t-line px-5 py-3.5">
                    <summary className="cursor-pointer font-semibold text-brand">{t('previousRounds')}</summary>
                    {[...new Set(previous.map((step) => step.round))].map((round) => (
                        <div key={round}>
                            <h4 className="mx-0 mb-0 mt-4 text-[12px]">
                                {t('round')} {round}
                            </h4>
                            <ol className="m-0 list-none px-0 pb-0 pt-[18px]">
                                {previous.filter((step) => step.round === round).map(row)}
                            </ol>
                        </div>
                    ))}
                </details>
            )}
        </section>
    );
}

export function RequestAttachments({ item, user, onChange, toast, busy, setBusy }) {
    const { t, number } = useLocale();
    const [progress, setProgress] = useState(null);
    const [removeId, setRemoveId] = useState(null);
    const files = item.attachments || [];
    const editable = item.user_id === user.id && ['draft', 'rejected'].includes(item.status);
    const failure = (error) =>
        toast(
            t(
                error.response?.status === 409
                    ? 'stale'
                    : error.response?.status === 422 || error.response?.status === 413
                      ? 'attachmentRules'
                      : 'error',
            ),
            'error',
        );
    async function upload(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > 2 * 1024 * 1024 || !/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) {
            toast(t('attachmentRules'), 'error');
            return;
        }
        setBusy(true);
        setProgress(0);
        const payload = new FormData();
        payload.append('file', file);
        payload.append('version', item.version);
        try {
            const { data } = await axios.post(`/api/approvals/${item.id}/attachments`, payload, {
                onUploadProgress: (event) =>
                    setProgress(Math.round((event.loaded / (event.total || file.size)) * 100)),
            });
            onChange(data);
            toast(t('attachmentSaved'));
        } catch (error) {
            failure(error);
        } finally {
            setBusy(false);
            setProgress(null);
        }
    }
    async function remove(id) {
        setBusy(true);
        try {
            const { data } = await axios.delete(`/api/approvals/${item.id}/attachments/${id}`, {
                data: { version: item.version },
            });
            onChange(data);
            setRemoveId(null);
            toast(t('attachmentRemoved'));
        } catch (error) {
            failure(error);
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="mx-0 my-6" aria-label={t('attachments')}>
            <header className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                <h3 className="m-0 flex items-center gap-2 text-[14px] font-[650]">
                    <Icon name="file" size={18} />
                    {t('attachments')}{' '}
                    <span className="rounded-[3px] bg-brand-tint px-[7px] py-0.5 text-[11px] text-brand">
                        {files.length}/5
                    </span>
                </h3>
                <small className="flex items-center gap-2 text-muted">
                    <Icon name="shield" size={13} />
                    {t('privateFiles')}
                </small>
            </header>
            <div>
                {files.map((file) => (
                    <div className="mb-2 flex items-center gap-3 rounded border border-line bg-surface p-3" key={file.id}>
                        <span className="shrink-0 bg-brand-tint px-[7px] py-2.5 text-brand [font:600_10px_ui-monospace,monospace]">
                            {file.original_name.split('.').pop()?.toUpperCase().slice(0, 4)}
                        </span>
                        <div className="min-w-0 flex-1">
                            <a
                                href={`/api/approvals/${item.id}/attachments/${file.id}${user.organization ? `?organization_id=${user.organization.id}` : ''}`}
                                className="flex items-center gap-2 font-semibold text-brand [overflow-wrap:anywhere] hover:underline"
                            >
                                {file.original_name}
                                <Icon name="download" size={14} className="shrink-0" />
                            </a>
                            <small className="mt-[3px] block text-muted">{number(Math.ceil(file.size / 1024))} KB</small>
                        </div>
                        {editable &&
                            (removeId === file.id ? (
                                <div className="flex gap-1 max-xs:flex-col">
                                    <button className="btn danger" disabled={busy} onClick={() => remove(file.id)}>
                                        {t('confirm')}
                                    </button>
                                    <button className="btn ghost" disabled={busy} onClick={() => setRemoveId(null)}>
                                        {t('cancel')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="icon-button destructive"
                                    disabled={busy}
                                    aria-label={`${t('delete')} ${file.original_name}`}
                                    onClick={() => setRemoveId(file.id)}
                                >
                                    <Icon name="trash" size={16} />
                                </button>
                            ))}
                    </div>
                ))}
            </div>
            {editable && files.length < 5 ? (
                <label
                    className={`flex cursor-pointer flex-col items-center gap-[7px] rounded border border-dashed border-brand bg-surface-alt px-4 py-6 text-brand [transition:background_0.2s] focus-within:bg-brand-tint focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand hover:bg-brand-tint hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-brand ${busy ? 'cursor-wait opacity-50' : ''}`}
                >
                    <Icon name="plus" />
                    <strong>{t('addAttachment')}</strong>
                    <small className="text-center text-muted">{t('attachmentRules')}</small>
                    <input
                        className="sr-only"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        disabled={busy}
                        onChange={upload}
                    />
                </label>
            ) : (
                !files.length && <FormNote>{t('noAttachments')}</FormNote>
            )}
            {progress !== null && (
                <div className="mt-3 text-muted" role="status">
                    {t(progress === 100 ? 'saving' : 'uploading')} {number(progress)}%
                    <progress className="mt-2 block h-1.5 w-full [accent-color:var(--green)]" max="100" value={progress} />
                </div>
            )}
            <FormNote>{t('attachmentLockHelp')}</FormNote>
        </section>
    );
}
