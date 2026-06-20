import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Save } from 'lucide-react';
import { Card } from './ui/Card';
import { Select } from './ui/Input';
import Button from './ui/Button';
import { ROLES, ROLES_LABEL, PERMISOS_POR_ROL } from '../lib/constants';

const PERMISOS_LIST = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'proyectos', label: 'Proyectos' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'cotizaciones', label: 'Cotizaciones' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'estadocuenta', label: 'Estado de cuenta' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'permisos', label: 'Permisos' },
  { key: 'reportes', label: 'Reportes' },
  { key: 'auditoria', label: 'Auditor\u00eda' },
  { key: 'configuracion', label: 'Configuraci\u00f3n' },
  { key: 'correos', label: 'Correos' },
];

export default function PermisosView({ profile }) {
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [permisos, setPermisos] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('usuarios').select('id, nombre_completo, rol, permisos').order('nombre_completo')
      .then(({ data }) => setUsuarios(data || []));
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    const u = usuarios.find(x => x.id === selectedUser);
    if (!u) return;
    const base = PERMISOS_POR_ROL[u.rol] || {};
    const custom = typeof u.permisos === 'string' ? JSON.parse(u.permisos) : (u.permisos || {});
    setPermisos({ ...base, ...custom });
  }, [selectedUser, usuarios]);

  const togglePermiso = (key) => {
    setPermisos(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const guardar = async () => {
    setSaving(true);
    await supabase.from('usuarios').update({ permisos }).eq('id', selectedUser);
    setSaving(false);
    alert('Permisos actualizados');
  };

  const user = usuarios.find(u => u.id === selectedUser);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Shield className="h-6 w-6 text-brand-700" /> Permisos</h1>
      <Card>
        <Select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
          <option value="">Seleccionar usuario...</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo} ({ROLES_LABEL[u.rol]})</option>)}
        </Select>
      </Card>

      {selectedUser && user && (
        <Card>
          <h3 className="text-sm font-semibold mb-3">{user.nombre_completo} - {ROLES_LABEL[user.rol]}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {PERMISOS_LIST.map(p => (
              <label key={p.key} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={!!permisos[p.key]} onChange={() => togglePermiso(p.key)}
                  className="h-4 w-4 rounded text-brand-700" />
                <span className="text-sm">{p.label}</span>
              </label>
            ))}
          </div>
          <Button onClick={guardar} loading={saving}><Save className="h-4 w-4" /> Guardar permisos</Button>
        </Card>
      )}
    </div>
  );
}
