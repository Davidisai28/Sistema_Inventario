import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { useToast } from '../hooks/useToast';
import Toast from '../Components/Toast';
import Modal from '../Components/Modal';

const FORMULARIO_VACIO = {
    nombre: '',
    tipoHuevo: 'Café',
    presentacion: 30,
    precio: '',
    stock: '',
    imagenUrl: '',
    descripcion: ''
};

export default function InventarioAdmin() {
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroStockBajo, setFiltroStockBajo] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toast, mostrarToast } = useToast();

    // Formulario consolidado en un solo estado
    const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
    const [idEditando, setIdEditando] = useState(null);
    const [eliminandoId, setEliminandoId] = useState(null);

    const actualizarCampo = (campo, valor) => {
        setFormulario(prev => ({ ...prev, [campo]: valor }));
    };

    useEffect(() => {
        cargarInventario();
    }, []);

    const cargarInventario = async () => {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            setProductos(data);
        } catch (error) {
            console.error("Error al cargar:", error.message);
            mostrarToast("Error al cargar los datos", "error");
        } finally {
            setCargando(false);
        }
    };

    const guardarProducto = async (e) => {
        e.preventDefault();

        const datosProducto = {
            nombre: formulario.nombre,
            tipo_huevo: formulario.tipoHuevo,
            presentacion: parseInt(formulario.presentacion, 10),
            precio: parseFloat(formulario.precio),
            stock_disponible: parseInt(formulario.stock, 10),
            codigo_familia: `FAM-${formulario.tipoHuevo.toUpperCase()}`,
            imagen_url: formulario.imagenUrl,
            descripcion: formulario.descripcion
        };

        try {
            if (idEditando) {
                const { error } = await supabase.from('productos').update(datosProducto).eq('id', idEditando);
                if (error) throw error;
                mostrarToast("Producto actualizado correctamente");
            } else {
                const { error } = await supabase.from('productos').insert([datosProducto]);
                if (error) throw error;
                mostrarToast("Nuevo producto creado");
            }

            cerrarModal();
            cargarInventario();

        } catch (error) {
            mostrarToast("Error al guardar el producto", "error");
        }
    };

    const abrirModalNuevo = () => {
        setFormulario(FORMULARIO_VACIO);
        setIdEditando(null);
        setIsModalOpen(true);
    };

    const prepararEdicion = (prod) => {
        setFormulario({
            nombre: prod.nombre,
            tipoHuevo: prod.tipo_huevo,
            presentacion: prod.presentacion,
            precio: prod.precio,
            stock: prod.stock_disponible,
            imagenUrl: prod.imagen_url || '',
            descripcion: prod.descripcion || ''
        });
        setIdEditando(prod.id);
        setIsModalOpen(true);
    };

    const cerrarModal = () => {
        setIsModalOpen(false);
        setFormulario(FORMULARIO_VACIO);
        setIdEditando(null);
    };

    const eliminarProducto = async (id, nombreProd) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar "${nombreProd}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            setEliminandoId(id);
            const { error } = await supabase
                .from('productos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            mostrarToast("Producto eliminado del catálogo");
            cargarInventario();
        } catch (error) {
            console.error("Error al eliminar:", error);
            mostrarToast("Error al eliminar el producto", "error");
        } finally {
            setEliminandoId(null);
        }
    };

    const isStockBajo = (prod) => prod.stock_disponible <= (prod.stock_minimo_alerta || 10);

    const productosFiltrados = productos.filter(p => {
        const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                                 p.tipo_huevo.toLowerCase().includes(busqueda.toLowerCase());
        if (filtroStockBajo) return coincideBusqueda && isStockBajo(p);
        return coincideBusqueda;
    });

    // ── Computed stats ──
    const stats = useMemo(() => {
        const totalProductos = productos.length;
        const stockBajo = productos.filter(p => p.stock_disponible <= (p.stock_minimo_alerta || 10)).length;
        const valorTotal = productos.reduce((sum, p) => sum + (p.precio * p.stock_disponible), 0);

        let valorFormateado;
        if (valorTotal >= 1000) {
            valorFormateado = `$${(valorTotal / 1000).toFixed(1)}k`;
        } else {
            valorFormateado = `$${valorTotal.toFixed(0)}`;
        }

        return { totalProductos, stockBajo, valorFormateado, valorTotal };
    }, [productos]);

    const getTipoBadgeClass = (tipo) => {
        const t = tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (t === 'cafe') return 'panel-tag--cafe';
        if (t === 'azul') return 'panel-tag--azul';
        if (t === 'mixto') return 'panel-tag--mixto';
        return 'panel-tag--neutral';
    };

    const getPresentacionLabel = (pzas) => `${pzas} pzas`;

    return (
        <>
            {/* ── HEADER ── */}
            <div className="panel-header">
                <div>
                    <h1 className="panel-title">Inventario</h1>
                    <p className="panel-subtitle">Gestiona los productos y existencias de la granja</p>
                </div>
                <button onClick={abrirModalNuevo} className="panel-add-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span className="panel-add-btn-label">Agregar Producto</span>
                </button>
            </div>

            {/* ── STATS CARDS ── */}
            <div className="panel-section panel-section--kpis">
                <div className="panel-kpi-grid">
                    <div className="panel-kpi">
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Total Productos</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        </div>
                        <div className="panel-kpi-value">{stats.totalProductos}</div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: '100%' }} /></div>
                    </div>
                    <div 
                        className={`panel-kpi ${stats.stockBajo > 0 ? 'panel-kpi--warn' : ''}`}
                        onClick={() => {
                            if (stats.stockBajo > 0) {
                                setFiltroStockBajo(!filtroStockBajo);
                            }
                        }}
                        style={{ 
                            cursor: stats.stockBajo > 0 ? 'pointer' : 'default',
                            outline: filtroStockBajo && stats.stockBajo > 0 ? '2px solid var(--color-warning)' : 'none',
                            outlineOffset: '2px'
                        }}
                        title={stats.stockBajo > 0 ? "Clic para filtrar productos con stock bajo" : "No hay productos con stock bajo"}
                    >
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Stock Bajo</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div className="panel-kpi-value">
                            {stats.stockBajo}
                        </div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: stats.stockBajo > 0 ? '100%' : '0%' }} /></div>
                    </div>
                    <div 
                        className="panel-kpi"
                        title={`Valor exacto: $${stats.valorTotal?.toLocaleString('es-MX')}`}
                        style={{ cursor: 'help' }}
                    >
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Valor Stock</span>
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
                        placeholder="Buscar por nombre o tipo..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <button className="panel-filter-btn" title="Opciones de vista">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                    </svg>
                </button>
            </div>

            {/* ── PRODUCT LIST ── */}
            <div className="panel-section panel-section--list">
                {cargando ? (
                    <div className="panel-empty">
                        <p>Cargando inventario...</p>
                    </div>
                ) : productosFiltrados.length === 0 ? (
                    <div className="panel-empty">
                        <p>{busqueda ? "No se encontraron productos con esa búsqueda" : "No hay productos registrados aún"}</p>
                    </div>
                ) : (
                    productosFiltrados.map((prod) => {
                        const bajo = isStockBajo(prod);
                        return (
                            <div className={`panel-product ${bajo ? 'panel-product--low' : ''}`} key={prod.id}>
                                <img
                                    className="panel-product-img"
                                    src={prod.imagen_url || 'https://placehold.co/80x80?text=Sin+Foto'}
                                    alt={prod.nombre}
                                    onError={(e) => { e.target.src = 'https://placehold.co/80x80?text=Error' }}
                                />

                                <div className="panel-product-body">
                                    <div className="panel-product-head">
                                        <div>
                                            <div className="panel-product-name">{prod.nombre}</div>
                                            {prod.descripcion && (
                                                <div className="panel-product-desc">{prod.descripcion}</div>
                                            )}
                                        </div>
                                        <div className="panel-product-price">${prod.precio}</div>
                                    </div>
                                    
                                    <div className="panel-product-tags">
                                        <span className="panel-tag panel-tag--neutral">{getPresentacionLabel(prod.presentacion)}</span>
                                        <span className={`panel-tag ${getTipoBadgeClass(prod.tipo_huevo)}`}>
                                            {prod.tipo_huevo}
                                        </span>
                                    </div>
                                    
                                    <div className="panel-product-foot">
                                        <div>
                                            <span className="panel-stock-label">{bajo ? 'Stock Bajo' : 'Existencias'}</span>
                                            <span className="panel-stock-value">{prod.stock_disponible} unid.</span>
                                        </div>
                                        <div className="panel-actions">
                                            <button
                                                className="panel-action-btn"
                                                title="Editar"
                                                onClick={() => prepararEdicion(prod)}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            </button>
                                            <button
                                                className="panel-action-btn panel-action-btn--warn panel-action-btn--delete"
                                                title="Eliminar"
                                                disabled={eliminandoId === prod.id}
                                                onClick={() => eliminarProducto(prod.id, prod.nombre)}
                                            >
                                                {eliminandoId === prod.id ? 
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> 
                                                : 
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL CON COMPONENTE REUTILIZABLE */}
            <Modal
                isOpen={isModalOpen}
                onClose={cerrarModal}
                title={idEditando ? 'Editar Producto' : 'Nuevo Producto'}
                titleColor={idEditando ? '#d97706' : '#111827'}
                maxWidth="800px"
            >
                <form onSubmit={guardarProducto} noValidate>
                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Nombre Comercial</label>
                            <input type="text" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} placeholder="Ej: Cartón Clásico" value={formulario.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)} required />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tipo de Huevo</label>
                            <select className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} value={formulario.tipoHuevo} onChange={(e) => actualizarCampo('tipoHuevo', e.target.value)}>
                                <option value="Café">Café</option>
                                <option value="Azul">Azul</option>
                                <option value="Mixto">Mixto</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Presentación (Piezas)</label>
                            <select className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} value={formulario.presentacion} onChange={(e) => actualizarCampo('presentacion', e.target.value)}>
                                <option value="12">Media docena (12)</option>
                                <option value="18">Empaque mediano (18)</option>
                                <option value="24">Empaque familiar (24)</option>
                                <option value="30">Cartón completo (30)</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Precio (MXN)</label>
                            <input type="number" step="0.01" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} placeholder="0.00" value={formulario.precio} onChange={(e) => actualizarCampo('precio', e.target.value)} required />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Stock Inicial</label>
                            <input type="number" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} placeholder="0" value={formulario.stock} onChange={(e) => actualizarCampo('stock', e.target.value)} required />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Descripción del Producto</label>
                            <textarea
                                className="panel-search-input"
                                rows="3"
                                placeholder="Ej: Huevos frescos de libre pastoreo seleccionados a mano..."
                                value={formulario.descripcion}
                                onChange={(e) => actualizarCampo('descripcion', e.target.value)}
                                style={{ resize: 'vertical', fontFamily: 'inherit', padding: '0.5rem 0.75rem', height: 'auto' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>URL de la Imagen</label>
                            <input type="url" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} placeholder="https://..." value={formulario.imagenUrl} onChange={(e) => actualizarCampo('imagenUrl', e.target.value)} />
                        </div>

                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '15px', marginTop: '10px' }}>
                            <button type="button" onClick={cerrarModal} className="panel-filter-btn" style={{ flex: 1, height: '3rem' }}>
                                Cancelar
                            </button>
                            <button type="submit" className="panel-add-btn" style={{ flex: 2, height: '3rem', justifyContent: 'center' }}>
                                {idEditando ? 'Guardar Cambios' : 'Crear Producto'}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </>
    );
}
