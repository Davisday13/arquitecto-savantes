import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Shield } from 'lucide-react';
import { Card, CardContent, Badge } from './ui/Card';
import Button from './ui/Button';
import { ROLES_LABEL, ROLES, PERMISOS_POR_ROL } from '../lib/constants';
import { getInitials } from '../lib/utils';

const PERMISOS_KEYS = [
  { key: 'dashboard',     label: 'Inicio / Dashboard' },
  { key: 'clientes',      label: 'Clientes' },
  { key: 'equipos',       label: 'Equipos' },
  { key: 'ordenes',       label: 'Órdenes de taller' },
  { key: 'visitas',       label: 'Visitas en sitio' },
  { key: 'usuarios',      label: 'Gestión de usuarios' },
  { key: 'permisos',      label: 'Asignar permisos' },
  { key: 'reportes',      label: 'Reportes' },
  { key: 'auditoria',     label: 'Auditoría' },
  { key: 'configuracion', label: 'Configuración empresa' },
];

export default function PermisosView({ profile }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [permisosActuales, setPermisosActuales] = useState({});
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, email_login, rol, permisos, activo')
      .neq('rol', 'ROOT') // ROOT no se edita aquí
      .order('nombre_completo');
    if (!error) setUsuarios(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const seleccionar = (u) => {
    setSeleccionado(u);
    let p = u.permisos;
    if (typeof p === 'string') {
      try { p = JSON.parse(p); } catch { p = {}; }
    }
    if (!p || Object.keys(p).length === 0) {
      p = { ...PERMISOS_POR_ROL[u.rol] };
    }
    // Asegurar que todas las claves existen
    const completos = {};
    PERMISOS_KEYS.forEach(({ key }) => {
      completos[key] = !!p[key];
    });
    setPermisosActuales(completos);
  };

  const togglePermiso = (key) => {
    setPermisosActuales({ ...permisosActuales, [key]: !permisosActuales[key] });
  };

  const restaurarDefaultRol = () => {
    if (!seleccionado) return;
    setPermisosActuales({ ...PERMISOS_POR_ROL[seleccionado.rol] });
  };

  const guardar = async () => {
    if (!seleccionado) return;
    setSaving(true);
    const { error } = await supabase
      .from('usuarios')
      .update({ permisos: permisosActuales })
      .eq('id', seleccionado.id);
    setSaving(false);
    if (error) return alert('Error: ' + error.message);
    alert('Permisos actualizados');
    cargar();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Permisos por usuario</h1>
        <p className="text-sm text-gray-500">Personaliza qué módulos puede ver cada usuario, más allá de su rol.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de usuarios */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Usuarios</h3>
            {loading ? (
              <div className="text-center py-4 text-gray-500 text-sm">Cargando...</div>
            ) : (
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {usuarios.map(u => (
                  <button
                    key={u.id}
                    onClick={() => seleccionar(u)}
                    className={`w-full text-left p-2 rounded-md flex items-center gap-2 transition-colors ${
                      seleccionado?.id === u.id ? 'bg-brand-50 border border-brand-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                      {getInitials(u.nombre_completo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.nombre_completo}</div>
                      <div className="text-xs text-gray-500 truncate">{u.email_login}</div>
                    </div>
                    <Badge variant="default">{ROLES_LABEL[u.rol]}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor de permisos */}
        <Card className="lg:col-span-2">
          <CardContent>
            {!seleccionado ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Selecciona un usuario para editar sus permisos</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{seleccionado.nombre_completo}</h3>
                    <p className="text-xs text-gray-500">
                      {seleccionado.email_login} · Rol: {ROLES_LABEL[seleccionado.rol]}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={restaurarDefaultRol}>
                    Restaurar permisos del rol
                  </Button>
                </div>

                <div className="border-t pt-4 space-y-2">
                  {PERMISOS_KEYS.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <span className="text-sm">{label}</span>
                      <input
                        type="checkbox"
                        checked={!!permisosActuales[key]}
                        onChange={() => togglePermiso(key)}
                        className="h-4 w-4 text-brand-600 rounded"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={guardar} loading={saving}>
                    <Save className="h-4 w-4" /> Guardar permisos
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
