import BootstrapLayout from "@/Layouts/BootstrapLayout";
import { Head } from "@inertiajs/react";
import { useState } from "react";

export default function SmartDoor() {
    // State 1: จัดการสถานะการล็อคประตู (ค่าเริ่มต้นคือ true = ล็อคอยู่)
    const [isLocked, setIsLocked] = useState(true);

    // State 2: จัดการสถานะเซ็นเซอร์ PIR ตรวจจับการเคลื่อนไหว
    const [motionDetected, setMotionDetected] = useState(false);

    // State 3: จัดการประวัติการทำงาน (Log) โดยเก็บเป็น Array ของ Object
    const [logs, setLogs] = useState([]);

    // ฟังก์ชันสำหรับสลับสถานะการล็อคประตู
    const toggleLock = () => {
        const newStatus = !isLocked;
        setIsLocked(newStatus); // อัปเดต State ประตู

        // สร้างข้อมูล Log ใหม่
        const timestamp = new Date().toLocaleTimeString('th-TH');
        const action = newStatus ? "🚪 ล็อคประตู" : "🔓 ปลดล็อคประตู";
        
        // อัปเดต State Array แบบ Immutable โดยเอาข้อมูลใหม่ต่อหน้าข้อมูลเดิม
        setLogs([{ time: timestamp, action: action }, ...logs]);
    };

    // ฟังก์ชันสำหรับจำลองว่าเซ็นเซอร์ PIR ตรวจพบการเคลื่อนไหว
    const simulateMotion = () => {
        setMotionDetected(true);
        
        const timestamp = new Date().toLocaleTimeString('th-TH');
        setLogs([{ time: timestamp, action: "⚠️ ตรวจพบการเคลื่อนไหวที่หน้าประตู!" }, ...logs]);

        // ตั้งเวลาให้สถานะแจ้งเตือนหายไปเองหลังผ่านไป 3 วินาที
        setTimeout(() => {
            setMotionDetected(false);
        }, 3000);
    };

    return (
        <BootstrapLayout>
            <Head title="Smart Door Security" />
            <div className="container mt-5">
                <h1 className="mb-4 text-center">Smart Security Door Dashboard</h1>

                <div className="row">
                    {/* ฝั่งซ้าย: แผงควบคุม (Control Panel) */}
                    <div className="col-lg-6 mb-4">
                        {/* การ์ดแสดงสถานะประตู (เปลี่ยนสีพื้นหลังตาม State isLocked) */}
                        <div className={`card text-white mb-4 ${isLocked ? 'bg-success' : 'bg-danger'}`}>
                            <div className="card-body text-center p-5">
                                <h2 className="card-title fw-bold">
                                    {isLocked ? "Secure (Locked)" : "Unsecure (Unlocked)"}
                                </h2>
                                <button
                                    className="btn btn-light btn-lg mt-3 fw-bold"
                                    onClick={toggleLock}
                                >
                                    {isLocked ? "Unlock Door" : "Lock Door"}
                                </button>
                            </div>
                        </div>

                        {/* การ์ดจำลองการทำงานของเซ็นเซอร์ */}
                        <div className="card shadow-sm">
                            <div className="card-body text-center p-4">
                                <h5>PIR & Ultrasonic Sensor Testing</h5>
                                <p className="text-muted small">จำลองคนเดินผ่านหน้าประตู</p>
                                <button
                                    className={`btn ${motionDetected ? 'btn-warning' : 'btn-outline-secondary'} btn-lg`}
                                    onClick={simulateMotion}
                                    disabled={motionDetected} // ป้องกันการกดซ้ำระหว่างแจ้งเตือน
                                >
                                    {motionDetected ? "Detecting..." : "Simulate Movement"}
                                </button>
                                
                                {/* แสดงข้อความแจ้งเตือนเมื่อ State motionDetected เป็น true */}
                                {motionDetected && (
                                    <div className="alert alert-danger mt-3 mb-0 fw-bold" role="alert">
                                        🚨 Motion Detected!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ฝั่งขวา: แสดงประวัติการทำงาน (Logs) */}
                    <div className="col-lg-6">
                        <div className="card shadow-sm h-100">
                            <div className="card-header bg-dark text-white fw-bold">
                                <i className="bi bi-clock-history me-2"></i> Security Logs
                            </div>
                            {/* ใช้ overflow-y เพื่อให้เลื่อนดูประวัติได้ถ้ามีเยอะ */}
                            <ul className="list-group list-group-flush" style={{ maxHeight: '430px', overflowY: 'auto' }}>
                                {/* ตรวจสอบว่ามีข้อมูลใน State logs หรือไม่ */}
                                {logs.length === 0 ? (
                                    <li className="list-group-item text-muted text-center py-4">
                                        No activity yet.
                                    </li>
                                ) : (
                                    // ใช้ .map() เพื่อลูปแสดงผลข้อมูลจาก State Array
                                    logs.map((log, index) => (
                                        <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>{log.action}</span>
                                            <span className="badge bg-secondary rounded-pill">{log.time}</span>
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