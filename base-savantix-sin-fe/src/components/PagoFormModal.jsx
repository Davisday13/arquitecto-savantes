import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ClipboardList, MapPin } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { METODOS_PAGO } from '../lib/constants';
import { formatCurrency } from '../lib/utils';

/**
 * Modal reutilizable para registrar un pago.
 *
 * Props:
 * - open, onClose
 * - userId: id del usuario que registra
 * - onSaved: callback cuando se guarda exitosamente
 * - tipoFijo: 'ORDEN' o 'VISITA' si ya viene predefinido
 * - documentoFijo: { id, numero, total, pagado, saldo, cliente, descripcion } si viene predefinido
 *
 * Si tipoFijo y documentoFijo están dados, no se muestra el selector
 * y el modal queda enfocado en registrar el pago directamente.
 */
export default function PagoFormModal({
  open, onClose, userId, onSaved,
  tipoFijo = null, documentoFijo = null,
}) {
  const [tipoDoc, setTipoDoc] = useState(tipoFijo || 'ORDEN');
  const [docs, setDocs] = useState([]);
  const [docSel, setDocSel] = useState(documentoFijo?.id || '');
  const [docInfo, setDocInfo] = useState(null);

  const [form, setForm] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: 0,
    metodo_pago: 'EFECTIVO',
    referencia: '',
    concepto: '',
    notas: '',
    asignar_factura: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const esFijo = !!documentoFijo;

  // Cargar documentos pendientes (solo si no es modo fijo)
  useEffect(() => {
    if (!open || esFijo) return;
    setError('');
    const cargar = async () => {
      if (tipoDoc === 'ORDEN') {
        const { data } = await supabase
          .from('v_ordenes_completa')
          .select('id_orden, numero_ticket, cliente_nombre, total_general, total_pagado, saldo_pendiente, estado_pago')
          .neq('estado', 'CANCELADO')
          .gt('total_general', 0)
          .neq('estado_pago', 'PAGADO')
          .order('created_at', { ascending: false });
        setDocs(data || []);
      } else {
        const { data } = await supabase
          .from('v_visitas_completa')
          .select('id_visita, numero_visita, cliente_nombre, costo_visita, total_pagado, saldo_pendiente, estado_pago')
          .neq('estado', 'CANCELADA')
          .gt('costo_visita', 0)
          .neq('estado_pago', 'PAGADO')
          .order('created_at', { ascending: false });
        setDocs(data || []);
      }
    };
    cargar();
  }, [open, tipoDoc, esFijo]);

  // Cargar info del documento seleccionado
  useEffect(() => {
    if (!open) return;
    if (esFijo) {
      setDocInfo({
        id_cliente: documentoFijo.id_cliente,
        numero_documento: documentoFijo.numero,
        cliente_nombre: documentoFijo.cliente_nombre,
        monto_total: documentoFijo.total,
        monto_pagado: documentoFijo.pagado,
        saldo_pendiente: documentoFijo.saldo,
        descripcion: documentoFijo.descripcion,
      });
      setDocSel(documentoFijo.id);
      setForm(f => ({
        ...f,
        monto: Number(documentoFijo.saldo) || 0,
        concepto: f.concepto || `Pago de ${documentoFijo.numero}`,
      }));
      return;
    }

    if (!docSel) {
      setDocInfo(null);
      return;
    }

    const cargar = async () => {
      if (tipoDoc === 'ORDEN') {
        const { data } = await supabase
          .from('v_ordenes_completa')
          .select('id_orden, id_cliente, numero_ticket, cliente_nombre, total_general, total_pagado, saldo_pendiente, falla_reportada')
          .eq('id_orden', docSel)
          .single();
        if (data) {
          setDocInfo({
            id_cliente: data.id_cliente,
            numero_documento: data.numero_ticket,
            cliente_nombre: data.cliente_nombre,
            monto_total: data.total_general,
            monto_pagado: data.total_pagado,
            saldo_pendiente: data.saldo_pendiente,
            descripcion: data.falla_reportada,
          });
          setForm(f => ({
            ...f,
            monto: Number(data.saldo_pendiente) || 0,
            concepto: f.concepto || `Pago de ${data.numero_ticket}`,
          }));
        }
      } else {
        const { data } = await supabase
          .from('v_visitas_completa')
          .select('id_visita, id_cliente, numero_visita, cliente_nombre, costo_visita, total_pagado, saldo_pendiente, motivo')
          .eq('id_visita', docSel)
          .single();
        if (data) {
          setDocInfo({
            id_cliente: data.id_cliente,
            numero_documento: data.numero_visita,
            cliente_nombre: data.cliente_nombre,
            monto_total: data.costo_visita,
            monto_pagado: data.total_pagado,
            saldo_pendiente: data.saldo_pendiente,
            descripcion: data.motivo,
          });
          setForm(f => ({
            ...f,
            monto: Number(data.saldo_pendiente) || 0,
            concepto: f.concepto || `Pago de ${data.numero_visita}`,
          }));
        }
      }
    };
    cargar();
  }, [docSel, tipoDoc, open, esFijo, documentoFijo]);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      if (!esFijo) {
        setTipoDoc(tipoFijo || 'ORDEN');
        setDocSel('');
        setDocInfo(null);
      }
      setForm({
        fecha_pago: new Date().toISOString().split('T')[0],
        monto: 0,
        metodo_pago: 'EFECTIVO',
        referencia: '',
        concepto: '',
        notas: '',
        asignar_factura: false,
      });
      setError('');
    }
  }, [open, esFijo, tipoFijo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!docSel) return setError('Selecciona un documento');
    if (!docInfo) return setError('Error cargando documento');
    if (!form.monto || Number(form.monto) <= 0) return setError('El monto debe ser mayor a cero');
    if (Number(form.monto) > Number(docInfo.saldo_pendiente)) {
      if (!confirm(`El monto (${formatCurrency(form.monto)}) excede el saldo pendiente (${formatCurrency(docInfo.saldo_pendiente)}). ¿Continuar?`)) {
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        id_cliente: docInfo.id_cliente,
        fecha_pago: form.fecha_pago,
        monto: Number(form.monto),
        metodo_pago: form.metodo_pago,
        referencia: form.referencia || null,
        concepto: form.concepto || null,
        notas: form.notas || null,
        registrado_por: userId,
      };
      if (tipoDoc === 'ORDEN') payload.id_orden = docSel;
      else payload.id_visita = docSel;

      const { data: nuevoPago, error } = await supabase
        .from('pagos')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      if (form.asignar_factura && nuevoPago) {
        await supabase.rpc('asignar_factura', { p_id_pago: nuevoPago.id_pago });
      }

      onSaved?.(nuevoPago);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar pago" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

        {/* Selector de tipo - solo si no viene fijo */}
        {!esFijo && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setTipoDoc('ORDEN'); setDocSel(''); }}
                className={`p-3 border-2 rounded-md text-center transition-colors ${
                  tipoDoc === 'ORDEN' ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <ClipboardList className="h-5 w-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Orden de taller</div>
              </button>
              <button
                type="button"
                onClick={() => { setTipoDoc('VISITA'); setDocSel(''); }}
                className={`p-3 border-2 rounded-md text-center transition-colors ${
                  tipoDoc === 'VISITA' ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <MapPin className="h-5 w-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Visita en sitio</div>
              </button>
            </div>

            <Select
              label={`${tipoDoc === 'ORDEN' ? 'Orden' : 'Visita'} *`}
              value={docSel}
              onChange={e => setDocSel(e.target.value)}
              required
            >
              <option value="">— Selecciona —</option>
              {docs.map(d => {
                const id = d.id_orden || d.id_visita;
                const num = d.numero_ticket || d.numero_visita;
                const total = d.total_general || d.costo_visita;
                return (
                  <option key={id} value={id}>
                    {num} · {d.cliente_nombre} · Saldo: {formatCurrency(d.saldo_pendiente)} de {formatCurrency(total)}
                  </option>
                );
              })}
            </Select>
          </>
        )}

        {docInfo && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-1 text-sm">
            {esFijo && (
              <div className="flex justify-between"><span className="text-gray-500">Documento:</span><span className="font-mono font-bold">{docInfo.numero_documento}</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-500">Cliente:</span><span className="font-medium">{docInfo.cliente_nombre}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total documento:</span><span>{formatCurrency(docInfo.monto_total)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ya pagado:</span><span>{formatCurrency(docInfo.monto_pagado)}</span></div>
            <div className="flex justify-between font-bold border-t pt-1 mt-1">
              <span>Saldo pendiente:</span>
              <span className="text-red-600">{formatCurrency(docInfo.saldo_pendiente)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Fecha *"
            type="date"
            value={form.fecha_pago}
            onChange={e => setForm({ ...form, fecha_pago: e.target.value })}
            required
          />
          <Input
            label="Monto *"
            type="number" step="0.01" min="0.01"
            value={form.monto}
            onChange={e => setForm({ ...form, monto: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Método de pago *"
            value={form.metodo_pago}
            onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
          >
            {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input
            label="Referencia"
            value={form.referencia}
            onChange={e => setForm({ ...form, referencia: e.target.value })}
            placeholder="N° transacción, cheque..."
          />
        </div>

        <Input
          label="Concepto"
          value={form.concepto}
          onChange={e => setForm({ ...form, concepto: e.target.value })}
          placeholder="Ej: Diagnóstico, Abono, Pago total..."
        />

        <Textarea
          label="Notas internas"
          value={form.notas}
          onChange={e => setForm({ ...form, notas: e.target.value })}
          rows={2}
        />

        <div className="flex items-center gap-2 pt-2 border-t">
          <input
            type="checkbox"
            id="asignar_factura"
            checked={form.asignar_factura}
            onChange={e => setForm({ ...form, asignar_factura: e.target.checked })}
            className="h-4 w-4 rounded text-brand-700"
          />
          <label htmlFor="asignar_factura" className="text-sm text-gray-700">
            Asignar también número de factura
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" loading={loading}>Registrar pago</Button>
        </div>
      </form>
    </Modal>
  );
}
