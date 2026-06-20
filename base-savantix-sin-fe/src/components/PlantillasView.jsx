import React, { useState, useEffect } from 'react';
import {
  Lightbulb, Plus, Pencil, Trash2, Save, AlertCircle, X,
  Wrench, MapPin, ShoppingCart,
} from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';

const ITBMS_OPCIONES = [
  { value: 0, label: '0%' },
  { value: 7, label: '7%' },
  { value: 10, label: '10%' },
  { value: 15, label: '15%' },
];

const TIPO_DESTINO_OPTS = [
  { value: '', label: '— Sin destino fijo —' },
  { value: 'TALLER', label: 'Taller', icon: Wrench },
  { value: 'VISITA', label: 'Visita', icon: MapPin },
  { value: 'VENTA_DIRECTA', label: 'Venta directa', icon: ShoppingCart },
];

export default function PlantillasView({ profile }) {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('presupuesto_plantillas')
      .select('*')
      .order('nombre');
    if (!error) setPlantillas(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar la plantilla "${p.nombre}"?`)) return;
    const { error } = await supabase
      .from('presupuesto_plantillas')
      .delete()
      .eq('id_plantilla', p.id_plantilla);
    if (error) return alert('Error: ' + error.message);
    cargar();
  };

  const toggleActiva = async (p) => {
    const { error } = await supabase
      .from('presupuesto_plantillas')
      .update({ activa: !p.activa })
      .eq('id_plantilla', p.id_plantilla);
    if (error) return alert('Error: ' + error.message);
    cargar();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            Plantillas de Presupuestos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Crea servicios pre-armados para acelerar la creación de presupuestos
          </p>
        </div>
        <Button onClick={() => { setEditId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Nueva plantilla
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : plantillas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Lightbulb className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-lg font-medium">No hay plantillas todavía</p>
            <p className="text-sm">
              Crea plantillas como "Mantenimiento PC", "Instalación CCTV 4 cámaras", etc. <br />
              Después podrás aplicarlas con un click al crear presupuestos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-center">Items</th>
                  <th className="px-3 py-2 text-right">Total estimado</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plantillas.map(p => {
                  const totalEstimado = (p.items || []).reduce(
                    (s, it) => s + Number(it.cantidad || 0) * Number(it.precio_unitario || 0),
                    0
                  );
                  return (
                    <tr key={p.id_plantilla} className={`hover:bg-gray-50 ${!p.activa ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2 font-medium text-gray-900">{p.nombre}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{p.descripcion || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {p.tipo_destino_default || '—'}
                      </td>
                      <td className="px-3 py-2 text-center">{(p.items || []).length}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(totalEstimado)}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => toggleActiva(p)}
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            p.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {p.activa ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <button
                          onClick={() => { setEditId(p.id_plantilla); setShowForm(true); }}
                          className="p-1 hover:bg-blue-100 rounded text-blue-700"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => eliminar(p)}
                          className="p-1 hover:bg-red-100 rounded text-red-700 ml-1"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showForm && (
        <PlantillaFormModal
          plantillaId={editId}
          profile={profile}
          onClose={() => { setShowForm(false); setEditId(null); cargar(); }}
        />
      )}
    </div>
  );
}

