import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { History, Search } from 'lucide-react';
import { Card } from './ui/Card';
import { Input, Select } from './ui/Input';
import { formatDateTime } from '../lib/utils';

export default function AuditoriaView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTabla, setFiltroTabla] = useState('');

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(200);
    if (filtroTabla) query = query.eq('tabla', filtroTabla);
    query.then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, [filtroTabla]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><History className="h-6 w-6 text-brand-700" /> Auditor&iacute;a</h1>
      <Card>
        <div className="w-48 mb-3">
          <Select value={filtroTabla} onChange={e => setFiltroTabla(e.target.value)}>
            <option value="">Todas las tablas</option>
            <option value="proyectos">Proyectos</option>
            <option value="cotizaciones">Cotizaciones</option>
            <option value="pagos">Pagos</option>
            <option value="gastos">Gastos</option>
            <option value="clientes">Clientes</option>
            <option value="inventario">Inventario</option>
          </Select>
        </div>
        {loading ? <div className="text-center py-8 text-gray-500">Cargando...</div> : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Sin registros de auditor&iacute;a</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Usuario</th><th className="px-3 py-2 text-left">Tabla</th><th className="px-3 py-2 text-left">Acci&oacute;n</th><th className="px-3 py-2 text-left">Observaciones</th></tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-500">{formatDateTime(l.created_at)}</td>
                    <td className="px-3 py-2 text-xs">{l.usuario_nombre || '-'}</td>
                    <td className="px-3 py-2 text-xs"><span className="font-mono">{l.tabla}</span></td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${l.accion === 'CREAR' ? 'bg-emerald-100 text-emerald-700' : l.accion === 'MODIFICAR' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{l.accion}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{l.observaciones || '-'}</td>
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
