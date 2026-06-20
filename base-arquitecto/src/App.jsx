import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';

import Navbar, { useSidebarCollapsed } from './components/Navbar';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import ClientesView from './components/ClientesView';
import ProyectosView from './components/ProyectosView';
import CotizacionesView from './components/CotizacionesView';
import PagosView from './components/PagosView';
import GastosView from './components/GastosView';
import EstadoCuentaView from './components/EstadoCuentaView';
import InventarioView from './components/InventarioView';
import UsuariosView from './components/UsuariosView';
import PermisosView from './components/PermisosView';
import ReportesView from './components/ReportesView';
import AuditoriaView from './components/AuditoriaView';
import ConfiguracionView from './components/ConfiguracionView';
import CorreosLogView from './components/CorreosLogView';
import NotificacionesView from './components/NotificacionesView';

function MainApp({ profile, setProfile, handleLogout }) {
  const [currentView, setCurrentView] = useState(() => {
    try { return localStorage.getItem('currentView') || 'dashboard'; } catch { return 'dashboard'; }
  });
  const sidebarCollapsed = useSidebarCollapsed();

  useEffect(() => {
    try { localStorage.setItem('currentView', currentView); } catch {}
  }, [currentView]);

  const views = {
    dashboard: DashboardView,
    clientes: ClientesView,
    proyectos: ProyectosView,
    cotizaciones: CotizacionesView,
    pagos: PagosView,
    gastos: GastosView,
    estadocuenta: EstadoCuentaView,
    inventario: InventarioView,
    usuarios: UsuariosView,
    permisos: PermisosView,
    reportes: ReportesView,
    auditoria: AuditoriaView,
    configuracion: ConfiguracionView,
    correos: CorreosLogView,
    notificaciones: NotificacionesView,
  };

  const ViewComponent = views[currentView] || DashboardView;
  const mainPadding = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-56';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        profile={profile}
        onLogout={handleLogout}
      />
      <div className={`transition-all duration-200 ${mainPadding}`}>
        <main className="px-4 lg:px-6 py-6">
          <ViewComponent profile={profile} setCurrentView={setCurrentView} />
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      if (!user) {
        if (mounted) setProfile(null);
        return;
      }
      if (profile && profile.id === user.id) return;
      try {
        if (mounted) setProfileLoading(true);
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        if (mounted && data) setProfile(data);
      } catch (err) {
        console.error('[App] Error obteniendo perfil:', err);
        if (mounted) {
          setProfile({
            id: user.id,
            email: user.email,
            email_login: user.email,
            nombre_completo: user.email.split('@')[0],
            rol: 'ARQUITECTO',
            activo: true,
          });
        }
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }
    fetchProfile();
    return () => { mounted = false; };
  }, [user?.id]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!user) return <LoginView />;
  if (!profile) return <LoginView />;

  if (!profile.activo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cuenta inactiva</h2>
          <p className="text-gray-600 mb-4">Tu usuario est&aacute; deshabilitado. Contacta al administrador.</p>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
          >
            Cerrar sesi&oacute;n
          </button>
        </div>
      </div>
    );
  }

  return <MainApp profile={profile} setProfile={setProfile} handleLogout={signOut} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
