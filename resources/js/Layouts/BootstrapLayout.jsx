import { Link } from "@inertiajs/react";
import { useEffect } from "react";

export default function BootstrapLayout({ children }) {
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        // บังคับใช้ Dark Theme ทั่วทั้งแอปพลิเคชัน
        <div data-bs-theme="dark" className="bg-black text-light min-vh-100" style={{ fontFamily: "'Consolas', 'Courier New', monospace" }}>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
            <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />

            <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary shadow">
                <div className="container-fluid px-4">
                    <Link className="navbar-brand fw-bold text-success" href="/drone-system">
                        <i className="bi bi-crosshair me-2"></i>A.E.G.I.S. Command
                    </Link>
                    
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar">
                        <span className="navbar-toggler-icon"></span>
                    </button>

                    <div className="collapse navbar-collapse" id="mainNavbar">
                        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                            <li className="nav-item">
                                <Link className="nav-link active text-info" href="/drone-system">MAIN_TERMINAL</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" href="#">FLEET_MATRIX</Link>
                            </li>
                            <li className="nav-item dropdown">
                                <a className="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                                    SYS_CONFIG
                                </a>
                                <ul className="dropdown-menu dropdown-menu-dark">
                                    <li><a className="dropdown-item" href="#"><i className="bi bi-cpu"></i> Calibrate IMU</a></li>
                                    <li><a className="dropdown-item" href="#"><i className="bi bi-broadcast"></i> Ping Satellites</a></li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li><a className="dropdown-item text-danger fw-bold" href="#"><i className="bi bi-exclamation-triangle-fill"></i> ABORT ALL MISSIONS</a></li>
                                </ul>
                            </li>
                        </ul>
                        
                        <div className="d-flex text-white align-items-center">
                            <span className="badge border border-success text-success p-2 me-3">
                                <span className="spinner-grow spinner-grow-sm me-2" style={{ width: '0.5rem', height: '0.5rem' }}></span>
                                UPLINK SECURE
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="p-3">
                {children}
            </main>
        </div>
    );
}