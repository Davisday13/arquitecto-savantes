import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';

export default function ClienteRapidoModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ tipo: 'PERSONA', nombre: '', documento: '', correo: '', telefono: '' });
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!form.nombre) { alert('Nombre requerido'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('clientes').insert(form).select('id_cliente, nombre').single();
      if (error) throw error;
      if (onCreated) onCreated(data);
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Cliente rápido">
      <div className="space-y-3">
        <Select label="Tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
          <option value="PERSONA">Persona</option><option value="EMPRESA">Empresa</option>
        </Select>
        <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
        <Input label="Documento" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} />
        <Input label="Correo" type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} />
        <Input label="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}>Crear y seleccionar</Button>
        </div>
      </div>
    </Modal>
  );
}
