/**
 * จอแสดงภาพจากกล้องโดรนแบบจำลอง
 * วาดด้วย CSS transform ล้วน ไม่ต้องใช้ไลบรารี 3D
 */
export default function HudViewport({ drone }) {
    const moving = drone.speed > 0;

    return (
        <div className="relative h-64 overflow-hidden rounded-lg border border-cyan-500/30 bg-[#02120f]">
            {/* พื้นดินแบบตารางที่เอียงตามการบิน */}
            <div
                className="absolute inset-0 transition-transform duration-500 ease-out"
                style={{
                    perspective: '420px',
                    transform: `rotateZ(${-drone.roll}deg)`,
                }}
            >
                <div
                    className="absolute -left-1/2 -top-1/2 h-[300%] w-[200%] animate-grid-drift"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(34,211,238,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.35) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                        transform: `rotateX(${75 + drone.pitch}deg) translateZ(-60px)`,
                        animationPlayState: moving ? 'running' : 'paused',
                    }}
                />
            </div>

            {/* เป้าหมายจำลอง */}
            <div className="absolute left-1/2 top-[42%] -translate-x-1/2 rounded border border-rose-500/60 bg-rose-500/10 px-3 py-1.5">
                <span className="font-mono text-[10px] font-bold tracking-widest text-rose-400">TGT-01</span>
            </div>

            {/* เส้นสแกนเคลื่อนที่ */}
            {moving && (
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px animate-scan-line bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
                    aria-hidden="true"
                />
            )}

            {/* เป้าเล็ง */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400/60" />
                <div className="absolute left-1/2 top-1/2 h-px w-16 -translate-x-1/2 -translate-y-1/2 bg-cyan-400/60" />
                <div className="absolute left-1/2 top-1/2 h-16 w-px -translate-x-1/2 -translate-y-1/2 bg-cyan-400/60" />
            </div>

            {/* ข้อมูลกำกับมุมจอ */}
            <div className="pointer-events-none absolute inset-0 p-3 font-mono text-[10px] text-cyan-400">
                <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                        <p>{(drone.payload_module ?? 'NO PAYLOAD').toUpperCase()}</p>
                        <p className="text-rose-400">● REC</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                        <p>HDG {Math.round(drone.heading).toString().padStart(3, '0')}°</p>
                        <p>ALT {drone.altitude.toFixed(1)}m</p>
                    </div>
                </div>

                <div className="absolute inset-x-3 bottom-3 flex items-end justify-between">
                    <p>
                        {drone.latitude.toFixed(5)}, {drone.longitude.toFixed(5)}
                    </p>
                    <p className={moving ? 'text-emerald-400' : 'text-zinc-600'}>
                        {moving ? 'TRACKING' : 'HOLDING'}
                    </p>
                </div>
            </div>
        </div>
    );
}
