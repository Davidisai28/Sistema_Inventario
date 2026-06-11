import { useState, useMemo } from 'react';
import { supabase } from '../config/supabase';

// Reglas de complejidad para contraseñas seguras
const REGLAS_PASSWORD = [
    { id: 'longitud', test: (p) => p.length >= 8, texto: 'Al menos 8 caracteres' },
    { id: 'mayuscula', test: (p) => /[A-Z]/.test(p), texto: 'Al menos una letra mayúscula' },
    { id: 'minuscula', test: (p) => /[a-z]/.test(p), texto: 'Al menos una letra minúscula' },
    { id: 'numero', test: (p) => /[0-9]/.test(p), texto: 'Al menos un número' },
    { id: 'especial', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p), texto: 'Al menos un carácter especial (!@#$...)' },
];

export default function ModalSeguridad({ ordenarCierre }) {
    const [passwordActual, setPasswordActual] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');

    const [verActual, setVerActual] = useState(false);
    const [verNueva, setVerNueva] = useState(false);
    const [verConfirmacion, setVerConfirmacion] = useState(false);

    const [actualizando, setActualizando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    // Evaluar reglas de complejidad en tiempo real
    const validacionPassword = useMemo(() => {
        return REGLAS_PASSWORD.map((regla) => ({
            ...regla,
            cumplida: regla.test(nuevaPassword),
        }));
    }, [nuevaPassword]);

    const todasCumplidas = validacionPassword.every((r) => r.cumplida);
    const coinciden = nuevaPassword === confirmarPassword && confirmarPassword.length > 0;

    const cambiarContrasena = async (e) => {
        e.preventDefault();
        setMensaje({ tipo: '', texto: '' });

        // Validar contraseña actual
        if (!passwordActual) {
            setMensaje({ tipo: 'error', texto: 'Debes ingresar tu contraseña actual.' });
            return;
        }

        // Validar complejidad
        if (!todasCumplidas) {
            setMensaje({ tipo: 'error', texto: 'La nueva contraseña no cumple todos los requisitos de seguridad.' });
            return;
        }

        // Validar coincidencia
        if (!coinciden) {
            setMensaje({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
            return;
        }

        // Validar que no sea igual a la actual
        if (nuevaPassword === passwordActual) {
            setMensaje({ tipo: 'error', texto: 'La nueva contraseña debe ser diferente a la actual.' });
            return;
        }

        try {
            setActualizando(true);

            // Obtener usuario autenticado
            const { data: { user }, error: errorUser } = await supabase.auth.getUser();
            if (errorUser || !user) {
                setMensaje({ tipo: 'error', texto: 'Sesión expirada. Cierra sesión y vuelve a iniciar.' });
                setActualizando(false);
                return;
            }

            // Verificar contraseña actual re-autenticándose
            const { error: errorVerificacion } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordActual,
            });

            if (errorVerificacion) {
                setMensaje({ tipo: 'error', texto: 'La contraseña actual es incorrecta.' });
                setActualizando(false);
                return;
            }

            // Actualizar contraseña
            const { error: errorActualizacion } = await supabase.auth.updateUser({
                password: nuevaPassword
            });

            if (errorActualizacion) {
                setMensaje({ tipo: 'error', texto: 'No se pudo actualizar la contraseña. Intenta de nuevo.' });
                setActualizando(false);
                return;
            }

            setMensaje({ tipo: 'exito', texto: 'Contraseña actualizada con éxito' });

            // Limpiar campos
            setPasswordActual('');
            setNuevaPassword('');
            setConfirmarPassword('');

            setTimeout(() => ordenarCierre(), 2000);

        } catch (error) {
            console.error("Error al actualizar contraseña.");
            setMensaje({ tipo: 'error', texto: 'Ocurrió un error inesperado. Intenta de nuevo.' });
        } finally {
            setActualizando(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 2000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontFamily: 'sans-serif'
        }}>
            {/* BLOQUE CSS PARA ELIMINAR EL OJITO DEL NAVEGADOR (EDGE/CHROME) */}
            <style>{`
                input[type="password"]::-ms-reveal,
                input[type="password"]::-ms-clear,
                input[type="password"]::-webkit-credentials-auto-fill-button {
                    display: none !important;
                }
            `}</style>

            <div style={{
                background: 'white', padding: '30px', borderRadius: '12px',
                width: '90%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#111827', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Seguridad de la Cuenta
                </h3>

                <form onSubmit={cambiarContrasena} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {/* CONTRASEÑA ACTUAL */}
                    <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#374151', marginBottom: '5px' }}>
                            Contraseña Actual
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={verActual ? "text" : "password"}
                                required
                                placeholder="Tu contraseña actual"
                                autoComplete="current-password"
                                style={{ width: '100%', padding: '10px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }}
                                value={passwordActual}
                                onChange={(e) => setPasswordActual(e.target.value)}
                            />
                            <button type="button" onClick={() => setVerActual(!verActual)} style={{ position: 'absolute', right: '10px', top: '8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                                {verActual ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                            </button>
                        </div>
                    </div>

                    {/* NUEVA CONTRASEÑA */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px' }}>
                            Nueva Contraseña
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={verNueva ? "text" : "password"}
                                required
                                placeholder="Mínimo 8 caracteres"
                                autoComplete="new-password"
                                style={{ width: '100%', padding: '10px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }}
                                value={nuevaPassword}
                                onChange={(e) => setNuevaPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setVerNueva(!verNueva)} style={{ position: 'absolute', right: '10px', top: '8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                                {verNueva ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                            </button>
                        </div>

                        {/* INDICADOR DE COMPLEJIDAD EN TIEMPO REAL */}
                        {nuevaPassword.length > 0 && (
                            <div style={{ marginTop: '10px', padding: '10px', borderRadius: '6px', background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', fontWeight: '600', color: '#4b5563' }}>
                                    Requisitos de seguridad:
                                </p>
                                {validacionPassword.map((regla) => (
                                    <div key={regla.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        fontSize: '0.78rem', color: regla.cumplida ? '#16a34a' : '#9ca3af',
                                        marginBottom: '3px',
                                        transition: 'color 0.2s ease'
                                    }}>
                                        <span>{regla.cumplida ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>}</span>
                                        <span style={{ textDecoration: regla.cumplida ? 'line-through' : 'none' }}>
                                            {regla.texto}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* CONFIRMAR CONTRASEÑA */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px' }}>
                            Confirmar Nueva Contraseña
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={verConfirmacion ? "text" : "password"}
                                required
                                placeholder="Repite la nueva contraseña"
                                autoComplete="new-password"
                                style={{ width: '100%', padding: '10px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }}
                                value={confirmarPassword}
                                onChange={(e) => setConfirmarPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setVerConfirmacion(!verConfirmacion)} style={{ position: 'absolute', right: '10px', top: '8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                                {verConfirmacion ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                            </button>
                        </div>

                        {/* INDICADOR DE COINCIDENCIA */}
                        {confirmarPassword.length > 0 && (
                            <p style={{
                                margin: '6px 0 0 0', fontSize: '0.78rem', fontWeight: '600',
                                color: coinciden ? '#16a34a' : '#dc2626'
                            }}>
                                {coinciden ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Las contraseñas coinciden</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Las contraseñas no coinciden</span>}
                            </p>
                        )}
                    </div>

                    {/* MENSAJES DE RESULTADO */}
                    {mensaje.texto && (
                        <div style={{
                            padding: '10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600',
                            backgroundColor: mensaje.tipo === 'error' ? '#fee2e2' : '#f0fdf4',
                            color: mensaje.tipo === 'error' ? '#dc2626' : '#166534',
                            border: mensaje.tipo === 'error' ? '1px solid #fca5a5' : '1px solid #bbf7d0'
                        }}>
                            {mensaje.texto}
                        </div>
                    )}

                    {/* BOTONES */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
                        <button type="button" onClick={ordenarCierre} style={{ padding: '8px 15px', background: 'white', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={actualizando || !todasCumplidas || !coinciden}
                            style={{
                                padding: '8px 20px',
                                background: (todasCumplidas && coinciden) ? '#2563eb' : '#93c5fd',
                                color: 'white', border: 'none', borderRadius: '6px',
                                cursor: (todasCumplidas && coinciden) ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold',
                                transition: 'background 0.2s ease'
                            }}
                        >
                            {actualizando ? 'Verificando...' : 'Actualizar y Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}