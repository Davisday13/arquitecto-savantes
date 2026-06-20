import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { ESTADOS_PROYECTO } from '../lib/constants';
import { Card, Badge } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input, Select, Textarea } from './ui/Input';
import {
  Plus, Search, Eye, Edit, Trash2, FolderOpen,
  GripVertical, ArrowUpDown,
} from 'lucide-react';
import ClienteRapidoModal from './ClienteRapidoModal';

const COLORS_ESTADO = { COTIZACION: 'yellow', EN_CURSO: 'blue', PAUSADO: 'orange', FINALIZADO: 'green', CANCELADO: 'red' };

export default function ProyectosView() {
  const { profile } = useAuth();
  const [proyectos, setProyectos] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetalle, setShowDetalle] = useState(null);
  const [showAvance, setShowAvance] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('v_proyectos_completa')
      .select('*').order('created_at', { ascending: false });
    setProyectos(data || []);
    const { data: s } = await supabase.from('v_estadisticas_proyectos').select('*').single();
    setStats(s || {});
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = proyectos.filter(p => {
    if (filtroEstado && p.estado !== filtroEstado) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.nombre?.toLowerCase().includes(q) && !p.numero_proyecto?.toLowerCase().includes(q) && !p.cliente_nombre?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este proyecto y todos sus datos asociados?')) return;
    await supabase.from('proyectos').delete().eq('id_proyecto', id);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FolderOpen className="h-6 w-6 text-brand-700" /> Proyectos</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Nuevo proyecto</Button>
      </div>

      {showForm && <ProyectoWizardModal open={showForm} onClose={() => { setShowForm(false); cargar(); }} profile={profile} />}
      {showDetalle && <ProyectoDetalleModal open={!!showDetalle} onClose={() => { setShowDetalle(null); cargar(); }} proyecto={showDetalle} profile={profile} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><div className="text-xs text-gray-500">Total</div><div className="text-2xl font-bold">{stats.total_proyectos || 0}</div></Card>
        <Card><div className="text-xs text-amber-600">Cotización</div><div className="text-2xl font-bold text-amber-700">{stats.en_cotizacion || 0}</div></Card>
        <Card><div className="text-xs text-blue-600">En curso</div><div className="text-2xl font-bold text-blue-700">{stats.en_curso || 0}</div></Card>
        <Card><div className="text-xs text-emerald-600">Completados</div><div className="text-2xl font-bold text-emerald-700">{stats.completados || 0}</div></Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proyectos..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="text-sm border border-gray-300 rounded-md px-3 py-2">
            <option value="">Todos los estados</option>
            {ESTADOS_PROYECTO.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-8 text-gray-400"><FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Sin proyectos</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                  <th className="py-2.5 px-3 font-medium">#</th>
                  <th className="py-2.5 px-3 font-medium">Proyecto</th>
                  <th className="py-2.5 px-3 font-medium">Cliente</th>
                  <th className="py-2.5 px-3 font-medium">Estado</th>
                  <th className="py-2.5 px-3 font-medium text-right">Monto</th>
                  <th className="py-2.5 px-3 font-medium text-right">Avance</th>
                  <th className="py-2.5 px-3 font-medium text-right">Pago</th>
                  <th className="py-2.5 px-3 font-medium text-right">Brecha</th>
                  <th className="py-2.5 px-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id_proyecto} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{p.numero_proyecto}</td>
                    <td className="py-2.5 px-3 font-medium">{p.nombre}</td>
                    <td className="py-2.5 px-3 text-gray-600">{p.cliente_nombre}</td>
                    <td className="py-2.5 px-3"><Badge color={COLORS_ESTADO[p.estado] || 'gray'}>{p.estado}</Badge></td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(p.monto_total)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{Number(p.avance_pct || 0).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right">{Number(p.pago_pct || 0).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-mono text-xs ${(p.brecha || 0) > 0 ? 'text-amber-600' : (p.brecha || 0) < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {p.brecha > 0 ? '+' : ''}{Number(p.brecha || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setShowAvance(p)} className="px-2 py-1 text-xs bg-brand-700 text-white rounded hover:bg-brand-800 font-medium">Avance</button>
                        <button onClick={() => setShowDetalle(p)} className="p-1.5 hover:bg-blue-50 rounded text-blue-700" title="Ver detalle"><Eye className="h-4 w-4" /></button>
                        {p.estado === 'COTIZACION' && (
                          <button onClick={() => { setShowForm(false); }} className="p-1.5 hover:bg-amber-50 rounded text-amber-600" title="Editar"><Edit className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => handleEliminar(p.id_proyecto)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {showAvance && <AvanceModal open={!!showAvance} onClose={() => { setShowAvance(null); cargar(); }} proyecto={showAvance} />}
    </div>
  );
}

// =============================================================
// WIZARD DE CREACIÓN DE PROYECTO (con etapas/sub-etapas)
// =============================================================
function ProyectoWizardModal({ open, onClose, profile }) {
  const [step, setStep] = useState(1);
  const [clientes, setClientes] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id_cliente: '', nombre: '', descripcion: '', estado: 'COTIZACION',
    moneda: 'PAB', fecha_inicio: '', fecha_fin_est: '',
  });

  const [etapas, setEtapas] = useState([
    { id: 1, nombre: 'Obra', tipo: 'OBRA', orden: 0, peso_pct: 100,
      sub_etapas: [
        { id: 11, nombre: 'Fase 1', orden: 0, peso_pct: 100, monto: 0 },
      ] },
  ]);
  const [showFormCliente, setShowFormCliente] = useState(false);

  useEffect(() => {
    if (open) supabase.from('clientes').select('*').eq('activo', true).order('nombre').then(({ data }) => setClientes(data || []));
  }, [open]);

  const nextId = (arr) => Math.max(0, ...arr.map(x => x.id || 0)) + 1;

  const addEtapa = (tipo) => {
    const id = nextId(etapas);
    setEtapas([...etapas, { id, nombre: tipo === 'DISENO' ? 'Diseño' : 'Obra', tipo, orden: etapas.length, peso_pct: 10, sub_etapas: tipo === 'DISENO' ? [{ id: nextId(etapas.flatMap(e => e.sub_etapas)), nombre: 'Nueva sub-etapa', orden: 0, peso_pct: 100, monto: 0 }] : [] }]);
  };

  const addSubEtapa = (etapaId) => {
    setEtapas(prev => prev.map(e => {
      if (e.id !== etapaId) return e;
      return { ...e, sub_etapas: [...e.sub_etapas, { id: nextId(e.sub_etapas), nombre: 'Nueva sub-etapa', orden: e.sub_etapas.length, peso_pct: 0, monto: 0 }] };
    }));
  };

  const updateSub = (etapaId, subId, field, value) => {
    setEtapas(prev => prev.map(e => {
      if (e.id !== etapaId) return e;
      return { ...e, sub_etapas: e.sub_etapas.map(s => s.id === subId ? { ...s, [field]: value } : s) };
    }));
  };

  const removeSub = (etapaId, subId) => {
    setEtapas(prev => prev.map(e => {
      if (e.id !== etapaId) return e;
      return { ...e, sub_etapas: e.sub_etapas.filter(s => s.id !== subId) };
    }));
  };

  const updateEtapa = (id, field, value) => {
    setEtapas(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeEtapa = (id) => setEtapas(prev => prev.filter(e => e.id !== id));

  // Auto-distribuir pesos de sub-etapas para que sumen 100
  const normalizePesosSub = (etapaId) => {
    setEtapas(prev => prev.map(e => {
      if (e.id !== etapaId) return e;
      const subs = e.sub_etapas;
      const total = subs.reduce((s, x) => s + Number(x.peso_pct || 0), 0);
      if (total === 0) return e;
      return { ...e, sub_etapas: subs.map(s => ({ ...s, peso_pct: (Number(s.peso_pct || 0) / total) * 100 })) };
    }));
  };

  const guardar = async () => {
    setSaving(true);
    try {
      if (!form.id_cliente) { alert('Seleccione un cliente'); setSaving(false); return; }
      if (etapas.length === 0) { alert('Agregue al menos una etapa'); setSaving(false); return; }

      // Obtener correlativo
      const { count } = await supabase.from('proyectos').select('*', { count: 'exact', head: true });
      const num = `P-${String((count || 0) + 1).padStart(4, '0')}`;

      // Crear proyecto
      const { data: proy, error: err1 } = await supabase.from('proyectos').insert({
        numero_proyecto: num, id_cliente: form.id_cliente, nombre: form.nombre,
        descripcion: form.descripcion, estado: form.estado, moneda: form.moneda,
        fecha_inicio: form.fecha_inicio || null, fecha_fin_est: form.fecha_fin_est || null,
        created_by: profile?.id,
      }).select('id_proyecto').single();
      if (err1) throw err1;

      // Crear etapas y sub-etapas
      for (const etapa of etapas) {
        const { data: et, error: err2 } = await supabase.from('proyecto_etapas').insert({
          id_proyecto: proy.id_proyecto, nombre: etapa.nombre, tipo: etapa.tipo,
          orden: etapa.orden, peso_pct: etapa.peso_pct,
        }).select('id_etapa').single();
        if (err2) throw err2;

        if (etapa.sub_etapas.length > 0) {
          const subs = etapa.sub_etapas.map(s => ({
            id_etapa: et.id_etapa, nombre: s.nombre, orden: s.orden,
            peso_pct: s.peso_pct, monto: Number(s.monto || 0),
          }));
          const { error: err3 } = await supabase.from('proyecto_subetapas').insert(subs);
          if (err3) throw err3;
        }
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalMonto = etapas.reduce((s, e) => s + e.sub_etapas.reduce((ss, sub) => ss + Number(sub.monto || 0), 0), 0);
  const totalPeso = etapas.reduce((s, e) => s + Number(e.peso_pct || 0), 0);
  const montoCur = formatCurrency(totalMonto);

  return (
    <Modal open={open} onClose={onClose} title="Nuevo proyecto" size="lg">
      {/* Steps */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-brand-700 font-medium' : 'text-gray-400'}`}><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-brand-700 text-white' : 'bg-gray-200'}`}>1</span> Cliente</div>
        <div className="flex-1 h-px bg-gray-200" />
        <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-brand-700 font-medium' : 'text-gray-400'}`}><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-brand-700 text-white' : 'bg-gray-200'}`}>2</span> Proyecto</div>
        <div className="flex-1 h-px bg-gray-200" />
        <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-brand-700 font-medium' : 'text-gray-400'}`}><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-brand-700 text-white' : 'bg-gray-200'}`}>3</span> Etapas</div>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <Select label="Cliente" value={form.id_cliente} onChange={e => setForm({ ...form, id_cliente: e.target.value })}>
            <option value="">Seleccionar cliente</option>
            {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.documento ? `(${c.documento})` : ''}</option>)}
          </Select>
          <Button variant="ghost" onClick={() => setShowFormCliente(true)}><Plus className="h-3 w-3" /> Crear cliente rápido</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <Input label="Nombre del proyecto" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          <Textarea label="Descripción" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha inicio" type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
            <Input label="Fecha fin estimada" type="date" value={form.fecha_fin_est} onChange={e => setForm({ ...form, fecha_fin_est: e.target.value })} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Etapas y sub-etapas</span>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={() => addEtapa('DISENO')}><Plus className="h-3 w-3" /> Diseño</Button>
              <Button size="sm" variant="secondary" onClick={() => addEtapa('OBRA')}><Plus className="h-3 w-3" /> Obra</Button>
            </div>
          </div>

          {etapas.map((etapa, ei) => (
            <div key={etapa.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                <Input value={etapa.nombre} onChange={e => updateEtapa(etapa.id, 'nombre', e.target.value)} className="flex-1" />
                <Input label="Peso %" type="number" step="0.01" value={etapa.peso_pct} onChange={e => updateEtapa(etapa.id, 'peso_pct', Number(e.target.value))} className="w-24" />
                <Badge color={etapa.tipo === 'DISENO' ? 'blue' : 'orange'}>{etapa.tipo}</Badge>
                <button onClick={() => removeEtapa(etapa.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>

              <div className="ml-6 space-y-1.5">
                {etapa.sub_etapas.map(sub => (
                  <div key={sub.id} className="flex items-center gap-2">
                    <ArrowUpDown className="h-3 w-3 text-gray-300" />
                    <Input value={sub.nombre} onChange={e => updateSub(etapa.id, sub.id, 'nombre', e.target.value)} className="flex-1" />
                    <Input label="Peso %" type="number" step="0.01" value={sub.peso_pct} onChange={e => updateSub(etapa.id, sub.id, 'peso_pct', Number(e.target.value))} className="w-20" />
                    <Input label="Monto B/." type="number" step="0.01" min="0" value={sub.monto} onChange={e => updateSub(etapa.id, sub.id, 'monto', Number(e.target.value))} className="w-28" />
                    <button onClick={() => removeSub(etapa.id, sub.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                <Button size="sm" variant="ghost" onClick={() => addSubEtapa(etapa.id)}><Plus className="h-3 w-3" /> Agregar sub-etapa</Button>
              </div>
            </div>
          ))}

          {etapas.length > 0 && (
            <div className="text-right text-sm text-gray-500">
              Total pesos: <strong>{totalPeso.toFixed(1)}%</strong> (debe sumar 100) · Monto total: <strong className="text-brand-700">{montoCur}</strong>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-3 border-t mt-4">
        <Button variant="secondary" onClick={() => { if (step > 1) setStep(step - 1); else onClose(); }}>
          {step > 1 ? 'Atrás' : 'Cancelar'}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)}>Siguiente</Button>
        ) : (
          <Button onClick={guardar} loading={saving}><Plus className="h-4 w-4" /> Crear proyecto</Button>
        )}
      </div>

      <ClienteRapidoModal open={showFormCliente} onClose={() => setShowFormCliente(false)}
        onCreated={(c) => {
          setForm(f => ({ ...f, id_cliente: c.id_cliente }));
          setClientes(prev => [...prev, c]);
          setShowFormCliente(false);
        }} />
    </Modal>
  );
}

// =============================================================
// DETALLE DE PROYECTO — Doble barra avance vs pago
// =============================================================
function ProyectoDetalleModal({ open, onClose, proyecto, profile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editSub, setEditSub] = useState(null); // {id_subetapa, avance_pct}

  const cargarData = useCallback(async () => {
    if (!proyecto) return;
    setLoading(true);
    try {
      const [etapasRes, pagosRes] = await Promise.all([
        supabase.from('proyecto_etapas').select('*').eq('id_proyecto', proyecto.id_proyecto).order('orden'),
        supabase.from('proyecto_pagos').select('*').eq('id_proyecto', proyecto.id_proyecto).order('created_at', { ascending: false }),
      ]);
      const etapas = etapasRes.data || [];
      const idsEtapas = etapas.map(e => e.id_etapa);
      let subs = [];
      if (idsEtapas.length > 0) {
        const subsRes = await supabase.from('proyecto_subetapas').select('*').in('id_etapa', idsEtapas).order('orden');
        subs = subsRes.data || [];
      }
      setData({ etapas, sub_etapas: subs, pagos: pagosRes.data || [] });
    } catch (err) {
      console.error('Error cargando detalle:', err);
      setData({ etapas: [], sub_etapas: [], pagos: [] });
    } finally {
      setLoading(false);
    }
  }, [proyecto]);

  useEffect(() => {
    cargarData();
  }, [cargarData]);

  const updateAvance = async (id_subetapa, avance_pct) => {
    await supabase.from('proyecto_subetapas').update({ avance_pct }).eq('id_subetapa', id_subetapa);
    setEditSub(null);
    cargarData();
  };

  const cambiarEstado = async (nuevoEstado) => {
    await supabase.from('proyectos').update({ estado: nuevoEstado }).eq('id_proyecto', proyecto.id_proyecto);
    onClose();
  };

  // Agrupar sub-etapas por etapa
  const etapasConSubs = data?.etapas.map(e => ({
    ...e,
    sub_etapas: (data?.sub_etapas || []).filter(s => s.id_etapa === e.id_etapa),
  })) || [];

  const Barra = ({ pct, label, color }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-12 text-right">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct || 0))}%` }} />
      </div>
      <span className="text-xs font-mono w-12">{(pct || 0).toFixed(1)}%</span>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={`${proyecto.numero_proyecto} — ${proyecto.nombre}`} size="xl">
      {loading ? <div className="text-center py-8 text-gray-500">Cargando...</div> : (
        <div className="space-y-4">
          {/* Info y acciones */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge color={COLORS_ESTADO[proyecto.estado]}>{proyecto.estado}</Badge>
              <span className="text-sm text-gray-500">Cliente: <strong>{proyecto.cliente_nombre}</strong></span>
              <span className="text-sm text-brand-700 font-bold">{formatCurrency(proyecto.monto_total)}</span>
            </div>
            <div className="flex gap-1">
              {proyecto.estado === 'COTIZACION' && <Button size="sm" onClick={() => cambiarEstado('EN_CURSO')}>Iniciar proyecto</Button>}
              {proyecto.estado === 'EN_CURSO' && <Button size="sm" variant="secondary" onClick={() => cambiarEstado('PAUSADO')}>Pausar</Button>}
              {proyecto.estado === 'EN_CURSO' && <Button size="sm" variant="danger" onClick={() => cambiarEstado('FINALIZADO')}>Finalizar</Button>}
              {proyecto.estado === 'PAUSADO' && <Button size="sm" onClick={() => cambiarEstado('EN_CURSO')}>Reanudar</Button>}
            </div>
          </div>

          {/* Doble barra — Proyecto */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Proyecto — Avance vs Pago</div>
            <Barra pct={proyecto.avance_pct} label="Avance" color="bg-blue-600" />
            <Barra pct={proyecto.pago_pct} label="Pago" color="bg-emerald-600" />
            <div className="text-xs mt-1 text-center">
              {(proyecto.pago_pct || 0) > (proyecto.avance_pct || 0)
                ? <span className="text-emerald-600">El cliente ha pagado por adelantado</span>
                : (proyecto.avance_pct || 0) > (proyecto.pago_pct || 0)
                ? <span className="text-amber-600">Trabajo entregado sin cobrar — el cliente debe B/. {(proyecto.monto_total - proyecto.pagado_total).toFixed(2)}</span>
                : <span className="text-gray-400">Al día</span>}
            </div>
          </div>

          {/* Etapas y sub-etapas */}
          {etapasConSubs.map(etapa => (
            <div key={etapa.id_etapa} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-sm">{etapa.nombre}</span>
                  <Badge color={etapa.tipo === 'DISENO' ? 'blue' : 'orange'} className="ml-2">{etapa.tipo}</Badge>
                  <span className="text-xs text-gray-400 ml-2">Peso: {etapa.peso_pct}%</span>
                </div>
                <div className="text-right text-xs">
                  <div className="font-medium">{formatCurrency(etapa.monto_total)}</div>
                  <div className="text-gray-400">Avance: {Number(etapa.avance_pct || 0).toFixed(1)}%</div>
                </div>
              </div>

              <Barra pct={etapa.avance_pct} label="" color="bg-blue-400" />

              {etapa.sub_etapas.map(sub => (
                <div key={sub.id_subetapa} className="ml-4 mt-2 p-2 bg-gray-50 rounded border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">{sub.nombre}</span>
                      <span className="text-xs text-gray-400 ml-2">Peso: {sub.peso_pct}%</span>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-mono">{formatCurrency(sub.monto)}</div>
                    </div>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <Barra pct={sub.avance_pct} label="" color="bg-blue-300" />
                    <Barra pct={sub.pago_pct} label="" color="bg-emerald-300" />
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-xs text-gray-400">Avance:</span>
                    {editSub === sub.id_subetapa ? (
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" max="100" step="1"
                          defaultValue={sub.avance_pct}
                          className="w-16 text-xs border border-gray-300 rounded px-1 py-0.5"
                          onKeyDown={e => {
                            if (e.key === 'Enter') updateAvance(sub.id_subetapa, Number(e.target.value));
                            if (e.key === 'Escape') setEditSub(null);
                          }}
                          autoFocus
                        />
                        <button onClick={() => setEditSub(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditSub(sub.id_subetapa)} className="text-xs text-brand-700 hover:underline">
                        {sub.avance_pct}%
                      </button>
                    )}
                    <span className="text-xs text-gray-400 ml-2">Pagado:</span>
                    <span className="text-xs font-mono">{sub.pago_pct?.toFixed(1)}% ({formatCurrency(sub.pagado)})</span>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Pagos recientes */}
          {data?.pagos && data.pagos.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Últimos pagos</h4>
              <div className="space-y-1">
                {data.pagos.slice(0, 5).map(p => (
                  <div key={p.id_pago} className={`flex items-center justify-between text-xs p-2 rounded ${p.anulado ? 'bg-red-50 line-through text-red-400' : 'bg-gray-50'}`}>
                    <span className="font-mono">{p.numero_recibo || '—'}</span>
                    <span>{formatDate(p.fecha)}</span>
                    <span className="font-mono font-medium">{formatCurrency(p.monto)}</span>
                    <span className="text-gray-400">{p.metodo_pago}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// =============================================================
// MODAL DE AVANCE COMPLETO — lista todo el trabajo y marca avance
// =============================================================
function AvanceModal({ open, onClose, proyecto }) {
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showAddSub, setShowAddSub] = useState(null);
  const [nuevaSub, setNuevaSub] = useState('');

  const cargarData = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    const { data: etapas } = await supabase.from('proyecto_etapas').select('*').eq('id_proyecto', proyecto.id_proyecto).order('orden');
    const ids = (etapas || []).map(e => e.id_etapa);
    let subs = [];
    if (ids.length > 0) {
      const { data: s } = await supabase.from('proyecto_subetapas').select('*').in('id_etapa', ids).order('orden');
      subs = s || [];
    }
    const agrupadas = (etapas || []).map(e => ({
      id_etapa: e.id_etapa,
      nombre: e.nombre,
      tipo: e.tipo,
      peso_pct: e.peso_pct,
      sub_etapas: subs.filter(s => s.id_etapa === e.id_etapa).map(s => ({
        id_subetapa: s.id_subetapa,
        nombre: s.nombre,
        peso_pct: s.peso_pct,
        avance_pct: s.avance_pct || 0,
      })),
    }));
    setEtapas(agrupadas);
    setLoading(false);
  }, [open, proyecto.id_proyecto]);

  useEffect(() => { cargarData(); }, [cargarData]);

  const updateAvance = async (id_subetapa, avance_pct) => {
    setSaving(id_subetapa);
    const pct = Math.min(100, Math.max(0, Number(avance_pct) || 0));
    await supabase.from('proyecto_subetapas').update({ avance_pct: pct }).eq('id_subetapa', id_subetapa);
    setEtapas(prev => prev.map(e => ({
      ...e,
      sub_etapas: e.sub_etapas.map(s => s.id_subetapa === id_subetapa ? { ...s, avance_pct: pct } : s)
    })));
    setSaving(null);
  };

  const agregarSubEtapa = async (id_etapa) => {
    if (!nuevaSub.trim()) return;
    const nombre = nuevaSub.trim();
    const { data: existentes } = await supabase.from('proyecto_subetapas').select('id_subetapa', 'avance_pct').eq('id_etapa', id_etapa);
    const total = (existentes?.length || 0) + 1;
    const peso = +(100 / total).toFixed(2);
    await supabase.from('proyecto_subetapas').update({ peso_pct: peso }).eq('id_etapa', id_etapa);
    const { data: sub } = await supabase.from('proyecto_subetapas').insert({
      id_etapa, nombre, orden: total, peso_pct: peso, monto: 0, avance_pct: 0,
    }).select('id_subetapa').single();
    if (sub) {
      setEtapas(prev => prev.map(e =>
        e.id_etapa === id_etapa
          ? { ...e, sub_etapas: e.sub_etapas.map(s => ({ ...s, peso_pct: peso })).concat({ id_subetapa: sub.id_subetapa, nombre, peso_pct: peso, avance_pct: 0 }) }
          : e
      ));
    }
    setNuevaSub('');
    setShowAddSub(null);
    await cargarData();
  };

  const totalAvance = etapas.length > 0
    ? etapas.reduce((sum, e) => sum + (e.peso_pct || 0) * (e.sub_etapas.reduce((s, sub) => s + sub.avance_pct * (sub.peso_pct || 0), 0) / Math.max(1, e.sub_etapas.reduce((s, sub) => s + (sub.peso_pct || 0), 0))) / 100, 0)
    : (proyecto.avance_pct || 0);

  const marcarCompletada = (sub, completada) => {
    updateAvance(sub.id_subetapa, completada ? 100 : 0);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Avance de obra — ${proyecto.nombre}`} size="xl">
      <div className="space-y-4">
        {/* Barra de avance global */}
        <div className="flex items-center justify-between p-3 bg-brand-50 rounded-lg">
          <span className="text-sm font-semibold text-brand-800">Avance total del proyecto</span>
          <div className="flex items-center gap-3">
            <div className="w-40 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand-700 rounded-full transition-all duration-300" style={{ width: `${totalAvance}%` }} />
            </div>
            <span className="text-2xl font-bold text-brand-700">{totalAvance.toFixed(1)}%</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">Cargando trabajo del proyecto...</div>
        ) : etapas.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Este proyecto no tiene etapas de trabajo definidas.</div>
        ) : (
          etapas.map(etapa => {
            const etapaAvance = etapa.sub_etapas.length > 0
              ? etapa.sub_etapas.reduce((s, sub) => s + sub.avance_pct * (sub.peso_pct || 0), 0) / Math.max(1, etapa.sub_etapas.reduce((s, sub) => s + (sub.peso_pct || 0), 0))
              : 0;
            return (
              <div key={etapa.id_etapa} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Header de etapa */}
                <div className="bg-gray-100 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{etapa.nombre}</span>
                    <Badge color={etapa.tipo === 'DISENO' ? 'blue' : 'orange'}>{etapa.tipo}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500">Peso: <strong>{etapa.peso_pct}%</strong></span>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${etapaAvance}%`, background: etapaAvance >= 100 ? '#22c55e' : '#6366f1' }} />
                    </div>
                    <span className="font-mono font-medium" style={{ color: etapaAvance >= 100 ? '#22c55e' : '#6366f1' }}>{etapaAvance.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Lista de sub-etapas */}
                <div className="divide-y divide-gray-100">
                  {etapa.sub_etapas.map(sub => (
                    <div key={sub.id_subetapa} className={`px-4 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors ${sub.avance_pct >= 100 ? 'bg-green-50/50' : ''}`}>
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={sub.avance_pct >= 100}
                        onChange={e => marcarCompletada(sub, e.target.checked)}
                        className="h-4 w-4 accent-brand-700 rounded cursor-pointer"
                      />
                      {/* Nombre */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${sub.avance_pct >= 100 ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {sub.nombre}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">({sub.peso_pct}%)</span>
                      </div>
                      {/* Slider */}
                      <input
                        type="range" min="0" max="100" step="1"
                        value={sub.avance_pct}
                        onChange={e => updateAvance(sub.id_subetapa, Number(e.target.value))}
                        className="w-20 h-1 accent-brand-700 cursor-pointer"
                      />
                      {/* Input numérico */}
                      <input
                        type="number" min="0" max="100"
                        value={sub.avance_pct}
                        onChange={e => updateAvance(sub.id_subetapa, Number(e.target.value))}
                        className="w-14 text-xs border border-gray-300 rounded px-1 py-0.5 text-center font-mono"
                      />
                      {/* Indicador visual */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sub.avance_pct >= 100 ? 'bg-green-500' : sub.avance_pct > 0 ? 'bg-amber-400' : 'bg-gray-300'}`} />
                    </div>
                  ))}

                  {/* Botón agregar sub-etapa */}
                  <div className="px-4 py-2">
                    {showAddSub === etapa.id_etapa ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={nuevaSub}
                          onChange={e => setNuevaSub(e.target.value)}
                          placeholder="Nombre del trabajo..."
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') agregarSubEtapa(etapa.id_etapa); if (e.key === 'Escape') { setShowAddSub(null); setNuevaSub(''); } }}
                        />
                        <button onClick={() => agregarSubEtapa(etapa.id_etapa)} className="text-xs bg-brand-700 text-white px-2 py-1 rounded hover:bg-brand-800">Agregar</button>
                        <button onClick={() => { setShowAddSub(null); setNuevaSub(''); }} className="text-xs text-gray-500 px-2 py-1">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddSub(etapa.id_etapa)} className="text-xs text-brand-700 hover:text-brand-800 font-medium">
                        + Agregar trabajo a esta etapa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
