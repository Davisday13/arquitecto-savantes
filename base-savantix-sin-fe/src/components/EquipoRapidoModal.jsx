import React, { useState } from 'react';
import { AlertCircle, Cpu } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../lib/supabase';
import { TIPOS_EQUIPO } from '../lib/constants';

/**
 * Modal de creación rápida de equipo.
 *
 * Props:
 * - open / onClose
 * - idCliente: id del cliente al que pertenece el equipo (obligatorio)
 * - clienteNombre: nombre para mostrar en el modal
 * - onCreated: callback({ id_equipo, ... })
 */
export default function EquipoRapidoModal({ open, onClose, idCliente, clienteNombre, onCreated }) {
  const [form, setForm] = useState({
    tipo_equipo: 'IMPRESORA',
    marca: '',
    modelo: '',
    numero_serie: '',
    ubicacion: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    setError('');

    if (!idCliente) return setError('Falta el cliente asociado');
    if (!form.tipo_equipo) return setError('Selecciona el tipo de equipo');
    if (!form.marca.trim()) return setError('La marca es obligatoria');

    setSaving(true);

    const { data, error: e } = await supabase
      .from('equipos')
      .insert({
        id_cliente: idCliente,
        tipo_equipo: form.tipo_equipo,
        marca: form.marca.trim(),
        modelo: form.modelo.trim() || null,
        numero_serie: form.numero_serie.trim() || null,
        ubicacion: form.ubicacion.trim() || null,
        activo: true,
      })
      .select()
      .single();

    setSaving(false);

    if (e) return setError(e.message);

    onCreated(data);
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo equipo rápido" size="md">
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {clienteNombre && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
            Equipo del cliente: <strong>{clienteNombre}</strong>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de equipo *</label>
          <Select
            value={form.tipo_equipo}
            onChange={e => setForm({ ...form, tipo_equipo: e.target.value })}
          >
            {TIPOS_EQUIPO.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Marca *"
            value={form.marca}
            onChange={e => setForm({ ...form, marca: e.target.value })}
            placeholder="HP, Epson, Lenovo..."
            autoFocus
          />
          <Input
            label="Modelo"
            value={form.modelo}
            onChange={e => setForm({ ...form, modelo: e.target.value })}
            placeholder="LaserJet Pro 400"
          />
        </div>

        <Input
          label="Número de serie"
          value={form.numero_serie}
          onChange={e => setForm({ ...form, numero_serie: e.target.value })}
          placeholder="opcional"
        />

        <Input
          label="Ubicación"
          value={form.ubicacion}
          onChange={e => setForm({ ...form, ubicacion: e.target.value })}
          placeholder="Oficina principal, sucursal X..."
        />

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={guardar} type="button" loading={saving}>
            <Cpu className="h-4 w-4" /> Crear equipo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
