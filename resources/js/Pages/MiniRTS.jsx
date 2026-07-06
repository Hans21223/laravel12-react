import BootstrapLayout from "@/Layouts/BootstrapLayout";
import { Head } from "@inertiajs/react";
import { useState, useEffect } from "react";

export default function MiniRTS() {
    // State 1: จัดการทรัพยากรด้วย Object
    const [resources, setResources] = useState({ gold: 50, wood: 50 });
    
    // State 2: จัดการจำนวนยูนิตด้วย Object
    const [units, setUnits] = useState({ peons: 0, soldiers: 0 });
    
    // State 3: จัดการประวัติการทำงาน (Log) ด้วย Array
    const [logs, setLogs] = useState([]);

    // ฟังก์ชันช่วยเหลือสำหรับบันทึก Log
    const addLog = (action) => {
        const time = new Date().toLocaleTimeString('th-TH');
        // ใช้ Spread Operator และเก็บแค่ 10 รายการล่าสุดเพื่อไม่ให้หน้าจอยาวเกินไป
        setLogs(prevLogs => [{ time, action }, ...prevLogs].slice(0, 10));
    };

    // --- Action Functions (กดคลิกเพื่อทำสิ่งต่างๆ) ---
    const gatherGold = () => {
        setResources(prev => ({ ...prev, gold: prev.gold + 10 }));
        addLog("⛏️ ขุดทองด้วยตัวเอง +10");
    };

    const gatherWood = () => {
        setResources(prev => ({ ...prev, wood: prev.wood + 10 }));
        addLog("🪓 ตัดไม้ด้วยตัวเอง +10");
    };

    const trainPeon = () => {
        if (resources.gold >= 20 && resources.wood >= 10) {
            setResources(prev => ({ ...prev, gold: prev.gold - 20, wood: prev.wood - 10 }));
            setUnits(prev => ({ ...prev, peons: prev.peons + 1 }));
            addLog("👷 สร้างคนงานสำเร็จ (Peon)");
        } else {
            addLog("❌ ทรัพยากรไม่พอสร้างคนงาน (ต้องการ: 20 Gold, 10 Wood)");
        }
    };

    const trainSoldier = () => {
        if (resources.gold >= 50 && resources.wood >= 50) {
            setResources(prev => ({ ...prev, gold: prev.gold - 50, wood: prev.wood - 50 }));
            setUnits(prev => ({ ...prev, soldiers: prev.soldiers + 1 }));
            addLog("⚔️ สร้างทหารสำเร็จ (Soldier)");
        } else {
            addLog("❌ ทรัพยากรไม่พอสร้างทหาร (ต้องการ: 50 Gold, 50 Wood)");
        }
    };

    // --- Passive Effect (ระบบเกมแบบเรียลไทม์) ---
    // ใช้ useEffect เพื่อให้คนงาน (Peons) ฟาร์มทรัพยากรให้เราอัตโนมัติทุกๆ 2 วินาที
    useEffect(() => {
        if (units.peons === 0) return; // ถ้าไม่มีคนงาน ก็ไม่ต้องทำอะไร

        const interval = setInterval(() => {
            setResources(prev => ({
                ...prev,
                gold: prev.gold + (units.peons * 2), // คนงาน 1 คน หาได้ 2 ทอง
                wood: prev.wood + (units.peons * 2)  // และ 2 ไม้ ต่อรอบ
            }));
        }, 2000); // ทำงานทุก 2 วินาที

        // Cleanup function (เหมือนในสไลด์เรียน)
        return () => clearInterval(interval);
    }, [units.peons]); // ทำงานใหม่เมื่อจำนวนคนงานเปลี่ยน

    return (
        <BootstrapLayout>
            <Head title="Mini RTS Game" />
            <div className="container mt-4">
                <h1 className="text-center mb-4">🏰 Mini Base Builder RTS</h1>

                {/* แถบแสดงทรัพยากร */}
                <div className="row text-center mb-4">
                    <div className="col-md-6">
                        <div className="card bg-warning text-dark shadow-sm">
                            <div className="card-body">
                                <h2>💰 Gold: {resources.gold}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card bg-success text-white shadow-sm">
                            <div className="card-body">
                                <h2>🌲 Wood: {resources.wood}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* ฝั่งซ้าย: แผงควบคุม (Command Center) */}
                    <div className="col-lg-8 mb-4">
                        <div className="card shadow-sm h-100">
                            <div className="card-header bg-dark text-white">
                                <h5 className="mb-0">⚙️ Command Center</h5>
                            </div>
                            <div className="card-body">
                                
                                <h6 className="text-muted">Manual Gather (ฟาร์มด้วยตัวเอง)</h6>
                                <div className="d-flex gap-2 mb-4">
                                    <button className="btn btn-outline-warning flex-fill fw-bold" onClick={gatherGold}>
                                        ⛏️ Mine Gold (+10)
                                    </button>
                                    <button className="btn btn-outline-success flex-fill fw-bold" onClick={gatherWood}>
                                        🪓 Chop Wood (+10)
                                    </button>
                                </div>

                                <hr />

                                <h6 className="text-muted">Barracks (สร้างยูนิต)</h6>
                                <div className="d-flex gap-2 mb-3">
                                    <button className="btn btn-primary flex-fill" onClick={trainPeon}>
                                        👷 Train Peon<br/><small>(Cost: 20 Gold, 10 Wood)</small>
                                    </button>
                                    <button className="btn btn-danger flex-fill" onClick={trainSoldier}>
                                        ⚔️ Train Soldier<br/><small>(Cost: 50 Gold, 50 Wood)</small>
                                    </button>
                                </div>

                                <div className="alert alert-info mt-4">
                                    <strong>📊 Army Status:</strong> 
                                    <span className="ms-3">👷 Peons: {units.peons}</span>
                                    <span className="ms-3">⚔️ Soldiers: {units.soldiers}</span>
                                    <br />
                                    <small className="text-muted">
                                        *Peons will automatically gather +2 Gold and +2 Wood every 2 seconds!
                                    </small>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* ฝั่งขวา: แสดงประวัติ (Battle Logs) */}
                    <div className="col-lg-4">
                        <div className="card shadow-sm h-100">
                            <div className="card-header bg-secondary text-white">
                                <h5 className="mb-0">📜 Action Logs</h5>
                            </div>
                            <ul className="list-group list-group-flush" style={{ minHeight: '300px' }}>
                                {logs.length === 0 ? (
                                    <li className="list-group-item text-muted text-center py-4">
                                        No actions yet.
                                    </li>
                                ) : (
                                    logs.map((log, index) => (
                                        <li key={index} className="list-group-item d-flex flex-column">
                                            <span className="fw-bold">{log.action}</span>
                                            <small className="text-muted">{log.time}</small>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </BootstrapLayout>
    );
}