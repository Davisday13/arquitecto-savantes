import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit2, Trash2, Building2, User as UserIcon } from 'lucide-react';
import { Card, CardContent, Badge } from './ui/Card';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import { TIPOS_CLIENTE, TIPOS_CLIENTE_LABEL } from '../lib/constants';
import { formatDate } from '../lib/utils';

export default function ClientesView({ profile }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false });
    if (!error) setClientes(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = clientes.filter(c => {
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return [c.numero_cliente, c.nombre, c.ruc_cedula, c.contacto_nombre, c.telefono, c.correo]
      .some(v => v?.toLowerCase().includes(t));
  });

  const handleEliminar = async (cliente) => {
    if (!confirm(`¿Eliminar al cliente "${cliente.nombre}"?\n\nSe marcará como inactivo (sus equipos y órdenes se conservan).`)) return;
    const { error } = await supabase
      .from('clientes')
      .update({ activo: false })
      .eq('id_cliente', cliente.id_cliente);
    if (error) return alert('Error: ' + error.message);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUC, teléfono, correo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {search ? 'No se encontraron clientes' : 'No hay clientes registrados. Crea el primero.'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="pb-2 pr-4 font-medium">Código</th>
                    <th className="pb-2 pr-4 font-medium">Tipo</th>
                    <th className="pb-2 pr-4 font-medium">Nombre</th>
                    <th className="pb-2 pr-4 font-medium">Contacto</th>
                    <th className="pb-2 pr-4 font-medium">Teléfono</th>
                    <th className="pb-2 pr-4 font-medium">Correo</th>
                    <th className="pb-2 pr-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(c => (
                    <tr key={c.id_cliente} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-4 font-mono text-xs">{c.numero_cliente}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={c.tipo_cliente === 'EMPRESA' ? 'primary' : 'default'}>
                          {c.tipo_cliente === 'EMPRESA'
                            ? <><Building2 className="h-3 w-3 inline mr-1" />Empresa</>
                            : <><UserIcon className="h-3 w-3 inline mr-1" />Personal</>}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 font-medium">{c.nombre}</td>
                      <td className="py-2 pr-4 text-gray-600">{c.contacto_nombre || '-'}</td>
                      <td className="py-2 pr-4 text-gray-600">{c.telefono || '-'}</td>
                      <td className="py-2 pr-4 text-gray-600">{c.correo || '-'}</td>
                      <td className="py-2 pr-4 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => { setEditing(c); setShowForm(true); }}
                            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(c)}
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

      <ClienteForm
        open={showForm}
        onClose={() => setShowForm(false)}
        cliente={editing}
        userId={profile?.id}
        onSaved={() => { setShowForm(false); cargar(); }}
      />
    </div>
  );
}

function ClienteForm({ open, onClose, cliente, userId, onSaved }) {
  const [form, setForm] = useState({
    tipo_cliente: 'EMPRESA',
    nombre: '',
    ruc_cedula: '',
    dv: '',
    contacto_nombre: '',
    telefono: '',
    correo: '',
    direccion: '',
    notas: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      if (cliente) {
        setForm({
          tipo_cliente: cliente.tipo_cliente || 'EMPRESA',
          nombre: cliente.nombre || '',
          ruc_cedula: cliente.ruc_cedula || '',
          dv: cliente.dv || '',
          contacto_nombre: cliente.contacto_nombre || '',
          telefono: cliente.telefono || '',
          correo: cliente.correo || '',
          direccion: cliente.direccion || '',
          notas: cliente.notas || '',
        });
      } else {
        setForm({
          tipo_cliente: 'EMPRESA', nombre: '', ruc_cedula: '', dv: '', contacto_nombre: '',
          telefono: '', correo: '', direccion: '', notas: '',
        });
      }
    }
  }, [open, cliente]);

  const generarNumero = async () => {
    const { count } = await supabase.from('clientes').select('id_cliente', { count: 'exact', head: true });
    return `C-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es obligatorio');
    setLoading(true);
    setError('');
    try {
      if (cliente) {
        const { error } = await supabase.from('clientes').update(form).eq('id_cliente', cliente.id_cliente);
        if (error) throw error;
      } else {
        const numero_cliente = await generarNumero();
        const { error } = await supabase.from('clientes').insert({
          ...form, numero_cliente, created_by: userId,
        });
        if (error) throw error;
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Tipo de cliente"
            value={form.tipo_cliente}
            onChange={e => setForm({ ...form, tipo_cliente: e.target.value })}
          >
            {Object.entries(TIPOS_CLIENTE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Input
            label={form.tipo_cliente === 'EMPRESA' ? 'RUC' : 'Cédula'}
            value={form.ruc_cedula}
            onChange={e => setForm({ ...form, ruc_cedula: e.target.value })}
          />
          <Input
            label="DV (Dígito Verificador)"
            value={form.dv}
            onChange={e => setForm({ ...form, dv: e.target.value })}
            maxLength={3}
            placeholder="Ej: 45"
          />
        </div>

        <Input
          label={form.tipo_cliente === 'EMPRESA' ? 'Razón social *' : 'Nombre completo *'}
          value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })}
          required
        />

        {form.tipo_cliente === 'EMPRESA' && (
          <Input
            label="Persona de contacto"
            value={form.contacto_nombre}
            onChange={e => setForm({ ...form, contacto_nombre: e.target.value })}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={e => setForm({ ...form, telefono: e.target.value })}
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={form.correo}
            onChange={e => setForm({ ...form, correo: e.target.value })}
          />
        </div>

        <Input
          label="Dirección"
          value={form.direccion}
          onChange={e => setForm({ ...form, direccion: e.target.value })}
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
            {cliente ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
