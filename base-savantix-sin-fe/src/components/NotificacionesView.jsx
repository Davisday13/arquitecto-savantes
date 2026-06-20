import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Calendar, DollarSign, Wrench, Bell, RefreshCcw, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, Badge } from './ui/Card';
import Button from './ui/Button';

/**
 * Vista completa del centro de notificaciones / alertas pendientes.
 *
 * Muestra todas las alertas con filtros por tipo y prioridad.
 * Click en una alerta → navega al objeto referenciado.
 */
export default function NotificacionesView({ profile, setCurrentView }) {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroPrioridad, setFiltroPrioridad] = useState('TODAS');

  const cargar = async () => {
    const userId = profile?.id || profile?.id_usuario;
    if (!userId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('v_alertas_pendientes')
        .select('*')
        .order('prioridad', { ascending: false })
        .order('dias_transcurridos', { ascending: false });

      if (!['ROOT', 'ADMIN'].includes(profile.rol)) {
        query = query.eq('id_responsable', userId);
      }

      const { data, error } = await query;
      if (error) console.error('NotificacionesView error:', error);
      setAlertas(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [profile]);

  const filtradas = alertas.filter(a => {
    if (filtroTipo !== 'TODOS' && a.tipo !== filtroTipo) return false;
    if (filtroPrioridad !== 'TODAS' && a.prioridad !== filtroPrioridad) return false;
    return true;
  });

  const conteos = {
    TODAS: alertas.length,
    ALTA: alertas.filter(a => a.prioridad === 'alta').length,
    ORDEN_ESTANCADA: alertas.filter(a => a.tipo === 'ORDEN_ESTANCADA').length,
    REPARADO_SIN_RETIRAR: alertas.filter(a => a.tipo === 'REPARADO_SIN_RETIRAR').length,
    PRESUPUESTO_VENCE: alertas.filter(a => a.tipo === 'PRESUPUESTO_VENCE').length,
    PAGO_PENDIENTE: alertas.filter(a => a.tipo === 'PAGO_PENDIENTE').length,
    VISITA_HOY: alertas.filter(a => a.tipo === 'VISITA_HOY').length,
  };

  const tipos = [
    { id: 'TODOS', label: 'Todas', count: conteos.TODAS },
    { id: 'ORDEN_ESTANCADA', label: 'Estancadas', count: conteos.ORDEN_ESTANCADA },
    { id: 'REPARADO_SIN_RETIRAR', label: 'Sin retirar', count: conteos.REPARADO_SIN_RETIRAR },
    { id: 'PRESUPUESTO_VENCE', label: 'Por vencer', count: conteos.PRESUPUESTO_VENCE },
    { id: 'PAGO_PENDIENTE', label: 'Pagos', count: conteos.PAGO_PENDIENTE },
    { id: 'VISITA_HOY', label: 'Visitas', count: conteos.VISITA_HOY },
  ];

  const irA = (alerta) => {
    const map = {
      ORDEN: 'ordenes',
      VISITA: 'visitas',
      PRESUPUESTO: 'presupuestos',
    };
    const view = map[alerta.ref_tipo];
    if (view) setCurrentView(view);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-7 w-7 text-brand-700" />
            Notificaciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {alertas.length === 0
              ? 'Todo está al día. ¡Buen trabajo!'
              : `${alertas.length} alerta${alertas.length === 1 ? '' : 's'} pendiente${alertas.length === 1 ? '' : 's'}`
            }
            {conteos.ALTA > 0 && ` · ${conteos.ALTA} urgente${conteos.ALTA === 1 ? '' : 's'}`}
          </p>
        </div>
        <Button variant="outline" onClick={cargar} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros tipo */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            {tipos.map(t => (
              <button
                key={t.id}
                onClick={() => setFiltroTipo(t.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  filtroTipo === t.id
                    ? 'bg-brand-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.label} <span className="ml-1 opacity-75">({t.count})</span>
              </button>
            ))}
            <div className="border-l border-gray-300 mx-1" />
            <button
              onClick={() => setFiltroPrioridad(filtroPrioridad === 'alta' ? 'TODAS' : 'alta')}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1 ${
                filtroPrioridad === 'alta'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Solo urgentes ({conteos.ALTA})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading && alertas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay notificaciones con los filtros aplicados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtradas.map((a, idx) => (
            <button
              key={`${a.tipo}-${a.ref_id}-${idx}`}
              onClick={() => irA(a)}
              className="w-full text-left bg-white rounded-lg border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all p-4 flex items-start gap-4"
            >
              <IconoTipo tipo={a.tipo} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">{a.titulo}</h3>
                  {a.prioridad === 'alta' && (
                    <Badge color="red" className="shrink-0">Urgente</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{a.mensaje}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {a.ref_numero && (
                    <span className="font-mono font-semibold text-brand-700">{a.ref_numero}</span>
                  )}
                  {a.cliente_nombre && (
                    <span>👤 {a.cliente_nombre}</span>
                  )}
                  {a.estado_actual && (
                    <Badge color="gray">{a.estado_actual}</Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconoTipo({ tipo }) {
  const config = {
    ORDEN_ESTANCADA: { Icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    REPARADO_SIN_RETIRAR: { Icon: Wrench, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    PRESUPUESTO_VENCE: { Icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    PAGO_PENDIENTE: { Icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-100' },
    VISITA_HOY: { Icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
  };
  const { Icon, color, bg } = config[tipo] || config.ORDEN_ESTANCADA;
  return (
    <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
  );
}
