import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserCog, Shield, Plus, Trash2 } from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { ROLES, ROLES_LABEL } from '../lib/constants';

export default function UsuariosView({ profile }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    const { data } = await supabase.from('usuarios').select('*').order('nombre_completo');
    setUsuarios(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const toggleActivo = async (u) => {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id);
    cargar();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><UserCog className="h-6 w-6 text-brand-700" /> Usuarios</h1>
      <Card>
        {loading ? <div className="text-center py-8 text-gray-500">Cargando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr><th className="px-3 py-2 text-left">Nombre</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Rol</th><th className="px-3 py-2 text-left">Tel&eacute;fono</th><th className="px-3 py-2 text-center">Estado</th><th className="px-3 py-2 text-center">Acciones</th></tr>
              </thead>
              <tbody className="divide-y">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{u.nombre_completo}</td>
                    <td className="px-3 py-2 text-xs">{u.email}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{ROLES_LABEL[u.rol] || u.rol}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">{u.telefono || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => toggleActivo(u)} className={`p-1 rounded ${u.activo ? 'hover:bg-red-100 text-red-600' : 'hover:bg-emerald-100 text-emerald-600'}`}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
