import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Receipt, FileText, XCircle, DollarSign } from 'lucide-react';
import Button from './ui/Button';
import { Badge } from './ui/Card';
import { formatDate, formatCurrency } from '../lib/utils';
import { ESTADO_PAGO_LABEL, ESTADO_PAGO_COLOR } from '../lib/constants';
import PagoFormModal from './PagoFormModal';
import { generarReciboPago } from './pdfRecibo';

/**
 * Sección de pagos reutilizable.
 *
 * Props:
 * - tipo: 'ORDEN' o 'VISITA'
 * - documento: objeto con datos del documento { id, numero, total, pagado, saldo, cliente, descripcion, estado_pago, id_cliente }
 * - userId: id del usuario actual
 * - onChanged: callback al registrar/anular un pago
 */
export default function PagosSection({ tipo, documento, userId, onChanged }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPagoForm, setShowPagoForm] = useState(false);

  const cargar = async () => {
    if (!documento?.id) return;
    setLoading(true);
    const filtroId = tipo === 'ORDEN' ? 'id_orden' : 'id_visita';
    const { data } = await supabase
      .from('v_pagos_completa')
      .select('*')
      .eq(filtroId, documento.id)
      .order('created_at', { ascending: false });
    setPagos(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [documento?.id]);

  const descargarRecibo = async (pago) => {
    try {
      const { data: empresa } = await supabase
        .from('configuracion_empresa')
        .select('*')
        .eq('id', 1)
        .single();
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
      onChanged?.();
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
        anulado_por: userId,
      })
      .eq('id_pago', pago.id_pago);
    if (error) return alert('Error: ' + error.message);
    cargar();
    onChanged?.();
  };

  const pagoGuardado = () => {
    setShowPagoForm(false);
    cargar();
    onChanged?.();
  };

  const tieneSaldo = Number(documento?.saldo) > 0;
  const tieneCosto = Number(documento?.total) > 0;
  const estadoPago = documento?.estado_pago || 'PENDIENTE';

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-brand-50 to-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-brand-700" />
          <h3 className="text-sm font-semibold text-gray-900">Pagos</h3>
          {tieneCosto && (
            <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${ESTADO_PAGO_COLOR[estadoPago]}`}>
              {ESTADO_PAGO_LABEL[estadoPago]}
            </span>
          )}
        </div>
        {tieneSaldo && (
          <Button size="sm" onClick={() => setShowPagoForm(true)}>
            <Plus className="h-3 w-3" /> Registrar pago
          </Button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Resumen de totales */}
        {tieneCosto && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded p-2">
              <div className="text-xs text-gray-500">Total</div>
              <div className="font-semibold">{formatCurrency(documento.total)}</div>
            </div>
            <div className="bg-emerald-50 rounded p-2">
              <div className="text-xs text-emerald-600">Pagado</div>
              <div className="font-semibold text-emerald-700">{formatCurrency(documento.pagado)}</div>
            </div>
            <div className={`rounded p-2 ${tieneSaldo ? 'bg-red-50' : 'bg-gray-50'}`}>
              <div className={`text-xs ${tieneSaldo ? 'text-red-600' : 'text-gray-500'}`}>Saldo</div>
              <div className={`font-semibold ${tieneSaldo ? 'text-red-700' : 'text-gray-700'}`}>
                {formatCurrency(documento.saldo)}
              </div>
            </div>
          </div>
        )}

        {/* Lista de pagos */}
        {!tieneCosto ? (
          <div className="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded">
            Este {tipo === 'ORDEN' ? 'documento' : 'visita'} no tiene costo asignado todavía
          </div>
        ) : loading ? (
          <div className="text-center py-3 text-gray-500 text-sm">Cargando...</div>
        ) : pagos.length === 0 ? (
          <div className="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded">
            Sin pagos registrados.{tieneSaldo && ' Click en "Registrar pago" para empezar.'}
          </div>
        ) : (
          <div className="space-y-2">
            {pagos.map(p => (
              <div
                key={p.id_pago}
                className={`border rounded p-2.5 ${p.estado === 'ANULADO' ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-brand-700">{p.numero_recibo}</span>
                      {p.numero_factura && (
                        <Badge variant="primary">{p.numero_factura}</Badge>
                      )}
                      {p.estado === 'ANULADO'
                        ? <Badge variant="danger">Anulado</Badge>
                        : <Badge variant="success">Confirmado</Badge>}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {formatDate(p.fecha_pago)} · {p.metodo_pago}
                      {p.referencia && ` · Ref: ${p.referencia}`}
                    </div>
                    {p.concepto && <div className="text-xs text-gray-500 italic mt-0.5">{p.concepto}</div>}
                    {p.estado === 'ANULADO' && p.motivo_anulacion && (
                      <div className="text-xs text-red-600 mt-0.5">Motivo: {p.motivo_anulacion}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-brand-700">{formatCurrency(p.monto)}</div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => descargarRecibo(p)}
                        className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Descargar recibo"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </button>
                      {p.estado === 'CONFIRMADO' && !p.numero_factura && (
                        <button
                          onClick={() => generarFactura(p)}
                          className="p-1 text-gray-400 hover:text-brand-700 hover:bg-brand-50 rounded"
                          title="Asignar nº de factura"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {p.estado === 'CONFIRMADO' && (
                        <button
                          onClick={() => anularPago(p)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Anular pago"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PagoFormModal
        open={showPagoForm}
        onClose={() => setShowPagoForm(false)}
        userId={userId}
        onSaved={pagoGuardado}
        tipoFijo={tipo}
        documentoFijo={documento}
      />
    </div>
  );
}
