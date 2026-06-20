import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Plus, Search, Eye, Pencil, Trash2, RefreshCw,
  Send, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { ESTADOS_COTIZACION, ESTADOS_COTIZACION_LABEL, ESTADOS_COTIZACION_COLOR } from '../lib/constants';
import CotizacionFormModal from './CotizacionFormModal';

export default function CotizacionesView({ profile }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detalleId, setDetalleId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    let query = supabase
      .from('v_cotizaciones_completa')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filtroEstado) query = query.eq('estado', filtroEstado);

    const { data, error } = await query;
    if (!error) setCotizaciones(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtroEstado]);

  const filtrados = useMemo(() => {
    if (!busqueda) return cotizaciones;
    const q = busqueda.toLowerCase();
    return cotizaciones.filter(c =>
      c.numero_cotizacion?.toLowerCase().includes(q) ||
      c.cliente_nombre?.toLowerCase().includes(q) ||
      c.asunto?.toLowerCase().includes(q) ||
      c.proyecto_nombre?.toLowerCase().includes(q)
    );
  }, [cotizaciones, busqueda]);

  const kpis = useMemo(() => ({
    total: cotizaciones.length,
    enviados: cotizaciones.filter(c => c.estado === 'ENVIADO').length,
    aprobados: cotizaciones.filter(c => c.estado === 'APROBADO').length,
    porVencer: cotizaciones.filter(c =>
      (c.estado === 'BORRADOR' || c.estado === 'ENVIADO') &&
      c.dias_para_vencer >= 0 && c.dias_para_vencer <= 3
    ).length,
    montoAprobado: cotizaciones
      .filter(c => c.estado === 'APROBADO' || c.estado === 'CONVERTIDO')
      .reduce((s, c) => s + Number(c.total_general || 0), 0),
  }), [cotizaciones]);

  const eliminar = async (c) => {
    if (!confirm(`Eliminar cotizaci\u00f3n ${c.numero_cotizacion}?`)) return;
    await supabase.from('cotizaciones').delete().eq('id_cotizacion', c.id_cotizacion);
    cargar();
  };

  const convertirAProyecto = async (c) => {
    if (!confirm(`Convertir cotizaci\u00f3n ${c.numero_cotizacion} en proyecto?`)) return;
    const { data, error } = await supabase.from('proyectos').insert({
      nombre: c.asunto || c.cliente_nombre + ' - Proyecto',
      id_cliente: c.id_cliente,
      estado: 'COTIZACION',
      presupuesto_total: c.total_general || 0,
      created_by: profile?.id,
    }).select().single();
    if (error) return alert('Error: ' + error.message);
    await supabase.from('cotizaciones').update({
      estado: 'CONVERTIDO',
      id_proyecto_generado: data.id_proyecto,
    }).eq('id_cotizacion', c.id_cotizacion);
    alert(`Proyecto ${data.codigo} creado desde cotizaci\u00f3n`);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-700" />
            Cotizaciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">Cotizaciones para proyectos de arquitectura</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Recargar
          </Button>
          <Button onClick={() => { setEditId(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Nueva cotizaci&oacute;n
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><div className="text-xs text-gray-500 uppercase">Total</div><div className="text-2xl font-bold">{kpis.total}</div></Card>
        <Card><div className="text-xs text-blue-600 uppercase">Enviados</div><div className="text-2xl font-bold text-blue-700">{kpis.enviados}</div></Card>
        <Card><div className="text-xs text-emerald-600 uppercase">Aprobados</div><div className="text-2xl font-bold text-emerald-700">{kpis.aprobados}</div></Card>
        <Card><div className="text-xs text-amber-600 uppercase">Por vencer</div><div className="text-2xl font-bold text-amber-700">{kpis.porVencer}</div></Card>
        <Card><div className="text-xs text-emerald-600 uppercase">$ Aprobado</div><div className="text-2xl font-bold text-emerald-700">{formatCurrency(kpis.montoAprobado)}</div></Card>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="N°, cliente, proyecto, asunto..." className="pl-8" />
          </div>
          <Select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_COTIZACION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-lg font-medium">No hay cotizaciones</p>
            <p className="text-sm">Crea tu primera cotizaci&oacute;n</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">N°</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Proyecto</th>
                  <th className="px-3 py-2 text-left">Asunto</th>
                  <th className="px-3 py-2 text-left">Emisi&oacute;n</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(c => {
                  const badge = ESTADOS_COTIZACION_COLOR[c.estado] || ESTADOS_COTIZACION_COLOR.BORRADOR;
                  return (
                    <tr key={c.id_cotizacion} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono font-medium text-brand-700">{c.numero_cotizacion}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{c.cliente_nombre}</div>
                        <div className="text-xs text-gray-500">{c.numero_cliente}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{c.proyecto_nombre || '-'}</td>
                      <td className="px-3 py-2 max-w-xs truncate">{c.asunto || <span className="text-gray-400 italic">-</span>}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDate(c.fecha_emision)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(c.total_general)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${badge}`}>
                          {ESTADOS_COTIZACION_LABEL[c.estado] || c.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setDetalleId(c.id_cotizacion)} className="p-1 hover:bg-gray-200 rounded text-brand-700" title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </button>
                          {c.estado === 'BORRADOR' && (
                            <button onClick={() => { setEditId(c.id_cotizacion); setShowForm(true); }} className="p-1 hover:bg-gray-200 rounded text-blue-700" title="Editar">
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {c.estado === 'APROBADO' && (
                            <button onClick={() => convertirAProyecto(c)} className="p-1 hover:bg-gray-200 rounded text-emerald-700" title="Convertir a proyecto">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {c.estado === 'BORRADOR' && (profile?.rol === 'ROOT' || profile?.rol === 'ADMIN') && (
                            <button onClick={() => eliminar(c)} className="p-1 hover:bg-red-100 rounded text-red-700" title="Eliminar">
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

      {showForm && (
        <CotizacionFormModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditId(null); cargar(); }}
          cotizacionId={editId}
          profile={profile}
        />
      )}

      {detalleId && (
        <CotizacionDetalleModal
          open={!!detalleId}
          onClose={() => { setDetalleId(null); cargar(); }}
          cotizacionId={detalleId}
          profile={profile}
        />
      )}
    </div>
  );
}

function CotizacionDetalleModal({ open, onClose, cotizacionId, profile }) {
  const [data, setData] = useState(null);
  const [items, setItems] = useState([]);
  const [empresa, setEmpresa] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !cotizacionId) return;
    setLoading(true);
    Promise.all([
      supabase.from('v_cotizaciones_completa').select('*').eq('id_cotizacion', cotizacionId).single(),
      supabase.from('cotizacion_items').select('*').eq('id_cotizacion', cotizacionId).order('orden'),
      supabase.from('configuracion_empresa').select('*').eq('id', 1).single(),
    ]).then(([cRes, iRes, eRes]) => {
      if (cRes.data) setData(cRes.data);
      setItems(iRes.data || []);
      if (eRes.data) setEmpresa(eRes.data);
      setLoading(false);
    });
  }, [open, cotizacionId]);

  const cambiarEstado = async (estado) => {
    await supabase.from('cotizaciones').update({ estado }).eq('id_cotizacion', cotizacionId);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 mb-10" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          {loading || !data ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{data.numero_cotizacion}</h2>
                <span className={`inline-flex px-3 py-1 rounded text-sm font-medium ${ESTADOS_COTIZACION_COLOR[data.estado]}`}>
                  {ESTADOS_COTIZACION_LABEL[data.estado]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Cliente:</span> <strong>{data.cliente_nombre}</strong></div>
                <div><span className="text-gray-500">Proyecto:</span> {data.proyecto_nombre || '-'}</div>
                <div><span className="text-gray-500">Emisi&oacute;n:</span> {formatDate(data.fecha_emision)}</div>
                <div><span className="text-gray-500">Validez:</span> {formatDate(data.fecha_validez)}</div>
              </div>

              {data.asunto && <div className="text-sm"><span className="text-gray-500">Asunto:</span> {data.asunto}</div>}

              <div className="border-t pt-3">
                <h3 className="text-sm font-semibold mb-2">Items ({items.length})</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-2 py-1 text-left">Descripci&oacute;n</th><th className="px-2 py-1 text-right">Cant.</th><th className="px-2 py-1 text-right">Precio</th><th className="px-2 py-1 text-right">Subtotal</th></tr></thead>
                  <tbody className="divide-y">
                    {items.map(it => (
                      <tr key={it.id_item}>
                        <td className="px-2 py-1">{it.descripcion}</td>
                        <td className="px-2 py-1 text-right">{Number(it.cantidad).toFixed(2)}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(it.precio_unitario)}</td>
                        <td className="px-2 py-1 text-right font-medium">{formatCurrency(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-emerald-50 rounded p-3 text-right">
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-2xl font-bold text-emerald-700">{formatCurrency(data.total_general)}</div>
              </div>

              {data.observaciones && <div className="text-sm bg-gray-50 p-3 rounded"><strong>Observaciones:</strong><br/>{data.observaciones}</div>}
              {data.condiciones && <div className="text-sm bg-gray-50 p-3 rounded"><strong>Condiciones:</strong><br/>{data.condiciones}</div>}

              <div className="flex justify-end gap-2 pt-3 border-t">
                {data.estado === 'BORRADOR' && <Button size="sm" variant="outline" onClick={() => cambiarEstado('ENVIADO')}><Send className="h-3 w-3" /> Marcar enviado</Button>}
                {(data.estado === 'BORRADOR' || data.estado === 'ENVIADO') && <Button size="sm" variant="outline" className="!border-emerald-600 !text-emerald-700" onClick={() => cambiarEstado('APROBADO')}><CheckCircle2 className="h-3 w-3" /> Aprobar</Button>}
                {(data.estado === 'BORRADOR' || data.estado === 'ENVIADO') && <Button size="sm" variant="outline" className="!border-red-600 !text-red-700" onClick={() => cambiarEstado('RECHAZADO')}><XCircle className="h-3 w-3" /> Rechazar</Button>}
                <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
