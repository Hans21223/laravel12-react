import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Avatar, avatarTone, Icon } from './UI';
import { useLocale } from './i18n';
import { onRealtime } from '../../realtime';

const merge = (a, b) =>
    [...new Map([...a, ...b].map((row) => [row.id, row])).values()].sort(
        (a, b) => a.id - b.id,
    );
export default function Messages({
    user,
    peer,
    setPeer,
    onDirectory,
    onCall,
    callsAvailable,
    toast,
}) {
    const { t, date } = useLocale();
    const [conversations, setConversations] = useState([]),
        [messages, setMessages] = useState([]),
        [body, setBody] = useState(''),
        [busy, setBusy] = useState(false),
        [loading, setLoading] = useState(false),
        [error, setError] = useState(false),
        [older, setOlder] = useState(true);
    const scroller = useRef(null),
        stick = useRef(true),
        cursor = useRef(0),
        refreshConversations = useRef(null),
        refreshMessages = useRef(null);
    useEffect(
        () =>
            onRealtime(['message'], ({ reference }) => {
                refreshConversations.current?.();
                if (reference === peer?.id) refreshMessages.current?.();
            }),
        [peer?.id],
    );
    useEffect(() => {
        let active = true;
        const load = () =>
            axios
                .get('/api/team/conversations')
                .then(({ data }) => {
                    if (active) setConversations(data);
                })
                .catch(() => {});
        refreshConversations.current = load;
        load();
        const timer = setInterval(load, 5000);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, []);
    useEffect(() => {
        if (!peer) return;
        let active = true,
            running = false;
        cursor.current = 0;
        stick.current = true;
        setMessages([]);
        setBody('');
        setLoading(true);
        setError(false);
        setOlder(true);
        async function load(initial = false) {
            if (running) return;
            running = true;
            try {
                const { data } = await axios.get(
                    `/api/team/messages/${peer.id}`,
                    { params: initial ? {} : { after: cursor.current } },
                );
                if (!active) return;
                setMessages((rows) => (initial ? data : merge(rows, data)));
                if (data.length) {
                    cursor.current = Math.max(
                        cursor.current,
                        ...data.map((m) => m.id),
                    );
                    if (document.visibilityState === 'visible')
                        await axios.post(`/api/team/messages/${peer.id}/read`, {
                            through: cursor.current,
                        });
                }
                if (initial) setOlder(data.length === 50);
                setError(false);
            } catch {
                if (active) setError(true);
            } finally {
                running = false;
                if (active) setLoading(false);
            }
        }
        load(true);
        refreshMessages.current = () => load();
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') load();
        }, 2500);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [peer?.id]);
    useEffect(() => {
        if (stick.current && scroller.current)
            scroller.current.scrollTop = scroller.current.scrollHeight;
    }, [messages]);
    async function send(event) {
        event.preventDefault();
        if (!body.trim() || busy) return;
        setBusy(true);
        try {
            const { data } = await axios.post(`/api/team/messages/${peer.id}`, {
                body,
            });
            stick.current = true;
            setMessages((rows) => merge(rows, [data]));
            setBody('');
        } catch {
            toast(t('messageFailed'), 'error');
        } finally {
            setBusy(false);
        }
    }
    async function loadOlder() {
        if (!messages.length) return;
        try {
            const { data } = await axios.get(`/api/team/messages/${peer.id}`, {
                params: { before: messages[0].id },
            });
            stick.current = false;
            setMessages((rows) => merge(data, rows));
            setOlder(data.length === 50);
        } catch {
            toast(t('error'), 'error');
        }
    }
    const call = (mode) => (
        <button
            className="icon-button"
            disabled={!callsAvailable}
            title={t(callsAvailable ? (mode === 'video' ? 'videoCall' : 'voiceCall') : 'callsUnavailable')}
            aria-label={t(mode === 'video' ? 'videoCall' : 'voiceCall')}
            onClick={() => onCall(peer, mode)}
        >
            <Icon name={mode === 'video' ? 'video' : 'phone'} />
        </button>
    );
    return (
        <section className="panel grid h-[min(720px,calc(100dvh_-_220px))] min-h-[430px] grid-cols-[280px_minmax(0,1fr)] overflow-hidden max-lg:grid-cols-[220px_minmax(0,1fr)] max-sm:block max-sm:h-[calc(100dvh_-_200px)]">
            <aside
                className={`overflow-y-auto border-r border-r-line bg-surface-alt max-sm:h-full ${peer ? 'max-sm:hidden' : ''}`}
            >
                <header className="flex items-center justify-between border-b border-b-line p-[18px]">
                    <h3 className="font-[650]">{t('messages')}</h3>
                    <button
                        className="icon-button"
                        title={t('newConversation')}
                        aria-label={t('newConversation')}
                        onClick={onDirectory}
                    >
                        <Icon name="plus" />
                    </button>
                </header>
                {conversations.map(
                    (conversation) =>
                        conversation.peer && (
                            <button
                                key={conversation.peer.id}
                                className={`flex w-full items-center gap-2.5 border-b border-b-line p-[17px] text-left ${peer?.id === conversation.peer.id ? 'border-l-[3px] border-l-signal bg-brand-tint pl-3.5' : ''}`}
                                onClick={() => setPeer(conversation.peer)}
                            >
                                <Avatar name={conversation.peer.name} src={conversation.peer.avatar_url} />
                                <span className="min-w-0 flex-1">
                                    <strong className="block truncate">{conversation.peer.name}</strong>
                                    <small className="mt-1 block truncate text-[11px] text-muted">
                                        {conversation.latest.body}
                                    </small>
                                </span>
                                {conversation.unread > 0 && (
                                    <b className="rounded-lg bg-signal px-1.5 py-0.5 text-[10px] text-white">
                                        {conversation.unread}
                                    </b>
                                )}
                            </button>
                        ),
                )}
                {!conversations.length && (
                    <p className="m-0 p-5 text-[12px] leading-[1.6] text-muted">{t('noConversations')}</p>
                )}
            </aside>
            <div className={`min-h-0 min-w-0 flex-col max-sm:h-full ${peer ? 'flex' : 'flex max-sm:hidden'}`}>
                {peer ? (
                    <>
                        <header className="flex items-center gap-3 border-b border-b-line px-[22px] py-4 max-sm:gap-2 max-sm:p-3">
                            <button
                                className="icon-button hidden max-sm:inline-flex"
                                onClick={() => setPeer(null)}
                                aria-label={t('backToConversations')}
                            >
                                <Icon name="left" />
                            </button>
                            <Avatar
                                name={peer.name}
                                src={peer.avatar_url}
                                className={`size-9 rounded-md text-[11px] max-sm:hidden ${avatarTone(peer.name)}`}
                            />
                            <div className="flex-1">
                                <strong className="block">{peer.name}</strong>
                                <small className="mt-[3px] block text-[11px] text-muted">{t('privateConversation')}</small>
                            </div>
                            {call('audio')}
                            {call('video')}
                        </header>
                        <div
                            className="flex flex-1 flex-col gap-3 overflow-y-auto p-6 max-sm:p-4"
                            ref={scroller}
                            onScroll={() => {
                                const el = scroller.current;
                                stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                            }}
                        >
                            {older && !loading && messages.length > 0 && (
                                <button className="btn ghost shrink-0 self-center" onClick={loadOlder}>
                                    {t('olderMessages')}
                                </button>
                            )}
                            {loading && <p role="status">{t('loading')}</p>}
                            {error && (
                                <p role="alert" className="mx-0 my-2.5 text-signal">
                                    {t('messageFailed')}
                                </p>
                            )}
                            {messages.map((message) => {
                                const sent = message.sender_id === user.id;
                                return (
                                    <div
                                        className={`max-w-[80%] border px-[15px] py-3 max-sm:max-w-[90%] ${sent ? 'self-end rounded-[12px_4px_12px_12px] border-transparent bg-brand-tint' : 'self-start rounded-[4px_12px_12px_12px] border-line bg-surface-alt'}`}
                                        key={message.id}
                                    >
                                        <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{message.body}</p>
                                        <small className="mt-[7px] block text-right text-[10px] text-muted">
                                            {date(message.created_at, { hour: '2-digit', minute: '2-digit' })}
                                        </small>
                                    </div>
                                );
                            })}
                        </div>
                        <form className="flex items-center gap-3 border-t border-t-line p-[18px] max-sm:gap-2 max-sm:p-3" onSubmit={send}>
                            <label className="sr-only" htmlFor="dm-body">
                                {t('messageBody')}
                            </label>
                            <textarea
                                id="dm-body"
                                className="min-w-0 flex-1 resize-none"
                                rows={2}
                                maxLength={4000}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder={t('messagePlaceholder')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                        e.preventDefault();
                                        send(e);
                                    }
                                }}
                            />
                            <button className="btn primary" disabled={busy || !body.trim()} aria-label={t('send')}>
                                <Icon name="send" size={18} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-[18px] p-8 text-center text-muted">
                        <Icon name="comment" size={42} />
                        <h2 className="text-[20px] font-[650] text-ink">{t('startConversation')}</h2>
                        <p>{t('chatIntro')}</p>
                        <button className="btn primary" onClick={onDirectory}>
                            {t('employeeDirectory')}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
