import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { UserCog, Edit, ShieldCheck, Plus, Trash2, KeyRound } from 'lucide-react';
import { Card, Badge } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input, Select } from './ui/Input';
import { useNavigate } from 'react-router-dom';
import { ROLES } from '../lib/constants';

export default function UsuariosView() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showResetPw, setShowResetPw] = useState(null);

  const esAdmin = profile?.rol === 'ROOT' || profile?.rol === 'ADMIN';

  const cargar = () => supabase.from('usuarios').select('*').order('nombre').then(({ data }) => setUsuarios(data || []));
  useEffect(() => { cargar(); }, []);

  const handleEliminar = async (u) => {
    if (!esAdmin) return;
    if (u.id === profile?.id) { alert('No puedes eliminarte a ti mismo'); return; }
    if (u.rol === 'ROOT') { alert('No puedes eliminar un usuario ROOT'); return; }
    if (!confirm(`¿Eliminar permanentemente a "${u.nombre}" (${u.email})?`)) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/eliminar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: u.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cargar();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><UserCog className="h-6 w-6 text-brand-700" /> Usuarios</h1>
        <div className="flex gap-1">
          {esAdmin && <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Nuevo usuario</Button>}
          <Button variant="secondary" onClick={() => navigate('/permisos')}><ShieldCheck className="h-4 w-4" /> Permisos</Button>
        </div>
      </div>

      {showForm && <UsuarioFormModal open={showForm} onClose={() => { setShowForm(false); cargar(); }} usuario={editUser} />}
      {showCreate && <CrearUsuarioModal open={showCreate} onClose={() => { setShowCreate(false); cargar(); }} />}
      {showResetPw && <ResetPasswordModal open={!!showResetPw} onClose={() => { setShowResetPw(null); }} usuario={showResetPw} />}

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
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditUser(u); setShowForm(true); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-700" title="Editar"><Edit className="h-4 w-4" /></button>
                      {esAdmin && u.rol !== 'ROOT' && (
                        <>
                          <button onClick={() => setShowResetPw(u)} className="p-1.5 hover:bg-amber-50 rounded text-amber-600" title="Resetear contraseña"><KeyRound className="h-4 w-4" /></button>
                          <button onClick={() => handleEliminar(u)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
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
  const [form, setForm] = useState({ nombre: '', rol: 'ARQUITECTO', activo: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (usuario) setForm({ nombre: usuario.nombre, rol: usuario.rol, activo: usuario.activo });
  }, [usuario, open]);

  const guardar = async () => {
    setSaving(true);
    try {
      await supabase.from('usuarios').update({ nombre: form.nombre, rol: form.rol, activo: form.activo }).eq('id', usuario.id);
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  if (!usuario) return null;

  return (
    <Modal open={open} onClose={onClose} title="Editar usuario">
      <div className="space-y-3">
        <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
        <Input label="Email" type="email" value={usuario.email} disabled />
        <Select label="Rol" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} className="h-4 w-4 rounded text-brand-700" /><span className="text-sm">Activo</span></label>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ open, onClose, usuario }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!password || password.length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirm) { alert('Las contraseñas no coinciden'); return; }
    setSaving(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/reset-password-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: usuario.id, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Contraseña actualizada exitosamente');
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Resetear contraseña — ${usuario?.nombre}`}>
      <div className="space-y-3">
        <Input label="Nueva contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <Input label="Confirmar contraseña" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}><KeyRound className="h-4 w-4" /> Actualizar contraseña</Button>
        </div>
      </div>
    </Modal>
  );
}

function CrearUsuarioModal({ open, onClose }) {
  const [form, setForm] = useState({ email: '', password: '', nombre: '', rol: 'ARQUITECTO' });
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!form.email || !form.password || !form.nombre) { alert('Todos los campos son requeridos'); return; }
    if (form.password.length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return; }
    setSaving(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) { alert('No autenticado'); setSaving(false); return; }
      const res = await fetch('/api/crear-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear usuario');
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo usuario">
      <div className="space-y-3">
        <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
        <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <Input label="Contraseña" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        <Select label="Rol" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
          {ROLES.filter(r => r !== 'ROOT').map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={saving}><Plus className="h-4 w-4" /> Crear usuario</Button>
        </div>
      </div>
    </Modal>
  );
}
