import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginAdmin from './pages/LoginAdmin';
import DashboardLayout from './Components/DashboardLayout';
import InventarioAdmin from './pages/InventarioAdmin';
import PedidosAdmin from './pages/PedidosAdmin';
import SuscripcionesAdmin from './pages/SuscripcionesAdmin';
import ProduccionDiaria from './pages/ProduccionDiaria';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" />} />
        <Route path="/admin/login" element={<LoginAdmin />} />
        {/* Aquí declaramos la ruta del Panel Administrativo */}
        <Route path="/admin" element={<DashboardLayout />}>
          {/* Si entran a /admin, los mandamos directo a inventario */}
          <Route index element={<Navigate to="inventario" />} />
          <Route path="pedidos" element={<PedidosAdmin />} />
          <Route path="inventario" element={<InventarioAdmin />} />
          <Route path="suscripciones" element={<SuscripcionesAdmin />} />
          <Route path="produccion" element={<ProduccionDiaria />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;