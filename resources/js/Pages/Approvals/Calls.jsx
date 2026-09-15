import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Avatar, Icon } from './UI';
import { useLocale } from './i18n';

export function useWorkspaceCalls(user, toast) {
    const { t } = useLocale();
    const [call, setCall] = useState(null),
        [configuration, setConfiguration] = useState(null),
        [local, setLocal] = useState(null),
        [remote, setRemote] = useState(null),
        [connection, setConnection] = useState('new'),
        [busy, setBusy] = useState(false),
        [muted, setMuted] = useState(false),
        [camera, setCamera] = useState(true);
    const current = useRef(null),
        pc = useRef(null),
        media = useRef(null),
        after = useRef(0),
        pendingIce = useRef([]),
        working = useRef(false);
    function cleanup() {
        pc.current?.close();
        pc.current = null;
        media.current?.getTracks().forEach((track) => track.stop());
        media.current = null;
        current.current = null;
        after.current = 0;
        pendingIce.current = [];
        setCall(null);
        setLocal(null);
        setRemote(null);
        setConnection('new');
        setMuted(false);
        setCamera(true);
    }
    async function end(action = 'end') {
        const row = current.current;
        cleanup();
        if (row) {
            try {
                await axios.patch(`/api/team/calls/${row.id}`, { action });
            } catch {
                /* Local media must stop even when the connection is lost. */
            }
        }
    }
    async function initialize(row) {
        if (!configuration?.available) throw new Error('Calls unavailable');
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video:
                row.mode === 'video'
                    ? { width: { ideal: 1280 }, height: { ideal: 720 } }
                    : false,
        });
        if (current.current?.id !== row.id) {
            stream.getTracks().forEach((track) => track.stop());
            throw new Error('Call ended');
        }
        media.current = stream;
        setLocal(stream);
        const peer = new RTCPeerConnection({
            iceServers: configuration.iceServers,
            iceTransportPolicy: 'relay',
        });
        pc.current = peer;
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        peer.ontrack = (event) => setRemote(event.streams[0]);
        peer.onicecandidate = (event) => {
            if (event.candidate && current.current)
                axios
                    .post(`/api/team/calls/${row.id}/signals`, {
                        type: 'ice',
                        payload: event.candidate.toJSON(),
                    })
                    .catch(() => {});
        };
        peer.onconnectionstatechange = () => {
            setConnection(peer.connectionState);
            if (peer.connectionState === 'failed') {
                toast(t('callFailed'), 'error');
                end();
            }
        };
        return peer;
    }
    async function start(person, mode) {
        if (working.current || current.current || !configuration?.available)
            return;
        working.current = true;
        setBusy(true);
        try {
            const { data: row } = await axios.post('/api/team/calls', {
                recipient_id: person.id,
                mode,
            });
            current.current = row;
            setCall(row);
            const peer = await initialize(row);
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            await axios.post(`/api/team/calls/${row.id}/signals`, {
                type: 'offer',
                payload: { type: 'offer', sdp: offer.sdp },
            });
        } catch (error) {
            toast(
                t(
                    error.name === 'NotAllowedError' ||
                        error.name === 'NotFoundError'
                        ? 'mediaPermission'
                        : 'callFailed',
                ),
                'error',
            );
            await end();
        } finally {
            working.current = false;
            setBusy(false);
        }
    }
    async function accept() {
        if (!current.current || working.current || !configuration?.available)
            return;
        working.current = true;
        setBusy(true);
        try {
            await initialize(current.current);
            const { data } = await axios.patch(
                `/api/team/calls/${current.current.id}`,
                { action: 'accept' },
            );
            current.current = data;
            setCall(data);
        } catch {
            toast(t('mediaPermission'), 'error');
            await end('decline');
        } finally {
            working.current = false;
            setBusy(false);
        }
    }
    useEffect(() => {
        if (!user.tenancy_enabled) return;
        let active = true,
            polling = false;
        axios
            .get('/api/team/calls/configuration')
            .then(({ data }) => {
                if (active) setConfiguration(data);
            })
            .catch(() => {});
        async function poll() {
            if (polling) return;
            polling = true;
            try {
                const row = current.current;
                if (!row) {
                    if (document.visibilityState !== 'visible') return;
                    const { data } = await axios.get('/api/team/calls');
                    if (active && data && data.recipient_id === user.id) {
                        current.current = data;
                        setCall(data);
                    }
                    return;
                }
                const { data } = await axios.get(`/api/team/calls/${row.id}`, {
                    params: { after: after.current },
                });
                if (!active || current.current?.id !== row.id) return;
                if (!['ringing', 'accepted'].includes(data.status)) {
                    cleanup();
                    return;
                }
                current.current = data;
                setCall(data);
                const peer = pc.current;
                if (!peer || working.current) return;
                for (const signal of data.signals || []) {
                    if (signal.type === 'offer') {
                        await peer.setRemoteDescription({
                            type: 'offer',
                            sdp: signal.payload.sdp,
                        });
                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);
                        await axios.post(`/api/team/calls/${row.id}/signals`, {
                            type: 'answer',
                            payload: { type: 'answer', sdp: answer.sdp },
                        });
                    } else if (signal.type === 'answer')
                        await peer.setRemoteDescription({
                            type: 'answer',
                            sdp: signal.payload.sdp,
                        });
                    else if (signal.type === 'ice') {
                        if (peer.remoteDescription)
                            await peer.addIceCandidate(signal.payload);
                        else pendingIce.current.push(signal.payload);
                    }
                    if (peer.remoteDescription) {
                        for (const candidate of pendingIce.current)
                            await peer.addIceCandidate(candidate);
                        pendingIce.current = [];
                    }
                    after.current = signal.id;
                }
            } catch {
                /* Temporary polling failures recover; media has its own connection state. */
            } finally {
                polling = false;
            }
        }
        const timer = setInterval(poll, 2000);
        poll();
        return () => {
            active = false;
            clearInterval(timer);
            const row = current.current;
            if (row)
                axios
                    .patch(`/api/team/calls/${row.id}`, { action: 'end' })
                    .catch(() => {});
            pc.current?.close();
            media.current?.getTracks().forEach((track) => track.stop());
            current.current = null;
        };
    }, [user.id, user.organization?.id]);
    function toggleMute() {
        const enabled = muted;
        media.current
            ?.getAudioTracks()
            .forEach((track) => (track.enabled = enabled));
        setMuted(!muted);
    }
    function toggleCamera() {
        media.current
            ?.getVideoTracks()
            .forEach((track) => (track.enabled = !camera));
        setCamera(!camera);
    }
    return {
        start,
        available: !!configuration?.available && !call && !busy,
        panel: call ? (
            <CallPanel
                call={call}
                user={user}
                local={local}
                remote={remote}
                connection={connection}
                busy={busy || !configuration?.available}
                muted={muted}
                camera={camera}
                onAccept={accept}
                onEnd={end}
                onMute={toggleMute}
                onCamera={toggleCamera}
            />
        ) : null,
    };
}
function Stream({ stream, muted = false, className }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.srcObject = stream;
            if (stream) ref.current.play().catch(() => {});
        }
    }, [stream]);
    return (
        <video
            ref={ref}
            autoPlay
            playsInline
            muted={muted}
            className={className}
        />
    );
}
function CallPanel({
    call,
    user,
    local,
    remote,
    connection,
    busy,
    muted,
    camera,
    onAccept,
    onEnd,
    onMute,
    onCamera,
}) {
    const { t } = useLocale();
    const incoming = call.recipient_id === user.id && call.status === 'ringing';
    const other = call.caller_id === user.id ? call.recipient : call.caller;
    return (
        <section
            className={`call-panel ${call.mode}`}
            role="region"
            aria-label={t(call.mode === 'video' ? 'videoCall' : 'voiceCall')}
        >
            <header>
                <Icon
                    name={call.mode === 'video' ? 'video' : 'phone'}
                    size={18}
                />
                <strong>{other?.name}</strong>
                <span>
                    {t(
                        incoming
                            ? 'incomingCall'
                            : connection === 'connected'
                              ? 'callConnected'
                              : 'callConnecting',
                    )}
                </span>
            </header>
            <div className="call-stage">
                {(!remote || call.mode === 'audio') && (
                    <div className="call-person">
                        <Avatar name={other?.name} src={other?.avatar_url} />
                        <strong>{other?.name}</strong>
                    </div>
                )}
                <Stream stream={remote} className="remote-stream" />
                <Stream stream={local} muted className="local-stream" />
            </div>
            <div className="call-controls">
                {incoming ? (
                    <>
                        <button
                            className="btn primary"
                            disabled={busy}
                            onClick={onAccept}
                        >
                            {t('acceptCall')}
                        </button>
                        <button
                            className="btn danger"
                            disabled={busy}
                            onClick={() => onEnd('decline')}
                        >
                            {t('declineCall')}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className={`btn secondary ${muted ? 'selected' : ''}`}
                            disabled={busy}
                            onClick={onMute}
                        >
                            {t(muted ? 'unmute' : 'mute')}
                        </button>
                        {call.mode === 'video' && (
                            <button
                                className="btn secondary"
                                disabled={busy}
                                onClick={onCamera}
                            >
                                {t(camera ? 'cameraOff' : 'cameraOn')}
                            </button>
                        )}
                        <button className="btn danger" onClick={() => onEnd()}>
                            {t('endCall')}
                        </button>
                    </>
                )}
            </div>
        </section>
    );
}
