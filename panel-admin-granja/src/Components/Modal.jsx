import { useEffect } from 'react';

/**
 * Componente Modal reutilizable.
 * Reemplaza el patrón de overlay repetido en 3 archivos.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - title: string (opcional)
 * - titleColor: string (opcional, para edición vs creación)
 * - maxWidth: string (default: '500px')
 * - children: ReactNode
 */
export default function Modal({ isOpen, onClose, title, titleColor, maxWidth = '500px', children }) {
    // Cerrar con Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        // Prevenir scroll del body cuando el modal está abierto
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                style={{ maxWidth }}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="modal-header">
                        <h3 className="card-title" style={titleColor ? { color: titleColor } : undefined}>
                            {title}
                        </h3>
                        <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}
