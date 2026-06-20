import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Eye, DollarSign } from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { METODOS_PAGO } from '../lib/constants';
import { formatDate, formatCurrency } from '../lib/utils';
import PagoFormModal from './PagoFormModal';

export default function PagosView({ profile }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [verPago, setVerPago] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('v_pagos_completa')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setPagos(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = pagos.filter(p => {
    if (filtroMetodo && p.metodo_pago !== filtroMetodo) return false;
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return [p.numero_recibo, p.cliente_nombre, p.proyecto_nombre, p.concepto, p.referencia]
      .some(v => v?.toLowerCase().includes(t));
  });

  const totalIngresos = filtrados
    .filter(p => p.estado === 'CONFIRMADO')
    .reduce((s, p) => s + Number(p.monto || 0), 0);

  const anularPago = async (pago) => {
    const motivo = prompt('Motivo de anulaci\u00f3n:');
    if (!motivo) return;
    await supabase.from('pagos').update({
      estado: 'ANULADO',
      motivo_anulacion: motivo,
      anulado_at: new Date().toISOString(),
      anulado_por: profile?.id,
    }).eq('id_pago', pago.id_pago);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-brand-700" />
          Pagos
        </h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Registrar pago
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por recibo, cliente, proyecto..." className="pl-8" />
          </div>
          <Select value={filtroMetodo} onChange={e => setFiltroMetodo(e.target.value)}>
            <option value="">Todos los m&eacute;todos</option>
            {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <div className="text-right">
            <div className="text-xs text-gray-500">Total filtrado</div>
            <div className="text-xl font-bold text-emerald-700">{formatCurrency(totalIngresos)}</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No se encontraron pagos</div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-3">Recibo</th>
                  <th className="pb-2 pr-3">Fecha</th>
                  <th className="pb-2 pr-3">Cliente</th>
                  <th className="pb-2 pr-3">Proyecto</th>
                  <th className="pb-2 pr-3">Concepto</th>
                  <th className="pb-2 pr-3">M&eacute;todo</th>
                  <th className="pb-2 pr-3 text-right">Monto</th>
                  <th className="pb-2 pr-3">Estado</th>
                  <th className="pb-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id_pago} className={`border-b hover:bg-gray-50 ${p.estado === 'ANULADO' ? 'opacity-50' : ''}`}>
                    <td className="py-2 pr-3 font-mono text-xs font-semibold">{p.numero_recibo}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">{formatDate(p.fecha_pago)}</td>
                    <td className="py-2 pr-3">{p.cliente_nombre}</td>
                    <td className="py-2 pr-3 text-xs text-gray-600">{p.proyecto_nombre || '-'}</td>
                    <td className="py-2 pr-3 text-xs">{p.concepto || '-'}</td>
                    <td className="py-2 pr-3 text-xs">{p.metodo_pago}</td>
                    <td className="py-2 pr-3 text-right font-medium">{formatCurrency(p.monto)}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${p.estado === 'CONFIRMADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => setVerPago(p)} className="p-1.5 text-gray-500 hover:text-brand-700 rounded" title="Ver">
                          <Eye className="h-4 w-4" />
                        </button>
                        {p.estado === 'CONFIRMADO' && (
                          <button onClick={() => anularPago(p)} className="p-1.5 text-gray-500 hover:text-red-600 rounded" title="Anular">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PagoFormModal open={showForm} onClose={() => setShowForm(false)} userId={profile?.id} onSaved={() => { setShowForm(false); cargar(); }} />

      <PagoDetalleModal open={!!verPago} onClose={() => setVerPago(null)} pago={verPago} />
    </div>
  );
}

function PagoDetalleModal({ open, onClose, pago }) {
  if (!pago) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Pago {pago.numero_recibo}</h2>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-gray-500">Fecha:</span> {formatDate(pago.fecha_pago)}</div>
            <div><span className="text-gray-500">Monto:</span> <strong className="text-brand-700">{formatCurrency(pago.monto)}</strong></div>
            <div><span className="text-gray-500">Cliente:</span> {pago.cliente_nombre}</div>
            <div><span className="text-gray-500">Proyecto:</span> {pago.proyecto_nombre || '-'}</div>
            <div><span className="text-gray-500">M&eacute;todo:</span> {pago.metodo_pago}</div>
            <div><span className="text-gray-500">Concepto:</span> {pago.concepto || '-'}</div>
          </div>
          {pago.referencia && <div><span className="text-gray-500">Referencia:</span> {pago.referencia}</div>}
          {pago.estado === 'ANULADO' && <div className="bg-red-50 -mx-6 -mb-4 px-6 py-3 rounded-b text-red-700 font-medium">ANULADO: {pago.motivo_anulacion}</div>}
        </div>
        <div className="flex justify-end mt-4 pt-3 border-t">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
}
