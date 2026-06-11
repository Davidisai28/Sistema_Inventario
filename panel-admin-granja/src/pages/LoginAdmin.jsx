import { useState } from 'react';
import { supabase } from '../config/supabase';
import { useNavigate } from 'react-router-dom';
import '../login-theme.css';
export default function LoginAdmin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [verPassword, setVerPassword] = useState(false);
    const [recordarme, setRecordarme] = useState(false);


    const manejarLogin = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (authError) {
                if (authError.message.includes('Invalid login credentials')) {
                    throw new Error('Correo o contraseña incorrectos.');
                }
                throw new Error('Error al iniciar sesión. Intenta de nuevo.');
            }

            if (!data?.session) {
                throw new Error('No se pudo crear la sesión. Intenta de nuevo.');
            }
            // Guardar o borrar el correo en el navegador
            if (recordarme) {
                localStorage.setItem('granja_admin_email', email.trim());
            } else {
                localStorage.removeItem('granja_admin_email');
            }
            navigate('/admin/inventario');
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const loginRapido = (correo) => {
        setEmail(correo);
        document.getElementById('login-password')?.focus();
    };

    return (
        <div className="login-wrapper">

            {/* ════════════ PANEL IZQUIERDO ════════════ */}
            <div className="login-left login-gradient">
                {/* Blobs decorativos */}
                <div className="login-blob login-blob--top-left" />
                <div className="login-blob login-blob--center-right" />
                <div className="login-blob login-blob--bottom-right" />

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="/logo.png" alt="Logo Buena Yema" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.3px' }}>BUENA YEMA</span>
                </div>

                {/* Centro — Ilustración */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, flex: 1, justifyContent: 'center' }}>
                    <div style={{ position: 'relative', marginBottom: '2rem', width: '280px', height: '280px' }}>
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/logo.png" alt="Logo Central Buena Yema" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1) drop-shadow(0 6px 16px rgba(0,0,0,0.25))' }} />
                        </div>
                        {/* Badge sol */}
                        <div className="login-badge login-badge--sun">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                        </div>
                        {/* Badge planta */}
                        <div className="login-badge login-badge--wheat">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V8" /><path d="M5 12H2a10 10 0 0 0 10 10" /><path d="M19 12h3a10 10 0 0 1-10 10" /><path d="m5 12 7-4 7 4" /><path d="m5 16 7-4 7 4" /></svg>
                        </div>
                    </div>

                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem', textAlign: 'center' }}>
                        Bienvenido de vuelta
                    </h1>
                    <p style={{ fontSize: '0.9rem', opacity: 0.8, maxWidth: '320px', textAlign: 'center', lineHeight: 1.5 }}>
                        Gestiona tu producción diaria, inventario y pedidos desde un solo lugar.
                    </p>

                    {/* Stats */}
                    <div className="login-stats">
                        <div>
                            <div className="login-stat-value">2,450</div>
                            <div className="login-stat-label">Huevos Hoy</div>
                        </div>
                        <div className="login-stat-divider" />
                        <div>
                            <div className="login-stat-value">4</div>
                            <div className="login-stat-label">Galpones</div>
                        </div>
                        <div className="login-stat-divider" />
                        <div>
                            <div className="login-stat-value">98%</div>
                            <div className="login-stat-label">Calidad</div>
                        </div>
                    </div>
                </div>

                {/* Footer izquierdo */}
                <p style={{ fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic', position: 'relative', zIndex: 1 }}>
                    "De la granja a tu mesa, con amor y dedicación."
                </p>
            </div>

            {/* ════════════ PANEL DERECHO ════════════ */}
            <div className="login-right">
                {/* Glows decorativos */}
                <div className="login-form-glow-top" />
                <div className="login-form-glow-bottom" />

                <div className="login-form-container">
                    <h2>Iniciar Sesión</h2>
                    <p className="login-subtitle">Ingresa tus credenciales para acceder al panel</p>

                    {error && (
                        <div className="login-error">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={manejarLogin}>
                        {/* Email */}
                        <div className="login-field">
                            <label htmlFor="login-email">Correo electrónico</label>
                            <span className="login-field-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                            </span>
                            <input
                                id="login-email"
                                type="email"
                                className="login-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@granja.com"
                                autoComplete="email"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="login-field">
                            <label htmlFor="login-password">Contraseña</label>
                            <span className="login-field-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            </span>
                            <input
                                id="login-password"
                                type={verPassword ? 'text' : 'password'}
                                className="login-input login-input--password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="login-toggle-password"
                                onClick={() => setVerPassword(!verPassword)}
                                tabIndex={-1}
                            >
                                {verPassword
                                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                }
                            </button>
                        </div>

                        {/* Options row */}
                        <div className="login-options-row">
                            <label className="login-remember">
                                <input
                                    type="checkbox"
                                    checked={recordarme}
                                    onChange={(e) => setRecordarme(e.target.checked)}
                                />
                                Recordarme
                            </label>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={cargando} className="login-submit">
                            {cargando
                                ? <span className="login-spinner" />
                                : <>
                                    Entrar al Panel
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                                </>
                            }
                        </button>
                    </form>

                    <div style={{ marginTop: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Enlace a la página pública (Abre en pestaña nueva) */}
                        <a
                            href="/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: 'var(--text-muted)',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontWeight: '500',
                                transition: 'color 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.color = 'var(--primary)'}
                            onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
                        >
                            {/* Ícono de enlace externo (cuadrito con flecha hacia afuera) */}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            Visitar sitio web principal
                        </a>

                        {/* Footer de Copyright */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.7, borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            &copy; {new Date().getFullYear()} Sistema de Gestión de Granja. <br />
                            Uso exclusivo para personal autorizado.
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
