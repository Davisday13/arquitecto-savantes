import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, History, Eye } from 'lucide-react';
import { Card, CardContent, Badge } from './ui/Card';
import Modal from './ui/Modal';
import { formatDateTime } from '../lib/utils';

const ACCION_VARIANT = {
  CREAR: 'success',
  MODIFICAR: 'warning',
  ELIMINAR: 'danger',
};

export default function AuditoriaView() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTabla, setFiltroTabla] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [verRegistro, setVerRegistro] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error) setData(data || []);
      setLoading(false);
    };
    cargar();
  }, []);

  const filtrados = data.filter(a => {
    if (filtroTabla && a.tabla !== filtroTabla) return false;
    if (filtroAccion && a.accion !== filtroAccion) return false;
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return [a.tabla, a.usuario_nombre, a.observaciones].some(v => v?.toLowerCase().includes(t));
  });

  const tablas = [...new Set(data.map(a => a.tabla))];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
        <p className="text-sm text-gray-500">Registro de acciones realizadas en el sistema</p>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={filtroTabla}
              onChange={e => setFiltroTabla(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todas las tablas</option>
              {tablas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filtroAccion}
              onChange={e => setFiltroAccion(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todas las acciones</option>
              <option value="CREAR">Crear</option>
              <option value="MODIFICAR">Modificar</option>
              <option value="ELIMINAR">Eliminar</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <History className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              No hay registros de auditoría
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 pr-3 font-medium">Tabla</th>
                    <th className="pb-2 pr-3 font-medium">Acción</th>
                    <th className="pb-2 pr-3 font-medium">Usuario</th>
                    <th className="pb-2 pr-3 font-medium">Observaciones</th>
                    <th className="pb-2 pr-3 font-medium text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(a => (
                    <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-3 text-gray-500 text-xs">{formatDateTime(a.created_at)}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{a.tabla}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={ACCION_VARIANT[a.accion] || 'default'}>{a.accion}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{a.usuario_nombre || '-'}</td>
                      <td className="py-2 pr-3 text-gray-600 text-xs max-w-[300px] truncate">
                        {a.observaciones || '-'}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          onClick={() => setVerRegistro(a)}
                          className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={!!verRegistro}
        onClose={() => setVerRegistro(null)}
        title="Detalle del registro"
        size="lg"
      >
        {verRegistro && (
          <div className="space-y-3 text-sm">
            <div><strong>Tabla:</strong> {verRegistro.tabla}</div>
            <div><strong>Acción:</strong> {verRegistro.accion}</div>
            <div><strong>Registro ID:</strong> <code className="text-xs">{verRegistro.registro_id}</code></div>
            <div><strong>Fecha:</strong> {formatDateTime(verRegistro.created_at)}</div>
            <div><strong>Usuario:</strong> {verRegistro.usuario_nombre || '-'}</div>
            {verRegistro.observaciones && <div><strong>Observaciones:</strong> {verRegistro.observaciones}</div>}
            {verRegistro.datos_anteriores && (
              <div>
                <strong>Datos anteriores:</strong>
                <pre className="bg-red-50 border border-red-200 p-2 rounded text-xs overflow-x-auto mt-1">
                  {JSON.stringify(verRegistro.datos_anteriores, null, 2)}
                </pre>
              </div>
            )}
            {verRegistro.datos_nuevos && (
              <div>
                <strong>Datos nuevos:</strong>
                <pre className="bg-emerald-50 border border-emerald-200 p-2 rounded text-xs overflow-x-auto mt-1">
                  {JSON.stringify(verRegistro.datos_nuevos, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
