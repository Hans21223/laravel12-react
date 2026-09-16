<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => fn () => $request->user()?->settingsPayload(),
            ],
            // ข้อความแจ้งเตือนหลังทำรายการ (แสดงเป็น Toast ฝั่ง React)
            'flash' => fn () => $request->session()->get('flash'),
            // Public WebSocket settings only; the app secret never leaves the server.
            'realtime' => fn () => $request->user() && config('broadcasting.default') === 'reverb' && config('broadcasting.connections.reverb.key') ? [
                'key' => config('broadcasting.connections.reverb.key'),
                'host' => config('broadcasting.connections.reverb.public.host') ?: parse_url(config('app.url'), PHP_URL_HOST),
                'port' => (int) config('broadcasting.connections.reverb.public.port', 443),
                'scheme' => config('broadcasting.connections.reverb.public.scheme', 'https'),
            ] : null,
        ];
    }
}
