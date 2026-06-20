import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input, Select } from './ui/Input';
import { Wallet, Plus, Search, Trash2 } from 'lucide-react';

export default function GastosView() {
  const { profile } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const cargar = () => supabase.from('proyecto_gastos').select('*, proyectos!left(nombre, numero_proyecto), proyecto_etapas!left(nombre)').order('created_at', { ascending: false }).then(({ data }) => setGastos(data || []));
  useEffect(() => { cargar(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await supabase.from('proyecto_gastos').delete().eq('id_gasto', id);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Wallet className="h-6 w-6 text-brand-700" /> Gastos</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Nuevo gasto</Button>
      </div>
      {showForm && <GastoFormModal open={showForm} onClose={() => { setShowForm(false); cargar(); }} profile={profile} />}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase"><th className="py-2.5 px-3 font-medium">Descripción</th><th className="py-2.5 px-3 font-medium">Tipo</th><th className="py-2.5 px-3 font-medium">Proyecto</th><th className="py-2.5 px-3 font-medium">Etapa</th><th className="py-2.5 px-3 font-medium text-right">Monto</th><th className="py-2.5 px-3 font-medium">Fecha</th><th className="py-2.5 px-3 font-medium text-right">Acciones</th></tr></thead>
            <tbody>
              {gastos.map(g => (
                <tr key={g.id_gasto} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-3">{g.descripcion}</td>
                  <td className="py-2.5 px-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${g.tipo === 'GENERAL' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>{g.tipo}</span></td>
                  <td className="py-2.5 px-3 text-gray-600">{g.proyectos?.numero_proyecto || '—'}</td>
                  <td className="py-2.5 px-3 text-gray-600">{g.proyecto_etapas?.nombre || '—'}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(g.monto)}</td>
                  <td className="py-2.5 px-3">{formatDate(g.fecha)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={() => handleDelete(g.id_gasto)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function GastoFormModal({ open, onClose, profile }) {
  const [proyectos, setProyectos] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    tipo: 'GENERAL', id_proyecto: '', id_etapa: '', id_subetapa: '',
    descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0],
    categoria: 'OTROS', id_item: '', cantidad: '', comprobante: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from('proyectos').select('id_proyecto, numero_proyecto, nombre').in('estado', ['EN_CURSO', 'PAUSADO']).order('numero_proyecto').then(({ data }) => setProyectos(data || []));
    supabase.from('inventario_items').select('id_item, nombre, codigo').eq('activo', true).order('nombre').then(({ data }) => setItems(data || []));
  }, [open]);

  useEffect(() => {
    if (!form.id_proyecto) { setEtapas([]); return; }
    supabase.from('proyecto_etapas').select('id_etapa, nombre, tipo').eq('id_proyecto', form.id_proyecto).order('orden').then(({ data }) => setEtapas(data || []));
  }, [form.id_proyecto]);

  const guardar = async () => {
    setSaving(true);
    try {
      await supabase.from('proyecto_gastos').insert({
        tipo: form.tipo, id_proyecto: form.id_proyecto || null,
        id_etapa: form.id_etapa || null, id_subetapa: null,
        descripcion: form.descripcion, monto: Number(form.monto),
        fecha: form.fecha, categoria: form.categoria,
        id_item: form.id_item || null, cantidad: form.cantidad ? Number(form.cantidad) : null,
        comprobante: form.comprobante || null, created_by: profile?.id,
      });
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo gasto" size="md">
      <div className="space-y-3">
        <Select label="Tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value, id_proyecto: '', id_etapa: '' })}>
          <option value="GENERAL">General (oficina, sin proyecto)</option>
          <option value="ETAPA">Por etapa de proyecto</option>
        </Select>

        {form.tipo === 'ETAPA' && (
          <>
            <Select label="Proyecto" value={form.id_proyecto} onChange={e => setForm({ ...form, id_proyecto: e.target.value })}>
              <option value="">Seleccionar proyecto</option>
              {proyectos.map(p => <option key={p.id_proyecto} value={p.id_proyecto}>{p.numero_proyecto} - {p.nombre}</option>)}
            </Select>
            <Select label="Etapa" value={form.id_etapa} onChange={e => setForm({ ...form, id_etapa: e.target.value })}>
              <option value="">Seleccionar etapa</option>
              {etapas.map(e => <option key={e.id_etapa} value={e.id_etapa}>{e.nombre} ({e.tipo})</option>)}
            </Select>
          </>
        )}

        <Input label="Descripción" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Monto B/." type="number" step="0.01" min="0" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} required />
          <Input label="Fecha" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
        </div>

        <Select label="Categoría" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
          <option value="MATERIALES">Materiales</option><option value="HERRAMIENTAS">Herramientas</option>
          <option value="TRANSPORTE">Transporte</option><option value="SERVICIOS">Servicios</option>
          <option value="ALIMENTACION">Alimentación</option><option value="OTROS">Otros</option>
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Item de inventario (opcional)" value={form.id_item} onChange={e => setForm({ ...form, id_item: e.target.value })}>
            <option value="">— Ninguno —</option>
            {items.map(i => <option key={i.id_item} value={i.id_item}>{i.codigo} - {i.nombre}</option>)}
          </Select>
          <Input label="Cantidad" type="number" step="0.01" min="0" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}><Plus className="h-4 w-4" /> Registrar gasto</Button>
        </div>
      </div>
    </Modal>
  );
}
