import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Edit2, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent, Badge } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import Modal from './ui/Modal';
import {
  ROLES, ROLES_LABEL, PERMISOS_POR_ROL,
} from '../lib/constants';
import { getInitials } from '../lib/utils';

export default function UsuariosView({ profile }) {
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const [uRes, cRes] = await Promise.all([
      supabase.from('usuarios').select('*').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id_cliente, numero_cliente, nombre').eq('activo', true).order('nombre'),
    ]);
    if (!uRes.error) setUsuarios(uRes.data || []);
    if (!cRes.error) setClientes(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = usuarios.filter(u => {
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return [u.nombre_completo, u.email_login, u.email, u.rol].some(v => v?.toLowerCase().includes(t));
  });

  const toggleActivo = async (u) => {
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: !u.activo })
      .eq('id', u.id);
    if (error) return alert('Error: ' + error.message);
    cargar();
  };

  // Solo ROOT puede gestionar usuarios; ADMIN puede pero no puede crear ROOT
  const soyRoot = profile?.rol === ROLES.ROOT;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>

      </div>

      <Card>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo, rol..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No hay usuarios</div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="pb-2 pr-3 font-medium">Usuario</th>
                    <th className="pb-2 pr-3 font-medium">Correo</th>
                    <th className="pb-2 pr-3 font-medium">Teléfono</th>
                    <th className="pb-2 pr-3 font-medium">Rol</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 pr-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(u => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                            {getInitials(u.nombre_completo)}
                          </div>
                          <div className="font-medium">{u.nombre_completo}</div>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-gray-600 text-xs">{u.email_login}</td>
                      <td className="py-2 pr-3 text-gray-600 text-xs">{u.telefono || '-'}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={u.rol === 'ROOT' ? 'danger' : u.rol === 'ADMIN' ? 'primary' : 'default'}>
                          {ROLES_LABEL[u.rol] || u.rol}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        {u.activo
                          ? <Badge variant="success">Activo</Badge>
                          : <Badge variant="danger">Inactivo</Badge>}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <div className="inline-flex gap-1">
                          {/* No permitir editarse a sí mismo desde aquí (sólo en perfil) */}
                          {u.id !== profile?.id && (
                            <>
                              <button
                                onClick={() => { setEditing(u); setShowForm(true); }}
                                className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => toggleActivo(u)}
                                className={`p-1.5 rounded ${u.activo ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                title={u.activo ? 'Desactivar' : 'Activar'}
                              >
                                {u.activo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </button>
                            </>
                          )}
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

      <UsuarioForm
        open={showForm}
        onClose={() => setShowForm(false)}
        usuario={editing}
        clientes={clientes}
        soyRoot={soyRoot}
        onSaved={() => { setShowForm(false); cargar(); }}
      />
    </div>
  );
}

function UsuarioForm({ open, onClose, usuario, clientes, soyRoot, onSaved }) {
  const [form, setForm] = useState({
    nombre_completo: '', telefono: '', rol: 'TECNICO', id_cliente_asociado: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && usuario) {
      setError('');
      setForm({
        nombre_completo: usuario.nombre_completo || '',
        telefono: usuario.telefono || '',
        rol: usuario.rol || 'TECNICO',
        id_cliente_asociado: usuario.id_cliente_asociado || '',
      });
    }
  }, [open, usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.nombre_completo.trim()) return setError('Nombre es obligatorio');
    setLoading(true);
    try {
      await supabase.from('usuarios').update({
        nombre_completo: form.nombre_completo,
        telefono: form.telefono || null,
        rol: form.rol,
        permisos: PERMISOS_POR_ROL[form.rol] || PERMISOS_POR_ROL.TECNICO,
      }).eq('id', usuario.id);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const rolesDisponibles = soyRoot
    ? ['ROOT', 'ADMIN', 'RECEPCIONISTA', 'TECNICO', 'CLIENTE']
    : ['ADMIN', 'RECEPCIONISTA', 'TECNICO', 'CLIENTE'];

  return (
    <Modal open={open} onClose={onClose} title="Editar usuario" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

        <Input label="Nombre completo *" value={form.nombre_completo} onChange={e => setForm({ ...form, nombre_completo: e.target.value })} required />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {usuario && <Input label="Correo" type="email" value={usuario.email_login || ''} disabled />}
          <Input label="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
        </div>

        <Select label="Rol *" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
          {rolesDisponibles.map(r => <option key={r} value={r}>{ROLES_LABEL[r]}</option>)}
        </Select>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" loading={loading}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  );
}
