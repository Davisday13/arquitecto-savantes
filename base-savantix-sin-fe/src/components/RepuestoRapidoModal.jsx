import React, { useState } from 'react';
import { AlertCircle, Package } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../lib/supabase';

/**
 * Modal de creación rápida de repuesto (catálogo).
 *
 * Props:
 * - open / onClose
 * - userId: id del usuario que crea
 * - empresa: para conocer itbms_default_pct y precios_incluyen_itbms
 * - nombreSugerido: si vienes de buscar algo, lo pre-llena
 * - onCreated: callback({ id_catalogo, sku, nombre, precio_venta, itbms_pct, ... })
 */
export default function RepuestoRapidoModal({
  open, onClose, userId, empresa, nombreSugerido = '', onCreated
}) {
  const [form, setForm] = useState({
    nombre: nombreSugerido,
    categoria: '',
    marca: '',
    modelo: '',
    precio_venta: '',
    costo: '',
    itbms_pct: empresa?.itbms_default_pct ?? 7,
    stock_disponible: '',
    stock_minimo: 0,
    unidad: 'unidad',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    setError('');

    if (!form.nombre.trim()) return setError('El nombre es obligatorio');

    setSaving(true);

    try {
      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria?.trim() || null,
        marca: form.marca?.trim() || null,
        modelo: form.modelo?.trim() || null,
        precio_venta: Number(form.precio_venta) || 0,
        costo: Number(form.costo) || 0,
        itbms_pct: Number(form.itbms_pct) || 0,
        stock_disponible: Number(form.stock_disponible) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
        unidad: form.unidad?.trim() || 'unidad',
        activo: true,
        created_by: userId || null,
      };

      const { data, error: e } = await supabase
        .from('catalogo_repuestos')
        .insert(payload)
        .select()
        .single();

      if (e) throw e;

      // Movimiento de inventario por stock inicial
      if (data && Number(form.stock_disponible) > 0) {
        await supabase.from('movimientos_inventario').insert({
          id_catalogo: data.id_catalogo,
          tipo: 'ENTRADA',
          cantidad: Number(form.stock_disponible),
          motivo: 'Stock inicial al crear repuesto desde presupuesto',
          stock_disponible_antes: 0,
          stock_disponible_despues: Number(form.stock_disponible),
          stock_reservado_antes: 0,
          stock_reservado_despues: 0,
          registrado_por: userId,
        });
      }

      onCreated(data);
    } catch (err) {
      setError(err.message || 'Error creando repuesto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo repuesto rápido" size="md">
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
          💡 El SKU (REP-XXXX) se genera automáticamente. Solo los datos esenciales — el resto los puedes completar después en <strong>Catálogo</strong>.
        </div>

        <Input
          label="Nombre del repuesto *"
          value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })}
          placeholder="Cartucho HP 305 Negro"
          autoFocus
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Marca"
            value={form.marca}
            onChange={e => setForm({ ...form, marca: e.target.value })}
            placeholder="HP, Epson..."
          />
          <Input
            label="Modelo"
            value={form.modelo}
            onChange={e => setForm({ ...form, modelo: e.target.value })}
            placeholder="305, 664..."
          />
        </div>

        <Input
          label="Categoría"
          value={form.categoria}
          onChange={e => setForm({ ...form, categoria: e.target.value })}
          placeholder="Tinta, Toner, Cable, Repuesto..."
        />

        <div className="grid grid-cols-3 gap-2">
          <Input
            label="Precio venta"
            type="number" step="0.01" min="0"
            value={form.precio_venta}
            onChange={e => setForm({ ...form, precio_venta: e.target.value })}
            placeholder="0.00"
          />
          <Input
            label="Costo"
            type="number" step="0.01" min="0"
            value={form.costo}
            onChange={e => setForm({ ...form, costo: e.target.value })}
            placeholder="0.00"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ITBMS</label>
            <Select
              value={form.itbms_pct}
              onChange={e => setForm({ ...form, itbms_pct: e.target.value })}
            >
              <option value="0">0%</option>
              <option value="7">7%</option>
              <option value="10">10%</option>
              <option value="15">15%</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Stock disponible"
            type="number" min="0"
            value={form.stock_disponible}
            onChange={e => setForm({ ...form, stock_disponible: e.target.value })}
            placeholder="0"
          />
          <Input
            label="Stock mínimo (alerta)"
            type="number" min="0"
            value={form.stock_minimo}
            onChange={e => setForm({ ...form, stock_minimo: e.target.value })}
            placeholder="0"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={guardar} type="button" loading={saving}>
            <Package className="h-4 w-4" /> Crear repuesto
          </Button>
        </div>
      </div>
    </Modal>
  );
}
