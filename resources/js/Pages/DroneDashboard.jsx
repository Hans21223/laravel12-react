import BootstrapLayout from "@/Layouts/BootstrapLayout";
import { Head } from "@inertiajs/react";
import { useState, useEffect } from "react";

export default function DroneDashboard() {
    const [drones, setDrones] = useState([
        { id: "DN-01", name: "Alpha-Quad", status: "In_Flight", battery: 85, altitude: 120.4, speed: 45.2, pitch: 2.1, roll: -1.4, yaw: 180, lat: 14.121045, lng: 100.612098, signal: 98 },
        { id: "DN-02", name: "Beta-Hexa", status: "Standby", battery: 100, altitude: 0.0, speed: 0.0, pitch: 0.0, roll: 0.0, yaw: 90, lat: 14.123000, lng: 100.615000, signal: 100 },
        { id: "DN-03", name: "Gamma-Fixed", status: "Returning", battery: 38, altitude: 150.8, speed: 65.7, pitch: -5.2, roll: 0.5, yaw: 270, lat: 14.118992, lng: 100.609112, signal: 65 },
    ]);

    const [selectedDroneId, setSelectedDroneId] = useState("DN-01");
    const [logs, setLogs] = useState([
        { time: "14:30:12", src: "SYS", msg: "Initial connection established." },
        { time: "14:31:05", src: "DN-03", msg: "Low battery warning triggered." },
    ]);

    const activeDrone = drones.find(d => d.id === selectedDroneId) || drones[0];

    // ฟังก์ชันสั่งการ
    const executeCommand = (cmd) => {
        setDrones(prev => prev.map(d => {
            if (d.id === selectedDroneId) {
                if (cmd === "LAUNCH") return { ...d, status: "In_Flight", altitude: 5.0, speed: 10.0 };
                if (cmd === "LAND") return { ...d, status: "Standby", altitude: 0, speed: 0, pitch: 0, roll: 0 };
                if (cmd === "RTL") return { ...d, status: "Returning" };
            }
            return d;
        }));

        const time = new Date().toLocaleTimeString('th-TH');
        setLogs(prev => [{ time, src: selectedDroneId, msg: `COMMAND_OVERRIDE: [${cmd}] Executed.` }, ...prev]);
    };

    // Live Telemetry Simulation
    useEffect(() => {
        const interval = setInterval(() => {
            setDrones(prevDrones => prevDrones.map(drone => {
                if (drone.status === "In_Flight" || drone.status === "Returning") {
                    return {
                        ...drone,
                        battery: Math.max(0, drone.battery - (Math.random() > 0.8 ? 1 : 0)),
                        altitude: Math.max(5, drone.altitude + (Math.random() * 2 - 1)),
                        speed: Math.max(10, drone.speed + (Math.random() * 4 - 2)),
                        pitch: (Math.random() * 10 - 5),
                        roll: (Math.random() * 10 - 5),
                        yaw: (drone.yaw + (Math.random() * 4 - 2)) % 360,
                        lat: drone.lat + (Math.random() * 0.0001 - 0.00005),
                        lng: drone.lng + (Math.random() * 0.0001 - 0.00005),
                        signal: Math.max(40, drone.signal - (Math.random() > 0.7 ? 2 : -1))
                    };
                }
                return drone;
            }));
        }, 1000); // อัปเดตทุก 1 วินาทีให้ดูเหมือนเซ็นเซอร์กำลังทำงาน
        return () => clearInterval(interval);
    }, []);

    // Custom CSS for the tactical UI
    const tacticalStyles = `
        .hud-box { border: 1px solid #198754; background: rgba(0, 20, 0, 0.4); }
        .text-neon { text-shadow: 0 0 5px #20c997; }
        .radar-box { position: relative; overflow: hidden; background: #000; border: 1px solid #0dcaf0; height: 250px; }
        .radar-sweep { position: absolute; width: 50%; height: 2px; background: #0dcaf0; top: 50%; left: 50%; transform-origin: 0 50%; animation: spin 4s linear infinite; box-shadow: 0 0 10px #0dcaf0; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .log-container::-webkit-scrollbar { width: 5px; }
        .log-container::-webkit-scrollbar-thumb { background: #198754; }
    `;

    return (
        <BootstrapLayout>
            <Head title="A.E.G.I.S. Command" />
            <style>{tacticalStyles}</style>

            <div className="container-fluid">
                {/* Header Stats */}
                <div className="row mb-3">
                    <div className="col-12 d-flex justify-content-between align-items-end border-bottom border-secondary pb-2">
                        <div>
                            <h3 className="text-success text-neon mb-0"><i className="bi bi-globe-asia-australia me-2"></i>GLOBAL_TELEMETRY_LINK</h3>
                            <small className="text-secondary">UAV FLEET TRACKING SYSTEM v4.2.1</small>
                        </div>
                        <div className="text-end">
                            <span className="text-info me-4">SYS_TIME: <span className="fw-bold">{new Date().toLocaleTimeString()}</span></span>
                            <span className="text-warning">ACTIVE_UNITS: <span className="fw-bold">2/3</span></span>
                        </div>
                    </div>
                </div>

                <div className="row g-3">
                    {/* Column 1: Fleet Roster */}
                    <div className="col-lg-3">
                        <div className="hud-box p-3 h-100">
                            <h5 className="text-info mb-3 border-bottom border-info pb-2"><i className="bi bi-list-nested"></i> FLEET_ROSTER</h5>
                            {drones.map(drone => (
                                <div 
                                    key={drone.id} 
                                    className={`card bg-transparent border mb-3 cursor-pointer ${selectedDroneId === drone.id ? 'border-success' : 'border-secondary'}`}
                                    onClick={() => setSelectedDroneId(drone.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={`card-header p-2 ${selectedDroneId === drone.id ? 'bg-success text-dark' : 'bg-dark text-secondary'}`}>
                                        <i className="bi bi-airplane-engines me-2"></i>{drone.id} | {drone.name}
                                    </div>
                                    <div className="card-body p-2 small">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span>STATUS:</span>
                                            <span className={drone.status === "In_Flight" ? "text-primary" : drone.status === "Returning" ? "text-warning" : "text-secondary"}>
                                                [{drone.status}]
                                            </span>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <span>PWR:</span>
                                            <span className={drone.battery < 40 ? "text-danger" : "text-success"}>{drone.battery}%</span>
                                        </div>
                                        <div className="progress mt-1" style={{ height: "4px" }}>
                                            <div className={`progress-bar ${drone.battery < 40 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${drone.battery}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Main HUD & Visuals */}
                    <div className="col-lg-5">
                        <div className="hud-box p-3 h-100 d-flex flex-column">
                            <h5 className="text-success mb-3 border-bottom border-success pb-2">
                                <i className="bi bi-camera-video text-danger pe-2 shadow-sm pulse"></i> 
                                OPTICAL_FEED_LINK // TARGET: {activeDrone.id}
                            </h5>
                            
                            {/* Fake Radar / Camera Viewport */}
                            <div className="radar-box d-flex justify-content-center align-items-center mb-3">
                                <div className="radar-sweep"></div>
                                <div className="text-info text-center" style={{ zIndex: 10 }}>
                                    <div>[ NO_OPTICAL_PAYLOAD_DETECTED ]</div>
                                    <small className="text-secondary">SWITCHING TO RADAR TELEMETRY</small>
                                </div>
                                {/* Crosshair */}
                                <div style={{ position: 'absolute', borderLeft: '1px solid #198754', borderRight: '1px solid #198754', height: '20px', width: '100%' }}></div>
                                <div style={{ position: 'absolute', borderTop: '1px solid #198754', borderBottom: '1px solid #198754', width: '20px', height: '100%' }}></div>
                            </div>

                            {/* Core Telemetry Grid */}
                            <div className="row g-2 text-center mt-auto">
                                <div className="col-4">
                                    <div className="border border-secondary p-2 bg-dark">
                                        <div className="text-muted small">ALTITUDE (m)</div>
                                        <div className="fs-4 text-info">{activeDrone.altitude.toFixed(1)}</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="border border-secondary p-2 bg-dark">
                                        <div className="text-muted small">SPEED (km/h)</div>
                                        <div className="fs-4 text-warning">{activeDrone.speed.toFixed(1)}</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="border border-secondary p-2 bg-dark">
                                        <div className="text-muted small">SIGNAL (%)</div>
                                        <div className="fs-4 text-success">{activeDrone.signal}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Terminal & Command */}
                    <div className="col-lg-4">
                        <div className="hud-box p-3 h-100 d-flex flex-column">
                            <h5 className="text-warning mb-3 border-bottom border-warning pb-2"><i className="bi bi-terminal"></i> COMMAND_LINK</h5>
                            
                            {/* Physics Data */}
                            <div className="mb-3 p-2 border border-secondary bg-dark small">
                                <div className="text-secondary mb-1">GYROSCOPE_DATA:</div>
                                <div className="d-flex justify-content-between"><span>PITCH:</span> <span className="text-info">{activeDrone.pitch.toFixed(2)}°</span></div>
                                <div className="d-flex justify-content-between"><span>ROLL:</span> <span className="text-info">{activeDrone.roll.toFixed(2)}°</span></div>
                                <div className="d-flex justify-content-between"><span>YAW:</span> <span className="text-info">{activeDrone.yaw.toFixed(2)}°</span></div>
                                <hr className="border-secondary my-1"/>
                                <div className="d-flex justify-content-between"><span>LAT:</span> <span className="text-info">{activeDrone.lat.toFixed(6)}</span></div>
                                <div className="d-flex justify-content-between"><span>LNG:</span> <span className="text-info">{activeDrone.lng.toFixed(6)}</span></div>
                            </div>

                            {/* Command Buttons */}
                            <div className="d-grid gap-2 mb-4">
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => executeCommand("LAUNCH")} disabled={activeDrone.status !== "Standby"}>
                                    <i className="bi bi-rocket-takeoff me-2"></i> [CMD_01] EXEC_TAKEOFF
                                </button>
                                <button className="btn btn-outline-warning btn-sm text-start" onClick={() => executeCommand("RTL")} disabled={activeDrone.status === "Standby"}>
                                    <i className="bi bi-arrow-return-left me-2"></i> [CMD_02] EXEC_RETURN
                                </button>
                                <button className="btn btn-outline-danger btn-sm text-start fw-bold" onClick={() => executeCommand("LAND")} disabled={activeDrone.status === "Standby"}>
                                    <i className="bi bi-exclamation-octagon me-2"></i> [CMD_99] OVERRIDE_LAND
                                </button>
                            </div>

                            {/* Event Logs Terminal */}
                            <h6 className="text-secondary mt-auto mb-2">SYS_AUDIT_LOG:</h6>
                            <div className="log-container border border-secondary p-2 bg-dark flex-grow-1" style={{ overflowY: "auto", maxHeight: "150px" }}>
                                {logs.map((log, index) => (
                                    <div key={index} className="small mb-1" style={{ fontSize: '0.75rem' }}>
                                        <span className="text-secondary">[{log.time}]</span> 
                                        <span className="text-warning mx-1">&lt;{log.src}&gt;</span> 
                                        <span className={log.msg.includes("OVERRIDE") ? "text-danger" : "text-light"}>{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </BootstrapLayout>
    );
}