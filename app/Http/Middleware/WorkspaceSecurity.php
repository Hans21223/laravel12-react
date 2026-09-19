<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;

class WorkspaceSecurity
{
    public function handle(Request $request, Closure $next)
    {
        if (!config('tenancy.enabled') && $request->is('organizations', 'api/organizations', 'api/organizations/*', 'api/organization/*', 'api/team/*')) {
            abort(404);
        }
        // Ziggy และ Vite ฝัง <script> ไว้ในหน้า จึงใช้ nonce แทนการเปิด 'unsafe-inline'
        $nonce = Vite::useCspNonce();
        $host = parse_url(config('app.url'), PHP_URL_HOST);

        $response = $next($request);

        // ไฟล์ทุกอย่างเสิร์ฟจากโดเมนเดียวกัน จึงล็อกแหล่งที่มาไว้ทั้งหมด
        // ลดความเสียหายหากมีช่องโหว่ XSS และกันการฝังหน้าเว็บใน iframe
        $response->headers->set('Content-Security-Policy', implode('; ', [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "script-src 'self' 'nonce-".$nonce."'",
            // React ใส่สไตล์ผ่าน attribute จึงต้องอนุญาต inline style
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "media-src 'self' blob:",
            "font-src 'self'",
            "connect-src 'self'".($host ? " wss://{$host} ws://{$host}" : ''),
        ]));

        // เปิดผ่าน HTTPS อยู่แล้ว จึงบอกเบราว์เซอร์ให้ใช้ HTTPS เท่านั้นในครั้งต่อไป
        if ($request->secure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
        if ($request->is('api/*') || $request->user()) {
            $response->headers->set('Cache-Control', 'private, no-store');
        }

        return $response;
    }
}
