import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { useToast } from '../hooks/useToast';
import Toast from '../Components/Toast';

export default function ProduccionDiaria() {
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const { toast, mostrarToast } = useToast(3500);

    const [recoleccion, setRecoleccion] = useState({ cafe: '', azul: '', mixto: '' });
    const [sobrantesAyer, setSobrantesAyer] = useState({ cafe: 0, azul: 0, mixto: 0 });

    // Selector del tipo de algoritmo
    const [tipoAlgoritmo, setTipoAlgoritmo] = useState('equitativo');

    // Aquí guardaremos la propuesta que el usuario puede editar
    const [propuestaEditable, setPropuestaEditable] = useState(null);

    useEffect(() => {
        inicializarModulo();
    }, []);

    const inicializarModulo = async () => {
        try {
            setCargando(true);
            const resProductos = await supabase.from('productos').select('*');
            if (resProductos.error) throw resProductos.error;
            setProductos(resProductos.data);

            const resProduccion = await supabase
                .from('produccion_diaria')
                .select('*')
                .order('creado_en', { ascending: false })
                .limit(1);

            if (resProduccion.data && resProduccion.data.length > 0) {
                const ultimoRegistro = resProduccion.data[0];
                setSobrantesAyer({
                    cafe: ultimoRegistro.sobrante_cafe_guardado || 0,
                    azul: ultimoRegistro.sobrante_azul_guardado || 0,
                    mixto: ultimoRegistro.sobrante_mixto_guardado || 0
                });
            }
        } catch (error) {
            console.error("Error al inicializar módulo:", error.message);
            mostrarToast("Error al cargar datos", "error");
        } finally {
            setCargando(false);
        }
    };

    // --- EL CEREBRO DE LOS CÁLCULOS ---
    const generarPropuesta = (e) => {
        e.preventDefault();

        const entradaCafe = parseInt(recoleccion.cafe || 0, 10) + sobrantesAyer.cafe;
        const entradaAzul = parseInt(recoleccion.azul || 0, 10) + sobrantesAyer.azul;
        const entradaMixto = parseInt(recoleccion.mixto || 0, 10) + sobrantesAyer.mixto;

        let lineasFinales = [];

        const calcularSugerencia = (totalHuevos, tipo) => {
            const empaques = productos
                .filter(p => p.tipo_huevo === tipo)
                .sort((a, b) => b.presentacion - a.presentacion);

            if (empaques.length === 0) return;

            if (tipoAlgoritmo === 'cascada') {
                let residuo = totalHuevos;
                empaques.forEach(prod => {
                    const paquetes = Math.floor(residuo / prod.presentacion);
                    residuo = residuo % prod.presentacion;
                    lineasFinales.push({ ...prod, paquetes_sugeridos: paquetes, paquetes_finales: paquetes });
                });
            } else {
                const sumaCapacidades = empaques.reduce((sum, p) => sum + p.presentacion, 0);
                const paquetesBase = Math.floor(totalHuevos / sumaCapacidades);
                let residuo = totalHuevos - (paquetesBase * sumaCapacidades);

                empaques.forEach(prod => {
                    let paquetesExtra = 0;
                    if (residuo >= prod.presentacion) {
                        paquetesExtra = Math.floor(residuo / prod.presentacion);
                        residuo = residuo % prod.presentacion;
                    }
                    const totalPaquetes = paquetesBase + paquetesExtra;
                    lineasFinales.push({ ...prod, paquetes_sugeridos: totalPaquetes, paquetes_finales: totalPaquetes });
                });
            }
        };

        calcularSugerencia(entradaCafe, 'Café');
        calcularSugerencia(entradaAzul, 'Azul');
        calcularSugerencia(entradaMixto, 'Mixto');

        setPropuestaEditable(lineasFinales);
    };

    // --- RECALCULAR SOBRANTES EN TIEMPO REAL ---
    const calcularSobrantesActuales = () => {
        if (!propuestaEditable) return { cafe: 0, azul: 0, mixto: 0 };

        const entradaCafe = parseInt(recoleccion.cafe || 0, 10) + sobrantesAyer.cafe;
        const entradaAzul = parseInt(recoleccion.azul || 0, 10) + sobrantesAyer.azul;
        const entradaMixto = parseInt(recoleccion.mixto || 0, 10) + sobrantesAyer.mixto;

        let usadosCafe = 0; let usadosAzul = 0; let usadosMixto = 0;

        propuestaEditable.forEach(linea => {
            const huevosUsados = linea.paquetes_finales * linea.presentacion;
            if (linea.tipo_huevo === 'Café') usadosCafe += huevosUsados;
            if (linea.tipo_huevo === 'Azul') usadosAzul += huevosUsados;
            if (linea.tipo_huevo === 'Mixto') usadosMixto += huevosUsados;
        });

        return {
            cafe: entradaCafe - usadosCafe,
            azul: entradaAzul - usadosAzul,
            mixto: entradaMixto - usadosMixto
        };
    };

    const handleCambioManual = (idProducto, nuevoValor) => {
        const valorLimpio = parseInt(nuevoValor, 10) || 0;
        setPropuestaEditable(prev => prev.map(linea =>
            linea.id === idProducto ? { ...linea, paquetes_finales: valorLimpio } : linea
        ));
    };

    const confirmarSurtidoEInventario = async () => {
        const sobrantes = calcularSobrantesActuales();

        if (sobrantes.cafe < 0 || sobrantes.azul < 0 || sobrantes.mixto < 0) {
            mostrarToast("Error: Estás intentando empaquetar más huevos de los que tienes.", "error");
            return;
        }

        try {
            setGuardando(true);

            // Intentar usar RPC (transacción atómica) — fallback a updates secuenciales
            const items = propuestaEditable
                .filter(l => l.paquetes_finales > 0)
                .map(l => ({ producto_id: l.id, cantidad: l.paquetes_finales }));

            const registro = {
                huevos_cafes_entrada: parseInt(recoleccion.cafe || 0, 10),
                huevos_azules_entrada: parseInt(recoleccion.azul || 0, 10),
                huevos_mixtos_entrada: parseInt(recoleccion.mixto || 0, 10),
                sobrante_cafe_guardado: sobrantes.cafe,
                sobrante_azul_guardado: sobrantes.azul,
                sobrante_mixto_guardado: sobrantes.mixto
            };

            // Intentar la función RPC atómica primero
            const { error: rpcError } = await supabase.rpc('surtir_inventario', {
                items: JSON.stringify(items),
                registro: JSON.stringify(registro)
            });

            if (rpcError) {
                // Fallback: Si la función RPC no existe todavía, usar método secuencial
                if (rpcError.message.includes('function') || rpcError.code === '42883') {
                    console.warn("Función RPC no encontrada, usando fallback secuencial.");

                    const { error: errorProd } = await supabase.from('produccion_diaria').insert([registro]);
                    if (errorProd) throw errorProd;

                    for (const linea of propuestaEditable) {
                        if (linea.paquetes_finales > 0) {
                            const { error: errorStock } = await supabase
                                .from('productos')
                                .update({ stock_disponible: linea.stock_disponible + linea.paquetes_finales })
                                .eq('id', linea.id);
                            if (errorStock) throw errorStock;
                        }
                    }
                } else {
                    throw rpcError;
                }
            }

            mostrarToast("Inventario actualizado con éxito");
            setRecoleccion({ cafe: '', azul: '', mixto: '' });
            setPropuestaEditable(null);
            inicializarModulo();

        } catch (error) {
            console.error("Error al surtir:", error.message);
            mostrarToast("Error al procesar el inventario", "error");
        } finally {
            setGuardando(false);
        }
    };

    const sobrantesDinamicos = calcularSobrantesActuales();
    const hayNegativos = sobrantesDinamicos.cafe < 0 || sobrantesDinamicos.azul < 0 || sobrantesDinamicos.mixto < 0;

    return (
        <>
            {/* ── HEADER ── */}
            <div className="panel-header">
                <div>
                    <h1 className="panel-title">Producción Diaria</h1>
                    <p className="panel-subtitle">Ingresa la recolección. El sistema sugiere, tú decides.</p>
                </div>
            </div>

            {/* ── STATS CARDS ── */}
            <div className="panel-section panel-section--kpis">
                <div className="panel-kpi-grid">
                    <div className="panel-kpi">
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Sobrante Cafés</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="8" ry="10"/></svg>
                        </div>
                        <div className="panel-kpi-value">{sobrantesAyer.cafe}</div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: '100%', backgroundColor: 'oklch(0.7 0.17 70)' }} /></div>
                    </div>
                    <div className="panel-kpi">
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Sobrante Azules</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="8" ry="10"/></svg>
                        </div>
                        <div className="panel-kpi-value" style={{ color: 'var(--color-primary)' }}>{sobrantesAyer.azul}</div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: '100%', backgroundColor: 'var(--color-primary)' }} /></div>
                    </div>
                    <div className="panel-kpi">
                        <div className="panel-kpi-head">
                            <span className="panel-kpi-label">Sobrante Mixtos</span>
                            <svg className="panel-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="8" ry="10"/></svg>
                        </div>
                        <div className="panel-kpi-value" style={{ color: 'var(--color-muted-foreground)' }}>{sobrantesAyer.mixto}</div>
                        <div className="panel-kpi-bar"><div className="panel-kpi-bar-fill" style={{ width: '100%', backgroundColor: 'var(--color-muted-foreground)' }} /></div>
                    </div>
                </div>
            </div>

            <div className="panel-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', alignItems: 'start' }}>

                {/* COLUMNA IZQUIERDA: FORMULARIO */}
                <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', boxShadow: '0 1px 2px rgb(0 0 0 / 5%)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--color-foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="8" ry="10"/><path d="M12 2c-2 4-2 8 0 12s2 8 0 12"/></svg>
                        Registro de Recolección
                    </h3>

                    <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--color-success)', color: 'var(--color-success-foreground)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.25rem' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                            Huevos sueltos en almacén (Ayer):
                        </strong>
                        <ul style={{ margin: '0', paddingLeft: '1.25rem' }}>
                            <li>Cafés: {sobrantesAyer.cafe} | Azules: {sobrantesAyer.azul} | Mixtos: {sobrantesAyer.mixto}</li>
                        </ul>
                    </div>

                    <form onSubmit={generarPropuesta} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Huevos Cafés Recolectados</label>
                            <input type="number" min="0" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} value={recoleccion.cafe} onChange={(e) => setRecoleccion({ ...recoleccion, cafe: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Huevos Azules Recolectados</label>
                            <input type="number" min="0" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} value={recoleccion.azul} onChange={(e) => setRecoleccion({ ...recoleccion, azul: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Huevos Mixtos Recolectados</label>
                            <input type="number" min="0" className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} value={recoleccion.mixto} onChange={(e) => setRecoleccion({ ...recoleccion, mixto: e.target.value })} />
                        </div>

                        <div style={{ background: 'var(--color-muted)', padding: '0.75rem', borderRadius: '0.5rem', marginTop: '0.5rem' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Método de Cálculo:</label>
                            <select className="panel-search-input" style={{ width: '100%', height: '2.5rem', padding: '0 0.75rem' }} value={tipoAlgoritmo} onChange={(e) => setTipoAlgoritmo(e.target.value)}>
                                <option value="equitativo">Equitativo (Surtir todos los tamaños igual)</option>
                                <option value="cascada">Cascada (Llenar cajas grandes primero)</option>
                            </select>
                        </div>

                        <button type="submit" disabled={cargando} className="panel-add-btn" style={{ width: '100%', height: '3rem', justifyContent: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                            Generar Propuesta
                        </button>
                    </form>
                </div>

                {/* COLUMNA DERECHA: EDICIÓN MANUAL */}
                <div>
                    {propuestaEditable ? (
                        <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', boxShadow: '0 1px 2px rgb(0 0 0 / 5%)' }}>
                            <h3 style={{ marginTop: 0, color: 'var(--color-foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Modificar y Confirmar
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-foreground)', margin: '0.25rem 0 1.25rem 0' }}>Puedes cambiar los números. Los sobrantes se calcularán solos.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {propuestaEditable.filter(linea => linea.paquetes_sugeridos > 0 || linea.paquetes_finales > 0).map((linea) => (
                                    <div className="panel-product" key={linea.id} style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                                            <div className="panel-product-name">{linea.nombre}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                Stock: {linea.stock_disponible} · Sugerido: {linea.paquetes_sugeridos}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>Cant:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={linea.paquetes_finales}
                                                onChange={(e) => handleCambioManual(linea.id, e.target.value)}
                                                className="panel-search-input"
                                                style={{ width: '4rem', padding: '0.25rem', textAlign: 'center', border: '2px solid var(--color-primary)', fontWeight: 'bold' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* SOBRANTES DINÁMICOS */}
                            <div style={{ 
                                padding: '1rem', 
                                borderRadius: '0.5rem', 
                                marginBottom: '1.25rem', 
                                backgroundColor: hayNegativos ? 'var(--color-destructive)' : 'var(--color-warning)',
                                color: hayNegativos ? 'var(--color-destructive-foreground)' : 'var(--color-warning-foreground)'
                            }}>
                                <strong style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.875rem' }}>
                                    <svg style={{ flexShrink: 0, marginTop: '2px' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="8" ry="10"/></svg>
                                    Sobrantes Reales (Se quedan para mañana):
                                </strong>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>
                                    <span>Cafés: {sobrantesDinamicos.cafe}</span>
                                    <span>Azules: {sobrantesDinamicos.azul}</span>
                                    <span>Mixtos: {sobrantesDinamicos.mixto}</span>
                                </div>
                                {hayNegativos && (
                                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                        Ajusta tus cantidades, tienes números negativos.
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={confirmarSurtidoEInventario}
                                disabled={guardando || hayNegativos}
                                className="panel-add-btn"
                                style={{ width: '100%', height: '3rem', justifyContent: 'center', backgroundColor: 'var(--color-success)', color: 'var(--color-success-foreground)' }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                {guardando ? 'Guardando...' : 'Confirmar y Surtir Almacén'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-muted-foreground)', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--color-muted)' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}>Introduce la recolección y calcula para ver las opciones.</p>
                        </div>
                    )}
                </div>
            </div>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </>
    );
}