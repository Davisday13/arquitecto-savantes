import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { tienePermiso } from '../lib/constants';
import Campanita from './Campanita';
import {
  LayoutDashboard, FolderOpen, DollarSign, Wallet, PieChart, Users, UserCog,
  FileBarChart, Settings, Bell, LogOut, Menu, X, ChevronDown, ChevronRight, Building2,
  Package, ClipboardList, Calculator,
} from 'lucide-react';

const grupos = [
  { label: 'Principal', items: [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard' },
  ]},
  { label: 'Operación', items: [
    { path: '/proyectos', label: 'Proyectos', icon: FolderOpen, perm: 'proyectos' },
    { path: '/clientes', label: 'Clientes', icon: Users, perm: 'clientes' },
  ]},
  { label: 'Finanzas', items: [
    { path: '/presupuesto', label: 'Presupuesto', icon: Calculator, perm: 'pagos' },
    { path: '/pagos', label: 'Pagos', icon: DollarSign, perm: 'pagos' },
    { path: '/gastos', label: 'Gastos', icon: Wallet, perm: 'gastos' },
    { path: '/estado-cuenta', label: 'Estado de cuenta', icon: PieChart, perm: 'estado_cuenta' },
  ]},
  { label: 'Recursos', items: [
    { path: '/inventario', label: 'Inventario', icon: Package, perm: 'inventario' },
  ]},
  { label: 'Reportes', items: [
    { path: '/reportes', label: 'Reportes', icon: FileBarChart, perm: 'reportes' },
  ]},
  { label: 'Administración', items: [
    { path: '/usuarios', label: 'Usuarios', icon: UserCog, perm: 'usuarios' },
    { path: '/notificaciones', label: 'Notificaciones', icon: Bell, perm: 'notificaciones' },
    { path: '/auditoria', label: 'Auditoría', icon: ClipboardList, perm: 'auditoria' },
    { path: '/configuracion', label: 'Configuración', icon: Settings, perm: 'configuracion' },
  ]},
];

export default function Layout() {
  const { profile, permisos, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('arq:sidebar') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(
    JSON.parse(localStorage.getItem('arq:expanded') || '{}')
  );

  useEffect(() => {
    supabase.from('configuracion_empresa').select('*').eq('id', 1).single()
      .then(({ data }) => { if (data) setEmpresa(data); });
  }, []);

  useEffect(() => {
    const h = () => setCollapsed(localStorage.getItem('arq:sidebar') === 'true');
    window.addEventListener('arq:sidebar-toggle', h);
    window.addEventListener('arq:empresa-actualizada', () => {
      supabase.from('configuracion_empresa').select('*').eq('id', 1).single()
        .then(({ data }) => { if (data) setEmpresa(data); });
    });
    return () => { window.removeEventListener('arq:sidebar-toggle', h); };
  }, []);

  useEffect(() => { localStorage.setItem('arq:expanded', JSON.stringify(expandedGroups)); }, [expandedGroups]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('arq:sidebar', String(next));
  };

  const toggleGroup = (label) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-56';
  const mainPadding = collapsed ? 'lg:pl-16' : 'lg:pl-56';
  const headerLeft = collapsed ? 'lg:left-16' : 'lg:left-56';

  if (!profile) return null;

  const hasItems = (items) => items.some(item => tienePermiso(permisos, item.perm, 1));

  return (
    <div className="min-h-screen bg-gray-50">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40 transition-all duration-200 flex flex-col
        ${sidebarWidth}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}>
        <div className="flex items-center h-14 px-3 border-b border-gray-200 flex-shrink-0">
          <div className="w-8 h-8 bg-brand-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="ml-2.5 truncate flex-1">
              <div className="text-sm font-bold text-gray-900 leading-tight">{empresa?.nombre_empresa || 'Arquitecto'}</div>
              <div className="text-[10px] text-gray-400 leading-tight">{profile?.nombre} &middot; <strong>ACOSTA</strong></div>
            </div>
          )}
          <button onClick={toggleCollapse} className={`p-1 hover:bg-gray-100 rounded flex-shrink-0 hidden lg:block ${collapsed ? 'mx-auto' : ''}`}>
            {collapsed ? <Menu className="h-4 w-4 text-gray-500" /> : <X className="h-4 w-4 text-gray-500" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {grupos.map(grupo => {
            if (!hasItems(grupo.items)) return null;
            const isExpanded = collapsed || expandedGroups[grupo.label];
            return (
              <div key={grupo.label}>
                {!collapsed && (
                  <button onClick={() => toggleGroup(grupo.label)} className="flex items-center gap-1 w-full px-2 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600">
                    {expandedGroups[grupo.label] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {grupo.label}
                  </button>
                )}
                {isExpanded && grupo.items.map(item => {
                  if (!tienePermiso(permisos, item.perm, 1)) return null;
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.path} to={item.path} end={item.path === '/'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-brand-50 text-brand-800 font-medium' : 'text-gray-600 hover:bg-gray-100'} ${collapsed ? 'justify-center' : ''}`
                      }
                      title={collapsed ? item.label : ''}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-2 flex-shrink-0">
          {!collapsed && (
            <NavLink to="/configuracion" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 mb-1">
              <Settings className="h-4 w-4" />
              <span>Configuración</span>
            </NavLink>
          )}
          <button onClick={handleLogout} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full ${collapsed ? 'justify-center' : ''}`}>
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      <header className={`fixed top-0 right-0 h-14 bg-white border-b border-gray-200 z-20 flex items-center justify-between px-4 transition-all duration-200 left-0 ${headerLeft}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1 hover:bg-gray-100 rounded">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-sm text-gray-500">Hola, <strong className="text-gray-900">{profile.nombre}</strong></span>
          <span className="text-xs bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full font-medium">{profile.rol}</span>
        </div>
        <div className="flex items-center gap-2">
          <Campanita />
        </div>
      </header>

      <main className={`pt-14 transition-all duration-200 min-h-screen ${mainPadding}`}>
        <div className="p-3 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
