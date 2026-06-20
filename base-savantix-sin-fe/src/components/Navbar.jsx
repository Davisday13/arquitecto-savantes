import React, { useState, useEffect } from 'react';
import {
  Menu, X, LayoutDashboard, Users, Cpu, ClipboardList, MapPin,
  UserCog, Shield, FileBarChart, History, Settings, LogOut, Mail,
  Wrench, ChevronDown, Key, DollarSign, FileSpreadsheet, Package,
  ChevronLeft, ChevronRight, FileText, Lightbulb, Target,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { ROLES, ROLES_LABEL, PERMISOS_POR_ROL } from '../lib/constants';
import { getInitials } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input } from './ui/Input';
import Campanita from './Campanita';

export default function Navbar({ currentView, setCurrentView, profile, onLogout }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('savantix.sidebar.collapsed');
    if (saved !== null) return saved === '1';
    return window.innerWidth < 1280;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [empresa, setEmpresa] = useState({ logo_url: null, nombre_empresa: '' });

  // Cargar info de la empresa una vez al montar y suscribirse a cambios
  useEffect(() => {
    let mounted = true;

    const cargar = async () => {
      const { data } = await supabase
        .from('configuracion_empresa')
        .select('logo_url, nombre_empresa')
        .eq('id', 1)
        .maybeSingle();
      if (mounted && data) setEmpresa(data);
    };

    cargar();

    // Si la empresa cambia su logo desde Configuración, refrescar
    const handler = () => cargar();
    window.addEventListener('savantix:empresa-actualizada', handler);

    return () => {
      mounted = false;
      window.removeEventListener('savantix:empresa-actualizada', handler);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('savantix.sidebar.collapsed', collapsed ? '1' : '0');
    // Avisar a otros componentes (App) que cambió el ancho
    window.dispatchEvent(new Event('savantix:sidebar-toggle'));
  }, [collapsed]);

  useEffect(() => { setMobileOpen(false); }, [currentView]);

  let permisos = profile?.permisos;
  if (typeof permisos === 'string') {
    try { permisos = JSON.parse(permisos); } catch { permisos = {}; }
  }
  const rol = profile?.rol || 'TECNICO';
  const esAdmin = rol === ROLES.ROOT || rol === ROLES.ADMIN;
  if (!permisos || Object.keys(permisos).length === 0 || esAdmin) {
    permisos = PERMISOS_POR_ROL[rol] || PERMISOS_POR_ROL.TECNICO;
  } else {
    permisos = { ...PERMISOS_POR_ROL[rol], ...permisos };
  }

  const menuGroups = [
    {
      title: 'Principal',
      items: [
        permisos.dashboard && { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
      ].filter(Boolean),
    },
    {
      title: 'Operación',
      items: [
        permisos.ordenes && { id: 'ordenes', label: 'Taller', icon: ClipboardList },
        permisos.visitas && { id: 'visitas', label: 'Visitas', icon: MapPin },
        (permisos.ordenes || permisos.visitas) && { id: 'calendario', label: 'Calendario', icon: CalendarIcon },
        permisos.presupuestos && { id: 'presupuestos', label: 'Presupuestos', icon: FileText },
        permisos.catalogo && { id: 'catalogo', label: 'Catálogo', icon: Package },
      ].filter(Boolean),
    },
    {
      title: 'Cobranzas',
      items: [
        permisos.pagos && { id: 'pagos', label: 'Pagos', icon: DollarSign },
        permisos.pagos && { id: 'estadocuenta', label: 'Estado cta.', icon: FileSpreadsheet },
      ].filter(Boolean),
    },
    {
      title: 'Maestros',
      items: [
        permisos.clientes && { id: 'clientes', label: 'Clientes', icon: Users },
        permisos.equipos && { id: 'equipos', label: 'Equipos', icon: Cpu },
      ].filter(Boolean),
    },
    {
      title: 'Administración',
      items: [
        permisos.reportes && { id: 'reportes', label: 'Reportes', icon: FileBarChart },
        permisos.metas && { id: 'metas', label: 'Metas', icon: Target },
        permisos.correos && { id: 'correos', label: 'Correos', icon: Mail },
        permisos.plantillas && { id: 'plantillas', label: 'Plantillas', icon: Lightbulb },
        permisos.usuarios && { id: 'usuarios', label: 'Usuarios', icon: UserCog },
        permisos.permisos && { id: 'permisos', label: 'Permisos', icon: Shield },
        permisos.auditoria && { id: 'auditoria', label: 'Auditoría', icon: History },
        permisos.configuracion && { id: 'configuracion', label: 'Empresa', icon: Settings },
      ].filter(Boolean),
    },
  ].filter(g => g.items.length > 0);

  const handleClick = (id) => {
    setCurrentView(id);
    setMobileOpen(false);
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-56';

  return (
    <>
      {/* TOPBAR */}
      <header className="bg-brand-700 shadow-md sticky top-0 z-40">
        <div className="px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-1.5 rounded-md text-white hover:bg-brand-600"
              aria-label="Menú"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/savante-logo-white.png"
                alt="Savante Solutions"
                className="h-8 w-8 object-contain"
              />
              <span className="font-bold text-white text-lg">Savantix</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Campanita profile={profile} setCurrentView={setCurrentView} />

            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-brand-600"
              >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-brand-700 text-sm font-bold">
                  {getInitials(profile?.nombre_completo || profile?.email || '?')}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-medium text-white leading-tight">{profile?.nombre_completo}</div>
                  <div className="text-[10px] text-brand-200 leading-tight">{ROLES_LABEL[profile?.rol] || profile?.rol}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-brand-200" />
              </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border z-20">
                  <div className="p-3 border-b">
                    <p className="text-xs text-gray-500">Conectado como</p>
                    <p className="text-sm font-medium truncate">{profile?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setShowProfile(false); setShowPwdModal(true); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Key className="h-4 w-4 text-gray-400" />
                      Cambiar contraseña
                    </button>
                    <button
                      onClick={() => { setShowProfile(false); onLogout(); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 text-red-400" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      </header>

      {/* SIDEBAR DESKTOP */}
      <aside
        className={`hidden lg:flex fixed left-0 top-14 bottom-0 z-30 bg-white border-r border-gray-200 flex-col transition-all duration-200 ${sidebarWidth}`}
      >
        {/* Logo de la empresa cliente (white-label) */}
        <EmpresaLogoBox empresa={empresa} collapsed={collapsed} />

        <nav className="flex-1 overflow-y-auto py-3">
          {menuGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {!collapsed && (
                <div className="px-4 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              {collapsed && gi > 0 && <div className="mx-3 border-t border-gray-200 my-2" />}
              <div className="space-y-0.5 px-2">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleClick(item.id)}
                      title={collapsed ? item.label : ''}
                      className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${active
                          ? 'bg-brand-700 text-white'
                          : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="border-t border-gray-200 py-2.5 flex items-center justify-center gap-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </aside>

      {/* SIDEBAR MÓVIL */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-14 bottom-0 z-50 w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <EmpresaLogoBox empresa={empresa} collapsed={false} />
            <nav className="py-3">
              {menuGroups.map((group, gi) => (
                <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                  <div className="px-4 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {group.title}
                  </div>
                  <div className="space-y-0.5 px-2">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const active = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleClick(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                            ${active
                              ? 'bg-brand-700 text-white'
                              : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </>
      )}

      <ChangePasswordModal open={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </>
  );
}

// =============================================================
// Caja del logo de la empresa cliente (white-label)
// =============================================================
function EmpresaLogoBox({ empresa, collapsed }) {
  const tieneLogo = !!empresa?.logo_url;
  const nombre = empresa?.nombre_empresa || '';

  return (
    <div className={`border-b border-gray-200 ${collapsed ? 'p-2' : 'p-3'}`}>
      <div
        className={`flex items-center justify-center overflow-hidden ${
          collapsed ? 'h-12 w-12 mx-auto p-1' : 'aspect-square w-full p-3'
        }`}
      >
        {tieneLogo ? (
          <img
            src={empresa.logo_url}
            alt={nombre || 'Logo empresa'}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className={`w-full h-full bg-gray-100 flex items-center justify-center ${collapsed ? 'text-[8px]' : 'text-[10px]'} text-gray-300 text-center`}>
            {collapsed ? '' : 'Logo empresa'}
          </div>
        )}
      </div>
      {!collapsed && nombre && (
        <div className="mt-1.5 text-center">
          <div className="text-[11px] font-semibold text-gray-700 leading-tight truncate" title={nombre}>
            {nombre}
          </div>
        </div>
      )}
    </div>
  );
}

function ChangePasswordModal({ open, onClose }) {
  const { changePassword } = useAuth();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (pwd.length < 6) return setErr('Mínimo 6 caracteres');
    if (pwd !== pwd2) return setErr('Las contraseñas no coinciden');
    setLoading(true);
    const { error } = await changePassword(pwd);
    setLoading(false);
    if (error) return setErr(error.message);
    setMsg('Contraseña actualizada');
    setPwd(''); setPwd2('');
    setTimeout(onClose, 1200);
  };

  return (
    <Modal open={open} onClose={onClose} title="Cambiar contraseña" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</div>}
        {msg && <div className="text-sm text-green-700 bg-green-50 p-2 rounded">{msg}</div>}
        <Input label="Nueva contraseña" type="password" value={pwd} onChange={e => setPwd(e.target.value)} />
        <Input label="Confirmar contraseña" type="password" value={pwd2} onChange={e => setPwd2(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" loading={loading}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

// Hook para que App.jsx ajuste el padding del contenido principal
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('savantix.sidebar.collapsed') === '1';
  });

  useEffect(() => {
    const handler = () => {
      setCollapsed(localStorage.getItem('savantix.sidebar.collapsed') === '1');
    };
    window.addEventListener('savantix:sidebar-toggle', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('savantix:sidebar-toggle', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return collapsed;
}
