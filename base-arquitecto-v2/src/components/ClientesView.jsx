import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import { Card, Badge } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input, Select, Textarea } from './ui/Input';
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react';

export default function ClientesView() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCliente, setEditCliente] = useState(null);

  const cargar = () => supabase.from('clientes').select('*').eq('activo', true).order('nombre').then(({ data }) => setClientes(data || []));
  useEffect(() => { cargar(); }, []);

  const filtrados = clientes.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.nombre?.toLowerCase().includes(q) || c.documento?.toLowerCase().includes(q) || c.correo?.toLowerCase().includes(q) || c.telefono?.includes(q);
  });

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar este cliente?')) return;
    await supabase.from('clientes').update({ activo: false }).eq('id_cliente', id);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="h-6 w-6 text-brand-700" /> Clientes</h1>
        <Button onClick={() => { setEditCliente(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Nuevo cliente</Button>
      </div>

      {showForm && <ClienteFormModal open={showForm} onClose={() => { setShowForm(false); cargar(); }} cliente={editCliente} />}

      <Card>
        <div className="mb-3"><Search className="absolute h-4 w-4 text-gray-400 mt-2.5 ml-2.5" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar clientes..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase"><th className="py-2.5 px-3 font-medium">Nombre</th><th className="py-2.5 px-3 font-medium">Documento</th><th className="py-2.5 px-3 font-medium">Correo</th><th className="py-2.5 px-3 font-medium">Teléfono</th><th className="py-2.5 px-3 font-medium">Tipo</th><th className="py-2.5 px-3 font-medium">Estado</th><th className="py-2.5 px-3 text-right">Acciones</th></tr></thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id_cliente} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium">{c.nombre}</td>
                  <td className="py-2.5 px-3 text-gray-600">{c.documento || '—'}</td>
                  <td className="py-2.5 px-3 text-gray-600">{c.correo || '—'}</td>
                  <td className="py-2.5 px-3 text-gray-600">{c.telefono || '—'}</td>
                  <td className="py-2.5 px-3"><Badge color={c.tipo === 'EMPRESA' ? 'purple' : 'blue'}>{c.tipo}</Badge></td>
                  <td className="py-2.5 px-3"><Badge color={c.activo ? 'green' : 'red'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={() => { setEditCliente(c); setShowForm(true); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-700"><Edit className="h-4 w-4" /></button>
                    {c.activo && <button onClick={() => handleDelete(c.id_cliente)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>}
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

function ClienteFormModal({ open, onClose, cliente }) {
  const [form, setForm] = useState({ tipo: 'PERSONA', nombre: '', documento: '', correo: '', telefono: '', telefono_alt: '', direccion: '', notas: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cliente) setForm({ tipo: cliente.tipo, nombre: cliente.nombre, documento: cliente.documento || '', correo: cliente.correo || '', telefono: cliente.telefono || '', telefono_alt: cliente.telefono_alt || '', direccion: cliente.direccion || '', notas: cliente.notas || '' });
    else setForm({ tipo: 'PERSONA', nombre: '', documento: '', correo: '', telefono: '', telefono_alt: '', direccion: '', notas: '' });
  }, [cliente, open]);

  const guardar = async () => {
    setSaving(true);
    try {
      if (cliente) await supabase.from('clientes').update(form).eq('id_cliente', cliente.id_cliente);
      else await supabase.from('clientes').insert(form);
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={cliente ? 'Editar cliente' : 'Nuevo cliente'}>
      <div className="space-y-3">
        <Select label="Tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
          <option value="PERSONA">Persona</option>
          <option value="EMPRESA">Empresa</option>
        </Select>
        <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
        <Input label="Documento (Cédula/RUC)" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} />
        <Input label="Correo" type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
          <Input label="Teléfono alternativo" value={form.telefono_alt} onChange={e => setForm({ ...form, telefono_alt: e.target.value })} />
        </div>
        <Textarea label="Dirección" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
        <Textarea label="Notas" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}>{cliente ? 'Guardar' : 'Crear cliente'}</Button>
        </div>
      </div>
    </Modal>
  );
}
