import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, Badge } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input, Select } from './ui/Input';
import { Package, Plus, Search, Edit, Activity, AlertTriangle } from 'lucide-react';

export default function InventarioView() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showMov, setShowMov] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const cargar = () => supabase.from('inventario_items').select('*').order('nombre').then(({ data }) => setItems(data || []));
  useEffect(() => { cargar(); }, []);

  const filtrados = items.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.nombre?.toLowerCase().includes(q) || i.codigo?.toLowerCase().includes(q);
  });

  const totalValor = items.reduce((s, i) => s + (Number(i.stock || 0) * Number(i.costo_unit || 0)), 0);
  const bajoStock = items.filter(i => i.stock <= i.stock_min && i.activo);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Package className="h-6 w-6 text-brand-700" /> Inventario</h1>
        <div className="flex gap-1">
          <Button variant="secondary" onClick={() => { setEditItem(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Item</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><div className="text-xs text-gray-500">Items activos</div><div className="text-2xl font-bold">{items.filter(i => i.activo).length}</div></Card>
        <Card><div className="text-xs text-amber-600">Stock bajo</div><div className="text-2xl font-bold text-amber-700">{bajoStock.length}</div></Card>
        <Card><div className="text-xs text-gray-500">Items totales</div><div className="text-2xl font-bold">{items.length}</div></Card>
        <Card><div className="text-xs text-brand-600">Valor inventario</div><div className="text-lg font-bold text-brand-700">{formatCurrency(totalValor)}</div></Card>
      </div>

      {bajoStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium"><AlertTriangle className="h-4 w-4" /> Items con stock bajo</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {bajoStock.slice(0, 10).map(i => (
              <span key={i.id_item} className="text-xs bg-white px-2 py-1 rounded border border-amber-200">{i.nombre} ({i.stock} {i.unidad})</span>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-3"><Search className="absolute h-4 w-4 text-gray-400 mt-2.5 ml-2.5" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar items..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase"><th className="py-2.5 px-3 font-medium">Código</th><th className="py-2.5 px-3 font-medium">Nombre</th><th className="py-2.5 px-3 font-medium">Unidad</th><th className="py-2.5 px-3 text-right">Stock</th><th className="py-2.5 px-3 text-right">Stock min</th><th className="py-2.5 px-3 text-right">Costo unit</th><th className="py-2.5 px-3 text-right">Precio unit</th><th className="py-2.5 px-3 font-medium">Categoría</th><th className="py-2.5 px-3 font-medium">Estado</th><th className="py-2.5 px-3 text-right">Acciones</th></tr></thead>
            <tbody>
              {filtrados.map(i => {
                const bajo = i.stock <= i.stock_min && i.activo;
                return (
                  <tr key={i.id_item} className={`border-b border-gray-100 hover:bg-gray-50 ${bajo ? 'bg-amber-50/50' : ''}`}>
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{i.codigo || '—'}</td>
                    <td className="py-2.5 px-3 font-medium">{i.nombre}</td>
                    <td className="py-2.5 px-3 text-gray-600">{i.unidad}</td>
                    <td className={`py-2.5 px-3 text-right font-mono ${bajo ? 'text-red-600 font-bold' : ''}`}>{Number(i.stock).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500">{i.stock_min || 0}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(i.costo_unit)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(i.precio_unit)}</td>
                    <td className="py-2.5 px-3"><Badge color="gray">{i.categoria}</Badge></td>
                    <td className="py-2.5 px-3"><Badge color={i.activo ? 'green' : 'red'}>{i.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                    <td className="py-2.5 px-3 text-right">
                      <button onClick={() => { setEditItem(i); setShowForm(true); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-700" title="Editar"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => { setShowMov(i); }} className="p-1.5 hover:bg-purple-50 rounded text-purple-700" title="Movimientos"><Activity className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && <ItemFormModal open={showForm} onClose={() => { setShowForm(false); cargar(); }} item={editItem} profile={profile} />}
      {showMov && <MovimientosModal open={!!showMov} onClose={() => setShowMov(null)} item={showMov} profile={profile} onRefresh={cargar} />}
    </div>
  );
}

function ItemFormModal({ open, onClose, item, profile }) {
  const [form, setForm] = useState({ codigo: '', nombre: '', unidad: 'und', stock: 0, stock_min: 0, costo_unit: 0, precio_unit: 0, categoria: 'MATERIAL' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) setForm({ codigo: item.codigo || '', nombre: item.nombre, unidad: item.unidad, stock: item.stock, stock_min: item.stock_min || 0, costo_unit: item.costo_unit, precio_unit: item.precio_unit, categoria: item.categoria });
    else setForm({ codigo: '', nombre: '', unidad: 'und', stock: 0, stock_min: 0, costo_unit: 0, precio_unit: 0, categoria: 'MATERIAL' });
  }, [item, open]);

  const guardar = async () => {
    setSaving(true);
    try {
      if (item) await supabase.from('inventario_items').update(form).eq('id_item', item.id_item);
      else await supabase.from('inventario_items').insert({ ...form, created_by: profile?.id });
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Editar item' : 'Nuevo item'}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Código" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} />
          <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Unidad" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} />
          <Input label="Stock inicial" type="number" step="0.01" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} />
          <Input label="Stock mínimo" type="number" step="0.01" value={form.stock_min} onChange={e => setForm({ ...form, stock_min: Number(e.target.value) })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Costo unitario B/." type="number" step="0.01" value={form.costo_unit} onChange={e => setForm({ ...form, costo_unit: Number(e.target.value) })} />
          <Input label="Precio unitario B/." type="number" step="0.01" value={form.precio_unit} onChange={e => setForm({ ...form, precio_unit: Number(e.target.value) })} />
        </div>
        <Select label="Categoría" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
          <option value="MATERIAL">Material</option><option value="HERRAMIENTA">Herramienta</option><option value="INSUMO">Insumo</option><option value="EQUIPO">Equipo</option>
        </Select>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}>{item ? 'Guardar' : 'Crear item'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function MovimientosModal({ open, onClose, item, profile, onRefresh }) {
  const [movs, setMovs] = useState([]);
  const [showMovForm, setShowMovForm] = useState(false);
  const [form, setForm] = useState({ tipo: 'ENTRADA', cantidad: '', motivo: '', costo_unit: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    supabase.from('inventario_movimientos').select('*').eq('id_item', item.id_item).order('created_at', { ascending: false }).then(({ data }) => setMovs(data || []));
  }, [item]);

  const guardarMov = async () => {
    setSaving(true);
    try {
      await supabase.from('inventario_movimientos').insert({
        id_item: item.id_item, tipo: form.tipo, cantidad: Number(form.cantidad),
        motivo: form.motivo || null, costo_unit: form.costo_unit ? Number(form.costo_unit) : null,
        created_by: profile?.id,
      });
      setShowMovForm(false);
      setForm({ tipo: 'ENTRADA', cantidad: '', motivo: '', costo_unit: '' });
      const { data } = await supabase.from('inventario_movimientos').select('*').eq('id_item', item.id_item).order('created_at', { ascending: false });
      setMovs(data || []);
      onRefresh();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Movimientos: ${item?.nombre}`} size="md">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">Stock actual: <strong className="text-brand-700">{Number(item?.stock || 0).toFixed(2)}</strong> {item?.unidad}</div>
          <Button size="sm" onClick={() => setShowMovForm(!showMovForm)}><Plus className="h-3 w-3" /> Nuevo movimiento</Button>
        </div>

        {showMovForm && (
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                <option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option><option value="AJUSTE">Ajuste</option>
              </Select>
              <Input type="number" step="0.01" placeholder="Cantidad" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} />
              <Input type="number" step="0.01" placeholder="Costo unit." value={form.costo_unit} onChange={e => setForm({ ...form, costo_unit: e.target.value })} />
            </div>
            <Input placeholder="Motivo" value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} />
            <Button size="sm" onClick={guardarMov} loading={saving}>Procesar</Button>
          </div>
        )}

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {movs.map(m => (
            <div key={m.id_mov} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
              <span className={`font-medium ${m.tipo === 'ENTRADA' ? 'text-emerald-700' : m.tipo === 'SALIDA' ? 'text-red-700' : 'text-amber-700'}`}>{m.tipo}</span>
              <span className="font-mono">{m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SALIDA' ? '-' : '±'}{Number(m.cantidad).toFixed(2)}</span>
              <span className="text-gray-500">{m.motivo || '—'}</span>
              <span className="text-gray-400">{formatDate(m.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
