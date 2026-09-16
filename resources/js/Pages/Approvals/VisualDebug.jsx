import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Icon } from './UI';
import { useLocale } from './i18n';

export function useVisualTrace(enabled) {
    const [traces, setTraces] = useState([]);
    useEffect(() => {
        if (!enabled) {
            delete axios.defaults.headers.common['X-AE-Debug'];
            return;
        }
        axios.defaults.headers.common['X-AE-Debug'] = '1';
        const id = axios.interceptors.response.use((response) => {
            const header = response.headers['x-ae-trace'];
            if (header) {
                try {
                    const trace = JSON.parse(atob(header));
                    setTraces((rows) =>
                        [
                            {
                                ...trace,
                                method: response.config.method.toUpperCase(),
                                status: response.status,
                                at: new Date().toLocaleTimeString(),
                                id: crypto.randomUUID(),
                            },
                            ...rows,
                        ].slice(0, 30),
                    );
                } catch {
                    /* An optional trace must never interrupt a request. */
                }
            }
            return response;
        });
        return () => {
            axios.interceptors.response.eject(id);
            delete axios.defaults.headers.common['X-AE-Debug'];
        };
    }, [enabled]);
    return traces;
}
export default function VisualDebug({ enabled, traces, onSettings }) {
    const { t } = useLocale();
    const [selected, setSelected] = useState('react');
    const latest = traces[0];
    const stages = [
        { id: 'react', icon: 'monitor', title: 'React + Tailwind' },
        { id: 'auth', icon: 'shield', title: 'Laravel Breeze' },
        { id: 'organization', icon: 'layers', title: t('organizationAccess') },
        { id: 'api', icon: 'arrow', title: 'Laravel API' },
        { id: 'sql', icon: 'database', title: latest?.engine === 'sqlite' ? 'SQLite' : 'MySQL' },
    ];
    const current = stages.find((stage) => stage.id === selected);
    return (
        <section className="panel">
            <header className="flex items-center justify-between gap-5 p-6 max-sm:p-[18px]">
                <div>
                    <span className="eyebrow">AE / {t('visualDebug')}</span>
                    <h2 className="m-0 text-[24px] font-[650]">{t('seeInsideRequest')}</h2>
                </div>
                <span className="flex items-center gap-[7px] text-[11px] text-muted">
                    <i className={`size-1.5 rounded-full ${enabled ? 'bg-signal [box-shadow:0_0_0_4px_#c6424c15]' : 'bg-muted'}`} />
                    {t(enabled ? 'traceEnabled' : 'traceDisabled')}
                </span>
            </header>
            <div className="flex items-center gap-2.5 px-6 pb-6 pt-[15px] max-lg:gap-1.5 max-sm:flex-wrap max-sm:p-4">
                {stages.map((stage, index) => (
                    <React.Fragment key={stage.id}>
                        <button
                            className={`flex min-w-0 flex-1 flex-col items-center gap-2 border px-2.5 py-5 max-sm:flex-[1_1_90px] ${selected === stage.id ? 'border-brand bg-brand-tint text-brand' : 'border-line bg-surface-alt'}`}
                            onClick={() => setSelected(stage.id)}
                        >
                            <Icon name={stage.icon} size={24} />
                            <small className="text-muted [font:10px_ui-monospace,monospace]">0{index + 1}</small>
                            <strong className="text-[12px]">{stage.title}</strong>
                        </button>
                        {index < stages.length - 1 && <Icon name="arrow" size={18} className="shrink-0 text-muted max-lg:hidden" />}
                    </React.Fragment>
                ))}
            </div>
            <div className="mx-6 mb-6 mt-0 flex items-start gap-[18px] border-l-[3px] border-l-signal bg-surface-alt p-[22px] max-sm:mx-4 max-sm:mb-4 max-sm:p-4">
                <Icon name={current.icon} size={30} className="shrink-0 text-brand" />
                <div>
                    <h3 className="font-[650]">{current.title}</h3>
                    <p className="m-0 leading-[1.7] text-muted">{t(`debugExplain${selected}`)}</p>
                </div>
            </div>
            <div className="grid grid-cols-3 [border-block:1px_solid_var(--line)]">
                {[
                    [
                        <>
                            {latest?.duration_ms ?? '—'} <small className="text-[12px]">ms</small>
                        </>,
                        'serverTime',
                    ],
                    [latest?.queries ?? '—', 'sqlQueries'],
                    [latest?.engine?.toUpperCase() || '—', 'databaseEngine'],
                ].map(([value, label]) => (
                    <div key={label} className="border-r border-r-line px-[25px] py-[22px] max-sm:px-2.5 max-sm:py-[15px]">
                        <strong className="block text-brand [font:600_25px_ui-monospace,monospace] max-sm:text-[18px]">{value}</strong>
                        <span className="mt-2 block text-[11px] text-muted">{t(label)}</span>
                    </div>
                ))}
            </div>
            {!enabled && (
                <div className="p-[25px] max-md:p-5 [&>.btn]:mt-1">
                    <p>{t('enableDebugHelp')}</p>
                    <button className="btn secondary" onClick={onSettings}>
                        {t('settings')}
                    </button>
                </div>
            )}
            <div>
                <div className="panel-heading max-sm:flex-wrap max-sm:gap-2">
                    <h3>{t('recentApiActivity')}</h3>
                    <span className="text-[11px] text-muted">{t('noSecretTrace')}</span>
                </div>
                {traces.map((trace) => (
                    <article
                        key={trace.id}
                        className="flex items-center gap-4 border-b border-b-line px-6 py-4 text-[11px] max-sm:flex-wrap max-sm:gap-2 max-sm:px-4 max-sm:py-3.5"
                    >
                        <span className="min-w-[42px] text-brand [font:600_10px_ui-monospace,monospace]">{trace.method}</span>
                        <div className="min-w-0 flex-1">
                            <code className="[overflow-wrap:anywhere]">/{trace.route}</code>
                            <small className="mt-1 block text-muted">
                                {trace.tables.join(' · ') || '—'} · {trace.operations.join(', ')}
                            </small>
                        </div>
                        <span>{trace.status}</span>
                        <strong>{trace.duration_ms} ms</strong>
                        <small className="mt-1 block text-muted max-sm:hidden">{trace.at}</small>
                    </article>
                ))}
                {!traces.length && <p className="p-[25px] max-md:p-5">{t('traceEmpty')}</p>}
            </div>
        </section>
    );
}

