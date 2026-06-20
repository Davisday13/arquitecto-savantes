import React, { useState, useEffect } from 'react';
import { AlertCircle, Save } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { supabase } from '../lib/supabase';
import { CATEGORIAS_GASTO, CATEGORIAS_GASTO_LABEL, TIPOS_GASTO, TIPOS_GASTO_LABEL } from '../lib/constants';

export default function GastoFormModal({ open, onClose, gastoId, profile }) {
  const editing = !!gastoId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [proyectos, setProyectos] = useState([]);
  const [etapas, setEtapas] = useState([]);

  const [form, setForm] = useState({
    tipo: 'GENERAL',
    descripcion: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'OTROS',
    id_proyecto: '',
    id_etapa: '',
    proveedor: '',
    notas: '',
  });

  useEffect(() => {
    if (!open) return;
    setError('');
    cargarInicial();
  }, [open, gastoId]);

  const cargarInicial = async () => {
    setLoading(true);
    const { data: proys } = await supabase
      .from('proyectos').select('id_proyecto, codigo, nombre')
      .in('estado', ['EN_CURSO', 'COMPLETADO'])
      .order('codigo');
    setProyectos(proys || []);

    if (editing) {
      const { data: g } = await supabase.from('gastos').select('*').eq('id_gasto', gastoId).single();
      if (g) {
        setForm({
          tipo: g.tipo,
          descripcion: g.descripcion,
          monto: String(g.monto),
          fecha: g.fecha,
          categoria: g.categoria || 'OTROS',
          id_proyecto: g.id_proyecto || '',
          id_etapa: g.id_etapa || '',
          proveedor: g.proveedor || '',
          notas: g.notas || '',
        });
        if (g.id_proyecto) cargarEtapas(g.id_proyecto);
      }
    }
    setLoading(false);
  };

  const cargarEtapas = async (idProyecto) => {
    if (!idProyecto) { setEtapas([]); return; }
    const { data } = await supabase.from('etapas').select('id_etapa, nombre').eq('id_proyecto', idProyecto).order('orden');
    setEtapas(data || []);
  };

  useEffect(() => {
    if (form.tipo === 'POR_ETAPA' && form.id_proyecto) cargarEtapas(form.id_proyecto);
    if (form.tipo !== 'POR_ETAPA') setForm(f => ({ ...f, id_etapa: '' }));
  }, [form.id_proyecto, form.tipo]);

  const guardar = async () => {
    setError('');
    if (!form.descripcion.trim()) return setError('Ingresa la descripci\u00f3n del gasto');
    if (!form.monto || Number(form.monto) <= 0) return setError('Ingresa un monto v\u00e1lido');

    setSaving(true);
    try {
      const payload = {
        tipo: form.tipo,
        descripcion: form.descripcion,
        monto: Number(form.monto),
        fecha: form.fecha,
        categoria: form.categoria,
        id_proyecto: form.id_proyecto || null,
        id_etapa: form.tipo === 'POR_ETAPA' ? (form.id_etapa || null) : null,
        proveedor: form.proveedor || null,
        notas: form.notas || null,
      };

      if (editing) {
        await supabase.from('gastos').update(payload).eq('id_gasto', gastoId);
      } else {
        payload.created_by = profile?.id;
        await supabase.from('gastos').insert(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Cargando..." size="lg">
        <div className="p-8 text-center text-gray-500">Cargando...</div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar gasto' : 'Nuevo gasto'} size="lg">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Tipo de gasto" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value, id_etapa: '' })}>
            {Object.entries(TIPOS_GASTO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Input label="Fecha" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
        </div>

        <Textarea label="Descripci&oacute;n *" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} placeholder="Describe el gasto..." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Monto * (B/.)" type="number" step="0.01" min="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} placeholder="0.00" />
          <Select label="Categor&iacute;a" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
            {CATEGORIAS_GASTO.map(c => (
              <option key={c} value={c}>{CATEGORIAS_GASTO_LABEL[c]}</option>
            ))}
          </Select>
        </div>

        <Input label="Proveedor" value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} placeholder="Nombre del proveedor" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Proyecto" value={form.id_proyecto} onChange={e => setForm({ ...form, id_proyecto: e.target.value, id_etapa: '' })}>
            <option value="">Sin proyecto asignado</option>
            {proyectos.map(p => (
              <option key={p.id_proyecto} value={p.id_proyecto}>{p.codigo} &mdash; {p.nombre}</option>
            ))}
          </Select>
          {form.tipo === 'POR_ETAPA' && form.id_proyecto && (
            <Select label="Etapa" value={form.id_etapa} onChange={e => setForm({ ...form, id_etapa: e.target.value })}>
              <option value="">Seleccionar etapa...</option>
              {etapas.map(e => (
                <option key={e.id_etapa} value={e.id_etapa}>{e.nombre}</option>
              ))}
            </Select>
          )}
        </div>

        <Textarea label="Notas" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} placeholder="Notas adicionales..." />

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={guardar} loading={saving}>
            <Save className="h-4 w-4" /> {editing ? 'Guardar cambios' : 'Registrar gasto'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
