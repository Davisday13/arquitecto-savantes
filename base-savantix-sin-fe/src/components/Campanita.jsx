import React, { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, Clock, Calendar, DollarSign, Wrench, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';

/**
 * Campanita de notificaciones en el navbar.
 *
 * Lee la vista v_alertas_pendientes de Supabase, que calcula al vuelo:
 * - Órdenes estancadas (RECIBIDO/EN_DIAGNOSTICO por +N días)
 * - Equipos REPARADOS sin retirar (+N días)
 * - Presupuestos por vencer (1 y 3 días antes)
 * - Pagos pendientes (entregadas con saldo +N días)
 * - Visitas programadas hoy/mañana
 *
 * Refresca automáticamente cada 60 segundos.
 */
export default function Campanita({ profile, setCurrentView }) {
  const [alertas, setAlertas] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    // El profile puede tener `id` o `id_usuario` según cómo se cargó
    const userId = profile?.id || profile?.id_usuario;
    if (!userId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('v_alertas_pendientes')
        .select('*')
        .order('prioridad', { ascending: false })
        .order('dias_transcurridos', { ascending: false })
        .limit(50);

      // Si NO es ROOT/ADMIN, filtrar solo las del usuario responsable
      if (!['ROOT', 'ADMIN'].includes(profile.rol)) {
        query = query.eq('id_responsable', userId);
      }

      const { data, error } = await query;
      if (error) console.error('Campanita error:', error);
      setAlertas(data || []);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    cargar();
    // Refresh cada 60 segundos
    const interval = setInterval(cargar, 60000);
    return () => clearInterval(interval);
  }, [cargar]);

  const total = alertas.length;
  const altas = alertas.filter(a => a.prioridad === 'alta').length;

  const irA = (alerta) => {
    setOpen(false);
    const map = {
      ORDEN: 'ordenes',
      VISITA: 'visitas',
      PRESUPUESTO: 'presupuestos',
    };
    const view = map[alerta.ref_tipo];
    if (view) setCurrentView(view);
  };

  const verTodas = () => {
    setOpen(false);
    setCurrentView('notificaciones');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md hover:bg-brand-600 transition-colors"
        title="Notificaciones"
      >
        <Bell className="h-5 w-5 text-white" />
        {total > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${altas > 0 ? 'bg-red-500' : 'bg-amber-500'}`}>
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 max-h-[500px] bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
                <p className="text-xs text-gray-500">
                  {total === 0 ? 'Todo al día' : `${total} pendiente${total === 1 ? '' : 's'}`}
                  {altas > 0 && ` · ${altas} urgente${altas === 1 ? '' : 's'}`}
                </p>
              </div>
              <button
                onClick={cargar}
                className="text-xs text-brand-700 hover:underline"
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {alertas.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm">No tienes notificaciones</p>
                  <p className="text-xs text-gray-400 mt-1">Todo está al día. ¡Buen trabajo!</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {alertas.slice(0, 10).map((a, idx) => (
                    <li key={`${a.tipo}-${a.ref_id}-${idx}`}>
                      <button
                        onClick={() => irA(a)}
                        className="w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors flex items-start gap-3"
                      >
                        <IconoPorTipo tipo={a.tipo} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {a.prioridad === 'alta' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                                URGENTE
                              </span>
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {a.titulo}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{a.mensaje}</p>
                          {a.cliente_nombre && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              Cliente: {a.cliente_nombre}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {alertas.length > 0 && (
              <div className="px-4 py-2 border-t bg-gray-50">
                <button
                  onClick={verTodas}
                  className="w-full text-center text-sm text-brand-700 hover:underline"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function IconoPorTipo({ tipo }) {
  const config = {
    ORDEN_ESTANCADA: { Icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    REPARADO_SIN_RETIRAR: { Icon: Wrench, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    PRESUPUESTO_VENCE: { Icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    PAGO_PENDIENTE: { Icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-100' },
    VISITA_HOY: { Icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
  };
  const { Icon, color, bg } = config[tipo] || config.ORDEN_ESTANCADA;

  return (
    <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
  );
}
