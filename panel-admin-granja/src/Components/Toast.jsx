/**
 * Componente Toast reutilizable.
 * Se usa junto con el hook useToast().
 * 
 * Props:
 * - show: boolean
 * - message: string
 * - type: 'success' | 'error' | 'warning'
 */
export default function Toast({ show, message, type = 'success' }) {
    if (!show) return null;

    return (
        <div className={`toast toast-${type}`} role="alert">
            {message}
        </div>
    );
}
