import BootstrapLayout from "@/Layouts/BootstrapLayout";
import { Head } from "@inertiajs/react";
import { useState, useEffect } from "react";
import axios from "axios"; // 🟢 สำคัญมาก! นำเข้า axios เพื่อให้ส่งข้อมูลผ่านระบบป้องกันของ Laravel ได้

export default function DroneDashboard() {
    const [drones, setDrones] = useState([]);
    const [selectedDroneId, setSelectedDroneId] = useState(null);
    const [isDeploying, setIsDeploying] = useState(false);
    
    const [logs, setLogs] = useState([
        { time: new Date().toLocaleTimeString('th-TH'), src: "SYS", msg: "TERMINAL ONLINE. CHECKING DATABASE..." }
    ]);

    const [newDrone, setNewDrone] = useState({ id: "", name: "", type: "Quad-Copter", payload: "Optical Camera" });
    const activeDrone = drones.find(d => d.id === selectedDroneId);

    // ======================================================================
    // 🚀 1. ดึงข้อมูลจากฐานข้อมูลด้วย axios
    // ======================================================================
    useEffect(() => {
        axios.get('/api/drones')
            .then(res => {
                const loadedDrones = res.data.map(dbDrone => ({
                    id: dbDrone.drone_code,
                    name: dbDrone.model_name,
                    type: "DB_UNIT",
                    payload: dbDrone.payload_module,
                    status: dbDrone.status,
                    battery: 100, altitude: 0, speed: 0, pitch: 0, roll: 0, yaw: 90, 
                    lat: 14.120000 + (Math.random() * 0.005), 
                    lng: 100.610000 + (Math.random() * 0.005), 
                    signal: 100
                }));
                
                setDrones(loadedDrones);
                if(loadedDrones.length > 0) setSelectedDroneId(loadedDrones[0].id);
                
                setLogs(prev => [{ time: new Date().toLocaleTimeString(), src: "SYS", msg: `DATABASE SYNC COMPLETE. ${loadedDrones.length} UNITS FOUND.` }, ...prev]);
            })
            .catch(err => console.error("โหลดข้อมูลล้มเหลว:", err));
    }, []);

    // ======================================================================
    // 🚀 2. บันทึกโดรนตัวใหม่ด้วย axios
    // ======================================================================
    const handleDeployDrone = async (e) => {
        e.preventDefault();
        if(!newDrone.id || !newDrone.name) return;

        try {
            // ใช้ axios ส่งข้อมูลไปที่ Laravel
            const response = await axios.post('/api/drones', newDrone);

            if (response.data.success) {
                const newUnit = {
                    id: newDrone.id.toUpperCase(),
                    name: newDrone.name,
                    type: newDrone.type,
                    payload: newDrone.payload,
                    status: "Standby",
                    battery: 100, altitude: 0.0, speed: 0.0, pitch: 0.0, roll: 0.0, yaw: 90, 
                    lat: 14.120000 + (Math.random() * 0.005), lng: 100.610000 + (Math.random() * 0.005), signal: 100
                };

                setDrones(prev => [...prev, newUnit]);
                setSelectedDroneId(newUnit.id);
                setIsDeploying(false);
                setNewDrone({ id: "", name: "", type: "Quad-Copter", payload: "Optical Camera" });

                const time = new Date().toLocaleTimeString('th-TH');
                setLogs(prev => [{ time, src: "SYS", msg: `[SQLITE_INSERT_OK]: UNIT ${newUnit.id} REGISTERED TO DB.` }, ...prev]);
            }
        } catch (error) {
            // ถ้า Error (เช่น ใส่ ID ซ้ำกับที่มีใน DB)
            alert("บันทึกล้มเหลว! รหัสโดรนนี้อาจมีซ้ำอยู่ใน Database แล้ว (CALL SIGN ต้องห้ามซ้ำกัน)");
            console.error("Database Save Error:", error);
        }
    };

    // ฟังก์ชันสั่งการ (คงเดิม)
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
        setLogs(prev => [{ time, src: selectedDroneId, msg: `COMMAND: [${cmd}] Executed.` }, ...prev]);
    };

    // ระบบจำลอง Telemetry (คงเดิม)
    useEffect(() => {
        const interval = setInterval(() => {
            setDrones(prevDrones => prevDrones.map(drone => {
                if (drone.status === "In_Flight" || drone.status === "Returning") {
                    return {
                        ...drone,
                        battery: Math.max(0, drone.battery - (Math.random() > 0.8 ? 1 : 0)),
                        altitude: Math.max(5, drone.altitude + (Math.random() * 2 - 1)),
                        speed: Math.max(10, drone.speed + (Math.random() * 4 - 2)),
                        pitch: (Math.random() * 8 - 4), roll: (Math.random() * 12 - 6), yaw: (drone.yaw + (Math.random() * 4 - 2)) % 360,
                        lat: drone.lat + (Math.random() * 0.0001 - 0.00005), lng: drone.lng + (Math.random() * 0.0001 - 0.00005),
                        signal: Math.max(40, drone.signal - (Math.random() > 0.8 ? 1 : 0))
                    };
                }
                return drone;
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // 🎨 CSS Tactical Theme (คงเดิม)
    const tacticalStyles = `
        .hud-box { border: 1px solid #198754; background: rgba(0, 20, 0, 0.4); }
        .text-neon { text-shadow: 0 0 5px #20c997; }
        .viewport-3d { perspective: 400px; overflow: hidden; background: #000a00; border: 1px solid #0dcaf0; height: 250px; position: relative; box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8); }
        .world-wrapper { position: absolute; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s ease-out; }
        .terrain { position: absolute; width: 300%; height: 300%; left: -100%; top: -50%; background-image: linear-gradient(rgba(13, 202, 240, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(13, 202, 240, 0.4) 1px, transparent 1px); background-size: 40px 40px; transform: rotateX(75deg) translateZ(-60px); transform-style: preserve-3d; animation: flyForward 0.8s linear infinite; }
        @keyframes flyForward { from { background-position: 0 0; } to { background-position: 0 40px; } }
        .target-house { position: absolute; width: 80px; height: 60px; left: 45%; top: 40%; border: 2px solid #dc3545; background: rgba(220, 53, 69, 0.2); transform: rotateX(-75deg) translateZ(30px); display: flex; align-items: center; justify-content: center; color: #dc3545; font-weight: bold; font-size: 10px; box-shadow: 0 0 10px rgba(220, 53, 69, 0.5); }
        .target-house::before { content: ''; position: absolute; top: -30px; left: -2px; border-left: 40px solid transparent; border-right: 40px solid transparent; border-bottom: 30px solid rgba(220, 53, 69, 0.5); }
        .hud-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 10; }
        .crosshair { position: absolute; top: 50%; left: 50%; width: 40px; height: 40px; margin-top: -20px; margin-left: -20px; border: 2px solid rgba(13, 202, 240, 0.7); border-radius: 50%; }
        .crosshair::before { content: ''; position: absolute; width: 60px; height: 2px; background: rgba(13, 202, 240, 0.7); top: 17px; left: -12px; }
        .crosshair::after { content: ''; position: absolute; height: 60px; width: 2px; background: rgba(13, 202, 240, 0.7); left: 17px; top: -12px; }
        .form-dark { background: rgba(0, 0, 0, 0.5); border: 1px solid #0dcaf0; color: #0dcaf0; }
        .form-dark:focus { background: rgba(0, 20, 20, 0.8); border-color: #20c997; color: #fff; box-shadow: none; }
    `;

    return (
        <BootstrapLayout>
            <Head title="A.E.G.I.S. Command" />
            <style>{tacticalStyles}</style>

            <div className="container-fluid" style={{ fontFamily: "'Consolas', 'Courier New', monospace" }}>
                {/* Header Stats */}
                <div className="row mb-3">
                    <div className="col-12 d-flex justify-content-between align-items-end border-bottom border-secondary pb-2">
                        <div>
                            <h3 className="text-success text-neon mb-0"><i className="bi bi-globe-asia-australia me-2"></i>GLOBAL_TELEMETRY_LINK</h3>
                            <small className="text-secondary">UAV FLEET TRACKING SYSTEM (DB SYNC ACTIVE)</small>
                        </div>
                        <div className="text-end">
                            <span className="text-info me-4">SYS_TIME: <span className="fw-bold">{new Date().toLocaleTimeString()}</span></span>
                            <span className="text-warning">ACTIVE_UNITS: <span className="fw-bold">{drones.length}</span></span>
                        </div>
                    </div>
                </div>

                <div className="row g-3">
                    {/* ---------------- Column 1: Fleet Roster & Deploy Button ---------------- */}
                    <div className="col-lg-3">
                        <div className="hud-box p-3 h-100 d-flex flex-column">
                            <h5 className="text-info mb-3 border-bottom border-info pb-2 d-flex justify-content-between">
                                <span><i className="bi bi-list-nested"></i> FLEET_ROSTER</span>
                            </h5>
                            
                            <button className={`btn w-100 mb-3 fw-bold ${isDeploying ? 'btn-success' : 'btn-outline-info'}`} onClick={() => setIsDeploying(!isDeploying)}>
                                {isDeploying ? "CANCEL DEPLOYMENT" : "[+] DEPLOY NEW UNIT"}
                            </button>

                            <div style={{ overflowY: 'auto', flexGrow: 1 }}>
                                {drones.length === 0 && !isDeploying && (
                                    <div className="text-center text-secondary py-5">
                                        <i className="bi bi-radar display-4 d-block mb-3 opacity-50"></i>
                                        NO ACTIVE UNITS IN DATABASE<br/>
                                        <small>Please deploy a unit to begin.</small>
                                    </div>
                                )}

                                {drones.map(drone => (
                                    <div key={drone.id} className={`card bg-transparent border mb-3 cursor-pointer ${selectedDroneId === drone.id ? 'border-success shadow' : 'border-secondary'}`} onClick={() => { setSelectedDroneId(drone.id); setIsDeploying(false); }}>
                                        <div className={`card-header p-2 ${selectedDroneId === drone.id ? 'bg-success text-dark fw-bold' : 'bg-dark text-secondary'}`}>
                                            <i className="bi bi-airplane-engines me-2"></i>{drone.id} | {drone.name}
                                        </div>
                                        <div className="card-body p-2 small text-light">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span>STATUS:</span>
                                                <span className={drone.status === "In_Flight" ? "text-primary" : drone.status === "Returning" ? "text-warning" : "text-secondary"}>
                                                    [{drone.status}]
                                                </span>
                                            </div>
                                            <div className="progress mt-2" style={{ height: "4px" }}>
                                                <div className={`progress-bar ${drone.battery < 40 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${drone.battery}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ---------------- Column 2: Main HUD & Visuals ---------------- */}
                    <div className="col-lg-5">
                        <div className="hud-box p-3 h-100 d-flex flex-column">
                            {isDeploying ? (
                                <div className="h-100 d-flex flex-column justify-content-center">
                                    <h4 className="text-success text-center mb-4"><i className="bi bi-database-add"></i> DATABASE WRITE: NEW DEPLOYMENT</h4>
                                    <form onSubmit={handleDeployDrone} className="px-4">
                                        <div className="mb-3">
                                            <label className="text-info small">CALL SIGN (ห้ามซ้ำใน Database):</label>
                                            <input type="text" className="form-control form-dark" placeholder="e.g. DN-05" value={newDrone.id} onChange={e => setNewDrone({...newDrone, id: e.target.value})} required />
                                        </div>
                                        <div className="mb-3">
                                            <label className="text-info small">MODEL NAME:</label>
                                            <input type="text" className="form-control form-dark" placeholder="e.g. Delta-Swarm" value={newDrone.name} onChange={e => setNewDrone({...newDrone, name: e.target.value})} required />
                                        </div>
                                        <div className="row mb-4">
                                            <div className="col-6">
                                                <label className="text-info small">AIRCRAFT TYPE:</label>
                                                <select className="form-select form-dark" value={newDrone.type} onChange={e => setNewDrone({...newDrone, type: e.target.value})}>
                                                    <option>Quad-Copter</option>
                                                    <option>Hexa-Copter</option>
                                                    <option>Fixed-Wing</option>
                                                </select>
                                            </div>
                                            <div className="col-6">
                                                <label className="text-info small">PAYLOAD MODULE:</label>
                                                <select className="form-select form-dark" value={newDrone.payload} onChange={e => setNewDrone({...newDrone, payload: e.target.value})}>
                                                    <option>Optical Camera</option>
                                                    <option>Thermal Imaging</option>
                                                    <option>LiDAR Scanner</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button type="submit" className="btn btn-success w-100 fw-bold fs-5 shadow"><i className="bi bi-hdd-network"></i> WRITE TO DATABASE & DEPLOY</button>
                                    </form>
                                </div>
                            ) : !activeDrone ? (
                                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-danger">
                                    <i className="bi bi-exclamation-triangle display-1 mb-3 pulse"></i>
                                    <h3>[ DATABASE_EMPTY ]</h3>
                                    <p className="text-secondary">Please deploy a new unit to the grid.</p>
                                </div>
                            ) : (
                                <>
                                    <h5 className="text-success mb-3 border-bottom border-success pb-2">
                                        <i className="bi bi-radar text-info pe-2 shadow-sm pulse"></i> 
                                        TARGET_SIMULATION // {activeDrone.id}
                                    </h5>
                                    
                                    <div className="viewport-3d mb-3">
                                        <div className="world-wrapper" style={{ transform: `rotateZ(${activeDrone.roll * -1}deg) rotateX(${activeDrone.pitch}deg)` }}>
                                            <div className="terrain" style={{ animationPlayState: activeDrone.speed > 0 ? 'running' : 'paused' }}>
                                                <div className="target-house">TGT-01</div>
                                            </div>
                                        </div>
                                        <div className="hud-overlay">
                                            <div className="crosshair"></div>
                                            <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#0dcaf0', fontSize: '12px' }}>
                                                {activeDrone.payload.toUpperCase()}: ACTIVE<br/>REC: 🔴 00:14:32
                                            </div>
                                        </div>
                                    </div>

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
                                </>
                            )}
                        </div>
                    </div>

                    {/* ---------------- Column 3: Terminal & Command ---------------- */}
                    <div className="col-lg-4">
                        <div className="hud-box p-3 h-100 d-flex flex-column">
                            <h5 className="text-warning mb-3 border-bottom border-warning pb-2"><i className="bi bi-terminal"></i> COMMAND_LINK</h5>
                            
                            {!activeDrone && !isDeploying ? (
                                <div className="text-center text-secondary py-4">AWAITING CONNECTION...</div>
                            ) : activeDrone && !isDeploying ? (
                                <>
                                    <div className="mb-3 p-2 border border-secondary bg-dark small">
                                        <div className="d-flex justify-content-between"><span>PITCH:</span> <span className="text-info">{activeDrone.pitch.toFixed(2)}°</span></div>
                                        <div className="d-flex justify-content-between"><span>ROLL:</span> <span className="text-info">{activeDrone.roll.toFixed(2)}°</span></div>
                                        <hr className="border-secondary my-1"/>
                                        <div className="d-flex justify-content-between"><span>LAT:</span> <span className="text-info">{activeDrone.lat.toFixed(6)}</span></div>
                                        <div className="d-flex justify-content-between"><span>LNG:</span> <span className="text-info">{activeDrone.lng.toFixed(6)}</span></div>
                                    </div>

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
                                </>
                            ) : null}

                            <h6 className="text-secondary mt-auto mb-2">SYS_AUDIT_LOG:</h6>
                            <div className="log-container border border-secondary p-2 bg-dark flex-grow-1" style={{ overflowY: "auto", maxHeight: "150px" }}>
                                {logs.map((log, index) => (
                                    <div key={index} className="small mb-1" style={{ fontSize: '0.75rem' }}>
                                        <span className="text-secondary">[{log.time}]</span> 
                                        <span className="text-warning mx-1">&lt;{log.src}&gt;</span> 
                                        <span className={log.msg.includes("ERROR") || log.msg.includes("OVERRIDE") ? "text-danger" : "text-light"}>{log.msg}</span>
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