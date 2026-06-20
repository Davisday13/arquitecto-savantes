import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';

import Navbar, { useSidebarCollapsed } from './components/Navbar';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import ClientesView from './components/ClientesView';
import EquiposView from './components/EquiposView';
import OrdenesView from './components/OrdenesView';
import VisitasView from './components/VisitasView';
import PagosView from './components/PagosView';
import EstadoCuentaView from './components/EstadoCuentaView';
import CatalogoView from './components/CatalogoView';
import UsuariosView from './components/UsuariosView';
import PermisosView from './components/PermisosView';
import ReportesView from './components/ReportesView';
import AuditoriaView from './components/AuditoriaView';
import ConfiguracionView from './components/ConfiguracionView';
import CorreosLogView from './components/CorreosLogView';
import PresupuestosView from './components/PresupuestosView';
import PlantillasView from './components/PlantillasView';
import MetasView from './components/MetasView';
import NotificacionesView from './components/NotificacionesView';
import CalendarioView from './components/CalendarioView';

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
    equipos: EquiposView,
    ordenes: OrdenesView,
    visitas: VisitasView,
    pagos: PagosView,
    estadocuenta: EstadoCuentaView,
    catalogo: CatalogoView,
    usuarios: UsuariosView,
    permisos: PermisosView,
    reportes: ReportesView,
    auditoria: AuditoriaView,
    configuracion: ConfiguracionView,
    correos: CorreosLogView,
    presupuestos: PresupuestosView,
    plantillas: PlantillasView,
    metas: MetasView,
    notificaciones: NotificacionesView,
    calendario: CalendarioView,
  };

  const ViewComponent = views[currentView] || DashboardView;

  // En desktop: padding-left = ancho del sidebar (16 = 4rem, 56 = 14rem)
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
          // Fallback: si no hay perfil en `usuarios`, usar datos básicos
          setProfile({
            id: user.id,
            email: user.email,
            email_login: user.email,
            nombre_completo: user.email.split('@')[0],
            rol: 'TECNICO',
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
          <p className="text-gray-600 mb-4">Tu usuario está deshabilitado. Contacta al administrador.</p>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
          >
            Cerrar sesión
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
