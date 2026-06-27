import React, { useState, useEffect } from 'react';
import {
  AlertCircle, Save, Plus, Trash2, UserPlus,
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { supabase } from '../lib/supabase';
import { FASES_CONSTRUCCION } from '../lib/constants';
import ClienteRapidoModal from './ClienteRapidoModal';

export default function ProyectoFormModal({ open, onClose, proyectoId, profile }) {
  const editing = !!proyectoId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientes, setClientes] = useState([]);
  const [showClienteRapido, setShowClienteRapido] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    id_cliente: '',
    direccion_obra: '',
    fecha_inicio: '',
    fecha_estimada_entrega: '',
    estado: 'COTIZACION',
  });

  useEffect(() => {
    if (!open) return;
    setError('');
    cargarInicial();
  }, [open, proyectoId]);

  const cargarInicial = async () => {
    setLoading(true);
    const { data: cli } = await supabase
      .from('clientes').select('id_cliente, numero_cliente, nombre')
      .eq('activo', true).order('nombre');
    setClientes(cli || []);

    if (editing) {
      const { data: proy } = await supabase
        .from('proyectos').select('*').eq('id_proyecto', proyectoId).single();
      if (proy) {
        setForm({
          nombre: proy.nombre,
          descripcion: proy.descripcion || '',
          id_cliente: proy.id_cliente,
          direccion_obra: proy.direccion_obra || '',
          fecha_inicio: proy.fecha_inicio || '',
          fecha_estimada_entrega: proy.fecha_estimada_entrega || '',
          estado: proy.estado,
        });
      }
    } else {
      setForm({
        nombre: '', descripcion: '', id_cliente: '', direccion_obra: '',
        fecha_inicio: '', fecha_estimada_entrega: '', estado: 'COTIZACION',
      });
    }
    setLoading(false);
  };

  const onClienteCreado = (cliente) => {
    setClientes(prev => [...prev, cliente].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setForm(f => ({ ...f, id_cliente: cliente.id_cliente }));
    setShowClienteRapido(false);
  };

  const guardar = async () => {
    setError('');
    if (!form.nombre.trim()) return setError('Ingresa el nombre del proyecto');
    if (!form.id_cliente) return setError('Selecciona un cliente');

    setSaving(true);
    try {
      if (editing) {
        const { error: e } = await supabase.from('proyectos').update({
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          id_cliente: form.id_cliente,
          direccion_obra: form.direccion_obra || null,
          fecha_inicio: form.fecha_inicio || null,
          fecha_estimada_entrega: form.fecha_estimada_entrega || null,
          estado: form.estado,
        }).eq('id_proyecto', proyectoId);
        if (e) throw e;
      } else {
        const { data: newProject, error: e } = await supabase.from('proyectos').insert({
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          id_cliente: form.id_cliente,
          direccion_obra: form.direccion_obra || null,
          fecha_inicio: form.fecha_inicio || null,
          fecha_estimada_entrega: form.fecha_estimada_entrega || null,
          estado: form.estado,
          created_by: profile?.id || null,
        }).select().single();
        if (e) throw e;

        if (newProject) {
          const etapasData = FASES_CONSTRUCCION.map((f, i) => ({
            id_proyecto: newProject.id_proyecto,
            nombre: f.fase,
            orden: i,
            peso_porcentaje: f.peso,
            presupuesto: 0,
          }));
          const { data: etapasCreadas } = await supabase.from('etapas').insert(etapasData).select();
          if (etapasCreadas) {
            const subEtapasData = [];
            etapasCreadas.forEach((etapa, idx) => {
              FASES_CONSTRUCCION[idx].sub_etapas.forEach((nombre, j) => {
                subEtapasData.push({
                  id_etapa: etapa.id_etapa,
                  nombre,
                  orden: j,
                  peso_porcentaje: 0,
                  presupuesto: 0,
                  estado: 'PENDIENTE',
                });
              });
            });
            await supabase.from('sub_etapas').insert(subEtapasData);
          }
        }
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
        <div className="p-8 text-center text-gray-500">Cargando datos...</div>
      </Modal>
    );
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? 'Editar proyecto' : 'Nuevo proyecto'} size="lg">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Nombre del proyecto *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Residencia Torres" />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Cliente *</label>
                <button type="button" onClick={() => setShowClienteRapido(true)}
                  className="text-xs text-brand-700 hover:text-brand-900 font-medium flex items-center gap-1">
                  <UserPlus className="h-3 w-3" /> Nuevo cliente
                </button>
              </div>
              <Select value={form.id_cliente} onChange={e => setForm({ ...form, id_cliente: e.target.value })}>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>{c.numero_cliente} &mdash; {c.nombre}</option>
                ))}
              </Select>
            </div>
          </div>

          <Textarea label="Descripci&oacute;n" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} placeholder="Alcance del proyecto..." />

          <Input label="Direcci&oacute;n de obra" value={form.direccion_obra} onChange={e => setForm({ ...form, direccion_obra: e.target.value })} placeholder="Ubicaci&oacute;n f&iacute;sica del proyecto" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Fecha de inicio" type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
            <Input label="Fecha estimada de entrega" type="date" value={form.fecha_estimada_entrega} onChange={e => setForm({ ...form, fecha_estimada_entrega: e.target.value })} />
          </div>

          {editing && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
              <Select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                <option value="COTIZACION">Cotizaci&oacute;n</option>
                <option value="EN_CURSO">En curso</option>
                <option value="COMPLETADO">Completado</option>
                <option value="CANCELADO">Cancelado</option>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="button" onClick={guardar} loading={saving}>
              <Save className="h-4 w-4" /> {editing ? 'Guardar cambios' : 'Crear proyecto'}
            </Button>
          </div>
        </div>
      </Modal>

      {showClienteRapido && (
        <ClienteRapidoModal open={showClienteRapido} onClose={() => setShowClienteRapido(false)} onCreated={onClienteCreado} />
      )}
    </>
  );
}
