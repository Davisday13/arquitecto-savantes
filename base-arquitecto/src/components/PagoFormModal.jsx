import React, { useState, useEffect } from 'react';
import { AlertCircle, Save } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { supabase } from '../lib/supabase';
import { METODOS_PAGO } from '../lib/constants';

export default function PagoFormModal({ open, onClose, userId, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientes, setClientes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [subEtapas, setSubEtapas] = useState([]);

  const [form, setForm] = useState({
    id_cliente: '',
    id_proyecto: '',
    id_sub_etapa: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: '',
    metodo_pago: 'EFECTIVO',
    referencia: '',
    concepto: '',
  });

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(true);
    Promise.all([
      supabase.from('clientes').select('id_cliente, numero_cliente, nombre').eq('activo', true).order('nombre'),
      supabase.from('proyectos').select('id_proyecto, codigo, nombre, id_cliente').in('estado', ['EN_CURSO', 'COMPLETADO']).order('codigo'),
    ]).then(([cliRes, proyRes]) => {
      setClientes(cliRes.data || []);
      setProyectos(proyRes.data || []);
      setLoading(false);
    });
  }, [open]);

  const cargarSubEtapas = async (idProyecto) => {
    if (!idProyecto) { setSubEtapas([]); return; }
    const { data } = await supabase
      .from('sub_etapas')
      .select('id_sub_etapa, nombre')
      .eq('id_etapa', supabase.from('etapas').select('id_etapa').eq('id_proyecto', idProyecto))
      .order('orden');
    // alternative approach
    const { data: etapas } = await supabase.from('etapas').select('id_etapa').eq('id_proyecto', idProyecto);
    if (etapas && etapas.length > 0) {
      const ids = etapas.map(e => e.id_etapa);
      const { data: subs } = await supabase.from('sub_etapas').select('id_sub_etapa, nombre').in('id_etapa', ids).order('orden');
      setSubEtapas(subs || []);
    } else {
      setSubEtapas([]);
    }
  };

  useEffect(() => {
    if (form.id_proyecto) {
      cargarSubEtapas(form.id_proyecto);
      const proy = proyectos.find(p => p.id_proyecto === form.id_proyecto);
      if (proy && !form.id_cliente) setForm(f => ({ ...f, id_cliente: proy.id_cliente }));
    } else {
      setSubEtapas([]);
    }
  }, [form.id_proyecto]);

  const guardar = async () => {
    setError('');
    if (!form.id_cliente) return setError('Selecciona un cliente');
    if (!form.monto || Number(form.monto) <= 0) return setError('Ingresa un monto v\u00e1lido');

    setSaving(true);
    try {
      const { error: e } = await supabase.from('pagos').insert({
        id_cliente: form.id_cliente,
        id_proyecto: form.id_proyecto || null,
        id_sub_etapa: form.id_sub_etapa || null,
        fecha_pago: form.fecha_pago,
        monto: Number(form.monto),
        metodo_pago: form.metodo_pago,
        referencia: form.referencia || null,
        concepto: form.concepto || null,
        created_by: userId,
      });
      if (e) throw e;
      onSaved();
    } catch (err) {
      setError(err.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar pago" size="lg">
      <div className="space-y-4">
        {error && <div className="bg-red-50 p-3 rounded text-sm text-red-700"><AlertCircle className="h-4 w-4 inline mr-1" />{error}</div>}

        <Select label="Cliente" value={form.id_cliente} onChange={e => setForm({ ...form, id_cliente: e.target.value })}>
          <option value="">Seleccionar cliente...</option>
          {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.numero_cliente} &mdash; {c.nombre}</option>)}
        </Select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Proyecto (opcional)" value={form.id_proyecto} onChange={e => setForm({ ...form, id_proyecto: e.target.value, id_sub_etapa: '' })}>
            <option value="">Sin proyecto</option>
            {proyectos.map(p => <option key={p.id_proyecto} value={p.id_proyecto}>{p.codigo} &mdash; {p.nombre}</option>)}
          </Select>
          {form.id_proyecto && subEtapas.length > 0 && (
            <Select label="Sub-etapa (opcional)" value={form.id_sub_etapa} onChange={e => setForm({ ...form, id_sub_etapa: e.target.value })}>
              <option value="">Sin sub-etapa</option>
              {subEtapas.map(se => <option key={se.id_sub_etapa} value={se.id_sub_etapa}>{se.nombre}</option>)}
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={form.fecha_pago} onChange={e => setForm({ ...form, fecha_pago: e.target.value })} />
          <Input label="Monto (B/.) *" type="number" step="0.01" min="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} placeholder="0.00" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="M&eacute;todo de pago" value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value })}>
            {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input label="Referencia" value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="N° de cheque, transacci\u00f3n, etc." />
        </div>

        <Textarea label="Concepto" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} rows={2} placeholder="Pago por..." />

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}><Save className="h-4 w-4" /> Registrar pago</Button>
        </div>
      </div>
    </Modal>
  );
}
