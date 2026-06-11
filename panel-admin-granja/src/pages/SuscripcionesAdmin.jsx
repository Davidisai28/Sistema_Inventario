import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { useToast } from '../hooks/useToast';
import Toast from '../Components/Toast';
import Modal from '../Components/Modal';

const POR_PAGINA = 20;

export default function SuscripcionesAdmin() {
    const [suscripciones, setSuscripciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [diaFiltro, setDiaFiltro] = useState('Todos');
    const [busqueda, setBusqueda] = useState('');
    const { toast, mostrarToast } = useToast();

    const [mostrarModal, setMostrarModal] = useState(false);
    const [listaClientes, setListaClientes] = useState([]);
    const [listaProductos, setListaProductos] = useState([]);
    const [guardando, setGuardando] = useState(false);

    // Clientes rápidos
    const [esNuevoCliente, setEsNuevoCliente] = useState(false);
    const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre_completo: '', telefono: '', direccion_entrega: '' });

    const [formulario, setFormulario] = useState({ cliente_id: '', producto_id: '', cantidad: 1, dia: 'Lunes' });

    // Paginación
    const [pagina, setPagina] = useState(0);
    const [totalSuscripciones, setTotalSuscripciones] = useState(0);

    useEffect(() => {
        cargarSuscripciones();
        cargarCatalogos();
    }, [pagina]);

    const cargarCatalogos = async () => {
        try {
            const [resClientes, resProductos] = await Promise.all([
                supabase.from('clientes').select('id, nombre_completo').order('nombre_completo'),
                supabase.from('productos').select('id, nombre, precio')
            ]);
            if (resClientes.data) setListaClientes(resClientes.data);
            if (resProductos.data) setListaProductos(resProductos.data);
        } catch (error) {
            console.error("Error al cargar catálogos:", error);
        }
    };

    const cargarSuscripciones = async () => {
        try {
            setCargando(true);

            const { count } = await supabase
                .from('suscripciones_semanales')
                .select('*', { count: 'exact', head: true });

            setTotalSuscripciones(count || 0);

            const desde = pagina * POR_PAGINA;
            const hasta = desde + POR_PAGINA - 1;

            const { data, error } = await supabase
                .from('suscripciones_semanales')
                .select(`
                    id_suscripcion, cantidad_paquetes, dia_de_entrega,
                    clientes ( nombre_completo, telefono, direccion_entrega ),
                    productos ( nombre, presentacion, precio )
                `)
                .range(desde, hasta);

            if (error) throw error;
            setSuscripciones(data);
        } catch (error) {
            console.error("Error al cargar:", error.message);
        } finally {
            setCargando(false);
        }
    };

    const crearSuscripcion = async (e) => {
        e.preventDefault();
        try {
            setGuardando(true);
            let idClienteFinal = formulario.cliente_id;

            if (esNuevoCliente) {
                if (!datosNuevoCliente.nombre_completo || !datosNuevoCliente.telefono) {
                    mostrarToast("Faltan el nombre o teléfono del cliente.", "warning");
                    setGuardando(false); return;
                }

                const { data: clienteCreado, error: errorCliente } = await supabase
                    .from('clientes')
                    .insert([datosNuevoCliente])
                    .select()
                    .single();

                if (errorCliente) throw errorCliente;
                idClienteFinal = clienteCreado.id;
            } else if (!idClienteFinal) {
                mostrarToast("Selecciona un cliente de la lista.", "warning");
                setGuardando(false); return;
            }

            if (!formulario.producto_id || formulario.cantidad < 1) {
                mostrarToast("Selecciona un producto y cantidad válida.", "warning");
                setGuardando(false); return;
            }

            const { error: errorSub } = await supabase
                .from('suscripciones_semanales')
                .insert([{
                    cliente_id: idClienteFinal,
                    producto_id: formulario.producto_id,
                    cantidad_paquetes: formulario.cantidad,
                    dia_de_entrega: formulario.dia
                }]);

            if (errorSub) throw errorSub;

            mostrarToast("Registro guardado con éxito");
            setMostrarModal(false);

            setFormulario({ cliente_id: '', producto_id: '', cantidad: 1, dia: 'Lunes' });
            setEsNuevoCliente(false);
            setDatosNuevoCliente({ nombre_completo: '', telefono: '', direccion_entrega: '' });

            cargarCatalogos();
            cargarSuscripciones();
        } catch (error) {
            console.error("Error general:", error.message);
            mostrarToast("Hubo un error al guardar", "error");
        } finally {
            setGuardando(false);
        }
    };

    const cancelarSuscripcion = async (id, clienteNombre) => {
        if (!window.confirm(`¿Deseas dar de baja la suscripción de "${clienteNombre}"?`)) return;
        try {
            const { error } = await supabase.from('suscripciones_semanales').delete().eq('id_suscripcion', id);
            if (error) throw error;
            mostrarToast("Suscripción cancelada");
            cargarSuscripciones();
        } catch (error) {
            mostrarToast("No se pudo dar de baja", "error");
        }
    };

    const suscripcionesFiltradas = suscripciones.filter(sub => {
        const matchDia = diaFiltro === 'Todos' ? true : sub.dia_de_entrega === diaFiltro;
        if (!busqueda) return matchDia;
        const term = busqueda.toLowerCase();
        return matchDia && (
            sub.clientes?.nombre_completo?.toLowerCase().includes(term) ||
            sub.productos?.nombre?.toLowerCase().includes(term)
        );
    });

    const stats = useMemo(() => {
        const total = suscripciones.length;
        const ingresoEstimado = suscripciones.reduce((sum, s) => sum + (s.cantidad_paquetes * (s.productos?.precio || 0)), 0);
        let valorFormateado = ingresoEstimado >= 1000 ? `$${(ingresoEstimado / 1000).toFixed(1)}k` : `$${ingresoEstimado.toFixed(0)}`;
        const diasUnicos = [...new Set(suscripciones.map(s => s.dia_de_entrega))].length;
        return { total, valorFormateado, diasUnicos, ingresoEstimado };
    }, [suscripciones]);

    const getDiaBadgeStyle = (dia) => {
        const dias = { 
            'Lunes': { bg: 'var(--color-chart-1)', color: 'white', rawBg: 'oklch(0.7 0.17 70)' }, 
            'Martes': { bg: 'var(--color-chart-2)', color: 'white', rawBg: 'oklch(0.55 0.17 45)' }, 
            'Miércoles': { bg: 'var(--color-success)', color: 'var(--color-success-foreground)', rawBg: 'oklch(0.62 0.14 145)' }, 
            'Jueves': { bg: 'var(--color-warning)', color: 'var(--color-warning-foreground)', rawBg: 'oklch(0.78 0.15 75)' }, 
            'Viernes': { bg: 'var(--color-destructive)', color: 'var(--color-destructive-foreground)', rawBg: 'oklch(0.58 0.22 27)' }, 
            'Sábado': { bg: 'var(--color-chart-5)', color: 'white', rawBg: 'oklch(0.6 0.18 25)' }, 
            'Domingo': { bg: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)', rawBg: 'oklch(0.94 0.04 80)' } 
        };
        return dias[dia] || { bg: 'var(--color-muted)', color: 'var(--color-muted-foreground)', rawBg: 'oklch(0.95 0.02 80)' };
    };

    const totalPaginas = Math.ceil(totalSuscripciones / POR_PAGINA);

    return (
        <>
            {/* ── HEADER ── */}
            <div className="panel-header">
                <div>
                    <h1 className="panel-title">Suscripciones Semanales</h1>
                    <p className="panel-subtitle">Gestiona los clientes fijos y sus entregas programadas</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setPagina(0); cargarSuscripciones(); }} className="panel-filter-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        <span className="panel-add-btn-label">Actualizar</span>
                    </button>
                    <button onClick={() => setMostrarModal(true)} className="panel-add-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span className="panel-add-btn-label">Nueva Suscripción</span>
                    </button>
                </div>
            </div>

            {/* ── STATS CARDS ── */}
            <div className="panel-section panel-section--kpis">
                <div className="panel-kpi-grid">
                    <div className="panel-kpi">
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Total Suscripciones</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <div className="panel-kpi-value">{stats.total}</div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: '100%' }} /></div>
                    </div>
                    <div className="panel-kpi">
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Días Activos</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </div>
                        <div className="panel-kpi-value">{stats.diasUnicos}</div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: `${(stats.diasUnicos / 7) * 100}%` }} /></div>
                    </div>
                    <div 
                        className="panel-kpi"
                        title={`Valor exacto: $${stats.ingresoEstimado?.toLocaleString('es-MX')}`}
                        style={{ cursor: 'help' }}
                    >
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Ingreso Semanal</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        <div className="panel-kpi-value">{stats.valorFormateado}</div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: '80%' }} /></div>
                    </div>
                </div>
            </div>

            {/* ── SEARCH BAR ── */}
            <div className="panel-section panel-section--search" style={{ flexWrap: 'wrap' }}>
                <div className="panel-search">
                    <svg className="panel-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                        type="text"
                        className="panel-search-input"
                        placeholder="Buscar por cliente o producto..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <div className="panel-scroll-row">
                    {['Todos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia) => (
                        <button
                            key={dia}
                            onClick={() => setDiaFiltro(dia)}
                            className="panel-filter-btn"
                            style={{ 
                                backgroundColor: diaFiltro === dia ? 'var(--color-primary)' : '', 
                                color: diaFiltro === dia ? 'var(--color-primary-foreground)' : '',
                                flexShrink: 0
                            }}
                        >
                            {dia}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── SUBSCRIPTION LIST ── */}
            <div className="panel-section panel-section--list">
                {cargando ? (
                    <div className="panel-empty"><p>Cargando suscripciones...</p></div>
                ) : suscripcionesFiltradas.length === 0 ? (
                    <div className="panel-empty" style={{ padding: '40px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-muted-foreground)' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </div>
                        <p>No se encontraron suscripciones.</p>
                    </div>
                ) : (
                    suscripcionesFiltradas.map((sub) => {
                        const badgeEstilo = getDiaBadgeStyle(sub.dia_de_entrega);
                        const totalEstimado = sub.cantidad_paquetes * (sub.productos?.precio || 0);
                        return (
                            <div className="panel-product" key={sub.id_suscripcion}>
                                {/* Avatar */}
                                <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-muted-foreground)', fontWeight: 800, fontSize: '18px', border: '1px solid var(--color-border)' }}>
                                    {(sub.clientes?.nombre_completo || 'D')[0].toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="panel-product-body">
                                    <div className="panel-product-head">
                                        <div className="panel-product-info">
                                            <div className="panel-product-name">{sub.clientes?.nombre_completo || 'Desconocido'}</div>
                                            <div className="panel-product-desc" style={{ maxWidth: 'none' }}>
                                                {sub.clientes?.direccion_entrega || 'Entrega en Granja'}
                                                {sub.clientes?.telefono && ` · ${sub.clientes.telefono}`}
                                            </div>
                                        </div>
                                        <div className="panel-product-price">${totalEstimado.toFixed(0)}</div>
                                    </div>
                                    <div className="panel-product-tags">
                                        <span className="panel-tag" style={{ backgroundColor: badgeEstilo.bg, color: badgeEstilo.color }}>{sub.dia_de_entrega}</span>
                                        <span className="panel-tag panel-tag--neutral" style={{ border: '1px solid var(--color-border)' }}>{sub.cantidad_paquetes}x {sub.productos?.nombre || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="panel-actions" style={{ alignSelf: 'center', marginLeft: 'auto' }}>
                                    <button className="panel-action-btn panel-action-btn--warn panel-action-btn--delete" title="Dar de baja" onClick={() => cancelarSuscripcion(sub.id_suscripcion, sub.clientes?.nombre_completo)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* PAGINACIÓN */}
            {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', paddingBottom: '2rem' }}>
                    <button className="panel-filter-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Anterior
                    </button>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Página {pagina + 1} de {totalPaginas}</span>
                    <button className="panel-filter-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => p + 1)}>
                        Siguiente <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
            )}

            {/* MODAL */}
            <Modal isOpen={mostrarModal} onClose={() => setMostrarModal(false)} title="Agregar Nueva Suscripción" maxWidth="500px">
                <form onSubmit={crearSuscripcion} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {/* SECCIÓN INTELIGENTE DE CLIENTE */}
                    <div style={{ background: 'var(--color-muted)', padding: '15px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-foreground)' }}>Datos del Cliente</label>
                            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={esNuevoCliente} onChange={(e) => setEsNuevoCliente(e.target.checked)} />
                                + Registrar cliente nuevo
                            </label>
                        </div>

                        {!esNuevoCliente ? (
                            <select className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} value={formulario.cliente_id} onChange={(e) => setFormulario({ ...formulario, cliente_id: e.target.value })}>
                                <option value="">-- Selecciona un cliente registrado --</option>
                                {listaClientes.map(c => (<option key={c.id} value={c.id}>{c.nombre_completo}</option>))}
                            </select>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input type="text" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} placeholder="Nombre completo *" required value={datosNuevoCliente.nombre_completo} onChange={(e) => setDatosNuevoCliente({ ...datosNuevoCliente, nombre_completo: e.target.value })} />
                                <input type="tel" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} placeholder="Teléfono *" required value={datosNuevoCliente.telefono} onChange={(e) => setDatosNuevoCliente({ ...datosNuevoCliente, telefono: e.target.value })} />
                                <input type="text" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} placeholder="Dirección de entrega" value={datosNuevoCliente.direccion_entrega} onChange={(e) => setDatosNuevoCliente({ ...datosNuevoCliente, direccion_entrega: e.target.value })} />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Seleccionar Producto</label>
                        <select className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} required value={formulario.producto_id} onChange={(e) => setFormulario({ ...formulario, producto_id: e.target.value })}>
                            <option value="">-- ¿Qué producto recibirá? --</option>
                            {listaProductos.map(p => (<option key={p.id} value={p.id}>{p.nombre} (${p.precio})</option>))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cant. de Paquetes</label>
                            <input type="number" min="1" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} required value={formulario.cantidad} onChange={(e) => setFormulario({ ...formulario, cantidad: parseInt(e.target.value, 10) || 1 })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Día de Entrega</label>
                            <select className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} required value={formulario.dia} onChange={(e) => setFormulario({ ...formulario, dia: e.target.value })}>
                                <option value="Lunes">Lunes</option><option value="Martes">Martes</option><option value="Miércoles">Miércoles</option><option value="Jueves">Jueves</option><option value="Viernes">Viernes</option><option value="Sábado">Sábado</option><option value="Domingo">Domingo</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                        <button type="button" onClick={() => setMostrarModal(false)} className="panel-filter-btn" style={{ height: '2.5rem' }}>Cancelar</button>
                        <button type="submit" disabled={guardando} className="panel-add-btn" style={{ height: '2.5rem', background: 'var(--color-success)', color: 'var(--color-success-foreground)' }}>{guardando ? 'Guardando...' : 'Guardar Suscripción'}</button>
                    </div>
                </form>
            </Modal>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </>
    );
}