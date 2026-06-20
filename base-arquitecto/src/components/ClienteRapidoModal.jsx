import React, { useState, useEffect } from 'react';
import { AlertCircle, Save } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { supabase } from '../lib/supabase';
import { TIPOS_CLIENTE, TIPOS_CLIENTE_LABEL } from '../lib/constants';

export default function ClienteRapidoModal({ open, onClose, editCliente, onCreated }) {
  const editing = !!editCliente;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    tipo_cliente: 'EMPRESA',
    nombre: '',
    ruc_cedula: '',
    contacto_nombre: '',
    telefono: '',
    correo: '',
    direccion: '',
    notas: '',
  });

  useEffect(() => {
    if (!open) return;
    if (editCliente) {
      setForm({
        tipo_cliente: editCliente.tipo_cliente,
        nombre: editCliente.nombre || '',
        ruc_cedula: editCliente.ruc_cedula || '',
        contacto_nombre: editCliente.contacto_nombre || '',
        telefono: editCliente.telefono || '',
        correo: editCliente.correo || '',
        direccion: editCliente.direccion || '',
        notas: editCliente.notas || '',
      });
    } else {
      setForm({ tipo_cliente: 'EMPRESA', nombre: '', ruc_cedula: '', contacto_nombre: '', telefono: '', correo: '', direccion: '', notas: '' });
    }
    setError('');
  }, [open, editCliente]);

  const guardar = async () => {
    setError('');
    if (!form.nombre.trim()) return setError('Ingresa el nombre del cliente');
    setSaving(true);
    try {
      if (editing) {
        await supabase.from('clientes').update(form).eq('id_cliente', editCliente.id_cliente);
        if (onCreated) onCreated();
      } else {
        const { data, error: e } = await supabase.from('clientes').insert(form).select().single();
        if (e) throw e;
        if (onCreated) onCreated(data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar cliente' : 'Nuevo cliente'} size="lg">
      <div className="space-y-3">
        {error && <div className="bg-red-50 p-3 rounded text-sm text-red-700 flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5" />{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <Select label="Tipo" value={form.tipo_cliente} onChange={e => setForm({ ...form, tipo_cliente: e.target.value })}>
            {Object.entries(TIPOS_CLIENTE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input label="RUC / C&eacute;dula" value={form.ruc_cedula} onChange={e => setForm({ ...form, ruc_cedula: e.target.value })} placeholder="Opcional" />
        </div>

        <Input label="Nombre *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Raz&oacute;n social o nombre completo" />

        {form.tipo_cliente === 'EMPRESA' && (
          <Input label="Contacto principal" value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value })} placeholder="Nombre del contacto" />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Tel&eacute;fono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+507 6000-0000" />
          <Input label="Correo electr&oacute;nico" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} placeholder="cliente@email.com" />
        </div>

        <Textarea label="Direcci&oacute;n" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} rows={2} placeholder="Direcci&oacute;n fiscal o f&iacute;sica" />

        <Textarea label="Notas" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} />

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}><Save className="h-4 w-4" /> {editing ? 'Guardar cambios' : 'Crear cliente'}</Button>
        </div>
      </div>
    </Modal>
  );
}
