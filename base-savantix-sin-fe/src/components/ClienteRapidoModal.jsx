import React, { useState } from 'react';
import { AlertCircle, Save, UserPlus } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../lib/supabase';

/**
 * Modal de creación rápida de cliente (campos esenciales solamente).
 *
 * Props:
 * - open / onClose
 * - onCreated: callback({ id_cliente, ... }) cuando se crea
 */
export default function ClienteRapidoModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    tipo_cliente: 'EMPRESA',
    nombre: '',
    ruc_cedula: '',
    dv: '',
    telefono: '',
    correo: '',
    contacto_nombre: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    setError('');

    if (!form.nombre.trim()) return setError('El nombre es obligatorio');

    setSaving(true);

    // Generar numero_cliente automáticamente (mismo patrón que ClientesView)
    const { count } = await supabase
      .from('clientes')
      .select('id_cliente', { count: 'exact', head: true });
    const numero_cliente = `C-${String((count || 0) + 1).padStart(4, '0')}`;

    const { data, error: e } = await supabase
      .from('clientes')
      .insert({
        numero_cliente,
        tipo_cliente: form.tipo_cliente,
        nombre: form.nombre.trim(),
        ruc_cedula: form.ruc_cedula.trim() || null,
        dv: form.dv.trim() || null,
        telefono: form.telefono.trim() || null,
        correo: form.correo.trim() || null,
        contacto_nombre: form.contacto_nombre.trim() || null,
        activo: true,
      })
      .select()
      .single();

    setSaving(false);

    if (e) return setError(e.message);

    onCreated(data);
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo cliente rápido" size="md">
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
          💡 Solo los datos esenciales. Después puedes completar el resto desde <strong>Clientes</strong>.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cliente</label>
          <Select
            value={form.tipo_cliente}
            onChange={e => setForm({ ...form, tipo_cliente: e.target.value })}
          >
            <option value="EMPRESA">Empresa</option>
            <option value="PERSONA">Persona</option>
          </Select>
        </div>

        <Input
          label={form.tipo_cliente === 'EMPRESA' ? 'Razón social *' : 'Nombre completo *'}
          value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })}
          placeholder={form.tipo_cliente === 'EMPRESA' ? 'PRECONCRETOS, S.A' : 'Juan Pérez'}
          autoFocus
        />

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Input
              label={form.tipo_cliente === 'EMPRESA' ? 'RUC' : 'Cédula'}
              value={form.ruc_cedula}
              onChange={e => setForm({ ...form, ruc_cedula: e.target.value })}
              placeholder={form.tipo_cliente === 'EMPRESA' ? '155778146-2-2026' : '8-456-1234'}
            />
          </div>
          <Input
            label="DV"
            value={form.dv}
            onChange={e => setForm({ ...form, dv: e.target.value })}
            placeholder="09"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={e => setForm({ ...form, telefono: e.target.value })}
            placeholder="6000-0000"
          />
          <Input
            label="Correo"
            type="email"
            value={form.correo}
            onChange={e => setForm({ ...form, correo: e.target.value })}
            placeholder="cliente@email.com"
          />
        </div>

        {form.tipo_cliente === 'EMPRESA' && (
          <Input
            label="Persona de contacto"
            value={form.contacto_nombre}
            onChange={e => setForm({ ...form, contacto_nombre: e.target.value })}
            placeholder="Nombre del contacto principal"
          />
        )}

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={guardar} type="button" loading={saving}>
            <UserPlus className="h-4 w-4" /> Crear cliente
          </Button>
        </div>
      </div>
    </Modal>
  );
}
