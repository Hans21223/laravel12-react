import BootstrapLayout from "@/Layouts/BootstrapLayout";
import { Head } from "@inertiajs/react";
import { useState, useEffect } from "react";
import axios from 'axios';

interface Drone {
    id: number;
    drone_code: string;
    model_name: string;
    battery_capacity: number;
    max_speed: number;
    payload_module: string;
    status: string;
}

export default function DroneDatabase() {
    const [drones, setDrones] = useState<Drone[]>([]);
    const [loading, setLoading] = useState(true);

    // ดึงข้อมูลจากฐานข้อมูลทันทีเมื่อเปิดหน้าเว็บ
    useEffect(() => {
        axios.get('/api/drones')
            .then((response) => {
                setDrones(response.data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching drones:", error);
                setLoading(false);
            });
    }, []);

    return (
        <BootstrapLayout>
            <Head title="A.E.G.I.S. | Database" />

            <div className="container mt-5">
                <div className="card border-info shadow">
                    <div className="card-header bg-dark text-info fw-bold">
                        <i className="bi bi-hdd-rack me-2"></i> UAV_FLEET_DATA_TABLE
                    </div>
                    <div className="card-body bg-black text-light">
                        {loading ? (
                            <div className="text-center p-5">Loading records...</div>
                        ) : (
                            <table className="table table-dark table-hover table-bordered align-middle">
                                <thead>
                                    <tr className="text-info">
                                        <th>ID</th>
                                        <th>CALL SIGN</th>
                                        <th>MODEL</th>
                                        <th>BATTERY (mAh)</th>
                                        <th>MAX SPEED</th>
                                        <th>PAYLOAD</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drones.map((d) => (
                                        <tr key={d.id}>
                                            <td className="text-secondary">{d.id}</td>
                                            <td className="fw-bold text-warning">{d.drone_code}</td>
                                            <td>{d.model_name}</td>
                                            <td>{d.battery_capacity}</td>
                                            <td>{d.max_speed} km/h</td>
                                            <td>{d.payload_module}</td>
                                            <td>
                                                <span className={`badge ${d.status === 'In_Flight' ? 'bg-primary' : 'bg-secondary'}`}>
                                                    {d.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </BootstrapLayout>
    );
}