// =============================================================
// Modal de creación/edición de plantilla
// =============================================================
function PlantillaFormModal({ plantillaId, profile, onClose }) {
  const editing = !!plantillaId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    tipo_destino_default: '',
    activa: true,
  });

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!editing) return;
    setLoading(true);
    supabase
      .from('presupuesto_plantillas')
      .select('*')
      .eq('id_plantilla', plantillaId)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            nombre: data.nombre,
            descripcion: data.descripcion || '',
            tipo_destino_default: data.tipo_destino_default || '',
            activa: data.activa,
          });
          setItems((data.items || []).map((it, i) => ({ ...it, _key: i })));
        }
        setLoading(false);
      });
  }, [plantillaId]);

  const agregarItem = (tipo = 'SERVICIO') => {
    setItems([
      ...items,
      {
        _key: Date.now() + Math.random(),
        tipo,
        sku: '',
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        itbms_pct: 7,
      },
    ]);
  };

  const actualizarItem = (idx, campo, valor) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], [campo]: valor };
    setItems(nuevos);
  };

  const eliminarItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const guardar = async () => {
    setError('');
    if (!form.nombre.trim()) return setError('Nombre es obligatorio');
    if (items.length === 0) return setError('Agrega al menos un item');

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.descripcion?.trim()) return setError(`Item ${i + 1}: falta descripción`);
    }

    setSaving(true);

    // Limpiar items para guardar en JSONB
    const itemsLimpios = items.map(({ _key, ...rest }) => ({
      tipo: rest.tipo || 'SERVICIO',
      sku: rest.sku || '',
      descripcion: rest.descripcion,
      cantidad: Number(rest.cantidad || 1),
      precio_unitario: Number(rest.precio_unitario || 0),
      itbms_pct: Number(rest.itbms_pct || 7),
    }));

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      tipo_destino_default: form.tipo_destino_default || null,
      activa: form.activa,
      items: itemsLimpios,
    };

    let result;
    if (editing) {
      result = await supabase
        .from('presupuesto_plantillas')
        .update(payload)
        .eq('id_plantilla', plantillaId);
    } else {
      result = await supabase
        .from('presupuesto_plantillas')
        .insert({ ...payload, created_by: profile?.id || null });
    }

    setSaving(false);
    if (result.error) return setError(result.error.message);
    onClose();
  };

  if (loading) {
    return (
      <Modal open={true} onClose={onClose} title="Cargando..." size="lg">
        <div className="p-8 text-center text-gray-500">Cargando...</div>
      </Modal>
    );
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={editing ? 'Editar plantilla' : 'Nueva plantilla'}
      size="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <Input
          label="Nombre de la plantilla *"
          value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej: Mantenimiento PC básico, Instalación CCTV 4 cámaras"
        />

        <Textarea
          label="Descripción"
          value={form.descripcion}
          onChange={e => setForm({ ...form, descripcion: e.target.value })}
          rows={2}
          placeholder="Para qué usar esta plantilla..."
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de destino sugerido</label>
            <Select
              value={form.tipo_destino_default}
              onChange={e => setForm({ ...form, tipo_destino_default: e.target.value })}
            >
              {TIPO_DESTINO_OPTS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Si lo defines, al usar la plantilla se preselecciona este destino.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-6">
            <input
              type="checkbox"
              checked={form.activa}
              onChange={e => setForm({ ...form, activa: e.target.checked })}
              className="h-4 w-4 rounded text-brand-700"
            />
            <span className="text-sm">Plantilla activa (visible al crear presupuestos)</span>
          </label>
        </div>

        {/* Items */}
        <div className="bg-gray-50 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Items pre-armados</h3>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => agregarItem('SERVICIO')} className="text-xs">
                <Plus className="h-3 w-3" /> Servicio
              </Button>
              <Button variant="outline" type="button" onClick={() => agregarItem('PRODUCTO')} className="text-xs">
                <Plus className="h-3 w-3" /> Producto
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center text-gray-500 py-4 bg-white rounded border-2 border-dashed">
              <p className="text-sm">No hay items todavía</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={it._key} className="bg-white border rounded p-2.5">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-12 sm:col-span-5">
                      <Input
                        value={it.descripcion}
                        onChange={e => actualizarItem(idx, 'descripcion', e.target.value)}
                        placeholder="Descripción del item..."
                      />
                      <div className="text-xs text-gray-500 mt-0.5">
                        {it.tipo === 'PRODUCTO' ? '📦 Producto' : '🔧 Servicio'}
                      </div>
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <Input
                        type="number" step="0.01" min="0.01"
                        value={it.cantidad}
                        onChange={e => actualizarItem(idx, 'cantidad', e.target.value)}
                        placeholder="Cant."
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        type="number" step="0.01" min="0"
                        value={it.precio_unitario}
                        onChange={e => actualizarItem(idx, 'precio_unitario', e.target.value)}
                        placeholder="Precio"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Select
                        value={it.itbms_pct}
                        onChange={e => actualizarItem(idx, 'itbms_pct', e.target.value)}
                      >
                        {ITBMS_OPCIONES.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarItem(idx)}
                      className="col-span-1 p-1.5 hover:bg-red-100 rounded text-red-600 self-center"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="secondary" onClick={onClose} type="button" disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={guardar} type="button" loading={saving}>
            <Save className="h-4 w-4" /> {editing ? 'Guardar cambios' : 'Crear plantilla'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
