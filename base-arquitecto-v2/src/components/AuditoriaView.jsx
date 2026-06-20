import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ClipboardList, Search } from 'lucide-react';
import { Card } from './ui/Card';

export default function AuditoriaView() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(200).then(({ data }) => setLogs(data || []));
  }, []);

  const filtrados = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.tabla?.toLowerCase().includes(q) || l.operacion?.toLowerCase().includes(q) || l.usuario_nombre?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ClipboardList className="h-6 w-6 text-brand-700" /> Auditoría</h1>
      <Card>
        <div className="mb-3"><Search className="absolute h-4 w-4 text-gray-400 mt-2.5 ml-2.5" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en auditoría..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-200 text-left text-gray-500 uppercase"><th className="py-2 px-2 font-medium">Fecha</th><th className="py-2 px-2 font-medium">Usuario</th><th className="py-2 px-2 font-medium">Tabla</th><th className="py-2 px-2 font-medium">Operación</th><th className="py-2 px-2 font-medium">Id registro</th><th className="py-2 px-2 font-medium">Detalle</th></tr></thead>
            <tbody>
              {filtrados.map(l => (
                <tr key={l.id_auditoria} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-1.5 px-2 text-gray-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString('es-PA')}</td>
                  <td className="py-1.5 px-2">{l.usuario_nombre || '—'}</td>
                  <td className="py-1.5 px-2"><span className="bg-gray-100 px-1.5 py-0.5 rounded">{l.tabla}</span></td>
                  <td className="py-1.5 px-2">
                    <span className={`font-medium ${l.operacion === 'INSERT' ? 'text-emerald-600' : l.operacion === 'UPDATE' ? 'text-amber-600' : 'text-red-600'}`}>{l.operacion}</span>
                  </td>
                  <td className="py-1.5 px-2 font-mono text-gray-500">{l.id_registro?.slice(0, 8) || '—'}</td>
                  <td className="py-1.5 px-2 text-gray-500 max-w-xs truncate">{l.valores_nuevos ? JSON.stringify(l.valores_nuevos).slice(0, 80) + '…' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
