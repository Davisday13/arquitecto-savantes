import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './components/LoginView';
import Layout from './components/Layout';
import DashboardView from './components/DashboardView';
import ProyectosView from './components/ProyectosView';
import ClientesView from './components/ClientesView';
import PagosView from './components/PagosView';
import GastosView from './components/GastosView';
import EstadoCuentaView from './components/EstadoCuentaView';
import InventarioView from './components/InventarioView';
import ReportesView from './components/ReportesView';
import UsuariosView from './components/UsuariosView';
import PermisosView from './components/PermisosView';
import AuditoriaView from './components/AuditoriaView';
import NotificacionesView from './components/NotificacionesView';
import ConfiguracionView from './components/ConfiguracionView';

function ProtectedRoute({ children, rolMinimo = 'CLIENTE' }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-brand-700 border-t-transparent rounded-full" /></div>;

  if (!session) return <Navigate to="/login" replace />;

  const rolesJerarquia = { ROOT: 5, ADMIN: 4, ARQUITECTO: 3, ASISTENTE: 2, CLIENTE: 1 };
  if ((rolesJerarquia[profile.rol] || 0) < (rolesJerarquia[rolMinimo] || 0)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-10 w-10 border-4 border-brand-700 border-t-transparent rounded-full" /></div>;

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginView />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardView />} />
        <Route path="proyectos" element={<ProyectosView />} />
        <Route path="clientes" element={<ClientesView />} />
        <Route path="pagos" element={<PagosView />} />
        <Route path="gastos" element={<GastosView />} />
        <Route path="estado-cuenta" element={<EstadoCuentaView />} />
        <Route path="inventario" element={<InventarioView />} />
        <Route path="reportes" element={<ReportesView />} />
        <Route path="usuarios" element={<ProtectedRoute rolMinimo="ADMIN"><UsuariosView /></ProtectedRoute>} />
        <Route path="permisos" element={<ProtectedRoute rolMinimo="ADMIN"><PermisosView /></ProtectedRoute>} />
        <Route path="auditoria" element={<AuditoriaView />} />
        <Route path="notificaciones" element={<NotificacionesView />} />
        <Route path="configuracion" element={<ConfiguracionView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
