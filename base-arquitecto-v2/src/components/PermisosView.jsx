import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck } from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { PERMISOS_POR_ROL, ROLES } from '../lib/constants';

const MODULOS = ['dashboard','proyectos','cotizaciones','pagos','gastos','inventario','estado_cuenta','clientes','usuarios','permisos','auditoria','reportes','notificaciones','configuracion','correos'];

const ETIQUETAS = {
  dashboard:'Dashboard', proyectos:'Proyectos', cotizaciones:'Cotizaciones', pagos:'Pagos',
  gastos:'Gastos', inventario:'Inventario', estado_cuenta:'Estado cuenta',
  clientes:'Clientes', usuarios:'Usuarios', permisos:'Permisos', auditoria:'Auditoría',
  reportes:'Reportes', notificaciones:'Notificaciones', configuracion:'Configuración', correos:'Correos',
};

const NIVELES = [
  { value: 0, label: 'Ninguno', color: 'text-gray-400' },
  { value: 1, label: 'Ver', color: 'text-blue-600' },
  { value: 3, label: 'Editar', color: 'text-amber-600' },
  { value: 5, label: 'Admin', color: 'text-red-600' },
  { value: 7, label: 'Total', color: 'text-purple-700' },
];

export default function PermisosView() {
  const [permisos, setPermisos] = useState({ ...PERMISOS_POR_ROL });

  useEffect(() => {
    const { data } = PERMISOS_POR_ROL;
    if (data) setPermisos(data);
  }, []);

  const cambiarNivel = (rol, modulo, nivel) => {
    setPermisos(prev => ({
      ...prev,
      [rol]: { ...prev[rol], [modulo]: nivel },
    }));
  };

  const guardar = async () => {
    // In a real app, save to DB. For the demo, just confirm.
    alert('Permisos actualizados (simulado)');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-brand-700" /> Permisos por rol</h1>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-2 text-left font-semibold text-gray-700">Módulo</th>
                {ROLES.map(r => <th key={r} className="py-2 px-2 text-center font-semibold text-gray-700">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {MODULOS.map(mod => (
                <tr key={mod} className="border-b border-gray-100">
                  <td className="py-1.5 px-2 font-medium text-gray-600">{ETIQUETAS[mod]}</td>
                  {ROLES.map(rol => (
                    <td key={rol} className="py-1.5 px-2 text-center">
                      <select value={permisos[rol]?.[mod] || 0} onChange={e => cambiarNivel(rol, mod, Number(e.target.value))}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
                        disabled={rol === 'ROOT'}>
                        {NIVELES.map(n => <option key={n.value} value={n.value} className={n.color}>{n.label}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-3 pt-2 border-t">
          <Button onClick={guardar}>Guardar configuración</Button>
        </div>
      </Card>
    </div>
  );
}
