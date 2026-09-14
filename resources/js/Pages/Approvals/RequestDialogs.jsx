import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocale } from './i18n';
import { Avatar, Badge, Field, Icon, Modal, Priority, TypeIcon } from './UI';

export function errorText(error, t) {
    return t(
        {
            401: 'sessionExpired',
            419: 'sessionExpired',
            403: 'forbidden',
            404: 'missing',
            409: 'stale',
            422: 'validation',
        }[error.response?.status] || (error.response ? 'error' : 'offline'),
    );
}
const empty = {
    title: '',
    description: '',
    type: 'leave',
    priority: 'normal',
    amount: '',
    start_date: '',
    end_date: '',
    due_date: '',
    document_url: '',
};
export function RequestForm({ item, initialType, onClose, onSaved, toast }) {
    const { t } = useLocale();
    const [form, setForm] = useState(() =>
        Object.fromEntries(
            Object.keys(empty).map((k) => [
                k,
                item?.[k] ?? (k === 'type' ? initialType || 'leave' : empty[k]),
            ]),
        ),
    );
    const [baseline] = useState(JSON.stringify(form));
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [discard, setDiscard] = useState(false);
    const dirty = JSON.stringify(form) !== baseline;
    const change = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: null }));
    };
    const close = () => {
        if (busy) return;
        if (dirty) setDiscard(true);
        else onClose();
    };
    useEffect(() => {
        const handler = (e) => {
            if (dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty]);
    async function save(submit) {
        const errs = {};
        if (form.title.trim().length < 3 || form.title.length > 180)
            errs.title = t('titleError');
        if (
            form.description.trim().length < 10 ||
            form.description.length > 10000
        )
            errs.description = t('descriptionError');
        if (
            form.type === 'budget' &&
            (!/^\d+(\.\d{1,2})?$/.test(form.amount) ||
                Number(form.amount) <= 0 ||
                Number(form.amount) > 999999999.99)
        )
            errs.amount = t('moneyError');
        if (form.type === 'leave') {
            if (!form.start_date) errs.start_date = t('required');
            if (!form.end_date) errs.end_date = t('required');
            else if (form.end_date < form.start_date)
                errs.end_date = t('dateError');
        }
        if (form.type === 'document' && form.document_url) {
            try {
                if (
                    !['https:', 'http:'].includes(
                        new URL(form.document_url).protocol,
                    )
                )
                    errs.document_url = t('urlError');
            } catch {
                errs.document_url = t('urlError');
            }
        }
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setBusy(true);
        try {
            const payload = {
                ...form,
                title: form.title.trim(),
                description: form.description.trim(),
                submit,
                version: item?.version,
            };
            const { data } = await axios[item ? 'put' : 'post'](
                `/api/approvals${item ? `/${item.id}` : ''}`,
                payload,
            );
            toast(
                t(
                    submit
                        ? 'submittedSuccess'
                        : item?.status === 'pending'
                          ? 'success'
                          : 'savedDraft',
                ),
            );
            onSaved(data);
        } catch (error) {
            const server = error.response?.data.errors;
            if (server)
                setErrors(
                    Object.fromEntries(
                        Object.keys(server).map((k) => [
                            k,
                            t(
                                {
                                    title: 'titleError',
                                    description: 'descriptionError',
                                    amount: 'moneyError',
                                    end_date: 'dateError',
                                    document_url: 'urlError',
                                }[k] || 'invalid',
                            ),
                        ]),
                    ),
                );
            toast(errorText(error, t), 'error');
        } finally {
            setBusy(false);
        }
    }
    const input = (key, type = 'text', extra = {}) => (
        <input
            type={type}
            value={form[key]}
            onChange={(e) => change(key, e.target.value)}
            aria-invalid={!!errors[key]}
            disabled={busy}
            {...extra}
        />
    );
    return (
        <>
            <Modal
                title={t(item ? 'edit' : 'newRequest')}
                onClose={close}
                className="request-form"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        save(true);
                    }}
                    noValidate
                >
                    <div className="dialog-body">
                        <div className="form-section-label">
                            01 <span>{t('requestType')}</span>
                        </div>
                        <div className="type-choices">
                            {['leave', 'budget', 'document'].map((type) => (
                                <button
                                    type="button"
                                    key={type}
                                    disabled={busy}
                                    aria-pressed={form.type === type}
                                    onClick={() => change('type', type)}
                                    className={`type-choice ${form.type === type ? 'selected' : ''}`}
                                >
                                    <TypeIcon type={type} />
                                    <strong>{t(type)}</strong>
                                    <small>{t(`${type}Hint`)}</small>
                                    {form.type === type && (
                                        <span className="type-check">
                                            <Icon name="check" size={12} />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="form-section-label">
                            02 <span>{t('details')}</span>
                        </div>
                        <Field label={t('title')} error={errors.title}>
                            {input('title', 'text', {
                                placeholder: t('titlePlaceholder'),
                                maxLength: 180,
                                autoFocus: true,
                            })}
                        </Field>
                        <Field
                            label={t('description')}
                            error={errors.description}
                        >
                            <textarea
                                rows={4}
                                value={form.description}
                                disabled={busy}
                                onChange={(e) =>
                                    change('description', e.target.value)
                                }
                                maxLength={10000}
                                placeholder={t('descriptionPlaceholder')}
                                aria-invalid={!!errors.description}
                            />
                        </Field>
                        {form.type === 'budget' && (
                            <Field label={t('amount')} error={errors.amount}>
                                {input('amount', 'number', {
                                    min: 0.01,
                                    max: 999999999.99,
                                    step: 0.01,
                                    placeholder: '0.00',
                                })}
                            </Field>
                        )}
                        {form.type === 'leave' && (
                            <div className="form-grid">
                                <Field
                                    label={t('startDate')}
                                    error={errors.start_date}
                                >
                                    {input('start_date', 'date')}
                                </Field>
                                <Field
                                    label={t('endDate')}
                                    error={errors.end_date}
                                >
                                    {input('end_date', 'date', {
                                        min: form.start_date,
                                    })}
                                </Field>
                            </div>
                        )}
                        {form.type === 'document' && (
                            <Field
                                label={t('documentUrl')}
                                hint={t('urlHint')}
                                error={errors.document_url}
                            >
                                {input('document_url', 'url', {
                                    placeholder: 'https://',
                                })}
                            </Field>
                        )}
                        <div className="form-grid">
                            <Field label={t('priority')}>
                                <select
                                    disabled={busy}
                                    value={form.priority}
                                    onChange={(e) =>
                                        change('priority', e.target.value)
                                    }
                                >
                                    {['normal', 'high', 'urgent'].map((p) => (
                                        <option key={p} value={p}>
                                            {t(p)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label={t('due')} error={errors.due_date}>
                                {input('due_date', 'date')}
                            </Field>
                        </div>
                        <p className="form-note">
                            <Icon name="shield" size={15} />
                            {t('draftHelp')}
                        </p>
                    </div>
                    <div className="dialog-footer">
                        <button
                            type="button"
                            className="btn ghost"
                            disabled={busy}
                            onClick={close}
                        >
                            {t('cancel')}
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="btn secondary"
                                disabled={busy}
                                onClick={() => save(false)}
                            >
                                {t(
                                    item?.status === 'pending'
                                        ? 'savePending'
                                        : 'saveDraft',
                                )}
                            </button>
                            {item?.status !== 'pending' && (
                                <button
                                    type="submit"
                                    className="btn primary"
                                    disabled={busy}
                                >
                                    {t(busy ? 'working' : 'submit')}
                                    <Icon name="arrow" size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>
            {discard && (
                <Modal
                    title={t('unsavedTitle')}
                    onClose={() => setDiscard(false)}
                    className="confirm-modal"
                >
                    <div className="dialog-body">
                        <p>{t('unsavedHelp')}</p>
                    </div>
                    <div className="dialog-footer">
                        <button
                            className="btn secondary"
                            onClick={() => setDiscard(false)}
                        >
                            {t('keepEditing')}
                        </button>
                        <button className="btn danger" onClick={onClose}>
                            {t('discard')}
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
}

export function RequestDetail({
    item,
    user,
    onClose,
    onEdit,
    onChange,
    toast,
}) {
    const { t, date, money } = useLocale();
    const [action, setAction] = useState(null),
        [note, setNote] = useState(''),
        [comment, setComment] = useState(''),
        [busy, setBusy] = useState(false),
        [noteError, setNoteError] = useState('');
    const own = item.user_id === user.id;
    const canReview =
        user.role === 'manager' && !own && item.status === 'pending';
    async function perform() {
        if (action === 'rejected' && !note.trim()) {
            setNoteError(t('rejectNote'));
            return;
        }
        setBusy(true);
        try {
            let response;
            if (action === 'delete')
                response = await axios.delete(`/api/approvals/${item.id}`, {
                    data: { version: item.version },
                });
            else if (action === 'cancel')
                response = await axios.post(
                    `/api/approvals/${item.id}/cancel`,
                    { version: item.version },
                );
            else
                response = await axios.post(
                    `/api/approvals/${item.id}/decision`,
                    {
                        version: item.version,
                        decision: action,
                        note: note.trim() || null,
                    },
                );
            toast(
                t(
                    action === 'delete'
                        ? 'deletedSuccess'
                        : action === 'cancel'
                          ? 'success'
                          : 'decisionSuccess',
                ),
            );
            setAction(null);
            onChange(action === 'delete' ? null : response.data);
        } catch (error) {
            toast(errorText(error, t), 'error');
        } finally {
            setBusy(false);
        }
    }
    async function sendComment(e) {
        e.preventDefault();
        if (!comment.trim()) return;
        setBusy(true);
        try {
            const { data } = await axios.post(
                `/api/approvals/${item.id}/comments`,
                { body: comment.trim() },
            );
            setComment('');
            onChange(data);
            toast(t('success'));
        } catch (error) {
            toast(errorText(error, t), 'error');
        } finally {
            setBusy(false);
        }
    }
    const begin = (value) => {
        setNote('');
        setNoteError('');
        setAction(value);
    };
    return (
        <>
            <Modal
                title={`REQ-${String(item.id).padStart(4, '0')}`}
                onClose={() => !busy && onClose()}
                className="detail-modal"
            >
                <div className="dialog-body">
                    <div className="detail-title">
                        <TypeIcon type={item.type} size={24} />
                        <div>
                            <div className="eyebrow">{t(item.type)}</div>
                            <h2>{item.title}</h2>
                        </div>
                    </div>
                    <div className="detail-badges">
                        <Badge status={item.status} />
                        <Priority value={item.priority} />
                        <span>
                            {date(item.created_at, { year: 'numeric' })}
                        </span>
                    </div>
                    <div className="detail-people">
                        <div>
                            <Avatar name={item.owner?.name} />
                            <span>
                                <small>{t('owner')}</small>
                                <strong>{item.owner?.name}</strong>
                            </span>
                        </div>
                        <div>
                            <span className="reviewer-icon">
                                <Icon name="shield" />
                            </span>
                            <span>
                                <small>{t('reviewer')}</small>
                                <strong>
                                    {item.reviewer?.name || t('awaiting')}
                                </strong>
                            </span>
                        </div>
                    </div>
                    <h3 className="detail-section-title">{t('description')}</h3>
                    <p className="detail-description">{item.description}</p>
                    <div className="detail-facts">
                        <div>
                            <small>{t('department')}</small>
                            <strong>{t(`dept${item.department}`)}</strong>
                        </div>
                        <div>
                            <small>{t('due')}</small>
                            <strong>
                                {date(item.due_date, { year: 'numeric' })}
                            </strong>
                        </div>
                        {item.type === 'budget' && (
                            <div>
                                <small>{t('budgetNote')}</small>
                                <strong className="money-value">
                                    {money(item.amount)}
                                </strong>
                            </div>
                        )}
                        {item.type === 'leave' && (
                            <div className="span-two">
                                <small>{t('leavePeriod')}</small>
                                <strong>
                                    {date(item.start_date)} →{' '}
                                    {date(item.end_date, { year: 'numeric' })}
                                </strong>
                            </div>
                        )}
                        {item.type === 'document' && item.document_url && (
                            <div className="span-two">
                                <small>{t('documentUrl')}</small>
                                <a
                                    href={item.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-link"
                                >
                                    {t('openDocument')}
                                    <Icon name="external" size={15} />
                                </a>
                            </div>
                        )}
                    </div>
                    {item.decision_note && (
                        <div className={`decision-note ${item.status}`}>
                            <Icon
                                name={
                                    item.status === 'approved'
                                        ? 'check'
                                        : 'comment'
                                }
                                size={18}
                            />
                            <div>
                                <strong>{t('note')}</strong>
                                <p>{item.decision_note}</p>
                            </div>
                        </div>
                    )}
                    <h3 className="detail-section-title">{t('history')}</h3>
                    <div className="timeline">
                        {item.events?.map((event) => (
                            <div className="timeline-item" key={event.id}>
                                <span
                                    className={`timeline-dot ${event.action}`}
                                >
                                    <Icon
                                        name={
                                            event.action === 'approved'
                                                ? 'check'
                                                : event.action === 'commented'
                                                  ? 'comment'
                                                  : 'clock'
                                        }
                                        size={13}
                                    />
                                </span>
                                <div>
                                    <strong>
                                        {t(`${event.action}Action`)}
                                    </strong>
                                    <small>
                                        {event.actor?.name || '—'} ·{' '}
                                        {date(event.created_at, {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </small>
                                    {event.body && <p>{event.body}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={sendComment} className="comment-form">
                        <label className="sr-only" htmlFor="comment-body">
                            {t('comment')}
                        </label>
                        <textarea
                            id="comment-body"
                            rows={2}
                            maxLength={2000}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={t('commentPlaceholder')}
                            disabled={busy}
                        />
                        <div>
                            <small>{t('commentsNote')}</small>
                            <button
                                className="btn secondary"
                                disabled={busy || !comment.trim()}
                            >
                                <Icon name="send" size={15} />
                                {t('send')}
                            </button>
                        </div>
                    </form>
                    {item.status === 'approved' && (
                        <p className="form-note">
                            <Icon name="shield" size={15} />
                            {t('archivedNote')}
                        </p>
                    )}
                </div>
                {(own || canReview) && (
                    <div className="dialog-footer detail-actions">
                        <div>
                            {own && item.status !== 'approved' && (
                                <button
                                    className="icon-button destructive"
                                    onClick={() => begin('delete')}
                                    disabled={busy}
                                    aria-label={t('delete')}
                                    title={t('delete')}
                                >
                                    <Icon name="trash" size={18} />
                                </button>
                            )}
                            {own && item.status === 'pending' && (
                                <button
                                    className="btn ghost"
                                    onClick={() => begin('cancel')}
                                    disabled={busy}
                                >
                                    {t('withdraw')}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {own &&
                                ['draft', 'pending', 'rejected'].includes(
                                    item.status,
                                ) && (
                                    <button
                                        className="btn primary"
                                        disabled={busy}
                                        onClick={() => onEdit(item)}
                                    >
                                        <Icon name="edit" size={16} />
                                        {t(
                                            item.status === 'rejected'
                                                ? 'revision'
                                                : 'edit',
                                        )}
                                    </button>
                                )}
                            {canReview && (
                                <>
                                    <button
                                        className="btn reject-button"
                                        disabled={busy}
                                        onClick={() => begin('rejected')}
                                    >
                                        <Icon name="close" size={16} />
                                        {t('reject')}
                                    </button>
                                    <button
                                        className="btn primary"
                                        disabled={busy}
                                        onClick={() => begin('approved')}
                                    >
                                        <Icon name="check" size={16} />
                                        {t('approve')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
            {action && (
                <Modal
                    title={t(
                        action === 'delete'
                            ? 'confirmDelete'
                            : action === 'cancel'
                              ? 'confirmWithdraw'
                              : 'decisionConfirm',
                    )}
                    onClose={() => !busy && setAction(null)}
                    className="confirm-modal"
                >
                    <div className="dialog-body">
                        <p>
                            {t(
                                action === 'delete'
                                    ? 'deleteHelp'
                                    : action === 'cancel'
                                      ? 'withdrawHelp'
                                      : 'decisionHelp',
                            )}
                        </p>
                        {['approved', 'rejected'].includes(action) && (
                            <>
                                <div className="mt-4 mb-4">
                                    <Badge status={action} />
                                </div>
                                <Field
                                    label={t('note')}
                                    error={noteError}
                                    hint={
                                        action === 'rejected'
                                            ? t('rejectNote')
                                            : null
                                    }
                                >
                                    <textarea
                                        rows={3}
                                        maxLength={2000}
                                        value={note}
                                        onChange={(e) => {
                                            setNote(e.target.value);
                                            setNoteError('');
                                        }}
                                        placeholder={t('notePlaceholder')}
                                        disabled={busy}
                                    />
                                </Field>
                            </>
                        )}
                    </div>
                    <div className="dialog-footer">
                        <button
                            className="btn secondary"
                            disabled={busy}
                            onClick={() => setAction(null)}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            className={`btn ${['delete', 'rejected'].includes(action) ? 'danger' : 'primary'}`}
                            disabled={busy}
                            onClick={perform}
                        >
                            {t(
                                busy
                                    ? 'working'
                                    : action === 'approved'
                                      ? 'approve'
                                      : action === 'rejected'
                                        ? 'reject'
                                        : 'confirm',
                            )}
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
}
