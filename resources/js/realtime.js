import axios from 'axios';

// Echo and Pusher load only when the server provides Reverb settings. Events carry no private data:
// listeners re-fetch through the normal authorized API, and polling keeps working if the socket drops.
export async function connectRealtime(config, organizationId, userId) {
    const [{ default: Echo }, { default: Pusher }] = await Promise.all([
        import('laravel-echo'),
        import('pusher-js'),
    ]);
    const echo = new Echo({
        broadcaster: 'reverb',
        key: config.key,
        wsHost: config.host,
        wsPort: config.port,
        wssPort: config.port,
        forceTLS: config.scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        Pusher,
        authorizer: (channel) => ({
            authorize: (socketId, callback) =>
                axios
                    .post('/broadcasting/auth', { socket_id: socketId, channel_name: channel.name })
                    .then(({ data }) => callback(null, data))
                    .catch((error) => callback(error, null)),
        }),
    });
    const name = `workspace.${organizationId}.${userId}`;
    echo.private(name).listen('.changed', (detail) =>
        window.dispatchEvent(new CustomEvent('ae:realtime', { detail })),
    );
    return () => {
        echo.leave(name);
        echo.disconnect();
    };
}

export function onRealtime(kinds, handler) {
    const listener = (event) => kinds.includes(event.detail?.kind) && handler(event.detail);
    window.addEventListener('ae:realtime', listener);
    return () => window.removeEventListener('ae:realtime', listener);
}
