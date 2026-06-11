import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { useToast } from '../hooks/useToast';
import Toast from '../Components/Toast';

const POR_PAGINA = 20;

export default function PedidosAdmin() {
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState('activos');
    const [actualizandoId, setActualizandoId] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const { toast, mostrarToast } = useToast();

    // Paginación
    const [pagina, setPagina] = useState(0);
    const [totalPedidos, setTotalPedidos] = useState(0);

    useEffect(() => {
        cargarPedidos();
    }, [pagina]);

    const cargarPedidos = async () => {
        try {
            setCargando(true);

            const { count } = await supabase
                .from('pedidos')
                .select('*', { count: 'exact', head: true });

            setTotalPedidos(count || 0);

            const desde = pagina * POR_PAGINA;
            const hasta = desde + POR_PAGINA - 1;

            const { data, error } = await supabase
                .from('pedidos')
                .select(`
                    id,
                    codigo_orden,
                    estado,
                    total,
                    creado_en,
                    clientes ( nombre_completo, telefono ),
                    detalles_pedido (
                        cantidad,
                        precio_unitario,
                        productos ( nombre )
                    )
                `)
                .order('id', { ascending: false })
                .range(desde, hasta);

            if (error) throw error;
            setPedidos(data);
        } catch (error) {
            console.error("Error al cargar pedidos:", error.message);
            mostrarToast("Error al cargar pedidos", "error");
        } finally {
            setCargando(false);
        }
    };

    const cambiarEstadoPedido = async (id, nuevoEstado) => {
        if (nuevoEstado === 'cancelado') {
            if (!window.confirm('¿Estás seguro de que deseas cancelar esta orden? Esta acción no se puede deshacer.')) {
                return;
            }
        }

        try {
            setActualizandoId(id);

            const { error } = await supabase
                .from('pedidos')
                .update({ estado: nuevoEstado })
                .eq('id', id);

            if (error) throw error;

            mostrarToast(`Orden actualizada a ${nuevoEstado.toUpperCase()}`);
            cargarPedidos();
        } catch (error) {
            console.error("Error al actualizar:", error.message);
            mostrarToast("No se pudo actualizar el estado", "error");
        } finally {
            setActualizandoId(null);
        }
    };

    const pedidosFiltrados = pedidos.filter(pedido => {
        const matchFiltro = filtro === 'activos'
            ? ['pendiente', 'confirmado', 'en_camino'].includes(pedido.estado)
            : ['entregado', 'cancelado'].includes(pedido.estado);

        if (!busqueda) return matchFiltro;

        const term = busqueda.toLowerCase();
        return matchFiltro && (
            pedido.codigo_orden?.toLowerCase().includes(term) ||
            pedido.clientes?.nombre_completo?.toLowerCase().includes(term)
        );
    });

    const stats = useMemo(() => {
        const activos = pedidos.filter(p => ['pendiente', 'confirmado', 'en_camino'].includes(p.estado)).length;
        const valorTotal = pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
        let valorFormateado = valorTotal >= 1000 ? `$${(valorTotal / 1000).toFixed(1)}k` : `$${valorTotal.toFixed(0)}`;
        return { total: pedidos.length, activos, valorFormateado, valorTotal };
    }, [pedidos]);

    const getBadgeStyle = (estado) => {
        const estilos = {
            'pendiente': { bg: 'var(--color-warning)', color: 'var(--color-warning-foreground)', rawBg: 'oklch(0.78 0.15 75)' },
            'confirmado': { bg: 'var(--color-primary)', color: 'var(--color-primary-foreground)', rawBg: 'oklch(0.55 0.17 45)' },
            'en_camino': { bg: 'var(--color-chart-4)', color: 'white', rawBg: 'oklch(0.65 0.12 200)' },
            'entregado': { bg: 'var(--color-success)', color: 'var(--color-success-foreground)', rawBg: 'oklch(0.62 0.14 145)' },
            'cancelado': { bg: 'var(--color-destructive)', color: 'var(--color-destructive-foreground)', rawBg: 'oklch(0.58 0.22 27)' }
        };
        return estilos[estado] || { bg: 'var(--color-muted)', color: 'var(--color-muted-foreground)', rawBg: 'oklch(0.95 0.02 80)' };
    };

    const totalPaginas = Math.ceil(totalPedidos / POR_PAGINA);

    return (
        <>
            {/* ── HEADER ── */}
            <div className="panel-header">
                <div>
                    <h1 className="panel-title">Gestión de Pedidos</h1>
                    <p className="panel-subtitle">Monitorea y despacha las órdenes de la granja en tiempo real</p>
                </div>
                <button onClick={() => { setPagina(0); cargarPedidos(); }} className="panel-filter-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    Actualizar
                </button>
            </div>

            {/* ── STATS CARDS ── */}
            <div className="panel-section panel-section--kpis">
                <div className="panel-kpi-grid">
                    <div className="panel-kpi">
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Total Pedidos</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        </div>
                        <div className="panel-kpi-value">{stats.total}</div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: '100%' }} /></div>
                    </div>
                    <div className={`panel-kpi ${stats.activos > 0 ? 'panel-kpi--warn' : ''}`}>
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Activos</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div className="panel-kpi-value">{stats.activos}</div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: stats.activos > 0 ? '100%' : '0%' }} /></div>
                    </div>
                    <div 
                        className="panel-kpi"
                        title={`Valor exacto: $${stats.valorTotal?.toLocaleString('es-MX')}`}
                        style={{ cursor: 'help' }}
                    >
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Valor Total</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        <div className="panel-kpi-value">{stats.valorFormateado}</div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: '80%' }} /></div>
                    </div>
                </div>
            </div>

            {/* ── SEARCH BAR ── */}
            <div className="panel-section panel-section--search">
                <div className="panel-search">
                    <svg className="panel-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                        type="text"
                        className="panel-search-input"
                        placeholder="Buscar por código o cliente..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button 
                        className="panel-filter-btn" 
                        style={{ backgroundColor: filtro === 'activos' ? 'var(--color-primary)' : '', color: filtro === 'activos' ? 'var(--color-primary-foreground)' : '' }}
                        onClick={() => setFiltro('activos')}
                    >
                        ACTIVOS
                    </button>
                    <button 
                        className="panel-filter-btn" 
                        style={{ backgroundColor: filtro === 'historial' ? 'var(--color-primary)' : '', color: filtro === 'historial' ? 'var(--color-primary-foreground)' : '' }}
                        onClick={() => setFiltro('historial')}
                    >
                        HISTORIAL
                    </button>
                </div>
            </div>

            {/* ── ORDER LIST ── */}
            <div className="panel-section panel-section--list">
                {cargando ? (
                    <div className="panel-empty">
                        <p>Cargando pedidos...</p>
                    </div>
                ) : pedidosFiltrados.length === 0 ? (
                    <div className="panel-empty" style={{ padding: '40px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-muted-foreground)' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        </div>
                        <p>No hay pedidos en esta sección por el momento.</p>
                    </div>
                ) : (
                    pedidosFiltrados.map((pedido) => {
                        const fecha = new Date(pedido.creado_en).toLocaleString('es-MX', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        });
                        const estiloBadge = getBadgeStyle(pedido.estado);
                        const estaActualizando = actualizandoId === pedido.id;

                        return (
                            <div className="panel-product" key={pedido.id} style={{ flexWrap: 'wrap' }}>
                                {/* Icon */}
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${estiloBadge.rawBg} / 15%`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={estiloBadge.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                                </div>

                                {/* Info */}
                                <div className="panel-product-body">
                                    <div className="panel-product-head" style={{ alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                                        <div className="panel-product-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <div className="panel-product-name">{pedido.codigo_orden}</div>
                                            <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', backgroundColor: estiloBadge.bg, color: estiloBadge.color, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                                                {pedido.estado.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="panel-product-desc" style={{ maxWidth: 'none', marginTop: '0.25rem' }}>
                                        {pedido.clientes?.nombre_completo || 'Cliente Eliminado'}
                                        {pedido.clientes?.telefono && ` · ${pedido.clientes.telefono}`}
                                    </div>
                                    <div className="panel-product-tags">
                                        <span className="panel-tag panel-tag--neutral" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            {fecha}
                                        </span>
                                        {pedido.detalles_pedido.map((item, i) => (
                                            <span className="panel-tag" style={{ border: '1px solid var(--color-border)' }} key={i}>{item.cantidad}x {item.productos?.nombre || 'N/A'}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="panel-product-price" style={{ alignSelf: 'center', marginLeft: 'auto', marginRight: '1rem' }}>${parseFloat(pedido.total).toFixed(0)}</div>

                                {/* Actions */}
                                <div className="panel-actions" style={{ flexWrap: 'wrap', gap: '6px', alignSelf: 'center' }}>
                                    {pedido.estado === 'pendiente' && (
                                        <>
                                            <button className="panel-action-btn panel-action-btn--warn panel-action-btn--delete" title="Cancelar" disabled={estaActualizando} onClick={() => cambiarEstadoPedido(pedido.id, 'cancelado')}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            </button>
                                            <button className="panel-action-btn" title="Confirmar" disabled={estaActualizando} onClick={() => cambiarEstadoPedido(pedido.id, 'confirmado')} style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            </button>
                                        </>
                                    )}
                                    {pedido.estado === 'confirmado' && (
                                        <button className="panel-action-btn" title="Enviar" disabled={estaActualizando} onClick={() => cambiarEstadoPedido(pedido.id, 'en_camino')} style={{ borderColor: 'var(--color-chart-4)', color: 'var(--color-chart-4)' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                                        </button>
                                    )}
                                    {pedido.estado === 'en_camino' && (
                                        <button className="panel-action-btn" title="Entregado" disabled={estaActualizando} onClick={() => cambiarEstadoPedido(pedido.id, 'entregado')} style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                                        </button>
                                    )}
                                    {['entregado', 'cancelado'].includes(pedido.estado) && (
                                        <span style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', fontStyle: 'italic', padding: '0 0.5rem' }}>Archivado</span>
                                    )}
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

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </>
    );
}