import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus, Search, FileText, Receipt, XCircle, Eye, ClipboardList, MapPin,
} from 'lucide-react';
import { Card, CardContent, Badge } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { METODOS_PAGO } from '../lib/constants';
import { formatDate, formatCurrency } from '../lib/utils';
import { generarReciboPago } from './pdfRecibo';
import PagoFormModal from './PagoFormModal';
import WhatsAppButton from './WhatsAppButton';

export default function PagosView({ profile }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [verPago, setVerPago] = useState(null);
  const [empresa, setEmpresa] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const [pRes, eRes] = await Promise.all([
      supabase.from('v_pagos_completa').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('configuracion_empresa').select('*').eq('id', 1).single(),
    ]);
    if (!pRes.error) setPagos(pRes.data || []);
    setEmpresa(eRes.data || null);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = pagos.filter(p => {
    if (filtroMetodo && p.metodo_pago !== filtroMetodo) return false;
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return [p.numero_recibo, p.numero_factura, p.cliente_nombre, p.documento_referencia, p.concepto, p.referencia]
      .some(v => v?.toLowerCase().includes(t));
  });

  const descargarRecibo = async (pago) => {
    try {
      const { data: empresa } = await supabase.from('configuracion_empresa').select('*').eq('id', 1).single();
      generarReciboPago(pago, empresa);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const generarFactura = async (pago) => {
    if (!confirm('¿Generar número de factura para este pago?')) return;
    try {
      const { data, error } = await supabase.rpc('asignar_factura', { p_id_pago: pago.id_pago });
      if (error) throw error;
      alert(`Factura asignada: ${data}`);
      cargar();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const anularPago = async (pago) => {
    const motivo = prompt('Motivo de anulación:');
    if (!motivo) return;
    const { error } = await supabase
      .from('pagos')
      .update({
        estado: 'ANULADO',
        motivo_anulacion: motivo,
        anulado_at: new Date().toISOString(),
        anulado_por: profile?.id,
      })
      .eq('id_pago', pago.id_pago);
    if (error) return alert('Error: ' + error.message);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Registrar pago
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por recibo, factura, cliente, ticket..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
            <select
              value={filtroMetodo}
              onChange={e => setFiltroMetodo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              <option value="">Todos los métodos</option>
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {search || filtroMetodo ? 'No se encontraron pagos' : 'No hay pagos registrados.'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="pb-2 pr-3 font-medium">Recibo</th>
                    <th className="pb-2 pr-3 font-medium">Factura</th>
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 pr-3 font-medium">Cliente</th>
                    <th className="pb-2 pr-3 font-medium">Documento</th>
                    <th className="pb-2 pr-3 font-medium">Método</th>
                    <th className="pb-2 pr-3 font-medium text-right">Monto</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 pr-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(p => (
                    <tr key={p.id_pago} className={`border-b border-gray-100 hover:bg-gray-50 ${p.estado === 'ANULADO' ? 'opacity-50' : ''}`}>
                      <td className="py-2 pr-3 font-mono text-xs font-semibold">{p.numero_recibo}</td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {p.numero_factura || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2 pr-3 text-gray-500 text-xs">{formatDate(p.fecha_pago)}</td>
                      <td className="py-2 pr-3">{p.cliente_nombre}</td>
                      <td className="py-2 pr-3 text-xs">
                        <div className="flex items-center gap-1">
                          {p.tipo_documento === 'ORDEN' ? (
                            <ClipboardList className="h-3 w-3 text-brand-700" />
                          ) : (
                            <MapPin className="h-3 w-3 text-emerald-600" />
                          )}
                          <span className="font-mono">{p.documento_referencia || '-'}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-xs">{p.metodo_pago}</td>
                      <td className="py-2 pr-3 text-right font-medium">{formatCurrency(p.monto)}</td>
                      <td className="py-2 pr-3">
                        {p.estado === 'CONFIRMADO'
                          ? <Badge variant="success">Confirmado</Badge>
                          : <Badge variant="danger">Anulado</Badge>}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setVerPago(p)}
                            className="p-1.5 text-gray-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => descargarRecibo(p)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Descargar recibo PDF"
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                          <WhatsAppButton
                            empresa={empresa}
                            tipo="RECIBO"
                            documento={{
                              numero: p.numero_recibo,
                              cliente_nombre: p.cliente_nombre,
                              cliente_telefono: p.cliente_telefono,
                              total: p.monto,
                            }}
                            variant="icon"
                          />
                          {p.estado === 'CONFIRMADO' && !p.numero_factura && (
                            <button
                              onClick={() => generarFactura(p)}
                              className="p-1.5 text-gray-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                              title="Asignar nº de factura"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                          {p.estado === 'CONFIRMADO' && (
                            <button
                              onClick={() => anularPago(p)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Anular pago"
                            >
                              <XCircle className="h-4 w-4" />
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
        </CardContent>
      </Card>

      <PagoFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        userId={profile?.id}
        onSaved={() => { setShowForm(false); cargar(); }}
      />

      <PagoDetalleModal
        open={!!verPago}
        onClose={() => setVerPago(null)}
        pago={verPago}
      />
    </div>
  );
}

function PagoDetalleModal({ open, onClose, pago }) {
  if (!pago) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Pago ${pago.numero_recibo}`} size="md">
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500">Recibo</div>
            <div className="font-mono font-bold">{pago.numero_recibo}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Factura</div>
            <div className="font-mono">{pago.numero_factura || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Fecha</div>
            <div>{formatDate(pago.fecha_pago)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Estado</div>
            <div>
              {pago.estado === 'CONFIRMADO'
                ? <Badge variant="success">Confirmado</Badge>
                : <Badge variant="danger">Anulado</Badge>}
            </div>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="text-xs text-gray-500">Cliente</div>
          <div className="font-medium">{pago.cliente_nombre}</div>
          <div className="text-xs text-gray-600">{pago.numero_cliente}</div>
        </div>

        <div className="border-t pt-3">
          <div className="text-xs text-gray-500">Documento aplicado</div>
          <div className="font-mono">{pago.tipo_documento} · {pago.documento_referencia}</div>
        </div>

        <div className="border-t pt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500">Método</div>
            <div className="font-medium">{pago.metodo_pago}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Monto</div>
            <div className="font-bold text-lg text-brand-700">{formatCurrency(pago.monto)}</div>
          </div>
        </div>

        {pago.referencia && (
          <div className="border-t pt-3">
            <div className="text-xs text-gray-500">Referencia</div>
            <div>{pago.referencia}</div>
          </div>
        )}

        {pago.concepto && (
          <div className="border-t pt-3">
            <div className="text-xs text-gray-500">Concepto</div>
            <div>{pago.concepto}</div>
          </div>
        )}

        {pago.estado === 'ANULADO' && (
          <div className="border-t pt-3 bg-red-50 -mx-6 -mb-4 px-6 py-3 rounded-b">
            <div className="text-xs text-red-600 font-bold">ANULADO</div>
            <div className="text-sm text-red-700">{pago.motivo_anulacion}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}
