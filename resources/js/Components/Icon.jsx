/**
 * ชุดไอคอน SVG แบบฝังในโค้ด
 * ใช้แทน bootstrap-icons ที่เดิมโหลดจาก CDN ทำให้ระบบทำงานได้โดยไม่ต้องต่ออินเทอร์เน็ต
 */
const PATHS = {
    radar: 'M19.07 4.93A10 10 0 1 1 4.93 19.07 M12 12l7-4 M12 2v4 M12 12a4 4 0 1 0 4 4',
    drone: 'M12 8v8 M8 12h8 M5 5l3 3 M19 5l-3 3 M5 19l3-3 M19 19l-3-3 M6.5 6.5a2.5 2.5 0 1 1-.01-.01 M17.5 6.5a2.5 2.5 0 1 1-.01-.01 M6.5 17.5a2.5 2.5 0 1 1-.01-.01 M17.5 17.5a2.5 2.5 0 1 1-.01-.01',
    database: 'M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3z M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6 M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6',
    terminal: 'M4 17l6-5-6-5 M12 19h8',
    lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
    unlock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 7.5-2',
    shield: 'M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6z',
    activity: 'M3 12h4l3 8 4-16 3 8h4',
    plus: 'M12 5v14 M5 12h14',
    pencil: 'M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16z',
    trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
    search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z M21 21l-4.3-4.3',
    menu: 'M4 7h16 M4 12h16 M4 17h16',
    close: 'M6 6l12 12 M18 6L6 18',
    rocket: 'M5 14c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.9-.9.9-2.3 0-3.2a2.3 2.3 0 0 0-3 .2z M13 12l-2-2 M18.5 3.5c-3 0-6.5 1.5-9 4l-2.5 2.5 5 5L14.5 12c2.5-2.5 4-6 4-9z M15 6.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0z',
    home: 'M4 11l8-7 8 7 M6 10v10h12V10',
    gauge: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z M12 12l4-4',
    signal: 'M4 20v-4 M9 20v-8 M14 20V8 M19 20V4',
    battery: 'M3 8h15v8H3z M21 11v2',
    alert: 'M12 4l9 16H3z M12 10v4 M12 17h.01',
    check: 'M5 13l4 4 10-10',
    logout: 'M9 21H5V3h4 M15 17l5-5-5-5 M20 12H9',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 3.6-6 8-6s8 2 8 6',
    chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
    arrowUp: 'M12 19V5 M6 11l6-6 6 6',
    arrowDown: 'M12 5v14 M6 13l6 6 6-6',
    chevronLeft: 'M15 6l-6 6 6 6',
    chevronRight: 'M9 6l6 6-6 6',
    refresh: 'M20 11a8 8 0 1 0-1.6 5.6 M20 5v6h-6',
    filter: 'M3 5h18l-7 8v6l-4-2v-4z',
    gold: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z M12 7v10 M9.5 9.5h5 M9.5 14.5h5',
    wood: 'M12 3v18 M12 9L7 5 M12 13l5-4 M12 17l-5-4',
    sword: 'M14 4h6v6 M20 4L9 15 M5 15l4 4 M4 19l1.5 1.5',
    worker: 'M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M5 21c0-3.3 3.1-5 7-5s7 1.7 7 5 M9 8h6',
    door: 'M5 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17 M5 21h14 M13 12h.01',
    motion: 'M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M5 20l3-5 M19 20l-3-5 M9 15h6',
    clock: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z M12 7v5l3 2',
};

export default function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.7, ...props }) {
    const path = PATHS[name];

    if (!path) {
        return null;
    }

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
            focusable="false"
            {...props}
        >
            {path.split(' M').map((segment, index) => (
                <path key={index} d={index === 0 ? segment : `M${segment}`} />
            ))}
        </svg>
    );
}
