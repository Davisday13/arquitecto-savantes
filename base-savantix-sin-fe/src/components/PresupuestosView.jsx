import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Plus, Search, Eye, Pencil, Trash2, RefreshCw,
  AlertCircle, CheckCircle2, XCircle, Clock, Send, Wrench, MapPin, ShoppingCart,
} from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import PresupuestoFormModal from './PresupuestoFormModal';
import PresupuestoDetalleModal from './PresupuestoDetalleModal';

const ESTADO_BADGES = {
  BORRADOR:    { label: 'Borrador',    cls: 'bg-gray-100 text-gray-700',         icon: Pencil },
  ENVIADO:     { label: 'Enviado',     cls: 'bg-blue-100 text-blue-800',         icon: Send },
  APROBADO:    { label: 'Aprobado',    cls: 'bg-emerald-100 text-emerald-800',   icon: CheckCircle2 },
  RECHAZADO:   { label: 'Rechazado',   cls: 'bg-red-100 text-red-800',           icon: XCircle },
  VENCIDO:     { label: 'Vencido',     cls: 'bg-amber-100 text-amber-800',       icon: Clock },
  CONVERTIDO:  { label: 'Convertido',  cls: 'bg-purple-100 text-purple-800',     icon: CheckCircle2 },
  CANCELADO:   { label: 'Cancelado',   cls: 'bg-gray-200 text-gray-600',         icon: XCircle },
};

const TIPO_DESTINO_INFO = {
  TALLER:        { label: 'Taller',        icon: Wrench,       cls: 'text-blue-700' },
  VISITA:        { label: 'Visita',        icon: MapPin,       cls: 'text-emerald-700' },
  VENTA_DIRECTA: { label: 'Venta directa', icon: ShoppingCart, cls: 'text-purple-700' },
};

