import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, Search, Pencil, Trash2, RefreshCw, AlertCircle,
} from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { CATEGORIAS_INVENTARIO, CATEGORIAS_INVENTARIO_LABEL } from '../lib/constants';

export default function InventarioView({ profile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const cargar = async () => {
    setLoading(true);
    let query = supabase.from('inventario').select('*').eq('activo', true).order('nombre');
    if (filtroCategoria) query = query.eq('categoria', filtroCategoria);
    const { data, error } = await query;
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtroCategoria]);

  const filtrados = useMemo(() => {
    if (!busqueda) return items;
    const q = busqueda.toLowerCase();
    return items.filter(i =>
      i.nombre?.toLowerCase().includes(q) ||
      i.codigo?.toLowerCase().includes(q) ||
      i.sku?.toLowerCase().includes(q) ||
      i.descripcion?.toLowerCase().includes(q)
    );
  }, [items, busqueda]);

  const stats = useMemo(() => ({
    total: items.length,
    valorTotal: items.reduce((s, i) => s + Number(i.cantidad_actual || 0) * Number(i.precio_unitario || 0), 0),
    stockBajo: items.filter(i => i.stock_minimo > 0 && Number(i.cantidad_actual) <= Number(i.stock_minimo)).length,
  }), [items]);

  const [editItem, setEditItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '', categoria: 'OTROS', unidad_medida: 'UND', cantidad_actual: 0, precio_unitario: 0, stock_minimo: 0, ubicacion: '' });
  const [saving, setSaving] = useState(false);

  const abrirForm = (item = null) => {
    if (item) {
      setForm({
        nombre: item.nombre,
        descripcion: item.descripcion || '',
        categoria: item.categoria || 'OTROS',
        unidad_medida: item.unidad_medida || 'UND',
        cantidad_actual: item.cantidad_actual,
        precio_unitario: item.precio_unitario,
        stock_minimo: item.stock_minimo || 0,
        ubicacion: item.ubicacion || '',
      });
      setEditItem(item);
    } else {
      setForm({ nombre: '', descripcion: '', categoria: 'OTROS', unidad_medida: 'UND', cantidad_actual: 0, precio_unitario: 0, stock_minimo: 0, ubicacion: '' });
      setEditItem(null);
    }
    setShowModal(true);
  };

  const guardarItem = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        categoria: form.categoria,
        unidad_medida: form.unidad_medida,
        cantidad_actual: Number(form.cantidad_actual) || 0,
        precio_unitario: Number(form.precio_unitario) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
        ubicacion: form.ubicacion || null,
      };
      if (editItem) {
        await supabase.from('inventario').update(payload).eq('id_item', editItem.id_item);
      } else {
        await supabase.from('inventario').insert({ ...payload, created_by: profile?.id });
      }
      setShowModal(false);
      cargar();
    } catch (err) { alert('Error: ' + err.message); } finally { setSaving(false); }
  };

  const toggleActivo = async (item) => {
    await supabase.from('inventario').update({ activo: !item.activo }).eq('id_item', item.id_item);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-brand-700" />
            Inventario
          </h1>
          <p className="text-sm text-gray-500 mt-1">Materiales e insumos para proyectos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Recargar
          </Button>
          <Button onClick={() => abrirForm(null)}>
            <Plus className="h-4 w-4" /> Nuevo item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><div className="text-xs text-gray-500 uppercase">Items totales</div><div className="text-2xl font-bold text-gray-900">{stats.total}</div></Card>
        <Card><div className="text-xs text-gray-500 uppercase">Valor inventario</div><div className="text-2xl font-bold text-brand-700">{formatCurrency(stats.valorTotal)}</div></Card>
        <Card>
          <div className="text-xs text-red-600 uppercase">Stock bajo</div>
          <div className={`text-2xl font-bold ${stats.stockBajo > 0 ? 'text-red-700' : 'text-gray-900'}`}>{stats.stockBajo}</div>
        </Card>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar item..." className="pl-8" />
          </div>
          <Select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
            <option value="">Todas las categor&iacute;as</option>
            {CATEGORIAS_INVENTARIO.map(c => (
              <option key={c} value={c}>{CATEGORIAS_INVENTARIO_LABEL[c]}</option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-lg font-medium">Inventario vac&iacute;o</p>
            <p className="text-sm">Agrega materiales e insumos para tus proyectos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">C&oacute;digo</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Categor&iacute;a</th>
                  <th className="px-3 py-2 text-center">Stock</th>
                  <th className="px-3 py-2 text-right">Precio unit.</th>
                  <th className="px-3 py-2 text-right">Valor total</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(item => {
                  const stockBajo = item.stock_minimo > 0 && Number(item.cantidad_actual) <= Number(item.stock_minimo);
                  return (
                    <tr key={item.id_item} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-brand-700">{item.codigo}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{item.nombre}</div>
                        {item.descripcion && <div className="text-xs text-gray-500">{item.descripcion}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{CATEGORIAS_INVENTARIO_LABEL[item.categoria] || item.categoria}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-mono font-medium ${stockBajo ? 'text-red-600' : 'text-gray-900'}`}>
                          {Number(item.cantidad_actual).toFixed(2)} {item.unidad_medida}
                        </span>
                        {stockBajo && <AlertCircle className="h-3 w-3 text-red-500 inline ml-1" />}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(item.precio_unitario)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(item.cantidad_actual) * Number(item.precio_unitario))}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${Number(item.cantidad_actual) <= 0 ? 'bg-red-100 text-red-700' : Number(item.cantidad_actual) <= Number(item.stock_minimo) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {Number(item.cantidad_actual) <= 0 ? 'Agotado' : stockBajo ? 'Stock bajo' : 'Disponible'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => abrirForm(item)} className="p-1 hover:bg-gray-200 rounded text-blue-700" title="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de edici&oacute;n */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editItem ? 'Editar item' : 'Nuevo item'}</h2>
            <div className="space-y-3">
              <Input label="Nombre *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del material..." />
              <Input label="Descripci&oacute;n" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Opcional" />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Categor&iacute;a" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS_INVENTARIO.map(c => <option key={c} value={c}>{CATEGORIAS_INVENTARIO_LABEL[c]}</option>)}
                </Select>
                <Select label="Unidad" value={form.unidad_medida} onChange={e => setForm({ ...form, unidad_medida: e.target.value })}>
                  <option value="UND">UND</option>
                  <option value="M">Metro (M)</option>
                  <option value="M2">Metro cuadrado (M2)</option>
                  <option value="M3">Metro c&uacute;bico (M3)</option>
                  <option value="KG">Kilogramo (KG)</option>
                  <option value="L">Litro (L)</option>
                  <option value="GL">Gal&oacute;n (GL)</option>
                  <option value="BOLSA">Bolsa</option>
                  <option value="CAJA">Caja</option>
                  <option value="ROLLO">Rollo</option>
                  <option value="PLIEGO">Pliego</option>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Stock actual" type="number" step="0.01" min="0" value={form.cantidad_actual} onChange={e => setForm({ ...form, cantidad_actual: e.target.value })} />
                <Input label="Precio unit. (B/.)" type="number" step="0.01" min="0" value={form.precio_unitario} onChange={e => setForm({ ...form, precio_unitario: e.target.value })} />
                <Input label="Stock m&iacute;nimo" type="number" step="0.01" min="0" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })} />
              </div>
              <Input label="Ubicaci&oacute;n" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} placeholder="Ej: Bodega 1, Estante 3" />
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={guardarItem} loading={saving}>Guardar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
