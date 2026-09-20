import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Messages from './Messages';
import { Icon } from './UI';
import { useLocale } from './i18n';
import { onRealtime } from '../../realtime';

const KEY = 'accord.messenger',
    SIZE = 56,
    EDGE = 12;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const spot = ({ x, y }) => ({
    x: clamp(x, EDGE, window.innerWidth - SIZE - EDGE),
    y: clamp(y, EDGE, window.innerHeight - SIZE - EDGE),
});

export default function Messenger({ onExpand, ...chat }) {
    const { t } = useLocale();
    const [open, setOpen] = useState(false),
        [unread, setUnread] = useState(0),
        [pos, setPos] = useState(null);
    const drag = useRef(null),
        moved = useRef(false);
    useEffect(() => {
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(KEY));
        } catch {}
        setPos(spot(saved?.x >= 0 ? saved : { x: 1e5, y: 1e5 }));
        const resize = () => setPos((current) => (current ? spot(current) : current));
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);
    useEffect(() => {
        let active = true;
        const load = () =>
            axios
                .get('/api/team/conversations')
                .then(({ data }) => {
                    if (active)
                        setUnread(data.reduce((sum, row) => sum + (row.unread || 0), 0));
                })
                .catch(() => {});
        load();
        const timer = setInterval(load, 15000),
            off = onRealtime(['message'], load);
        return () => {
            active = false;
            clearInterval(timer);
            off?.();
        };
    }, [open, chat.peer?.id]);
    useEffect(() => {
        if (!open) return;
        const key = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [open]);
    if (!pos) return null;
    const down = (event) => {
        if (event.button) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { dx: event.clientX - pos.x, dy: event.clientY - pos.y };
        moved.current = false;
    };
    const move = (event) => {
        if (!drag.current) return;
        const next = {
            x: event.clientX - drag.current.dx,
            y: event.clientY - drag.current.dy,
        };
        if (Math.abs(next.x - pos.x) + Math.abs(next.y - pos.y) > 3) moved.current = true;
        setPos(spot(next));
    };
    const up = () => {
        if (!drag.current) return;
        drag.current = null;
        if (!moved.current) return;
        const snapped = spot({
            ...pos,
            x: pos.x + SIZE / 2 < window.innerWidth / 2 ? EDGE : window.innerWidth,
        });
        setPos(snapped);
        try {
            localStorage.setItem(KEY, JSON.stringify(snapped));
        } catch {}
    };
    const panel = () => {
        const width = Math.min(380, window.innerWidth - 2 * EDGE),
            height = Math.min(560, window.innerHeight - 2 * EDGE),
            above = pos.y - height - EDGE;
        return {
            width,
            height,
            left: clamp(pos.x + SIZE / 2 - width / 2, EDGE, window.innerWidth - width - EDGE),
            top:
                above >= EDGE
                    ? above
                    : clamp(pos.y + SIZE + EDGE, EDGE, window.innerHeight - height - EDGE),
        };
    };
    return (
        <>
            {open && (
                <section
                    aria-label={t('messages')}
                    style={panel()}
                    className="panel fixed z-[70] flex flex-col overflow-hidden shadow-[0_18px_44px_rgba(0,0,0,0.28)] print:hidden max-sm:!inset-x-2 max-sm:!bottom-[84px] max-sm:!top-3 max-sm:!h-auto max-sm:!w-auto"
                >
                    <header className="flex shrink-0 items-center gap-1.5 border-b border-b-line px-4 py-3">
                        <Icon name="comment" size={17} />
                        <strong className="flex-1 text-[13px]">{t('messages')}</strong>
                        <button
                            className="icon-button"
                            title={t('newConversation')}
                            aria-label={t('newConversation')}
                            onClick={() => {
                                setOpen(false);
                                chat.onDirectory();
                            }}
                        >
                            <Icon name="plus" size={16} />
                        </button>
                        <button
                            className="icon-button"
                            title={t('openFullPage')}
                            aria-label={t('openFullPage')}
                            onClick={() => {
                                setOpen(false);
                                onExpand();
                            }}
                        >
                            <Icon name="external" size={16} />
                        </button>
                        <button
                            className="icon-button"
                            title={t('close')}
                            aria-label={t('close')}
                            onClick={() => setOpen(false)}
                        >
                            <Icon name="close" size={16} />
                        </button>
                    </header>
                    <div className="min-h-0 flex-1">
                        <Messages compact {...chat} />
                    </div>
                </section>
            )}
            <button
                aria-label={`${t('messages')}${unread ? ` · ${unread} ${t('unread')}` : ''}`}
                aria-expanded={open}
                title={t('messages')}
                style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                onClick={() => {
                    if (moved.current) {
                        moved.current = false;
                        return;
                    }
                    setOpen((value) => !value);
                }}
                className="fixed z-[70] flex size-14 cursor-grab touch-none items-center justify-center rounded-full bg-signal text-white shadow-[0_10px_26px_rgba(0,0,0,0.3)] active:cursor-grabbing print:hidden"
            >
                <Icon name={open ? 'down' : 'comment'} size={22} />
                {!open && unread > 0 && (
                    <b className="absolute -right-0.5 -top-0.5 min-w-[20px] rounded-full border-2 border-surface bg-ink px-1 text-center text-[10px] leading-4 text-surface">
                        {unread > 9 ? '9+' : unread}
                    </b>
                )}
            </button>
        </>
    );
}
