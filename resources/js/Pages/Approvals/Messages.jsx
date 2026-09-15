import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Avatar, Icon } from './UI';
import { useLocale } from './i18n';

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
        cursor = useRef(0);
    useEffect(() => {
        let active = true;
        const load = () =>
            axios
                .get('/api/team/conversations')
                .then(({ data }) => {
                    if (active) setConversations(data);
                })
                .catch(() => {});
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
    return (
        <section className={`panel messaging-shell ${peer ? 'has-peer' : ''}`}>
            <aside className="conversation-list">
                <header>
                    <h3>{t('messages')}</h3>
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
                                className={`conversation ${peer?.id === conversation.peer.id ? 'active' : ''}`}
                                onClick={() => setPeer(conversation.peer)}
                            >
                                <Avatar
                                    name={conversation.peer.name}
                                    src={conversation.peer.avatar_url}
                                />
                                <span>
                                    <strong>{conversation.peer.name}</strong>
                                    <small>{conversation.latest.body}</small>
                                </span>
                                {conversation.unread > 0 && (
                                    <b>{conversation.unread}</b>
                                )}
                            </button>
                        ),
                )}
                {!conversations.length && (
                    <p className="settings-hint">{t('noConversations')}</p>
                )}
            </aside>
            <div className="chat-main">
                {peer ? (
                    <>
                        <header className="chat-header">
                            <button
                                className="icon-button chat-back"
                                onClick={() => setPeer(null)}
                                aria-label={t('backToConversations')}
                            >
                                <Icon name="left" />
                            </button>
                            <Avatar name={peer.name} src={peer.avatar_url} />
                            <div>
                                <strong>{peer.name}</strong>
                                <small>{t('privateConversation')}</small>
                            </div>
                            <button
                                className="icon-button"
                                disabled={!callsAvailable}
                                title={t(
                                    callsAvailable
                                        ? 'voiceCall'
                                        : 'callsUnavailable',
                                )}
                                aria-label={t('voiceCall')}
                                onClick={() => onCall(peer, 'audio')}
                            >
                                <Icon name="phone" />
                            </button>
                            <button
                                className="icon-button"
                                disabled={!callsAvailable}
                                title={t(
                                    callsAvailable
                                        ? 'videoCall'
                                        : 'callsUnavailable',
                                )}
                                aria-label={t('videoCall')}
                                onClick={() => onCall(peer, 'video')}
                            >
                                <Icon name="video" />
                            </button>
                        </header>
                        <div
                            className="chat-scroll"
                            ref={scroller}
                            onScroll={() => {
                                const el = scroller.current;
                                stick.current =
                                    el.scrollHeight -
                                        el.scrollTop -
                                        el.clientHeight <
                                    100;
                            }}
                        >
                            {older && !loading && messages.length > 0 && (
                                <button
                                    className="btn ghost older-messages"
                                    onClick={loadOlder}
                                >
                                    {t('olderMessages')}
                                </button>
                            )}
                            {loading && <p role="status">{t('loading')}</p>}
                            {error && (
                                <p role="alert" className="route-warning">
                                    {t('messageFailed')}
                                </p>
                            )}
                            {messages.map((message) => (
                                <div
                                    className={`message-bubble ${message.sender_id === user.id ? 'sent' : 'received'}`}
                                    key={message.id}
                                >
                                    <p>{message.body}</p>
                                    <small>
                                        {date(message.created_at, {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </small>
                                </div>
                            ))}
                        </div>
                        <form className="chat-composer" onSubmit={send}>
                            <label className="sr-only" htmlFor="dm-body">
                                {t('messageBody')}
                            </label>
                            <textarea
                                id="dm-body"
                                rows={2}
                                maxLength={4000}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder={t('messagePlaceholder')}
                                onKeyDown={(e) => {
                                    if (
                                        e.key === 'Enter' &&
                                        !e.shiftKey &&
                                        !e.nativeEvent.isComposing
                                    ) {
                                        e.preventDefault();
                                        send(e);
                                    }
                                }}
                            />
                            <button
                                className="btn primary"
                                disabled={busy || !body.trim()}
                                aria-label={t('send')}
                            >
                                <Icon name="send" size={18} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="chat-empty">
                        <Icon name="comment" size={42} />
                        <h2>{t('startConversation')}</h2>
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