export default function PresupuestosView({ profile }) {
  const [presupuestos, setPresupuestos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detalleId, setDetalleId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    let query = supabase
      .from('v_presupuestos_completa')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filtroEstado) query = query.eq('estado', filtroEstado);
    if (filtroTipo) query = query.eq('tipo_destino', filtroTipo);
    if (fechaDesde) query = query.gte('fecha_emision', fechaDesde);
    if (fechaHasta) query = query.lte('fecha_emision', fechaHasta);

    const { data, error } = await query;
    if (!error) setPresupuestos(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtroEstado, filtroTipo, fechaDesde, fechaHasta]);

  // Marcar automáticamente como VENCIDOS los que pasaron su fecha
  useEffect(() => {
    const venceHoy = presupuestos.filter(
      p => (p.estado === 'BORRADOR' || p.estado === 'ENVIADO') && p.dias_para_vencer < 0
    );
    if (venceHoy.length > 0) {
      // Marcar como vencidos en BD (sin liberar stock porque no estaban aprobados)
      Promise.all(
        venceHoy.map(p =>
          supabase.from('presupuestos').update({ estado: 'VENCIDO' }).eq('id_presupuesto', p.id_presupuesto)
        )
      ).then(() => cargar());
    }
  }, [presupuestos.length]); // eslint-disable-line

  // Búsqueda en cliente
  const filtrados = useMemo(() => {
    if (!busqueda) return presupuestos;
    const q = busqueda.toLowerCase();
    return presupuestos.filter(p =>
      p.numero_presupuesto?.toLowerCase().includes(q) ||
      p.cliente_nombre?.toLowerCase().includes(q) ||
      p.numero_cliente?.toLowerCase().includes(q) ||
      p.asunto?.toLowerCase().includes(q)
    );
  }, [presupuestos, busqueda]);

  // KPIs
  const kpis = useMemo(() => {
    const hoy = new Date();
    return {
      total: presupuestos.length,
      borrador: presupuestos.filter(p => p.estado === 'BORRADOR').length,
      enviados: presupuestos.filter(p => p.estado === 'ENVIADO').length,
      aprobados: presupuestos.filter(p => p.estado === 'APROBADO').length,
      porVencer: presupuestos.filter(p =>
        (p.estado === 'BORRADOR' || p.estado === 'ENVIADO') &&
        p.dias_para_vencer >= 0 && p.dias_para_vencer <= 3
      ).length,
      montoAprobado: presupuestos
        .filter(p => p.estado === 'APROBADO' || p.estado === 'CONVERTIDO')
        .reduce((s, p) => s + Number(p.total_general || 0), 0),
    };
  }, [presupuestos]);

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar presupuesto ${p.numero_presupuesto}?\nEsta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('presupuestos').delete().eq('id_presupuesto', p.id_presupuesto);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    cargar();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-700" />
            Presupuestos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cotizaciones que se pueden convertir a Orden, Visita o Venta Directa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Recargar
          </Button>
          <Button onClick={() => { setEditId(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Nuevo presupuesto
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Total</div>
          <div className="text-2xl font-bold text-gray-900">{kpis.total}</div>
        </Card>
        <Card>
          <div className="text-xs text-blue-600 uppercase tracking-wider">Enviados</div>
          <div className="text-2xl font-bold text-blue-700">{kpis.enviados}</div>
        </Card>
        <Card>
          <div className="text-xs text-emerald-600 uppercase tracking-wider">Aprobados</div>
          <div className="text-2xl font-bold text-emerald-700">{kpis.aprobados}</div>
        </Card>
        <Card>
          <div className="text-xs text-amber-600 uppercase tracking-wider">Por vencer</div>
          <div className="text-2xl font-bold text-amber-700">{kpis.porVencer}</div>
          <div className="text-xs text-amber-600 mt-1">en próximos 3 días</div>
        </Card>
        <Card>
          <div className="text-xs text-emerald-600 uppercase tracking-wider">$ Aprobado</div>
          <div className="text-2xl font-bold text-emerald-700">{formatCurrency(kpis.montoAprobado)}</div>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="N°, cliente, asunto..."
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ESTADO_BADGES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
            <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(TIPO_DESTINO_INFO).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-lg font-medium">No hay presupuestos</p>
            <p className="text-sm">Crea tu primer presupuesto con el botón de arriba</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">N°</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Asunto</th>
                  <th className="px-3 py-2 text-left">Emisión</th>
                  <th className="px-3 py-2 text-left">Validez</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((p) => {
                  const badge = ESTADO_BADGES[p.estado] || ESTADO_BADGES.BORRADOR;
                  const StatusIcon = badge.icon;
                  const tipoInfo = TIPO_DESTINO_INFO[p.tipo_destino] || {};
                  const TipoIcon = tipoInfo.icon || FileText;
                  const porVencer = (p.estado === 'BORRADOR' || p.estado === 'ENVIADO') &&
                                    p.dias_para_vencer >= 0 && p.dias_para_vencer <= 3;

                  return (
                    <tr key={p.id_presupuesto} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono font-medium text-brand-700 whitespace-nowrap">
                        {p.numero_presupuesto}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{p.cliente_nombre}</div>
                        {p.numero_cliente && <div className="text-xs text-gray-500">{p.numero_cliente}</div>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 ${tipoInfo.cls}`}>
                          <TipoIcon className="h-4 w-4" />
                          <span className="text-xs">{tipoInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-xs truncate" title={p.asunto}>
                        {p.asunto || <span className="text-gray-400 italic">Sin asunto</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {formatDate(p.fecha_emision)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-gray-600">{formatDate(p.fecha_validez)}</div>
                        {porVencer && (
                          <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {p.dias_para_vencer === 0 ? 'Vence hoy' : `Vence en ${p.dias_para_vencer}d`}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {formatCurrency(p.total_general)}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
                          <StatusIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetalleId(p.id_presupuesto)}
                            className="p-1 hover:bg-gray-200 rounded text-brand-700"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {p.estado === 'BORRADOR' && (
                            <button
                              onClick={() => { setEditId(p.id_presupuesto); setShowForm(true); }}
                              className="p-1 hover:bg-gray-200 rounded text-blue-700"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {(profile?.rol === 'ROOT' || profile?.rol === 'ADMIN') &&
                           p.estado === 'BORRADOR' && (
                            <button
                              onClick={() => eliminar(p)}
                              className="p-1 hover:bg-red-100 rounded text-red-700"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modales */}
      {showForm && (
        <PresupuestoFormModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditId(null); cargar(); }}
          presupuestoId={editId}
          profile={profile}
        />
      )}

      {detalleId && (
        <PresupuestoDetalleModal
          open={!!detalleId}
          onClose={() => { setDetalleId(null); cargar(); }}
          presupuestoId={detalleId}
          profile={profile}
          onEditar={(id) => {
            setDetalleId(null);
            setEditId(id);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}
