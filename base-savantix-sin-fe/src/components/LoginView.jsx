import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ClipboardList, MapPin, Package } from 'lucide-react';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empresa, setEmpresa] = useState({ logo_url: null, nombre_empresa: '', ruc: '', dv: '' });
  const { signIn } = useAuth();

  useEffect(() => {
    let mounted = true;
    supabase
      .from('configuracion_empresa')
      .select('logo_url, nombre_empresa, ruc, dv')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted && data) setEmpresa(data);
      });
    return () => { mounted = false; };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Ingresa email y contraseña');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: err } = await signIn({ email, password });
      if (err) throw err;
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid_credentials')) {
        setError('Credenciales inválidas');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Debes confirmar tu correo antes de ingresar');
      } else {
        setError(msg || 'Error al iniciar sesión');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ============== LADO IZQUIERDO - HERO CON FOTO + LOGO CLIENTE PROTAGONISTA ============== */}
      <div className="lg:w-1/2 relative overflow-hidden flex flex-col justify-between min-h-[60vh] lg:min-h-screen">

        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/login-bg.jpg')" }}
        />

        {/* Overlay azul Savante para legibilidad y branding */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700/90 via-brand-700/85 to-brand-900/95" />

        {/* CONTENIDO */}
        <div className="relative z-10 p-8 lg:p-12 flex flex-col justify-between flex-1 text-white">

          {/* HEADER: Savantix pequeño arriba */}
          <div className="flex items-center gap-2.5">
            <img
              src="/savante-logo-white.png"
              alt="Savantix"
              className="h-8 w-8 object-contain"
            />
            <div>
              <div className="text-base font-bold leading-tight">Savantix</div>
              <div className="text-[9px] text-brand-200 tracking-widest leading-tight">
                BY SAVANTE SOLUTIONS
              </div>
            </div>
          </div>

          {/* CENTRO: Logo cliente PROTAGONISTA */}
          <div className="text-center my-8 lg:my-0">
            {empresa.logo_url ? (
              <>
                {/* Logo cliente grande con sombra fuerte */}
                <div className="inline-flex items-center justify-center w-48 h-48 lg:w-56 lg:h-56 mb-6 rounded-3xl bg-white/95 shadow-2xl shadow-black/40 overflow-hidden ring-4 ring-white/20">
                  <img
                    src={empresa.logo_url}
                    alt={empresa.nombre_empresa || 'Logo empresa'}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Nombre empresa GRANDE */}
                {empresa.nombre_empresa && (
                  <h1 className="text-3xl lg:text-4xl font-bold mb-2 leading-tight drop-shadow-lg">
                    {empresa.nombre_empresa}
                  </h1>
                )}

                {/* Tagline */}
                <p className="text-brand-100 text-sm tracking-widest font-medium mb-4">
                  TU ALIADO COMERCIAL
                </p>

                {/* Slogan secundario */}
                <p className="text-white/80 text-base lg:text-lg max-w-md mx-auto font-light italic">
                  El sistema que ordena tu taller
                </p>
              </>
            ) : (
              <>
                {/* Fallback si no hay logo cliente: Savantix grande */}
                <div className="inline-flex items-center justify-center w-40 h-40 lg:w-48 lg:h-48 mb-6 rounded-3xl bg-white/10 backdrop-blur-sm border-2 border-white/20 shadow-2xl shadow-black/40">
                  <img
                    src="/savante-logo-white.png"
                    alt="Savante"
                    className="w-24 h-24 lg:w-28 lg:h-28 object-contain"
                  />
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">
                  El sistema que ordena tu taller
                </h1>
                <p className="text-brand-100 text-sm">
                  Configura tu empresa en el panel para personalizar
                </p>
              </>
            )}
          </div>

          {/* FOOTER: features + copyright */}
          <div>
            <div className="flex items-center justify-center gap-6 lg:gap-10 pb-5 mb-5 border-t border-white/15 pt-5">
              <div className="text-center">
                <ClipboardList className="h-5 w-5 mx-auto mb-1 text-brand-200" />
                <div className="text-xs font-medium">Órdenes</div>
              </div>
              <div className="text-center">
                <MapPin className="h-5 w-5 mx-auto mb-1 text-brand-200" />
                <div className="text-xs font-medium">Visitas</div>
              </div>
              <div className="text-center">
                <Package className="h-5 w-5 mx-auto mb-1 text-brand-200" />
                <div className="text-xs font-medium">Inventario</div>
              </div>
            </div>
            <div className="text-center text-brand-200 text-xs">
              © {new Date().getFullYear()} Savantix · Todos los derechos reservados
            </div>
          </div>
        </div>
      </div>

      {/* ============== LADO DERECHO - FORMULARIO ============== */}
      <div className="lg:w-1/2 bg-gray-50 flex items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-md">

          {/* Card del formulario con sombra */}
          <div className="bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-200 overflow-hidden">

            {/* Encabezado */}
            <div className="p-6 pb-4 text-center border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Iniciar sesión</h2>
              <p className="text-sm text-gray-500 mt-1">
                {empresa.nombre_empresa
                  ? `Bienvenido a ${empresa.nombre_empresa}`
                  : 'Ingresa tus credenciales para continuar'}
              </p>
            </div>

            {/* Datos fiscales discretos (si están configurados) */}
            {empresa.ruc && (
              <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                  RUC {empresa.ruc}{empresa.dv ? `-${empresa.dv}` : ''}
                </div>
              </div>
            )}

            {/* Formulario */}
            <form className="p-6 space-y-4" onSubmit={handleLogin}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 focus:bg-white transition-colors"
                    placeholder="usuario@empresa.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 focus:bg-white transition-colors"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full py-2.5 mt-2">
                Ingresar
              </Button>
            </form>

            {/* Footer del card: indicador de estado */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] text-gray-500 font-medium">Sistema en línea</span>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            ¿Olvidaste tu contraseña? Contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
