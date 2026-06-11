import { useState, useCallback, useRef } from 'react';

/**
 * Hook reutilizable para mostrar notificaciones toast.
 * Reemplaza el patrón duplicado en 4 componentes.
 * 
 * @param {number} duracion - Milisegundos que dura visible el toast (default: 3000)
 * @returns {{ toast, mostrarToast }}
 */
export function useToast(duracion = 3000) {
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const timerRef = useRef(null);

    const mostrarToast = useCallback((message, type = 'success') => {
        // Limpiar timer anterior si existe (evita bugs con toasts rápidos)
        if (timerRef.current) clearTimeout(timerRef.current);

        setToast({ show: true, message, type });

        timerRef.current = setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
            timerRef.current = null;
        }, duracion);
    }, [duracion]);

    return { toast, mostrarToast };
}
