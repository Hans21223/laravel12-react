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

export function RouteBuilder({ form, change, busy, error }) {
    const { t } = useLocale();
    const [reviewers, setReviewers] = useState([]);
    const [state, setState] = useState('loading');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setState('loading');
        axios
            .get('/api/approvals/reviewers', { signal: controller.signal })
            .then(({ data }) => {
                setReviewers(data);
                setState('ready');
            })
            .catch((error) => {
                if (!axios.isCancel(error)) setState('error');
            });
        return () => controller.abort();
    }, [retry]);
    const ids = form.reviewer_ids;
    return (
        <section className="route-builder">
            <div className="form-section-label">
                03 <span>{t('approvalRoute')}</span>
            </div>
            <div className="route-options">
                {['standard', 'sequential'].map((mode) => (
                    <button
                        type="button"
                        key={mode}
                        disabled={busy}
                        className={`route-option ${form.route_mode === mode ? 'selected' : ''}`}
                        aria-pressed={form.route_mode === mode}
                        onClick={() => {
                            change('route_mode', mode);
                            if (mode === 'sequential' && ids.length < 2)
                                change('reviewer_ids', ['', '']);
                        }}
                    >
                        <Icon
                            name={mode === 'standard' ? 'shield' : 'layers'}
                        />
                        <span>
                            <strong>
                                {t(
                                    mode === 'standard'
                                        ? 'standardRoute'
                                        : 'sequentialRoute',
                                )}
                            </strong>
                            <small>
                                {t(
                                    mode === 'standard'
                                        ? 'standardRouteHelp'
                                        : 'sequentialRouteHelp',
                                )}
                            </small>
                        </span>
                        {form.route_mode === mode && (
                            <Icon name="check" size={16} />
                        )}
                    </button>
                ))}
            </div>
            {form.route_mode === 'sequential' && (
                <div className="route-stages">
                    <p className="form-note">{t('routeRules')}</p>
                    {state === 'loading' && <p role="status">{t('loading')}</p>}
                    {state === 'error' && (
                        <button
                            type="button"
                            className="btn secondary"
                            onClick={() => setRetry((v) => v + 1)}
                        >
                            {t('retry')}
                        </button>
                    )}
                    {state === 'ready' && reviewers.length < 2 && (
                        <p className="route-warning" role="alert">
                            {t('needReviewers')}
                        </p>
                    )}
                    {ids.map((id, index) => (
                        <div className="route-stage-input" key={index}>
                            <span className="route-number">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <Field label={`${t('reviewer')} ${index + 1}`}>
                                <select
                                    value={id}
                                    disabled={busy || state !== 'ready'}
                                    onChange={(e) =>
                                        change(
                                            'reviewer_ids',
                                            ids.map((value, i) =>
                                                i === index
                                                    ? Number(e.target.value) ||
                                                      ''
                                                    : value,
                                            ),
                                        )
                                    }
                                >
                                    <option value="">
                                        {t('selectReviewer')}
                                    </option>
                                    {reviewers.map((person) => (
                                        <option
                                            key={person.id}
                                            value={person.id}
                                            disabled={ids.some(
                                                (chosen, i) =>
                                                    i !== index &&
                                                    Number(chosen) ===
                                                        person.id,
                                            )}
                                        >
                                            {person.name} ·{' '}
                                            {t(`dept${person.department}`)}
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
                                    onClick={() =>
                                        change(
                                            'reviewer_ids',
                                            ids.filter((_, i) => i !== index),
                                        )
                                    }
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
                        <p className="route-warning" role="alert">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}

export function RouteSummary({ item }) {
    const { t } = useLocale();
    const steps = currentSteps(item);
    const done = steps.filter((step) => step.status === 'approved').length;
    if (!steps.length && !item.attachments_count) return null;
    return (
        <span className="route-summary">
            {steps.length > 0 && (
                <span title={t('approvalProgress')}>
                    <Icon name="layers" size={12} />
                    {done}/{steps.length}
                    <span className="mini-route">
                        {steps.map((step) => (
                            <i key={step.id} className={step.status} />
                        ))}
                    </span>
                </span>
            )}
            {item.attachments_count > 0 && (
                <span title={t('attachments')}>
                    <Icon name="file" size={12} />
                    {item.attachments_count}
                </span>
            )}
        </span>
    );
}

export function ApprovalJourney({ item, user }) {
    const { t, date } = useLocale();
    const steps = currentSteps(item);
    const done = steps.filter((step) => step.status === 'approved').length;
    const previous = (item.steps || []).filter(
        (step) => step.round !== item.approval_round,
    );
    const row = (step) => (
        <li key={step.id} className={`journey-step ${step.status}`}>
            <span className="journey-node">
                {step.status === 'approved' ? (
                    <Icon name="check" size={15} />
                ) : step.status === 'rejected' ? (
                    <Icon name="close" size={15} />
                ) : (
                    step.position
                )}
            </span>
            <Avatar
                name={step.reviewer?.name}
                src={step.reviewer?.avatar_url}
            />
            <div className="journey-person">
                <strong>{step.reviewer?.name || '—'}</strong>
                <small>
                    {t(
                        item.status === 'draft' && step.status === 'waiting'
                            ? 'waitingSubmission'
                            : `step${step.status}`,
                    )}
                    {step.status === 'pending' && step.reviewer_id === user.id
                        ? ` · ${t('yourTurn')}`
                        : ''}
                    {step.decided_at
                        ? ` · ${date(step.decided_at, { hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                </small>
                {step.note && <p>{step.note}</p>}
            </div>
        </li>
    );
    return (
        <section
            className="approval-journey"
            aria-label={t('approvalProgress')}
        >
            <header>
                <div>
                    <span className="eyebrow">AE / {t('approvalRoute')}</span>
                    <h3>
                        {t(steps.length ? 'sequentialRoute' : 'standardRoute')}
                    </h3>
                </div>
                <span className="journey-counter">
                    {steps.length ? (
                        `${done} / ${steps.length}`
                    ) : (
                        <Icon name="shield" />
                    )}
                </span>
            </header>
            {steps.length ? (
                <>
                    <div
                        className="journey-progress"
                        role="progressbar"
                        aria-label={t('approvalProgress')}
                        aria-valuenow={done}
                        aria-valuemin={0}
                        aria-valuemax={steps.length}
                    >
                        <span
                            style={{ width: `${(done / steps.length) * 100}%` }}
                        />
                    </div>
                    <ol>{steps.map(row)}</ol>
                    <p className="journey-caption">
                        {t('round')} {item.approval_round} ·{' '}
                        {t('allStagesRequired')}
                    </p>
                </>
            ) : (
                <p className="journey-caption">{t('standardRouteHelp')}</p>
            )}
            {previous.length > 0 && (
                <details className="previous-rounds">
                    <summary>{t('previousRounds')}</summary>
                    {[...new Set(previous.map((step) => step.round))].map(
                        (round) => (
                            <div key={round}>
                                <h4>
                                    {t('round')} {round}
                                </h4>
                                <ol>
                                    {previous
                                        .filter((step) => step.round === round)
                                        .map(row)}
                                </ol>
                            </div>
                        ),
                    )}
                </details>
            )}
        </section>
    );
}

export function RequestAttachments({
    item,
    user,
    onChange,
    toast,
    busy,
    setBusy,
}) {
    const { t, number } = useLocale();
    const [progress, setProgress] = useState(null);
    const [removeId, setRemoveId] = useState(null);
    const files = item.attachments || [];
    const editable =
        item.user_id === user.id && ['draft', 'rejected'].includes(item.status);
    const failure = (error) =>
        toast(
            t(
                error.response?.status === 409
                    ? 'stale'
                    : error.response?.status === 422 ||
                        error.response?.status === 413
                      ? 'attachmentRules'
                      : 'error',
            ),
            'error',
        );
    async function upload(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (
            file.size > 2 * 1024 * 1024 ||
            !/\.(pdf|jpe?g|png|webp)$/i.test(file.name)
        ) {
            toast(t('attachmentRules'), 'error');
            return;
        }
        setBusy(true);
        setProgress(0);
        const payload = new FormData();
        payload.append('file', file);
        payload.append('version', item.version);
        try {
            const { data } = await axios.post(
                `/api/approvals/${item.id}/attachments`,
                payload,
                {
                    onUploadProgress: (event) =>
                        setProgress(
                            Math.round(
                                (event.loaded / (event.total || file.size)) *
                                    100,
                            ),
                        ),
                },
            );
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
            const { data } = await axios.delete(
                `/api/approvals/${item.id}/attachments/${id}`,
                { data: { version: item.version } },
            );
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
        <section className="request-attachments" aria-label={t('attachments')}>
            <header>
                <h3>
                    <Icon name="file" size={18} />
                    {t('attachments')} <span>{files.length}/5</span>
                </h3>
                <small>
                    <Icon name="shield" size={13} />
                    {t('privateFiles')}
                </small>
            </header>
            <div className="attachment-list">
                {files.map((file) => (
                    <div className="attachment-row" key={file.id}>
                        <span className="attachment-type">
                            {file.original_name
                                .split('.')
                                .pop()
                                ?.toUpperCase()
                                .slice(0, 4)}
                        </span>
                        <div>
                            <a
                            href={`/api/approvals/${item.id}/attachments/${file.id}${user.organization ? `?organization_id=${user.organization.id}` : ''}`}
                                className="attachment-name"
                            >
                                {file.original_name}
                                <Icon name="download" size={14} />
                            </a>
                            <small>
                                {number(Math.ceil(file.size / 1024))} KB
                            </small>
                        </div>
                        {editable &&
                            (removeId === file.id ? (
                                <div className="attachment-confirm">
                                    <button
                                        className="btn danger"
                                        disabled={busy}
                                        onClick={() => remove(file.id)}
                                    >
                                        {t('confirm')}
                                    </button>
                                    <button
                                        className="btn ghost"
                                        disabled={busy}
                                        onClick={() => setRemoveId(null)}
                                    >
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
                <label className={`attachment-drop ${busy ? 'disabled' : ''}`}>
                    <Icon name="plus" />
                    <strong>{t('addAttachment')}</strong>
                    <small>{t('attachmentRules')}</small>
                    <input
                        className="sr-only"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        disabled={busy}
                        onChange={upload}
                    />
                </label>
            ) : (
                !files.length && (
                    <p className="form-note">{t('noAttachments')}</p>
                )
            )}
            {progress !== null && (
                <div className="upload-status" role="status">
                    {t(progress === 100 ? 'saving' : 'uploading')}{' '}
                    {number(progress)}%<progress max="100" value={progress} />
                </div>
            )}
            <p className="form-note">{t('attachmentLockHelp')}</p>
        </section>
    );
}
