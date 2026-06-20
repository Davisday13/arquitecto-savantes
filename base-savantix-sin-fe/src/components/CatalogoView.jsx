import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus, Search, Edit2, Package, AlertTriangle, ArrowDownToLine,
  ArrowUpFromLine, Upload, Download, History,
} from 'lucide-react';
import { Card, CardContent, Badge } from './ui/Card';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import { CATEGORIAS_REPUESTO, ESTADO_STOCK_LABEL, ESTADO_STOCK_COLOR, TASAS_ITBMS } from '../lib/constants';
import { formatCurrency, formatDateTime } from '../lib/utils';

export default function CatalogoView({ profile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showSoloActivos, setShowSoloActivos] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showAjuste, setShowAjuste] = useState(null);
  const [showHistorial, setShowHistorial] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_catalogo_completo')
      .select('*')
      .order('nombre');
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = items.filter(i => {
    if (showSoloActivos && !i.activo) return false;
    if (filtroCategoria && i.categoria !== filtroCategoria) return false;
    if (filtroEstado && i.estado_stock !== filtroEstado) return false;
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return [i.sku, i.nombre, i.descripcion, i.categoria, i.marca, i.modelo]
      .some(v => v?.toLowerCase().includes(t));
  });

  const categoriasExistentes = [...new Set([
    ...CATEGORIAS_REPUESTO,
    ...items.map(i => i.categoria).filter(Boolean),
  ])].sort();

  const exportarCSV = () => {
    const headers = ['SKU', 'Nombre', 'Descripcion', 'Categoria', 'Marca', 'Modelo',
                     'Precio Venta', 'Costo', 'ITBMS %', 'Stock Disponible', 'Stock Reservado',
                     'Stock Minimo', 'Unidad', 'Notas', 'Activo'];
    const rows = items.map(i => [
      i.sku, i.nombre, i.descripcion || '', i.categoria || '', i.marca || '', i.modelo || '',
      i.precio_venta, i.costo || 0, i.itbms_pct, i.stock_disponible, i.stock_reservado,
      i.stock_minimo, i.unidad || '', i.notas || '', i.activo ? 'SI' : 'NO',
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(c => {
        const s = String(c).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
      }).join(',')
    ).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Catalogo-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalActivos = items.filter(i => i.activo).length;
  const stockBajo = items.filter(i => i.activo && i.estado_stock === 'BAJO').length;
  const agotados = items.filter(i => i.activo && i.estado_stock === 'AGOTADO').length;
  const valorInventario = items
    .filter(i => i.activo)
    .reduce((s, i) => s + (Number(i.stock_disponible) * Number(i.precio_venta)), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de repuestos</h1>
          <p className="text-sm text-gray-500">{totalActivos} productos activos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportarCSV}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" /> Importar CSV
          </Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Nuevo repuesto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="text-center">
            <Package className="h-5 w-5 mx-auto text-gray-400 mb-1" />
            <div className="text-xs text-gray-500 uppercase">Activos</div>
            <div className="text-xl font-bold">{totalActivos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-amber-400 mb-1" />
            <div className="text-xs text-gray-500 uppercase">Stock bajo</div>
            <div className="text-xl font-bold text-amber-600">{stockBajo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-400 mb-1" />
            <div className="text-xs text-gray-500 uppercase">Agotados</div>
            <div className="text-xl font-bold text-red-600">{agotados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <div className="text-xs text-gray-500 uppercase">Valor inventario</div>
            <div className="text-xl font-bold text-brand-700 mt-1">{formatCurrency(valorInventario)}</div>
            <div className="text-xs text-gray-400">a precio de venta</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por SKU, nombre, marca..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              <option value="">Todas las categorías</option>
              {categoriasExistentes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              <option value="">Todos los estados</option>
              <option value="OK">Disponible</option>
              <option value="BAJO">Stock bajo</option>
              <option value="AGOTADO">Agotado</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-sm mb-3">
            <input
              type="checkbox"
              checked={showSoloActivos}
              onChange={e => setShowSoloActivos(e.target.checked)}
              className="h-4 w-4 rounded text-brand-700"
            />
            Solo productos activos
          </label>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {search || filtroCategoria || filtroEstado
                ? 'No se encontraron productos'
                : 'Aún no tienes productos. Click en "Nuevo repuesto" o "Importar CSV" para empezar.'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="pb-2 pr-3 font-medium">SKU</th>
                    <th className="pb-2 pr-3 font-medium">Nombre</th>
                    <th className="pb-2 pr-3 font-medium">Categoría</th>
                    <th className="pb-2 pr-3 font-medium text-right">Disp.</th>
                    <th className="pb-2 pr-3 font-medium text-right">Reserv.</th>
                    <th className="pb-2 pr-3 font-medium text-right">Mín.</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 pr-3 font-medium text-right">Precio</th>
                    <th className="pb-2 pr-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(i => (
                    <tr key={i.id_catalogo} className={`border-b border-gray-100 hover:bg-gray-50 ${!i.activo ? 'opacity-50' : ''}`}>
                      <td className="py-2 pr-3 font-mono text-xs font-semibold">{i.sku}</td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{i.nombre}</div>
                        {(i.marca || i.modelo) && (
                          <div className="text-xs text-gray-500">{i.marca} {i.modelo}</div>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-600">{i.categoria || '—'}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{i.stock_disponible}</td>
                      <td className="py-2 pr-3 text-right text-amber-600">{i.stock_reservado || 0}</td>
                      <td className="py-2 pr-3 text-right text-gray-500">{i.stock_minimo}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${ESTADO_STOCK_COLOR[i.estado_stock]}`}>
                          {ESTADO_STOCK_LABEL[i.estado_stock]}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">{formatCurrency(i.precio_venta)}</td>
                      <td className="py-2 pr-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setShowAjuste(i)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Ajustar stock"
                          >
                            <ArrowDownToLine className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowHistorial(i)}
                            className="p-1.5 text-gray-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                            title="Historial"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setEditing(i); setShowForm(true); }}
                            className="p-1.5 text-gray-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <RepuestoForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        item={editing}
        userId={profile?.id}
        categoriasExistentes={categoriasExistentes}
        onSaved={() => { setShowForm(false); setEditing(null); cargar(); }}
      />

      <AjusteStockModal
        open={!!showAjuste}
        onClose={() => setShowAjuste(null)}
        item={showAjuste}
        userId={profile?.id}
        onSaved={() => { setShowAjuste(null); cargar(); }}
      />

      <HistorialModal
        open={!!showHistorial}
        onClose={() => setShowHistorial(null)}
        item={showHistorial}
      />

      <ImportarCSVModal
        open={showImport}
        onClose={() => setShowImport(false)}
        userId={profile?.id}
        onImported={() => { setShowImport(false); cargar(); }}
      />
    </div>
  );
}

function RepuestoForm({ open, onClose, item, userId, categoriasExistentes, onSaved }) {
  const [form, setForm] = useState({
    nombre: '', descripcion: '', categoria: '', marca: '', modelo: '',
    precio_venta: 0, costo: 0, itbms_pct: 7,
    stock_disponible: 0, stock_minimo: 0, unidad: 'unidad',
    notas: '', activo: true,
  });
  const [categoriaCustom, setCategoriaCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      if (item) {
        setForm({
          nombre: item.nombre || '',
          descripcion: item.descripcion || '',
          categoria: item.categoria || '',
          marca: item.marca || '',
          modelo: item.modelo || '',
          precio_venta: Number(item.precio_venta) || 0,
          costo: Number(item.costo) || 0,
          itbms_pct: Number(item.itbms_pct) ?? 7,
          stock_disponible: Number(item.stock_disponible) || 0,
          stock_minimo: Number(item.stock_minimo) || 0,
          unidad: item.unidad || 'unidad',
          notas: item.notas || '',
          activo: item.activo !== false,
        });
        setCategoriaCustom(item.categoria && !categoriasExistentes.includes(item.categoria));
      } else {
        setForm({
          nombre: '', descripcion: '', categoria: '', marca: '', modelo: '',
          precio_venta: 0, costo: 0, itbms_pct: 7,
          stock_disponible: 0, stock_minimo: 0, unidad: 'unidad',
          notas: '', activo: true,
        });
        setCategoriaCustom(false);
      }
    }
  }, [open, item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es obligatorio');

    setLoading(true);
    setError('');
    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || null,
        categoria: form.categoria?.trim() || null,
        marca: form.marca?.trim() || null,
        modelo: form.modelo?.trim() || null,
        precio_venta: Number(form.precio_venta) || 0,
        costo: Number(form.costo) || 0,
        itbms_pct: Number(form.itbms_pct),
        stock_minimo: Number(form.stock_minimo) || 0,
        unidad: form.unidad?.trim() || 'unidad',
        notas: form.notas?.trim() || null,
        activo: form.activo,
      };

      if (item) {
        const { error } = await supabase
          .from('catalogo_repuestos')
          .update(payload)
          .eq('id_catalogo', item.id_catalogo);
        if (error) throw error;
      } else {
        payload.stock_disponible = Number(form.stock_disponible) || 0;
        payload.created_by = userId;
        const { data, error } = await supabase
          .from('catalogo_repuestos')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        if (data && Number(form.stock_disponible) > 0) {
          await supabase.from('movimientos_inventario').insert({
            id_catalogo: data.id_catalogo,
            tipo: 'ENTRADA',
            cantidad: Number(form.stock_disponible),
            motivo: 'Stock inicial al crear repuesto',
            stock_disponible_antes: 0,
            stock_disponible_despues: Number(form.stock_disponible),
            stock_reservado_antes: 0,
            stock_reservado_despues: 0,
            registrado_por: userId,
          });
        }
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? `Editar ${item.sku}` : 'Nuevo repuesto'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

        <Input
          label="Nombre / Descripción corta *"
          value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })}
          required
          placeholder="Ej: Cartucho HP 664 Negro"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            {!categoriaCustom ? (
              <select
                value={form.categoria}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    setCategoriaCustom(true);
                    setForm({ ...form, categoria: '' });
                  } else {
                    setForm({ ...form, categoria: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                <option value="">— Selecciona —</option>
                {categoriasExistentes.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__custom__">+ Nueva categoría...</option>
              </select>
            ) : (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={form.categoria}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Escribe la categoría"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setCategoriaCustom(false); setForm({ ...form, categoria: '' }); }}
                  className="text-xs text-gray-500 hover:underline px-2"
                >
                  ← Lista
                </button>
              </div>
            )}
          </div>
          <Input
            label="Unidad"
            value={form.unidad}
            onChange={e => setForm({ ...form, unidad: e.target.value })}
            placeholder="unidad, par, metro..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Marca"
            value={form.marca}
            onChange={e => setForm({ ...form, marca: e.target.value })}
          />
          <Input
            label="Modelo"
            value={form.modelo}
            onChange={e => setForm({ ...form, modelo: e.target.value })}
          />
        </div>

        <Textarea
          label="Descripción detallada"
          value={form.descripcion}
          onChange={e => setForm({ ...form, descripcion: e.target.value })}
          rows={2}
        />

        <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Precio venta * (Inc. ITBMS)"
              type="number" step="0.01" min="0"
              value={form.precio_venta}
              onChange={e => setForm({ ...form, precio_venta: e.target.value })}
              required
            />
            <Input
              label="Costo (opcional)"
              type="number" step="0.01" min="0"
              value={form.costo}
              onChange={e => setForm({ ...form, costo: e.target.value })}
            />
            <Select
              label="Tasa ITBMS *"
              value={form.itbms_pct}
              onChange={e => setForm({ ...form, itbms_pct: e.target.value })}
            >
              {TASAS_ITBMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!item && (
              <Input
                label="Stock inicial"
                type="number" step="1" min="0"
                value={form.stock_disponible}
                onChange={e => setForm({ ...form, stock_disponible: e.target.value })}
              />
            )}
            <Input
              label="Stock mínimo (alerta)"
              type="number" step="1" min="0"
              value={form.stock_minimo}
              onChange={e => setForm({ ...form, stock_minimo: e.target.value })}
            />
          </div>
          <p className="text-xs text-blue-700 mt-2">
            {item
              ? 'El stock actual se ajusta con el botón "Ajustar stock" en la lista.'
              : 'Si pones 0, podrás agregar stock después con "Ajustar stock".'}
          </p>
        </div>

        <Textarea
          label="Notas internas"
          value={form.notas}
          onChange={e => setForm({ ...form, notas: e.target.value })}
          rows={2}
        />

        {item && (
          <label className="flex items-center gap-2 cursor-pointer p-3 border rounded">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={e => setForm({ ...form, activo: e.target.checked })}
              className="h-4 w-4 rounded text-brand-700"
            />
            <span className="text-sm font-medium text-gray-700">
              {form.activo ? 'Activo' : 'Inactivo (no aparece al agregar a órdenes)'}
            </span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" loading={loading}>{item ? 'Guardar cambios' : 'Crear repuesto'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AjusteStockModal({ open, onClose, item, userId, onSaved }) {
  const [tipo, setTipo] = useState('ENTRADA');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setTipo('ENTRADA'); setCantidad(''); setMotivo(''); setError(''); }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cantidad || Number(cantidad) <= 0) return setError('La cantidad debe ser mayor a cero');
    if (!motivo.trim()) return setError('Ingresa un motivo');

    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.rpc('ajustar_stock', {
        p_id_catalogo: item.id_catalogo,
        p_cantidad: Number(cantidad),
        p_tipo: tipo,
        p_motivo: motivo,
        p_user: userId || null,
      });
      if (error) throw error;
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Ajustar stock · ${item.sku}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm space-y-1">
          <div className="font-medium">{item.nombre}</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-gray-500">Disponible:</span> <strong>{item.stock_disponible}</strong></div>
            <div><span className="text-gray-500">Reservado:</span> <strong className="text-amber-600">{item.stock_reservado || 0}</strong></div>
            <div><span className="text-gray-500">Mínimo:</span> <strong>{item.stock_minimo}</strong></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo('ENTRADA')}
            className={`p-3 border-2 rounded text-center transition-colors ${
              tipo === 'ENTRADA' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <ArrowDownToLine className="h-5 w-5 mx-auto mb-1" />
            <div className="text-sm font-medium">Entrada</div>
            <div className="text-xs">Sumar al stock</div>
          </button>
          <button
            type="button"
            onClick={() => setTipo('SALIDA')}
            className={`p-3 border-2 rounded text-center transition-colors ${
              tipo === 'SALIDA' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <ArrowUpFromLine className="h-5 w-5 mx-auto mb-1" />
            <div className="text-sm font-medium">Salida</div>
            <div className="text-xs">Restar del stock</div>
          </button>
        </div>

        <Input
          label="Cantidad *"
          type="number" step="1" min="1"
          value={cantidad}
          onChange={e => setCantidad(e.target.value)}
          required
        />

        <Textarea
          label="Motivo *"
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          rows={2}
          placeholder={tipo === 'ENTRADA' ? 'Ej: Compra al proveedor X' : 'Ej: Producto dañado'}
          required
        />

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" loading={loading} variant={tipo === 'ENTRADA' ? 'success' : 'danger'}>
            {tipo === 'ENTRADA' ? 'Registrar entrada' : 'Registrar salida'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function HistorialModal({ open, onClose, item }) {
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setLoading(true);
    supabase
      .from('movimientos_inventario')
      .select('*, usuarios:registrado_por(nombre_completo), ordenes_taller:id_orden(numero_ticket)')
      .eq('id_catalogo', item.id_catalogo)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setMovs(data || []);
        setLoading(false);
      });
  }, [open, item]);

  if (!item) return null;

  const tipoLabel = {
    ENTRADA:            { label: 'Entrada',   color: 'success', sign: '+' },
    SALIDA:             { label: 'Salida',    color: 'danger',  sign: '−' },
    RESERVA:            { label: 'Reserva',   color: 'warning', sign: '→' },
    DEVOLUCION_RESERVA: { label: 'Devuelto',  color: 'primary', sign: '←' },
    VENTA:              { label: 'Venta',     color: 'success', sign: '✓' },
    IMPORTACION:        { label: 'Importado', color: 'primary', sign: '↓' },
  };

  return (
    <Modal open={open} onClose={onClose} title={`Historial · ${item.sku}`} size="lg">
      <div className="space-y-3">
        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
          <div className="font-medium">{item.nombre}</div>
          <div className="text-xs text-gray-500 mt-1">
            Disponible: <strong>{item.stock_disponible}</strong> · Reservado: <strong>{item.stock_reservado || 0}</strong>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-6 text-gray-500">Cargando...</div>
        ) : movs.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">Sin movimientos registrados</div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6 max-h-[60vh]">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left border-b border-gray-200 text-gray-500 uppercase">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 font-medium text-right">Cant.</th>
                  <th className="py-2 pr-3 font-medium text-right">Disp. después</th>
                  <th className="py-2 pr-3 font-medium">Motivo</th>
                  <th className="py-2 pr-3 font-medium">Usuario</th>
                  <th className="py-2 pr-3 font-medium">Orden</th>
                </tr>
              </thead>
              <tbody>
                {movs.map(m => {
                  const t = tipoLabel[m.tipo] || { label: m.tipo, color: 'primary', sign: '' };
                  return (
                    <tr key={m.id_movimiento} className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-gray-500">{formatDateTime(m.created_at)}</td>
                      <td className="py-2 pr-3"><Badge variant={t.color}>{t.label}</Badge></td>
                      <td className="py-2 pr-3 text-right font-bold">{t.sign}{m.cantidad}</td>
                      <td className="py-2 pr-3 text-right">{m.stock_disponible_despues}</td>
                      <td className="py-2 pr-3 text-gray-600">{m.motivo || '—'}</td>
                      <td className="py-2 pr-3 text-gray-600">{m.usuarios?.nombre_completo || '—'}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{m.ordenes_taller?.numero_ticket || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ImportarCSVModal({ open, onClose, userId, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFile(null); setPreview([]); setErrors([]); setResultado(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [open]);

  const descargarPlantilla = () => {
    const headers = ['Nombre', 'Descripcion', 'Categoria', 'Marca', 'Modelo',
                     'Precio Venta', 'Costo', 'ITBMS %', 'Stock Inicial', 'Stock Minimo', 'Unidad', 'Notas'];
    const ejemplo = [
      ['Cartucho HP 664 Negro', 'Cartucho original 664', 'Cartuchos / Tóners', 'HP', '664', '25.00', '15.00', '7', '10', '2', 'unidad', ''],
      ['Cable HDMI 2m', 'Cable HDMI alta velocidad', 'Cables', 'Generico', 'HDMI-2M', '8.50', '4.00', '7', '20', '5', 'unidad', ''],
    ];
    const csv = [headers, ...ejemplo].map(r =>
      r.map(c => /[,"\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')
    ).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-catalogo.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const splitLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          result.push(current); current = '';
        } else {
          current += ch;
        }
      }
      result.push(current);
      return result.map(s => s.trim());
    };
    return { headers: splitLine(lines[0]), rows: lines.slice(1).map(splitLine) };
  };

  const handleFile = (f) => {
    setFile(f); setErrors([]); setResultado(null);
    if (!f) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { headers, rows } = parseCSV(e.target.result);
        if (headers.length === 0) {
          setErrors(['El archivo no tiene contenido válido']);
          return;
        }

        const norm = s => s?.toLowerCase().replace(/[^a-z0-9]/g, '');
        const findCol = (...names) => {
          for (const n of names) {
            const idx = headers.findIndex(h => norm(h) === norm(n));
            if (idx >= 0) return idx;
          }
          return -1;
        };

        const cN = findCol('Nombre', 'Producto', 'Descripcion');
        const cD = findCol('Descripcion', 'Detalle');
        const cCat = findCol('Categoria');
        const cMar = findCol('Marca');
        const cMod = findCol('Modelo');
        const cP = findCol('Precio Venta', 'Precio');
        const cCs = findCol('Costo');
        const cIt = findCol('ITBMS %', 'ITBMS');
        const cSt = findCol('Stock Inicial', 'Stock', 'Cantidad');
        const cMin = findCol('Stock Minimo', 'Minimo');
        const cU = findCol('Unidad');
        const cNt = findCol('Notas');

        if (cN < 0) {
          setErrors(['No se encuentra columna "Nombre". Descarga la plantilla.']);
          return;
        }

        const errs = [];
        const items = rows.map((row, i) => {
          const nombre = row[cN]?.trim();
          if (!nombre) {
            errs.push(`Fila ${i + 2}: nombre vacío`);
            return null;
          }
          return {
            nombre,
            descripcion: cD >= 0 ? row[cD]?.trim() || null : null,
            categoria: cCat >= 0 ? row[cCat]?.trim() || null : null,
            marca: cMar >= 0 ? row[cMar]?.trim() || null : null,
            modelo: cMod >= 0 ? row[cMod]?.trim() || null : null,
            precio_venta: parseFloat(row[cP]) || 0,
            costo: cCs >= 0 ? (parseFloat(row[cCs]) || 0) : 0,
            itbms_pct: cIt >= 0 ? (parseFloat(row[cIt]) || 7) : 7,
            stock_inicial: cSt >= 0 ? (parseInt(row[cSt]) || 0) : 0,
            stock_minimo: cMin >= 0 ? (parseInt(row[cMin]) || 0) : 0,
            unidad: cU >= 0 ? row[cU]?.trim() || 'unidad' : 'unidad',
            notas: cNt >= 0 ? row[cNt]?.trim() || null : null,
          };
        }).filter(Boolean);

        setPreview(items);
        setErrors(errs);
      } catch (err) {
        setErrors(['Error: ' + err.message]);
      }
    };
    reader.readAsText(f, 'utf-8');
  };

  const importar = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    let creados = 0, fallos = 0;
    const erroresImp = [];

    for (const item of preview) {
      try {
        const { stock_inicial, ...payload } = item;
        const { data, error } = await supabase
          .from('catalogo_repuestos')
          .insert({ ...payload, stock_disponible: stock_inicial, created_by: userId })
          .select()
          .single();
        if (error) throw error;
        if (data && stock_inicial > 0) {
          await supabase.from('movimientos_inventario').insert({
            id_catalogo: data.id_catalogo,
            tipo: 'IMPORTACION',
            cantidad: stock_inicial,
            motivo: 'Importación desde CSV',
            stock_disponible_antes: 0,
            stock_disponible_despues: stock_inicial,
            stock_reservado_antes: 0,
            stock_reservado_despues: 0,
            registrado_por: userId,
          });
        }
        creados++;
      } catch (err) {
        fallos++;
        erroresImp.push(`${item.nombre}: ${err.message}`);
      }
    }

    setResultado({ creados, fallos, errores: erroresImp });
    setImporting(false);
    if (creados > 0) setTimeout(() => onImported(), 1500);
  };

  return (
    <Modal open={open} onClose={onClose} title="Importar catálogo desde CSV" size="lg">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-start gap-3">
          <Download className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-blue-900">1. Descarga la plantilla</div>
            <p className="text-xs text-blue-700 mt-1">
              Descarga la plantilla, llénala en Excel/Google Sheets y guárdala como CSV.
            </p>
            <button
              type="button"
              onClick={descargarPlantilla}
              className="mt-2 text-xs font-medium text-blue-700 hover:underline"
            >
              Descargar plantilla CSV →
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">2. Selecciona tu archivo CSV</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={e => handleFile(e.target.files?.[0])}
            className="block w-full text-sm border border-gray-300 rounded-md cursor-pointer file:cursor-pointer file:bg-brand-50 file:text-brand-700 file:border-0 file:px-3 file:py-2 file:mr-3"
          />
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="text-sm font-semibold text-red-700 mb-1">Avisos:</div>
            <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
              {errors.map((e, i) => <li key={i}>· {e}</li>)}
            </ul>
          </div>
        )}

        {preview.length > 0 && !resultado && (
          <div className="border border-gray-200 rounded">
            <div className="bg-gray-50 px-3 py-2 border-b text-sm font-semibold">
              Vista previa: {preview.length} productos
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-500 uppercase">
                    <th className="py-1.5 px-2 font-medium">Nombre</th>
                    <th className="py-1.5 px-2 font-medium">Categoría</th>
                    <th className="py-1.5 px-2 font-medium text-right">Precio</th>
                    <th className="py-1.5 px-2 font-medium text-center">ITBMS</th>
                    <th className="py-1.5 px-2 font-medium text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((p, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-1 px-2 truncate max-w-[200px]">{p.nombre}</td>
                      <td className="py-1 px-2 text-gray-600">{p.categoria || '—'}</td>
                      <td className="py-1 px-2 text-right">{formatCurrency(p.precio_venta)}</td>
                      <td className="py-1 px-2 text-center">{p.itbms_pct}%</td>
                      <td className="py-1 px-2 text-right font-medium">{p.stock_inicial}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && (
                <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">
                  ... y {preview.length - 50} más
                </div>
              )}
            </div>
          </div>
        )}

        {resultado && (
          <div className={`rounded p-3 ${resultado.fallos > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="text-sm font-semibold">
              {resultado.creados > 0 && `✓ ${resultado.creados} creados`}
              {resultado.fallos > 0 && ` · ✗ ${resultado.fallos} fallaron`}
            </div>
            {resultado.errores.length > 0 && (
              <ul className="text-xs text-amber-800 mt-2 space-y-0.5 max-h-32 overflow-y-auto">
                {resultado.errores.map((e, i) => <li key={i}>· {e}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} type="button">
            {resultado ? 'Cerrar' : 'Cancelar'}
          </Button>
          {preview.length > 0 && !resultado && (
            <Button onClick={importar} loading={importing}>
              <Upload className="h-4 w-4" /> Importar {preview.length} productos
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
