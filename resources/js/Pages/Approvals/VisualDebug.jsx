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
    const stages = [
        { id: 'react', icon: 'monitor', title: 'React + Tailwind' },
        { id: 'auth', icon: 'shield', title: 'Laravel Breeze' },
        { id: 'organization', icon: 'layers', title: t('organizationAccess') },
        { id: 'api', icon: 'arrow', title: 'Laravel API' },
        { id: 'sql', icon: 'database', title: 'MySQL' },
    ];
    const latest = traces[0];
    return (
        <section className="panel visual-debug">
            <header className="database-toolbar">
                <div>
                    <span className="eyebrow">AE / {t('visualDebug')}</span>
                    <h2>{t('seeInsideRequest')}</h2>
                </div>
                <span className={`debug-state ${enabled ? 'enabled' : ''}`}>
                    <i />
                    {t(enabled ? 'traceEnabled' : 'traceDisabled')}
                </span>
            </header>
            <div className="debug-flow">
                {stages.map((stage, index) => (
                    <React.Fragment key={stage.id}>
                        <button
                            className={selected === stage.id ? 'selected' : ''}
                            onClick={() => setSelected(stage.id)}
                        >
                            <Icon name={stage.icon} size={24} />
                            <small>0{index + 1}</small>
                            <strong>{stage.title}</strong>
                        </button>
                        {index < stages.length - 1 && (
                            <Icon name="arrow" size={18} />
                        )}
                    </React.Fragment>
                ))}
            </div>
            <div className="debug-explanation">
                <Icon
                    name={stages.find((stage) => stage.id === selected).icon}
                    size={30}
                />
                <div>
                    <h3>
                        {stages.find((stage) => stage.id === selected).title}
                    </h3>
                    <p>{t(`debugExplain${selected}`)}</p>
                </div>
            </div>
            <div className="debug-metrics">
                <div>
                    <strong>
                        {latest?.duration_ms ?? '—'} <small>ms</small>
                    </strong>
                    <span>{t('serverTime')}</span>
                </div>
                <div>
                    <strong>{latest?.queries ?? '—'}</strong>
                    <span>{t('sqlQueries')}</span>
                </div>
                <div>
                    <strong>{latest?.engine?.toUpperCase() || '—'}</strong>
                    <span>{t('databaseEngine')}</span>
                </div>
            </div>
            {!enabled && (
                <div className="settings-body">
                    <p>{t('enableDebugHelp')}</p>
                    <button className="btn secondary" onClick={onSettings}>
                        {t('settings')}
                    </button>
                </div>
            )}
            <div className="trace-list">
                <div className="panel-heading">
                    <h3>{t('recentApiActivity')}</h3>
                    <span>{t('noSecretTrace')}</span>
                </div>
                {traces.map((trace) => (
                    <article key={trace.id}>
                        <span className="trace-method">{trace.method}</span>
                        <div>
                            <code>/{trace.route}</code>
                            <small>
                                {trace.tables.join(' · ') || '—'} ·{' '}
                                {trace.operations.join(', ')}
                            </small>
                        </div>
                        <span>{trace.status}</span>
                        <strong>{trace.duration_ms} ms</strong>
                        <small>{trace.at}</small>
                    </article>
                ))}
                {!traces.length && (
                    <p className="settings-body">{t('traceEmpty')}</p>
                )}
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
        <section className="panel crud-demo">
            <div>
                <span className="eyebrow">CREATE / READ / UPDATE / DELETE</span>
                <h3>{t('runCrudDemo')}</h3>
                <p>{t('crudDemoHelp')}</p>
                <button
                    className="btn primary"
                    disabled={busy}
                    onClick={demonstrate}
                >
                    <Icon name="refresh" size={16} />
                    {t(busy ? 'working' : 'runCrudDemo')}
                </button>
            </div>
            {demo && (
                <div className="crud-result" role="status">
                    <strong>
                        {t(
                            demo.complete
                                ? 'crudDemoComplete'
                                : demo.error
                                  ? 'error'
                                  : 'working',
                        )}{' '}
                        {demo.id ? `· REQ-${demo.id}` : ''}
                    </strong>
                    <div>
                        {demo.stages.map((step) => (
                            <article key={step.name}>
                                <span>{step.name}</span>
                                <strong>HTTP {step.status}</strong>
                                {step.version && (
                                    <small>
                                        v{step.version} · ฿{step.amount}
                                    </small>
                                )}
                            </article>
                        ))}
                    </div>
                    {demo.cleanupNeeded && <p>{t('crudCleanupNeeded')}</p>}
                </div>
            )}
        </section>
    );
}
