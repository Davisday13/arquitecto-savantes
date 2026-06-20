import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Plus, Search, Eye, Pencil, Trash2, RefreshCw,
} from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { ESTADOS_PROYECTO, ESTADOS_PROYECTO_LABEL, ESTADOS_PROYECTO_COLOR } from '../lib/constants';
import ProyectoFormModal from './ProyectoFormModal';
import ProyectoDetalleModal from './ProyectoDetalleModal';

export default function ProyectosView({ profile }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detalleId, setDetalleId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    let query = supabase
      .from('v_proyectos_completa')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filtroEstado) query = query.eq('estado', filtroEstado);

    const { data, error } = await query;
    if (!error) setProyectos(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtroEstado]);

  const filtrados = useMemo(() => {
    if (!busqueda) return proyectos;
    const q = busqueda.toLowerCase();
    return proyectos.filter(p =>
      p.codigo?.toLowerCase().includes(q) ||
      p.nombre?.toLowerCase().includes(q) ||
      p.cliente_nombre?.toLowerCase().includes(q) ||
      p.numero_cliente?.toLowerCase().includes(q)
    );
  }, [proyectos, busqueda]);

  const kpis = useMemo(() => ({
    total: proyectos.length,
    enCurso: proyectos.filter(p => p.estado === 'EN_CURSO').length,
    completados: proyectos.filter(p => p.estado === 'COMPLETADO').length,
    cotizacion: proyectos.filter(p => p.estado === 'COTIZACION').length,
    presupuestado: proyectos
      .filter(p => p.estado === 'EN_CURSO' || p.estado === 'COMPLETADO')
      .reduce((s, p) => s + Number(p.presupuesto_total || 0), 0),
  }), [proyectos]);

  const eliminar = async (p) => {
    if (!confirm(`Eliminar proyecto ${p.codigo}?`)) return;
    const { error } = await supabase.from('proyectos').delete().eq('id_proyecto', p.id_proyecto);
    if (error) { alert('Error: ' + error.message); return; }
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-brand-700" />
            Proyectos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gesti&oacute;n de proyectos de arquitectura</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Recargar
          </Button>
          <Button onClick={() => { setEditId(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Nuevo proyecto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><div className="text-xs text-gray-500 uppercase tracking-wider">Total</div><div className="text-2xl font-bold text-gray-900">{kpis.total}</div></Card>
        <Card><div className="text-xs text-amber-600 uppercase tracking-wider">En curso</div><div className="text-2xl font-bold text-amber-700">{kpis.enCurso}</div></Card>
        <Card><div className="text-xs text-green-600 uppercase tracking-wider">Completados</div><div className="text-2xl font-bold text-green-700">{kpis.completados}</div></Card>
        <Card><div className="text-xs text-blue-600 uppercase tracking-wider">Cotizaci&oacute;n</div><div className="text-2xl font-bold text-blue-700">{kpis.cotizacion}</div></Card>
        <Card><div className="text-xs text-emerald-600 uppercase tracking-wider">$ Presupuestado</div><div className="text-2xl font-bold text-emerald-700">{formatCurrency(kpis.presupuestado)}</div></Card>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar proyecto, cliente..." className="pl-8" />
          </div>
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_PROYECTO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-lg font-medium">No hay proyectos</p>
            <p className="text-sm">Crea tu primer proyecto con el bot&oacute;n de arriba</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">C&oacute;digo</th>
                  <th className="px-3 py-2 text-left">Proyecto</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Inicio</th>
                  <th className="px-3 py-2 text-left">Entrega</th>
                  <th className="px-3 py-2 text-right">Presupuesto</th>
                  <th className="px-3 py-2 text-right">Pagado</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-center">Avance</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((p) => {
                  const badge = ESTADOS_PROYECTO_COLOR[p.estado] || ESTADOS_PROYECTO_COLOR.COTIZACION;
                  const avance = Number(p.porcentaje_avance_general || 0);
                  return (
                    <tr key={p.id_proyecto} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono font-medium text-brand-700 whitespace-nowrap">{p.codigo}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{p.nombre}</div>
                        {p.descripcion && <div className="text-xs text-gray-500 truncate max-w-xs">{p.descripcion}</div>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-gray-900">{p.cliente_nombre}</div>
                        <div className="text-xs text-gray-500">{p.numero_cliente}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.fecha_inicio ? formatDate(p.fecha_inicio) : '-'}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.fecha_estimada_entrega ? formatDate(p.fecha_estimada_entrega) : '-'}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(p.presupuesto_total)}</td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-700">{formatCurrency(p.total_pagado)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${badge}`}>
                          {ESTADOS_PROYECTO_LABEL[p.estado] || p.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${avance}%` }} />
                          </div>
                          <span className="text-xs font-medium">{avance.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setDetalleId(p.id_proyecto)} className="p-1 hover:bg-gray-200 rounded text-brand-700" title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </button>
                          {(p.estado === 'COTIZACION' || p.estado === 'EN_CURSO') && (
                            <button onClick={() => { setEditId(p.id_proyecto); setShowForm(true); }} className="p-1 hover:bg-gray-200 rounded text-blue-700" title="Editar">
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {(profile?.rol === 'ROOT' || profile?.rol === 'ADMIN') && p.estado === 'COTIZACION' && (
                            <button onClick={() => eliminar(p)} className="p-1 hover:bg-red-100 rounded text-red-700" title="Eliminar">
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
        <ProyectoFormModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditId(null); cargar(); }}
          proyectoId={editId}
          profile={profile}
        />
      )}

      {detalleId && (
        <ProyectoDetalleModal
          open={!!detalleId}
          onClose={() => { setDetalleId(null); cargar(); }}
          proyectoId={detalleId}
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
