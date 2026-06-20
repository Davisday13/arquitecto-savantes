import React, { useState, useEffect } from 'react';
import { AlertCircle, Save, Plus, Trash2, UserPlus } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import ClienteRapidoModal from './ClienteRapidoModal';

export default function CotizacionFormModal({ open, onClose, cotizacionId, profile }) {
  const editing = !!cotizacionId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientes, setClientes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [showClienteRapido, setShowClienteRapido] = useState(false);

  const [form, setForm] = useState({
    id_cliente: '',
    id_proyecto: '',
    asunto: '',
    fecha_validez: '',
    precios_incluyen_itbms: false,
    observaciones: '',
    condiciones: '',
    notas_internas: '',
    descuento_tipo: '',
    descuento_valor: 0,
  });

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!open) return;
    setError('');
    cargarInicial();
  }, [open, cotizacionId]);

  const cargarInicial = async () => {
    setLoading(true);
    const [cliRes, proyRes, empRes] = await Promise.all([
      supabase.from('clientes').select('id_cliente, numero_cliente, nombre').eq('activo', true).order('nombre'),
      supabase.from('proyectos').select('id_proyecto, codigo, nombre').in('estado', ['COTIZACION', 'EN_CURSO']).order('codigo'),
      supabase.from('configuracion_empresa').select('*').eq('id', 1).single(),
    ]);
    setClientes(cliRes.data || []);
    setProyectos(proyRes.data || []);
    const emp = empRes.data || {};

    if (editing) {
      const { data: c } = await supabase.from('cotizaciones').select('*').eq('id_cotizacion', cotizacionId).single();
      if (c) {
        setForm({
          id_cliente: c.id_cliente,
          id_proyecto: c.id_proyecto || '',
          asunto: c.asunto || '',
          fecha_validez: c.fecha_validez,
          precios_incluyen_itbms: c.precios_incluyen_itbms,
          observaciones: c.observaciones || '',
          condiciones: c.condiciones || '',
          notas_internas: c.notas_internas || '',
          descuento_tipo: c.descuento_tipo || '',
          descuento_valor: Number(c.descuento_valor) || 0,
        });
      }
      const { data: its } = await supabase.from('cotizacion_items').select('*').eq('id_cotizacion', cotizacionId).order('orden');
      setItems(its || []);
    } else {
      const validez = new Date(); validez.setDate(validez.getDate() + 15);
      setForm(f => ({
        ...f,
        fecha_validez: validez.toISOString().split('T')[0],
        precios_incluyen_itbms: emp?.precios_incluyen_itbms !== false,
        condiciones: emp?.terminos_cotizacion || '',
      }));
      setItems([]);
    }
    setLoading(false);
  };

  const agregarItem = (tipo) => {
    setItems([...items, {
      _key: Date.now() + Math.random(),
      tipo,
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      itbms_pct: 7,
    }]);
  };

  const actualizarItem = (idx, campo, valor) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], [campo]: valor };
    setItems(nuevos);
  };

  const eliminarItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const totales = (() => {
    let subtotal = 0, itbms = 0;
    items.forEach(it => {
      const cant = Number(it.cantidad || 0);
      const precio = Number(it.precio_unitario || 0);
      const pct = Number(it.itbms_pct || 0);
      const lineTotal = cant * precio;
      if (form.precios_incluyen_itbms) {
        subtotal += lineTotal / (1 + pct / 100);
        itbms += lineTotal - (lineTotal / (1 + pct / 100));
      } else {
        subtotal += lineTotal;
        itbms += lineTotal * pct / 100;
      }
    });
    let descuento = 0;
    if (form.descuento_tipo === 'PORCENTAJE' && form.descuento_valor > 0) {
      descuento = (subtotal + itbms) * Number(form.descuento_valor) / 100;
    } else if (form.descuento_tipo === 'MONTO' && form.descuento_valor > 0) {
      descuento = Math.min(Number(form.descuento_valor), subtotal + itbms);
    }
    return { subtotal, itbms, total: subtotal + itbms, descuento, totalConDescuento: subtotal + itbms - descuento };
  })();

  const guardar = async () => {
    setError('');
    if (!form.id_cliente) return setError('Selecciona un cliente');
    if (items.length === 0) return setError('Agrega al menos un item');

    setSaving(true);
    try {
      let idCot = cotizacionId;

      const payload = {
        id_cliente: form.id_cliente,
        id_proyecto: form.id_proyecto || null,
        asunto: form.asunto || null,
        fecha_validez: form.fecha_validez,
        precios_incluyen_itbms: form.precios_incluyen_itbms,
        observaciones: form.observaciones || null,
        condiciones: form.condiciones || null,
        notas_internas: form.notas_internas || null,
        descuento_tipo: form.descuento_tipo || null,
        descuento_valor: Number(form.descuento_valor) || 0,
        descuento_monto_calculado: totales.descuento || 0,
        subtotal_sin_itbms: totales.subtotal,
        total_itbms: totales.itbms,
        total_general: totales.totalConDescuento,
      };

      if (editing) {
        await supabase.from('cotizaciones').update(payload).eq('id_cotizacion', idCot);
        await supabase.from('cotizacion_items').delete().eq('id_cotizacion', idCot);
      } else {
        const { data, error: e } = await supabase.from('cotizaciones').insert({
          ...payload,
          created_by: profile?.id,
        }).select().single();
        if (e) throw e;
        idCot = data.id_cotizacion;
      }

      if (items.length > 0) {
        const itemsInsert = items.map((it, idx) => ({
          id_cotizacion: idCot,
          tipo: it.tipo,
          descripcion: it.descripcion,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          itbms_pct: Number(it.itbms_pct),
          orden: idx,
        }));
        await supabase.from('cotizacion_items').insert(itemsInsert);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const onClienteCreado = (cliente) => {
    setClientes(prev => [...prev, cliente].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setForm(f => ({ ...f, id_cliente: cliente.id_cliente }));
    setShowClienteRapido(false);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? 'Editar cotizaci\u00f3n' : 'Nueva cotizaci\u00f3n'} size="xl">
        <div className="space-y-4">
          {error && <div className="bg-red-50 p-3 rounded text-sm text-red-700 flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5" />{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">Cliente *</label>
                <button type="button" onClick={() => setShowClienteRapido(true)} className="text-xs text-brand-700 font-medium">+ Nuevo</button>
              </div>
              <Select value={form.id_cliente} onChange={e => setForm({ ...form, id_cliente: e.target.value })}>
                <option value="">Seleccionar...</option>
                {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.numero_cliente} &mdash; {c.nombre}</option>)}
              </Select>
            </div>
            <Select label="Proyecto (opcional)" value={form.id_proyecto} onChange={e => setForm({ ...form, id_proyecto: e.target.value })}>
              <option value="">Sin proyecto asociado</option>
              {proyectos.map(p => <option key={p.id_proyecto} value={p.id_proyecto}>{p.codigo} &mdash; {p.nombre}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Asunto" value={form.asunto} onChange={e => setForm({ ...form, asunto: e.target.value })} placeholder="Ej: Dise\u00f1o y construcci\u00f3n residencial" />
            <Input label="V\u00e1lido hasta *" type="date" value={form.fecha_validez} onChange={e => setForm({ ...form, fecha_validez: e.target.value })} />
          </div>

          <div className="bg-gray-50 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Items</h3>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => agregarItem('SERVICIO')}><Plus className="h-3 w-3" /> Servicio</Button>
                <Button size="sm" variant="outline" onClick={() => agregarItem('PRODUCTO')}><Plus className="h-3 w-3" /> Producto</Button>
              </div>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed rounded">Agrega items a la cotizaci&oacute;n</div>
            ) : (
              <div className="space-y-1.5">
                {items.map((it, idx) => (
                  <div key={it._key} className="flex items-start gap-2 bg-white p-2 rounded border">
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <div className="col-span-6">
                        <Input value={it.descripcion} onChange={e => actualizarItem(idx, 'descripcion', e.target.value)} placeholder={it.tipo === 'SERVICIO' ? 'Servicio...' : 'Producto...'} />
                      </div>
                      <div className="col-span-2"><Input type="number" min="0.01" step="0.01" value={it.cantidad} onChange={e => actualizarItem(idx, 'cantidad', e.target.value)} placeholder="Cant." /></div>
                      <div className="col-span-2"><Input type="number" min="0" step="0.01" value={it.precio_unitario} onChange={e => actualizarItem(idx, 'precio_unitario', e.target.value)} placeholder="B/." /></div>
                      <div className="col-span-2"><Input type="number" min="0" max="100" step="1" value={it.itbms_pct} onChange={e => actualizarItem(idx, 'itbms_pct', e.target.value)} placeholder="ITBMS %" /></div>
                    </div>
                    <button onClick={() => eliminarItem(idx)} className="p-1 hover:bg-red-100 rounded text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="bg-emerald-50 rounded p-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-xs text-gray-600">Subtotal</span><div className="text-lg font-semibold">{formatCurrency(totales.subtotal)}</div></div>
                <div><span className="text-xs text-gray-600">ITBMS</span><div className="text-lg font-semibold">{formatCurrency(totales.itbms)}</div></div>
                <div><span className="text-xs text-emerald-700">TOTAL</span><div className="text-2xl font-bold text-emerald-700">{formatCurrency(totales.totalConDescuento)}</div></div>
              </div>
            </div>
          )}

          <Textarea label="Observaciones" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2} />
          <Textarea label="T\u00e9rminos y condiciones" value={form.condiciones} onChange={e => setForm({ ...form, condiciones: e.target.value })} rows={2} />

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={guardar} loading={saving}><Save className="h-4 w-4" /> {editing ? 'Guardar' : 'Crear cotizaci\u00f3n'}</Button>
          </div>
        </div>
      </Modal>

      {showClienteRapido && <ClienteRapidoModal open={showClienteRapido} onClose={() => setShowClienteRapido(false)} onCreated={onClienteCreado} />}
    </>
  );
}
