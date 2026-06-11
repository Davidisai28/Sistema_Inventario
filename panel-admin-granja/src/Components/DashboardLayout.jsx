import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabase';
import ModalSeguridad from "../pages/ModalSeguridad";

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const [verSeguridad, setVerSeguridad] = useState(false);
    const [cargandoAuth, setCargandoAuth] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved) return saved === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    // AUTH GUARD: Verificar sesión activa al montar
    useEffect(() => {
        const verificarSesion = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/admin/login', { replace: true });
            }
            setCargandoAuth(false);
        };

        verificarSesion();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                navigate('/admin/login', { replace: true });
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    // Cerrar sidebar al cambiar de ruta (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // INACTIVITY AUTO-LOGOUT (1 minute for testing)
    useEffect(() => {
        let timeoutId;

        const resetTimer = () => {
            clearTimeout(timeoutId);
            // 1 minuto de inactividad = 60,000 ms
            timeoutId = setTimeout(() => {
                alert('Tu sesión ha expirado por seguridad debido a 1 minuto de inactividad. Serás redirigido al inicio de sesión.');
                cerrarSesion();
            }, 60000);
        };

        // Iniciar el temporizador la primera vez
        resetTimer();

        // Eventos que se consideran "actividad"
        const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        // Limpieza de eventos y temporizador al desmontar
        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cerrarSesion = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login', { replace: true });
    };

    const navItems = [
        { to: '/admin/inventario', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>, label: 'Inventario' },
        { to: '/admin/pedidos', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>, label: 'Pedidos' },
        { to: '/admin/suscripciones', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>, label: 'Suscripciones' },
        { to: '/admin/produccion', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>, label: 'Producción Diaria' },
    ];

    if (cargandoAuth) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: '100vh', fontFamily: 'sans-serif', color: 'var(--color-muted-foreground)'
            }}>
                <p>Verificando sesión...</p>
            </div>
        );
    }

    return (
        <div className="panel-root">

            {/* SIDEBAR */}
            <aside className="panel-sidebar">
                <div className="panel-sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img src="/logo.png" alt="Logo Buena Yema" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                    </div>
                    <div>
                        <h2 className="panel-sidebar-title">BUENA YEMA</h2>
                        <p className="panel-sidebar-subtitle">Panel de Control</p>
                    </div>
                </div>

                <nav className="panel-sidebar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`panel-nav-item ${location.pathname === item.to ? 'is-active' : ''}`}
                        >
                            <span className="panel-nav-icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="panel-sidebar-footer">
                    <button onClick={toggleTheme} className="panel-footer-btn panel-footer-btn--neutral">
                        {isDarkMode ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                        ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                        )}
                        {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
                    </button>

                    <button
                        onClick={() => setVerSeguridad(true)}
                        className="panel-footer-btn panel-footer-btn--neutral"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                        Seguridad
                    </button>

                    <button onClick={cerrarSesion} className="panel-footer-btn panel-footer-btn--danger">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* RENDERIZADO DEL MODAL */}
            {verSeguridad && (
                <ModalSeguridad ordenarCierre={() => setVerSeguridad(false)} />
            )}

            {/* CONTENIDO PRINCIPAL */}
            <main className="panel-main">
                <Outlet />
            </main>

        </div>
    );
}