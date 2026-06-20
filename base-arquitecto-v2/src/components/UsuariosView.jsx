import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserCog, Plus, Search, Edit, ShieldCheck } from 'lucide-react';
import { Card, Badge } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input, Select } from './ui/Input';
import { useNavigate } from 'react-router-dom';
import { ROLES } from '../lib/constants';

export default function UsuariosView() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const cargar = () => supabase.from('usuarios').select('*').order('nombre').then(({ data }) => setUsuarios(data || []));
  useEffect(() => { cargar(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><UserCog className="h-6 w-6 text-brand-700" /> Usuarios</h1>
        <div className="flex gap-1">
          <Button variant="secondary" onClick={() => navigate('/permisos')}><ShieldCheck className="h-4 w-4" /> Permisos</Button>
          <Button onClick={() => { setEditUser(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Nuevo usuario</Button>
        </div>
      </div>

      {showForm && <UsuarioFormModal open={showForm} onClose={() => { setShowForm(false); cargar(); }} usuario={editUser} />}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase"><th className="py-2.5 px-3 font-medium">Nombre</th><th className="py-2.5 px-3 font-medium">Email</th><th className="py-2.5 px-3 font-medium">Rol</th><th className="py-2.5 px-3 font-medium">Estado</th><th className="py-2.5 px-3 font-medium">Último acceso</th><th className="py-2.5 px-3 text-right">Acciones</th></tr></thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium">{u.nombre}</td>
                  <td className="py-2.5 px-3 text-gray-600">{u.email}</td>
                  <td className="py-2.5 px-3"><Badge color={u.rol === 'ROOT' ? 'purple' : u.rol === 'ADMIN' ? 'blue' : u.rol === 'ARQUITECTO' ? 'green' : u.rol === 'ASISTENTE' ? 'yellow' : 'gray'}>{u.rol}</Badge></td>
                  <td className="py-2.5 px-3"><Badge color={u.activo ? 'green' : 'red'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="py-2.5 px-3 text-xs text-gray-500">{u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-PA') : '—'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={() => { setEditUser(u); setShowForm(true); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-700"><Edit className="h-4 w-4" /></button>
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

function UsuarioFormModal({ open, onClose, usuario }) {
  const [form, setForm] = useState({ email: '', nombre: '', rol: 'ARQUITECTO', activo: true, password: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (usuario) setForm({ email: usuario.email, nombre: usuario.nombre, rol: usuario.rol, activo: usuario.activo, password: '' });
    else setForm({ email: '', nombre: '', rol: 'ARQUITECTO', activo: true, password: '' });
  }, [usuario, open]);

  const guardar = async () => {
    setSaving(true);
    try {
      if (usuario) {
        const upd = { nombre: form.nombre, rol: form.rol, activo: form.activo };
        await supabase.from('usuarios').update(upd).eq('id', usuario.id);
      } else {
        const res = await fetch('/api/crear-usuario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password, nombre: form.nombre, rol: form.rol }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Error al crear usuario');
      }
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={usuario ? 'Editar usuario' : 'Nuevo usuario'}>
      <div className="space-y-3">
        <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
        <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required disabled={!!usuario} />
        {!usuario && <Input label="Contraseña" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />}
        <Select label="Rol" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} className="h-4 w-4 rounded text-brand-700" /><span className="text-sm">Activo</span></label>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}>{usuario ? 'Guardar' : 'Crear usuario'}</Button>
        </div>
      </div>
    </Modal>
  );
}
