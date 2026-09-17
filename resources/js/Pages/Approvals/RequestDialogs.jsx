import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocale } from './i18n';
import {
    Avatar,
    avatarTone,
    Badge,
    DialogFooter,
    Field,
    Icon,
    Modal,
    Priority,
    TypeIcon,
} from './UI';
import {
    ApprovalJourney,
    FormNote,
    RequestAttachments,
    RouteBuilder,
    SectionLabel,
    canReviewRequest,
    currentSteps,
} from './Workflow';

const dialogBody = 'p-[25px] max-md:px-[18px] max-md:py-5';
const confirmText = 'text-[13px] leading-[1.8] text-muted';
const formGrid = 'grid grid-cols-2 gap-[17px] max-md:gap-[11px]';
const sectionTitle = '!mx-0 !mb-3 !mt-6 text-[12px] font-semibold';

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
    route_mode: 'standard',
    reviewer_ids: [],
};
export function RequestForm({ item, initialType, onClose, onSaved, toast }) {
    const { t, number } = useLocale();
    const [form, setForm] = useState(() =>
        Object.fromEntries(
            Object.keys(empty).map((k) => [
                k,
                k === 'reviewer_ids'
                    ? item
                        ? currentSteps(item).map((step) => step.reviewer_id)
                        : []
                    : (item?.[k] ??
                      (k === 'type' ? initialType || 'leave' : empty[k])),
            ]),
        ),
    );
    const [baseline] = useState(JSON.stringify(form));
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [discard, setDiscard] = useState(false);
    const [files, setFiles] = useState([]);
    const dirty = JSON.stringify(form) !== baseline || files.length > 0;
    function pickFiles(event) {
        const chosen = [...event.target.files];
        event.target.value = '';
        const valid = chosen.filter(
            (file) =>
                file.size <= 2 * 1024 * 1024 &&
                /\.(pdf|jpe?g|png|webp)$/i.test(file.name),
        );
        if (valid.length < chosen.length || files.length + valid.length > 5)
            toast(t('attachmentRules'), 'error');
        setFiles([...files, ...valid].slice(0, 5));
    }
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
        if (
            form.route_mode === 'sequential' &&
            (form.reviewer_ids.length < 2 ||
                form.reviewer_ids.some((id) => !id) ||
                new Set(form.reviewer_ids).size !== form.reviewer_ids.length)
        )
            errs.reviewer_ids = t('reviewersError');
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
        let draft = null;
        try {
            const payload = {
                ...form,
                title: form.title.trim(),
                description: form.description.trim(),
                submit,
                version: item?.version,
            };
            let data;
            if (item || !files.length) {
                ({ data } = await axios[item ? 'put' : 'post'](
                    `/api/approvals${item ? `/${item.id}` : ''}`,
                    payload,
                ));
            } else {
                // Files attach to a saved request: create a private draft, add them, then submit it.
                ({ data: draft } = await axios.post('/api/approvals', {
                    ...payload,
                    submit: false,
                }));
                for (const file of files) {
                    const body = new FormData();
                    body.append('file', file);
                    body.append('version', draft.version);
                    ({ data: draft } = await axios.post(
                        `/api/approvals/${draft.id}/attachments`,
                        body,
                    ));
                }
                data = submit
                    ? (
                          await axios.put(`/api/approvals/${draft.id}`, {
                              ...payload,
                              version: draft.version,
                          })
                      ).data
                    : draft;
            }
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
            if (draft) {
                // Open the saved draft so the remaining files are added there instead of creating a duplicate.
                toast(t('filesDraftSaved'), 'error');
                onSaved(draft);
                return;
            }
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
            if (
                server &&
                Object.keys(server).some((key) =>
                    key.startsWith('reviewer_ids'),
                )
            )
                setErrors((old) => ({
                    ...old,
                    reviewer_ids: t('reviewersError'),
                }));
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
            <Modal title={t(item ? 'edit' : 'newRequest')} onClose={close}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        save(true);
                    }}
                    noValidate
                >
                    <div className={dialogBody}>
                        <SectionLabel number="01">{t('requestType')}</SectionLabel>
                        <div className="mb-7 grid grid-cols-3 gap-[11px] max-md:gap-[7px]">
                            {['leave', 'budget', 'document'].map((type) => (
                                <button
                                    type="button"
                                    key={type}
                                    disabled={busy}
                                    aria-pressed={form.type === type}
                                    onClick={() => change('type', type)}
                                    className={`relative !rounded border px-3 py-[15px] text-left max-md:px-[9px] max-md:py-3 ${form.type === type ? 'border-[#6288b7] bg-brand-tint' : 'border-line hover:border-[#9eb8a7]'}`}
                                >
                                    <TypeIcon type={type} />
                                    <strong className="mt-[11px] block text-[11px] font-semibold max-md:text-[10px]">
                                        {t(type)}
                                    </strong>
                                    <small className="mt-[3px] block text-[9px] text-muted max-md:text-[8px]">
                                        {t(`${type}Hint`)}
                                    </small>
                                    {form.type === type && (
                                        <span className="absolute right-2.5 top-2.5 rounded-sm bg-brand p-0.5 text-surface max-md:right-1.5 max-md:top-1.5">
                                            <Icon name="check" size={12} />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <SectionLabel number="02">{t('details')}</SectionLabel>
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
                            <div className={formGrid}>
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
                        <div className={formGrid}>
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
                        <RouteBuilder
                            form={form}
                            change={change}
                            busy={busy}
                            error={errors.reviewer_ids}
                        />
                        {item?.status === 'pending' &&
                            item?.route_mode === 'sequential' && (
                                <p className="mx-0 my-2.5 text-signal">
                                    {t('restartWarning')}
                                </p>
                            )}
                        {item ? (
                            <FormNote icon="file">
                                {t('attachAfterDraft')}
                            </FormNote>
                        ) : (
                            <section className="mt-6" aria-label={t('attachments')}>
                                <SectionLabel number="04">
                                    {t('attachments')} · {files.length}/5
                                </SectionLabel>
                                {files.map((file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="mb-2 flex items-center gap-3 rounded border border-line bg-surface px-3 py-2"
                                    >
                                        <span className="shrink-0 bg-brand-tint px-[7px] py-1.5 text-brand [font:600_10px_ui-monospace,monospace]">
                                            {file.name.split('.').pop().toUpperCase().slice(0, 4)}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate font-semibold">
                                            {file.name}
                                        </span>
                                        <small className="shrink-0 text-muted">
                                            {number(Math.ceil(file.size / 1024))} KB
                                        </small>
                                        <button
                                            type="button"
                                            className="icon-button destructive"
                                            disabled={busy}
                                            aria-label={`${t('delete')} ${file.name}`}
                                            onClick={() =>
                                                setFiles(files.filter((_, i) => i !== index))
                                            }
                                        >
                                            <Icon name="trash" size={16} />
                                        </button>
                                    </div>
                                ))}
                                {files.length < 5 && (
                                    <label
                                        className={`flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-brand bg-surface-alt px-4 py-3.5 text-brand focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand hover:bg-brand-tint ${busy ? 'cursor-wait opacity-50' : ''}`}
                                    >
                                        <Icon name="plus" size={16} />
                                        <strong>{t('addAttachment')}</strong>
                                        <input
                                            className="sr-only"
                                            type="file"
                                            multiple
                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                            disabled={busy}
                                            onChange={pickFiles}
                                        />
                                    </label>
                                )}
                                <FormNote icon="file">{t('attachmentRules')}</FormNote>
                            </section>
                        )}
                        <FormNote icon="shield">{t('draftHelp')}</FormNote>
                    </div>
                    <DialogFooter>
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
                    </DialogFooter>
                </form>
            </Modal>
            {discard && (
                <Modal
                    title={t('unsavedTitle')}
                    onClose={() => setDiscard(false)}
                    width="max-w-[460px]"
                >
                    <div className={dialogBody}>
                        <p className={confirmText}>{t('unsavedHelp')}</p>
                    </div>
                    <DialogFooter>
                        <button
                            className="btn secondary"
                            onClick={() => setDiscard(false)}
                        >
                            {t('keepEditing')}
                        </button>
                        <button className="btn danger" onClick={onClose}>
                            {t('discard')}
                        </button>
                    </DialogFooter>
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
    const canReview = canReviewRequest(item, user);
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
                width="max-w-[720px]"
            >
                <div className={dialogBody}>
                    <div className="flex items-center gap-4">
                        <TypeIcon type={item.type} size={24} box="lg" />
                        <div className="min-w-0">
                            <div className="eyebrow mb-[3px] font-sans text-[10px] tracking-[0.7px]">
                                {t(item.type)}
                            </div>
                            <h2 className="font-technical text-[23px] font-[550] leading-[1.4] tracking-[-0.5px] [overflow-wrap:anywhere] max-md:text-[21px]">
                                {item.title}
                            </h2>
                        </div>
                    </div>
                    <div className="mx-0 my-5 flex items-center gap-4 text-[10px] text-muted">
                        <Badge status={item.status} />
                        <Priority value={item.priority} />
                        <span>{date(item.created_at, { year: 'numeric' })}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-[15px] border-y border-y-line px-0 py-5">
                        <div className="flex items-center gap-2.5">
                            <Avatar
                                src={item.owner?.avatar_url}
                                name={item.owner?.name}
                                className={`size-9 rounded text-[11px] ${avatarTone(item.owner?.name)}`}
                            />
                            <Person label={t('owner')} value={item.owner?.name} />
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="grid size-[35px] place-items-center rounded bg-surface-alt text-muted">
                                <Icon name="shield" />
                            </span>
                            <Person
                                label={t('reviewer')}
                                value={item.reviewer?.name || t('awaiting')}
                            />
                        </div>
                    </div>
                    <h3 className={sectionTitle}>{t('description')}</h3>
                    <p className="whitespace-pre-wrap text-[12px] leading-[1.9] text-muted [overflow-wrap:anywhere]">
                        {item.description}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-[19px] rounded-[5px] border border-line bg-surface-alt p-[18px]">
                        <Fact label={t('department')}>{t(`dept${item.department}`)}</Fact>
                        <Fact label={t('due')}>{date(item.due_date, { year: 'numeric' })}</Fact>
                        {item.type === 'budget' && (
                            <Fact label={t('budgetNote')} className="font-technical !text-[22px] !font-[550] text-brand">
                                {money(item.amount)}
                            </Fact>
                        )}
                        {item.type === 'leave' && (
                            <Fact label={t('leavePeriod')} wide>
                                {date(item.start_date)} → {date(item.end_date, { year: 'numeric' })}
                            </Fact>
                        )}
                        {item.type === 'document' && item.document_url && (
                            <div className="col-span-2">
                                <small className="mb-[5px] block text-[10px] text-muted">
                                    {t('documentUrl')}
                                </small>
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
                    <ApprovalJourney
                        item={item}
                        user={user}
                        onChange={onChange}
                        toast={toast}
                    />
                    <RequestAttachments
                        item={item}
                        user={user}
                        onChange={onChange}
                        toast={toast}
                        busy={busy}
                        setBusy={setBusy}
                    />
                    {item.decision_note && (
                        <div
                            className={`mt-5 flex gap-2.5 rounded border border-line p-[15px] ${item.status === 'rejected' ? 'bg-[#fbf1ee] text-[#aa7164]' : 'bg-brand-tint text-brand'}`}
                        >
                            <Icon
                                name={item.status === 'approved' ? 'check' : 'comment'}
                                size={18}
                                className="mt-0.5 shrink-0"
                            />
                            <div>
                                <strong className="text-[11px] font-semibold">{t('note')}</strong>
                                <p className="mt-1 whitespace-pre-wrap text-[12px] leading-[1.75] [overflow-wrap:anywhere]">
                                    {item.decision_note}
                                </p>
                            </div>
                        </div>
                    )}
                    <h3 className={sectionTitle}>{t('history')}</h3>
                    <div className="pb-0 pl-[7px] pr-0 pt-px">
                        {item.events?.map((event) => (
                            <div
                                className="relative flex gap-[13px] pb-[23px] before:absolute before:bottom-0 before:left-3 before:top-[23px] before:border-l before:border-l-line before:content-[''] last:before:hidden"
                                key={event.id}
                            >
                                <span
                                    className={`z-[1] grid size-[25px] shrink-0 place-items-center rounded border border-line ${event.action === 'approved' ? 'bg-brand-tint text-brand' : 'bg-surface-alt text-muted'}`}
                                >
                                    <Icon
                                        name={
                                            event.action === 'approved'
                                                ? 'check'
                                                : event.action === 'commented'
                                                  ? 'comment'
                                                  : event.action === 'rerouted'
                                                    ? 'refresh'
                                                    : 'clock'
                                        }
                                        size={13}
                                    />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <strong className="text-[11px] font-[550]">
                                        {t(`${event.action}Action`)}
                                    </strong>
                                    <small className="mt-[3px] block text-[9px] text-muted">
                                        {event.actor?.name || '—'} ·{' '}
                                        {date(event.created_at, {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </small>
                                    {event.body && (
                                        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-surface-alt px-[13px] py-[11px] text-[12px] leading-[1.75] [overflow-wrap:anywhere]">
                                            {event.body}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={sendComment}>
                        <label className="sr-only" htmlFor="comment-body">
                            {t('comment')}
                        </label>
                        <textarea
                            id="comment-body"
                            className="w-full resize-y p-3 !text-[12px]"
                            rows={2}
                            maxLength={2000}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={t('commentPlaceholder')}
                            disabled={busy}
                        />
                        <div className="mt-[9px] flex items-center justify-between gap-3.5">
                            <small className="text-[9px] text-muted max-md:max-w-[200px]">
                                {t('commentsNote')}
                            </small>
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
                        <FormNote icon="shield">{t('archivedNote')}</FormNote>
                    )}
                </div>
                {(own || canReview) && (
                    <DialogFooter className="max-md:flex-wrap max-md:gap-[7px] max-md:[&_.btn]:px-2.5 max-md:[&_.btn]:py-[9px] max-md:[&_.btn]:text-[10px]">
                        <div className="flex items-center gap-1">
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
                            {own && ['draft', 'pending', 'rejected'].includes(item.status) && (
                                <button
                                    className="btn primary bg-[#2e587f] text-white hover:bg-[#214766]"
                                    disabled={busy}
                                    onClick={() => onEdit(item)}
                                >
                                    <Icon name="edit" size={16} />
                                    {t(item.status === 'rejected' ? 'revision' : 'edit')}
                                </button>
                            )}
                            {canReview && (
                                <>
                                    <button
                                        className="btn border-[#f0d6d4] bg-[#fff3f2] text-[#b04f4c]"
                                        disabled={busy}
                                        onClick={() => begin('rejected')}
                                    >
                                        <Icon name="close" size={16} />
                                        {t('reject')}
                                    </button>
                                    <button
                                        className="btn primary bg-[#2e587f] text-white hover:bg-[#214766]"
                                        disabled={busy}
                                        onClick={() => begin('approved')}
                                    >
                                        <Icon name="check" size={16} />
                                        {t(item.route_mode === 'sequential' ? 'approveStage' : 'approve')}
                                    </button>
                                </>
                            )}
                        </div>
                    </DialogFooter>
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
                    width="max-w-[460px]"
                >
                    <div className={dialogBody}>
                        <p className={confirmText}>
                            {t(
                                action === 'delete'
                                    ? 'deleteHelp'
                                    : action === 'cancel'
                                      ? 'withdrawHelp'
                                      : item.route_mode === 'sequential'
                                        ? 'stageDecisionHelp'
                                        : 'decisionHelp',
                            )}
                        </p>
                        {['approved', 'rejected'].includes(action) && (
                            <>
                                <div className="my-4">
                                    <Badge status={action} />
                                </div>
                                <Field
                                    className="mb-0"
                                    label={t('note')}
                                    error={noteError}
                                    hint={action === 'rejected' ? t('rejectNote') : null}
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
                    <DialogFooter>
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
                    </DialogFooter>
                </Modal>
            )}
        </>
    );
}

function Person({ label, value }) {
    return (
        <span>
            <small className="block text-[10px] text-muted">{label}</small>
            <strong className="mt-[3px] block text-[12px] font-medium max-md:text-[11px]">
                {value}
            </strong>
        </span>
    );
}

function Fact({ label, children, wide = false, className = '' }) {
    return (
        <div className={wide ? 'col-span-2' : ''}>
            <small className="mb-[5px] block text-[10px] text-muted">{label}</small>
            <strong className={`text-[12px] font-medium ${className}`}>{children}</strong>
        </div>
    );
}
