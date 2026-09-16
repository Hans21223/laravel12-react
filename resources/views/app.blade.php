<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#111f33">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        {{-- ใช้ฟอนต์ของเครื่องผู้ใช้ ไม่ต้องพึ่ง CDN ภายนอก ระบบจึงทำงานได้แม้ไม่มีอินเทอร์เน็ต --}}

        @routes
        @viteReactRefresh
        @vite('resources/js/app.jsx')
        @inertiaHead
    </head>
    <body class="min-h-screen bg-canvas font-sans text-ink antialiased">
        @inertia
    </body>
</html>