export function CrudDemo() {
    const { t } = useLocale();
    const [demo, setDemo] = useState(null),
        [busy, setBusy] = useState(false);
    async function demonstrate() {
        if (busy) return;
        setBusy(true);
        setDemo({ stages: [] });
        let record;
        const payload = {
            title: `CRUD verification visual demo ${Date.now()}`,
            description:
                'Synthetic learning example. This draft is created, updated and soft-deleted by the interactive CRUD demonstration.',
            type: 'budget',
            amount: 100,
            priority: 'normal',
            submit: false,
        };
        const stage = (name, status, data) =>
            setDemo((old) => ({
                ...old,
                id: data?.id || old.id,
                stages: [
                    ...old.stages,
                    {
                        name,
                        status,
                        amount: data?.amount,
                        version: data?.version,
                    },
                ],
            }));
        try {
            let response = await axios.post('/api/approvals', payload);
            record = response.data;
            stage('CREATE', response.status, record);
            response = await axios.get(`/api/approvals/${record.id}`);
            stage('READ', response.status, response.data);
            response = await axios.put(`/api/approvals/${record.id}`, {
                ...payload,
                amount: 150,
                version: record.version,
            });
            record = response.data;
            stage('UPDATE', response.status, record);
            response = await axios.delete(`/api/approvals/${record.id}`, {
                data: { version: record.version },
            });
            stage('DELETE', response.status, null);
            record = null;
            setDemo((old) => ({ ...old, complete: true }));
        } catch {
            setDemo((old) => ({ ...old, error: true }));
        } finally {
            if (record) {
                try {
                    const { data } = await axios.get(
                        `/api/approvals/${record.id}`,
                    );
                    await axios.delete(`/api/approvals/${data.id}`, {
                        data: { version: data.version },
                    });
                } catch {
                    setDemo((old) => ({ ...old, cleanupNeeded: true }));
                }
            }
            setBusy(false);
        }
    }
    return (
        <section className="panel mb-6 p-6">
            <div>
                <span className="eyebrow">CREATE / READ / UPDATE / DELETE</span>
                <h3>{t('runCrudDemo')}</h3>
                <p className="max-w-[760px] text-muted">{t('crudDemoHelp')}</p>
                <button className="btn primary" disabled={busy} onClick={demonstrate}>
                    <Icon name="refresh" size={16} />
                    {t(busy ? 'working' : 'runCrudDemo')}
                </button>
            </div>
            {demo && (
                <div className="mt-6" role="status">
                    <strong>
                        {t(demo.complete ? 'crudDemoComplete' : demo.error ? 'error' : 'working')}{' '}
                        {demo.id ? `· REQ-${demo.id}` : ''}
                    </strong>
                    <div className="mt-3.5 grid grid-cols-4 gap-3 max-sm:grid-cols-2">
                        {demo.stages.map((step) => (
                            <article key={step.name} className="grid gap-2 rounded-lg border border-line p-4">
                                <span className="text-[10px] tracking-[0.12em] text-muted">{step.name}</span>
                                <strong>HTTP {step.status}</strong>
                                {step.version && (
                                    <small>
                                        v{step.version} · ฿{step.amount}
                                    </small>
                                )}
                            </article>
                        ))}
                    </div>
                    {demo.cleanupNeeded && <p className="text-muted">{t('crudCleanupNeeded')}</p>}
                </div>
            )}
        </section>
    );
}
