import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, Badge } from './ui/Card';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import { TIPOS_EQUIPO } from '../lib/constants';

export default function EquiposView({ profile }) {
  const [equipos, setEquipos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const [equiposRes, clientesRes] = await Promise.all([
      supabase.from('equipos')
        .select('*, clientes(numero_cliente, nombre, tipo_cliente)')
        .eq('activo', true)
        .order('created_at', { ascending: false }),
      supabase.from('clientes')
        .select('id_cliente, numero_cliente, nombre')
        .eq('activo', true)
        .order('nombre'),
    ]);
    if (!equiposRes.error) setEquipos(equiposRes.data || []);
    if (!clientesRes.error) setClientes(clientesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = equipos.filter(e => {
    if (filtroCliente && e.id_cliente !== filtroCliente) return false;
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return [e.tipo_equipo, e.marca, e.modelo, e.numero_serie, e.ubicacion, e.clientes?.nombre]
      .some(v => v?.toLowerCase().includes(t));
  });

  const handleEliminar = async (eq) => {
    if (!confirm(`¿Eliminar el equipo "${eq.marca} ${eq.modelo} (${eq.numero_serie})"?\n\nSe marcará como inactivo.`)) return;
    const { error } = await supabase.from('equipos').update({ activo: false }).eq('id_equipo', eq.id_equipo);
    if (error) return alert('Error: ' + error.message);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Equipos</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Nuevo equipo
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por serie, marca, modelo, cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={filtroCliente}
              onChange={e => setFiltroCliente(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos los clientes</option>
              {clientes.map(c => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {search || filtroCliente ? 'No se encontraron equipos' : 'No hay equipos registrados.'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="pb-2 pr-4 font-medium">Cliente</th>
                    <th className="pb-2 pr-4 font-medium">Tipo</th>
                    <th className="pb-2 pr-4 font-medium">Marca / Modelo</th>
                    <th className="pb-2 pr-4 font-medium">Serie</th>
                    <th className="pb-2 pr-4 font-medium">Ubicación</th>
                    <th className="pb-2 pr-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(e => (
                    <tr key={e.id_equipo} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{e.clientes?.nombre}</div>
                        <div className="text-xs text-gray-500 font-mono">{e.clientes?.numero_cliente}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="primary">{e.tipo_equipo}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <div>{e.marca || '-'}</div>
                        <div className="text-xs text-gray-500">{e.modelo || ''}</div>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{e.numero_serie}</td>
                      <td className="py-2 pr-4 text-gray-600">{e.ubicacion || '-'}</td>
                      <td className="py-2 pr-4 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => { setEditing(e); setShowForm(true); }}
                            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(e)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
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

      <EquipoForm
        open={showForm}
        onClose={() => setShowForm(false)}
        equipo={editing}
        clientes={clientes}
        userId={profile?.id}
        onSaved={() => { setShowForm(false); cargar(); }}
      />
    </div>
  );
}

function EquipoForm({ open, onClose, equipo, clientes, userId, onSaved }) {
  const [form, setForm] = useState({
    id_cliente: '', tipo_equipo: 'IMPRESORA', marca: '', modelo: '',
    numero_serie: '', ubicacion: '', notas: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      if (equipo) {
        setForm({
          id_cliente: equipo.id_cliente || '',
          tipo_equipo: equipo.tipo_equipo || 'IMPRESORA',
          marca: equipo.marca || '',
          modelo: equipo.modelo || '',
          numero_serie: equipo.numero_serie || '',
          ubicacion: equipo.ubicacion || '',
          notas: equipo.notas || '',
        });
      } else {
        setForm({
          id_cliente: '', tipo_equipo: 'IMPRESORA', marca: '', modelo: '',
          numero_serie: '', ubicacion: '', notas: '',
        });
      }
    }
  }, [open, equipo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_cliente) return setError('Selecciona un cliente');
    if (!form.numero_serie.trim()) return setError('El número de serie es obligatorio');
    setLoading(true);
    setError('');
    try {
      if (equipo) {
        const { error } = await supabase.from('equipos').update(form).eq('id_equipo', equipo.id_equipo);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('equipos').insert({ ...form, created_by: userId });
        if (error) throw error;
      }
      onSaved();
    } catch (err) {
      if (err.message?.includes('duplicate')) {
        setError('Este número de serie ya existe para este cliente');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={equipo ? 'Editar equipo' : 'Nuevo equipo'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

        <Select
          label="Cliente *"
          value={form.id_cliente}
          onChange={e => setForm({ ...form, id_cliente: e.target.value })}
          required
        >
          <option value="">— Selecciona un cliente —</option>
          {clientes.map(c => (
            <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
          ))}
        </Select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Tipo de equipo *"
            value={form.tipo_equipo}
            onChange={e => setForm({ ...form, tipo_equipo: e.target.value })}
          >
            {TIPOS_EQUIPO.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input
            label="Número de serie *"
            value={form.numero_serie}
            onChange={e => setForm({ ...form, numero_serie: e.target.value })}
            required
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

        <Input
          label="Ubicación física en el cliente"
          placeholder="Ej: Oficina 2do piso, recepción..."
          value={form.ubicacion}
          onChange={e => setForm({ ...form, ubicacion: e.target.value })}
        />

        <Textarea
          label="Notas"
          value={form.notas}
          onChange={e => setForm({ ...form, notas: e.target.value })}
          rows={2}
        />

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" loading={loading}>
            {equipo ? 'Guardar cambios' : 'Crear equipo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
