import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input, Select } from './ui/Input';
import { DollarSign, Plus, Search, Eye, XCircle } from 'lucide-react';

export default function PagosView() {
  const { profile } = useAuth();
  const [pagos, setPagos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [search, setSearch] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [showForm, setShowForm] = useState(false);

  const cargar = () => {
    supabase.from('proyecto_pagos').select('*, proyectos!inner(nombre, numero_proyecto, id_cliente, clientes!inner(nombre))').order('created_at', { ascending: false }).then(({ data }) => setPagos(data || []));
    supabase.from('proyectos').select('id_proyecto, numero_proyecto, nombre').order('numero_proyecto').then(({ data }) => setProyectos(data || []));
  };
  useEffect(() => { cargar(); }, []);

  const filtrados = pagos.filter(p => {
    if (filtroProyecto && p.id_proyecto !== filtroProyecto) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.numero_recibo?.toLowerCase().includes(q) && !p.proyectos?.nombre?.toLowerCase().includes(q) && !p.proyectos?.clientes?.nombre?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const anularPago = async (id) => {
    const motivo = prompt('Motivo de anulación:');
    if (!motivo) return;
    await supabase.from('proyecto_pagos').update({ anulado: true, anulado_motivo: motivo }).eq('id_pago', id);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><DollarSign className="h-6 w-6 text-brand-700" /> Pagos</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Nuevo pago</Button>
      </div>
      {showForm && <PagoFormModal open={showForm} onClose={() => { setShowForm(false); cargar(); }} profile={profile} />}

      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pagos..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <select value={filtroProyecto} onChange={e => setFiltroProyecto(e.target.value)} className="text-sm border border-gray-300 rounded-md px-3 py-2">
            <option value="">Todos los proyectos</option>
            {proyectos.map(p => <option key={p.id_proyecto} value={p.id_proyecto}>{p.numero_proyecto} - {p.nombre}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase"><th className="py-2.5 px-3 font-medium">Recibo</th><th className="py-2.5 px-3 font-medium">Proyecto</th><th className="py-2.5 px-3 font-medium">Cliente</th><th className="py-2.5 px-3 font-medium text-right">Monto</th><th className="py-2.5 px-3 font-medium">Método</th><th className="py-2.5 px-3 font-medium">Fecha</th><th className="py-2.5 px-3 font-medium">Estado</th><th className="py-2.5 px-3 text-right">Acciones</th></tr></thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id_pago} className={`border-b border-gray-100 hover:bg-gray-50 ${p.anulado ? 'text-red-400 line-through' : ''}`}>
                  <td className="py-2.5 px-3 font-mono text-xs">{p.numero_recibo || '—'}</td>
                  <td className="py-2.5 px-3">{p.proyectos?.numero_proyecto} - {p.proyectos?.nombre}</td>
                  <td className="py-2.5 px-3 text-gray-600">{p.proyectos?.clientes?.nombre}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(p.monto)}</td>
                  <td className="py-2.5 px-3">{p.metodo_pago || '—'}</td>
                  <td className="py-2.5 px-3">{formatDate(p.fecha)}</td>
                  <td className="py-2.5 px-3">{p.anulado ? 'Anulado' : 'Vigente'}</td>
                  <td className="py-2.5 px-3 text-right">
                    {!p.anulado && <button onClick={() => anularPago(p.id_pago)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Anular"><XCircle className="h-4 w-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PagoFormModal({ open, onClose, profile }) {
  const [proyectos, setProyectos] = useState([]);
  const [subetapas, setSubetapas] = useState([]);
  const [form, setForm] = useState({
    id_proyecto: '', id_subetapa: '', monto: '', metodo_pago: 'TRANSFERENCIA',
    fecha: new Date().toISOString().split('T')[0], numero_recibo: '', nota: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from('proyectos').select('id_proyecto, numero_proyecto, nombre').in('estado', ['EN_CURSO', 'PAUSADO']).order('numero_proyecto').then(({ data }) => setProyectos(data || []));
  }, [open]);

  useEffect(() => {
    if (!form.id_proyecto) { setSubetapas([]); return; }
    supabase.from('proyecto_subetapas').select('id_subetapa, nombre, monto, pagado, proyecto_etapas!inner(nombre)')
      .in('id_etapa', supabase.from('proyecto_etapas').select('id_etapa').eq('id_proyecto', form.id_proyecto))
      .order('orden').then(({ data }) => setSubetapas(data || []));
  }, [form.id_proyecto]);

  const guardar = async () => {
    setSaving(true);
    try {
      await supabase.from('proyecto_pagos').insert({
        id_proyecto: form.id_proyecto,
        id_subetapa: form.id_subetapa || null,
        monto: Number(form.monto),
        metodo_pago: form.metodo_pago,
        fecha: form.fecha,
        numero_recibo: form.numero_recibo || null,
        nota: form.nota || null,
        created_by: profile?.id,
      });
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo pago">
      <div className="space-y-3">
        <Select label="Proyecto" value={form.id_proyecto} onChange={e => setForm({ ...form, id_proyecto: e.target.value, id_subetapa: '' })}>
          <option value="">Seleccionar proyecto</option>
          {proyectos.map(p => <option key={p.id_proyecto} value={p.id_proyecto}>{p.numero_proyecto} - {p.nombre}</option>)}
        </Select>

        <Select label="Sub-etapa (opcional — vacío = anticipo)" value={form.id_subetapa} onChange={e => setForm({ ...form, id_subetapa: e.target.value })}>
          <option value="">— Anticipo / Sin asignar —</option>
          {subetapas.map(s => (
            <option key={s.id_subetapa} value={s.id_subetapa}>
              {s.proyecto_etapas?.nombre} / {s.nombre} (B/.{Number(s.monto).toFixed(2)} - Pagado: B/.{Number(s.pagado).toFixed(2)})
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Monto B/." type="number" step="0.01" min="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} required />
          <Select label="Método" value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value })}>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTRO">Otro</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
          <Input label="N° Recibo" value={form.numero_recibo} onChange={e => setForm({ ...form, numero_recibo: e.target.value })} />
        </div>
        <Input label="Nota" value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} />
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}><DollarSign className="h-4 w-4" /> Registrar pago</Button>
        </div>
      </div>
    </Modal>
  );
}
