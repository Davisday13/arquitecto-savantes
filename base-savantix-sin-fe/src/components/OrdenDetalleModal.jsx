import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus, Trash2, Wrench, Package, Clock, FileText, DollarSign,
  CheckCircle2, XCircle, FileDown, Eraser, PenTool, Mail,
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import SignatureCanvas from 'react-signature-canvas';
import { ESTADOS_ORDEN_LABEL, ESTADOS_ORDEN_COLOR, ROLES, ESTADO_PAGO_LABEL, ESTADO_PAGO_COLOR, TASAS_ITBMS, desglosarItbms } from '../lib/constants';
import { formatDate, formatDateTime, formatCurrency } from '../lib/utils';
import { generarPDFOrden } from './pdfOrden';
import PagosSection from './PagosSection';
import CatalogoAutocomplete from './CatalogoAutocomplete';
import EnviarCorreoModal from './EnviarCorreoModal';
import WhatsAppButton from './WhatsAppButton';

const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPPY', 'OTRO'];

export default function OrdenDetalleModal({ open, onClose, ordenId, profile }) {
  const [orden, setOrden] = useState(null);
  const [repuestos, setRepuestos] = useState([]);
  const [manoObra, setManoObra] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingTexts, setSavingTexts] = useState(false);

  const [diagnostico, setDiagnostico] = useState('');
  const [solucion, setSolucion] = useState('');
  const [estadoNuevo, setEstadoNuevo] = useState('');

  // Modal de envío por correo
  const [showCorreo, setShowCorreo] = useState(false);
  const [pdfBlobCorreo, setPdfBlobCorreo] = useState(null);
  const [pdfNombreCorreo, setPdfNombreCorreo] = useState('');

  // Empresa (para WhatsApp y PDFs)
  const [empresa, setEmpresa] = useState(null);

  const cargar = async () => {
    if (!ordenId) return;
    setLoading(true);
    const [oRes, rRes, mRes, hRes, eRes] = await Promise.all([
      supabase.from('v_ordenes_completa').select('*').eq('id_orden', ordenId).single(),
      supabase.from('orden_repuestos').select('*').eq('id_orden', ordenId).order('created_at'),
      supabase.from('orden_mano_obra').select('*, usuarios:id_tecnico(nombre_completo)').eq('id_orden', ordenId).order('created_at'),
      supabase.from('orden_historial').select('*, usuarios:usuario_id(nombre_completo)').eq('id_orden', ordenId).order('created_at', { ascending: false }),
      supabase.from('configuracion_empresa').select('*').eq('id', 1).single(),
    ]);
    if (!oRes.error && oRes.data) {
      setOrden(oRes.data);
      setDiagnostico(oRes.data.diagnostico || '');
      setSolucion(oRes.data.solucion || '');
      setEstadoNuevo(oRes.data.estado);
    }
    setRepuestos(rRes.data || []);
    setManoObra(mRes.data || []);
    setHistorial(hRes.data || []);
    setEmpresa(eRes.data || null);
    setLoading(false);
  };

  useEffect(() => {
    if (open && ordenId) cargar();
    if (!open) {
      setOrden(null);
      setRepuestos([]); setManoObra([]); setHistorial([]);
    }
  }, [open, ordenId]);

  const guardarTextos = async () => {
    setSavingTexts(true);
    const updates = { diagnostico, solucion };
    if (estadoNuevo !== orden.estado) updates.estado = estadoNuevo;
    const { error } = await supabase.from('ordenes_taller').update(updates).eq('id_orden', ordenId);
    setSavingTexts(false);
    if (error) return alert('Error: ' + error.message);
    cargar();
  };

  const descargarPDF = async () => {
    try {
      const { data: empresa } = await supabase.from('configuracion_empresa').select('*').eq('id', 1).single();
      generarPDFOrden(orden, repuestos, manoObra, empresa);
    } catch (err) {
      alert('Error generando PDF: ' + err.message);
    }
  };

  const abrirEnvioCorreo = async () => {
    try {
      const { data: empresa } = await supabase.from('configuracion_empresa').select('*').eq('id', 1).single();
      const { blob, nombre } = generarPDFOrden(orden, repuestos, manoObra, empresa, { soloBlob: true });
      setPdfBlobCorreo(blob);
      setPdfNombreCorreo(nombre);
      setShowCorreo(true);
    } catch (err) {
      alert('Error preparando envío: ' + err.message);
    }
  };

  const puedeEditar = profile?.rol !== ROLES.CLIENTE;

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={orden ? `Orden ${orden.numero_ticket}` : 'Cargando orden...'} size="full">
      {loading || !orden ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        <div className="space-y-6">
          {/* Encabezado: cliente + equipo + estado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 uppercase">Cliente</div>
              <div className="font-semibold">{orden.cliente_nombre}</div>
              <div className="text-xs text-gray-500 font-mono">{orden.numero_cliente}</div>
              {orden.cliente_telefono && <div className="text-xs text-gray-600">📞 {orden.cliente_telefono}</div>}
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Equipo</div>
              <div className="font-semibold">{orden.tipo_equipo} {orden.marca} {orden.modelo}</div>
              <div className="text-xs text-gray-500 font-mono">Serie: {orden.numero_serie}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Estado</div>
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                <span className={`inline-flex px-2 py-1 rounded text-sm border ${ESTADOS_ORDEN_COLOR[orden.estado]}`}>
                  {ESTADOS_ORDEN_LABEL[orden.estado]}
                </span>
                {Number(orden.total_general) > 0 && (
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${ESTADO_PAGO_COLOR[orden.estado_pago]}`}>
                    {ESTADO_PAGO_LABEL[orden.estado_pago]}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Recibido: {formatDate(orden.fecha_entrada)}
              </div>
              {orden.fecha_diagnostico_prometida && (
                <FechaDiagnosticoIndicador
                  fecha={orden.fecha_diagnostico_prometida}
                  estado={orden.estado}
                />
              )}
            </div>
          </div>

          {/* Sección de Diagnóstico y Autorización */}
          {puedeEditar && (
            <DiagnosticoSection
              orden={orden}
              onUpdated={cargar}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Falla, diagnóstico, solución */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Falla reportada
                </h3>
                <div className="bg-red-50 border border-red-200 p-3 rounded text-sm">
                  {orden.falla_reportada}
                </div>
              </div>

              <Textarea
                label="Diagnóstico"
                value={diagnostico}
                onChange={e => setDiagnostico(e.target.value)}
                rows={3}
                disabled={!puedeEditar}
                placeholder="¿Qué encontró el técnico?"
              />

              <Textarea
                label="Solución aplicada"
                value={solucion}
                onChange={e => setSolucion(e.target.value)}
                rows={3}
                disabled={!puedeEditar}
                placeholder="¿Qué se hizo para resolver?"
              />

              {puedeEditar && (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      label="Cambiar estado"
                      value={estadoNuevo}
                      onChange={e => setEstadoNuevo(e.target.value)}
                    >
                      {Object.entries(ESTADOS_ORDEN_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </Select>
                  </div>
                  <Button onClick={guardarTextos} loading={savingTexts}>
                    Guardar
                  </Button>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Historial
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {historial.length === 0 && (
                  <div className="text-sm text-gray-500 py-4 text-center">Sin movimientos aún</div>
                )}
                {historial.map(h => (
                  <div key={h.id} className="border-l-2 border-brand-200 pl-3 py-1">
                    <div className="text-xs text-gray-500">{formatDateTime(h.created_at)}</div>
                    <div className="text-sm">
                      {h.estado_anterior ? (
                        <>
                          {ESTADOS_ORDEN_LABEL[h.estado_anterior]} →{' '}
                          <strong>{ESTADOS_ORDEN_LABEL[h.estado_nuevo]}</strong>
                        </>
                      ) : (
                        <strong>Creada como {ESTADOS_ORDEN_LABEL[h.estado_nuevo]}</strong>
                      )}
                    </div>
                    {h.usuarios?.nombre_completo && (
                      <div className="text-xs text-gray-500">por {h.usuarios.nombre_completo}</div>
                    )}
                    {h.comentario && <div className="text-xs text-gray-600 italic">{h.comentario}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Repuestos */}
          {puedeEditar && (
            <RepuestosSection
              ordenId={ordenId}
              repuestos={repuestos}
              onChanged={cargar}
            />
          )}

          {/* Mano de obra */}
          {puedeEditar && (
            <ManoObraSection
              ordenId={ordenId}
              manoObra={manoObra}
              onChanged={cargar}
            />
          )}

          {/* Firmas (recepción y entrega) */}
          {puedeEditar && (
            <FirmasSection
              orden={orden}
              onUpdated={cargar}
            />
          )}

          {/* Sección de pagos integrada */}
          {puedeEditar && Number(orden.total_general) > 0 && (
            <PagosSection
              tipo="ORDEN"
              userId={profile?.id}
              documento={{
                id: orden.id_orden,
                id_cliente: orden.id_cliente,
                numero: orden.numero_ticket,
                cliente_nombre: orden.cliente_nombre,
                total: orden.total_general,
                pagado: orden.total_pagado,
                saldo: orden.saldo_pendiente,
                estado_pago: orden.estado_pago,
                descripcion: orden.falla_reportada,
              }}
              onChanged={cargar}
            />
          )}

          {/* Totales */}
          <TotalesSection orden={orden} />

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <WhatsAppButton
              empresa={empresa}
              tipo="ORDEN"
              documento={{
                numero: orden.numero_ticket,
                cliente_nombre: orden.cliente_nombre,
                cliente_telefono: orden.cliente_telefono,
                total: orden.total_general,
                estado: orden.estado,
              }}
            />
            <Button variant="outline" onClick={abrirEnvioCorreo} type="button" disabled={!orden?.cliente_correo}>
              <Mail className="h-4 w-4" /> Enviar por correo
            </Button>
            <Button variant="outline" onClick={descargarPDF} type="button">
              <FileDown className="h-4 w-4" /> Descargar PDF
            </Button>
          </div>
        </div>
      )}

      {/* Modal de envío por correo */}
      {showCorreo && orden && (
        <EnviarCorreoModal
          open={showCorreo}
          onClose={() => setShowCorreo(false)}
          tipo="ORDEN"
          documento={orden}
          cliente={{
            id_cliente: orden.id_cliente,
            nombre: orden.cliente_nombre,
            correo: orden.cliente_correo,
            telefono: orden.cliente_telefono,
          }}
          pdfBlob={pdfBlobCorreo}
          pdfNombre={pdfNombreCorreo}
          userId={profile?.id}
          userName={profile?.nombre_completo}
          referencias={{
            id_orden: orden.id_orden,
            id_cliente: orden.id_cliente,
          }}
        />
      )}
    </Modal>
  );
}

// =============================================================
// Sección de DIAGNÓSTICO (cobro inicial + autorización reparación)
// =============================================================
function DiagnosticoSection({ orden, onUpdated }) {
  const costoDiag = Number(orden.costo_diagnostico || 0);
  const diagPagado = !!orden.diagnostico_pagado;
  const repAutorizada = !!orden.reparacion_autorizada;

  const [costo, setCosto] = useState(costoDiag);
  const [itbmsPct, setItbmsPct] = useState(orden.diagnostico_itbms_pct ?? 7);
  const [metodo, setMetodo] = useState(orden.diagnostico_metodo_pago || 'EFECTIVO');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCosto(Number(orden.costo_diagnostico || 0));
    setItbmsPct(orden.diagnostico_itbms_pct ?? 7);
    setMetodo(orden.diagnostico_metodo_pago || 'EFECTIVO');
  }, [orden]);

  const guardarCosto = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('ordenes_taller')
      .update({
        costo_diagnostico: Number(costo) || 0,
        diagnostico_itbms_pct: Number(itbmsPct),
      })
      .eq('id_orden', orden.id_orden);
    setSaving(false);
    if (error) return alert(error.message);
    onUpdated();
  };

  const marcarPagado = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('ordenes_taller')
      .update({
        diagnostico_pagado: true,
        diagnostico_metodo_pago: metodo,
        diagnostico_pagado_at: new Date().toISOString(),
      })
      .eq('id_orden', orden.id_orden);
    setSaving(false);
    if (error) return alert(error.message);
    onUpdated();
  };

  const revertirPago = async () => {
    if (!confirm('¿Revertir el pago del diagnóstico?')) return;
    setSaving(true);
    const { error } = await supabase
      .from('ordenes_taller')
      .update({
        diagnostico_pagado: false,
        diagnostico_metodo_pago: null,
        diagnostico_pagado_at: null,
      })
      .eq('id_orden', orden.id_orden);
    setSaving(false);
    if (error) return alert(error.message);
    onUpdated();
  };

  const autorizarReparacion = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('ordenes_taller')
      .update({
        reparacion_autorizada: true,
        reparacion_autorizada_at: new Date().toISOString(),
      })
      .eq('id_orden', orden.id_orden);
    setSaving(false);
    if (error) return alert(error.message);
    onUpdated();
  };

  const desautorizarReparacion = async () => {
    if (!confirm('¿Quitar la autorización de reparación?')) return;
    setSaving(true);
    const { error } = await supabase
      .from('ordenes_taller')
      .update({
        reparacion_autorizada: false,
        reparacion_autorizada_at: null,
      })
      .eq('id_orden', orden.id_orden);
    setSaving(false);
    if (error) return alert(error.message);
    onUpdated();
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
        <DollarSign className="h-4 w-4" /> Diagnóstico inicial
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Costo */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">Costo (Inc. ITBMS)</label>
          <div className="flex gap-1">
            <input
              type="number" step="0.01" min="0"
              value={costo}
              onChange={e => setCosto(e.target.value)}
              disabled={diagPagado}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
            />
            {!diagPagado && (Number(costo) !== costoDiag || Number(itbmsPct) !== Number(orden.diagnostico_itbms_pct ?? 7)) && (
              <Button size="sm" onClick={guardarCosto} loading={saving} type="button">
                Guardar
              </Button>
            )}
          </div>
        </div>

        {/* Tasa ITBMS */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">ITBMS</label>
          <select
            value={itbmsPct}
            onChange={e => setItbmsPct(e.target.value)}
            disabled={diagPagado}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
          >
            {TASAS_ITBMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Estado de pago */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">Estado de pago</label>
          {diagPagado ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" /> Pagado ({orden.diagnostico_metodo_pago})
              </span>
              <button
                onClick={revertirPago}
                disabled={saving}
                className="text-xs text-red-600 hover:underline"
                type="button"
              >
                Revertir
              </button>
            </div>
          ) : costoDiag > 0 ? (
            <div className="flex gap-1">
              <select
                value={metodo}
                onChange={e => setMetodo(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <Button size="sm" variant="success" onClick={marcarPagado} loading={saving} type="button">
                Marcar pagado
              </Button>
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic py-1.5">Sin costo de diagnóstico</div>
          )}
        </div>

        {/* Autorización de reparación */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">Reparación</label>
          {repAutorizada ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" /> Autorizada
              </span>
              <button
                onClick={desautorizarReparacion}
                disabled={saving}
                className="text-xs text-red-600 hover:underline"
                type="button"
              >
                Quitar
              </button>
            </div>
          ) : (
            <Button size="sm" variant="success" onClick={autorizarReparacion} loading={saving} type="button">
              Autorizar reparación
            </Button>
          )}
        </div>
      </div>

      {repAutorizada && diagPagado && costoDiag > 0 && (
        <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
          ✓ Cliente autorizó la reparación. El diagnóstico de {formatCurrency(costoDiag)} ya pagado se descuenta del total final.
        </div>
      )}
      {!repAutorizada && diagPagado && costoDiag > 0 && (
        <div className="mt-3 text-xs text-amber-700 bg-amber-100 border border-amber-300 rounded p-2">
          ⚠ Cliente pagó diagnóstico pero no ha autorizado reparación. Si finalmente NO autoriza, el total será solo el diagnóstico.
        </div>
      )}
    </div>
  );
}

// =============================================================
// Sección de FIRMAS (recepción y entrega)
// =============================================================
function FirmasSection({ orden, onUpdated }) {
  const [editing, setEditing] = useState(null); // 'recepcion' | 'entrega' | null
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const sigRef = useRef(null);

  const abrir = (tipo) => {
    setEditing(tipo);
    setNombre(tipo === 'recepcion'
      ? (orden.firma_recepcion_nombre || '')
      : (orden.firma_entrega_nombre || ''));
    setTimeout(() => {
      const firma = tipo === 'recepcion' ? orden.firma_recepcion : orden.firma_entrega;
      if (firma && sigRef.current) sigRef.current.fromDataURL(firma);
    }, 100);
  };

  const cerrar = () => {
    setEditing(null);
    setNombre('');
  };

  const limpiar = () => sigRef.current?.clear();

  const guardar = async () => {
    setSaving(true);
    const firmaData = sigRef.current && !sigRef.current.isEmpty()
      ? sigRef.current.toDataURL('image/png')
      : null;

    const updates = editing === 'recepcion'
      ? { firma_recepcion: firmaData, firma_recepcion_nombre: nombre || null }
      : { firma_entrega: firmaData, firma_entrega_nombre: nombre || null };

    const { error } = await supabase
      .from('ordenes_taller')
      .update(updates)
      .eq('id_orden', orden.id_orden);
    setSaving(false);
    if (error) return alert(error.message);
    cerrar();
    onUpdated();
  };

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <PenTool className="h-4 w-4" /> Firmas del cliente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FirmaPreview
            label="Al recibir el equipo"
            firma={orden.firma_recepcion}
            nombre={orden.firma_recepcion_nombre}
            onClick={() => abrir('recepcion')}
          />
          <FirmaPreview
            label="Al recibir conforme (entrega)"
            firma={orden.firma_entrega}
            nombre={orden.firma_entrega_nombre}
            onClick={() => abrir('entrega')}
          />
        </div>
      </div>

      <Modal
        open={!!editing}
        onClose={cerrar}
        title={editing === 'recepcion' ? 'Firma de recepción' : 'Firma de entrega'}
        size="md"
      >
        <div className="space-y-3">
          <Input
            label="Nombre de quien firma"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre completo"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
            <div className="border-2 border-dashed border-gray-300 rounded bg-white">
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  className: 'w-full h-40',
                  style: { width: '100%', height: '160px' },
                }}
                penColor="black"
              />
            </div>
            <div className="flex justify-end mt-2">
              <Button size="sm" variant="outline" onClick={limpiar} type="button">
                <Eraser className="h-4 w-4" /> Limpiar
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={cerrar} type="button">Cancelar</Button>
            <Button onClick={guardar} loading={saving} type="button">Guardar firma</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function FirmaPreview({ label, firma, nombre, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-2 border-dashed border-gray-300 rounded p-3 hover:border-brand-400 hover:bg-brand-50 transition-colors text-left w-full"
    >
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {firma ? (
        <>
          <img src={firma} alt="firma" className="h-16 mx-auto" />
          {nombre && <div className="text-xs text-gray-700 mt-1 text-center">{nombre}</div>}
        </>
      ) : (
        <div className="h-16 flex items-center justify-center text-xs text-gray-400 italic">
          Click para firmar
        </div>
      )}
    </button>
  );
}

// =============================================================
// Sección de TOTALES (con lógica de diagnóstico)
// =============================================================
function TotalesSection({ orden }) {
  const costoDiag = Number(orden.costo_diagnostico || 0);
  const repAutorizada = !!orden.reparacion_autorizada;
  const diagPagado = !!orden.diagnostico_pagado;

  // Subtotales sin ITBMS desde la vista
  const subRep = Number(orden.subtotal_repuestos_sin_itbms || 0);
  const subMo = Number(orden.subtotal_mo_sin_itbms || 0);
  const subDiag = Number(orden.subtotal_diagnostico_sin_itbms || 0);

  const itbmsRep = Number(orden.itbms_repuestos || 0);
  const itbmsMo = Number(orden.itbms_mo || 0);
  const itbmsDiag = Number(orden.itbms_diagnostico || 0);

  // Cuando se autorizó reparación con diag pagado, el diagnóstico no suma
  const incluirDiag = costoDiag > 0 && (!repAutorizada || !diagPagado);
  const subtotalGeneral = subRep + subMo + (incluirDiag ? subDiag : 0);
  const itbmsTotal = itbmsRep + itbmsMo + (incluirDiag ? itbmsDiag : 0);

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
      <div className="space-y-1 text-sm border-b border-gray-200 pb-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal repuestos:</span>
          <span className="font-medium">{formatCurrency(subRep)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal mano de obra:</span>
          <span className="font-medium">{formatCurrency(subMo)}</span>
        </div>
        {costoDiag > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">
              Subtotal diagnóstico
              {repAutorizada && diagPagado && <span className="italic text-xs"> (descontado)</span>}
              :
            </span>
            <span className={`font-medium ${repAutorizada && diagPagado ? 'text-red-600' : ''}`}>
              {repAutorizada && diagPagado ? `-${formatCurrency(subDiag)}` : formatCurrency(subDiag)}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1 text-sm border-b border-gray-200 pb-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal sin ITBMS:</span>
          <span className="font-semibold">{formatCurrency(subtotalGeneral)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">ITBMS:</span>
          <span className="font-semibold">{formatCurrency(itbmsTotal)}</span>
        </div>
      </div>

      <div className="flex justify-between items-end pt-1">
        <span className="text-base font-bold text-gray-700">TOTAL:</span>
        <span className="text-2xl font-bold text-brand-700">{formatCurrency(orden.total_general)}</span>
      </div>
    </div>
  );
}

// =============================================================
// Sección de REPUESTOS
// =============================================================
function RepuestosSection({ ordenId, repuestos, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [modoCustom, setModoCustom] = useState(false);
  const [catSel, setCatSel] = useState(null);
  const [form, setForm] = useState({ descripcion: '', cantidad: 1, precio_unitario: 0, itbms_pct: 7 });
  const [saving, setSaving] = useState(false);

  // Cuando seleccionan algo del catálogo, autocompletar form
  useEffect(() => {
    if (catSel) {
      const desc = catSel.nombre + ((catSel.marca || catSel.modelo) ? ` (${[catSel.marca, catSel.modelo].filter(Boolean).join(' ')})` : '');
      setForm(f => ({
        ...f,
        descripcion: desc,
        precio_unitario: Number(catSel.precio_venta) || 0,
        itbms_pct: Number(catSel.itbms_pct) ?? 7,
      }));
    }
  }, [catSel]);

  const limpiarForm = () => {
    setForm({ descripcion: '', cantidad: 1, precio_unitario: 0, itbms_pct: 7 });
    setCatSel(null);
    setModoCustom(false);
  };

  const cerrarForm = () => {
    setShowForm(false);
    limpiarForm();
  };

  const agregar = async (e) => {
    e.preventDefault();
    if (!form.descripcion.trim()) return;

    // Verificar stock si tiene catálogo vinculado
    if (catSel && Number(form.cantidad) > Number(catSel.stock_disponible || 0)) {
      const ok = confirm(
        `Stock disponible: ${catSel.stock_disponible}. Estás reservando ${form.cantidad}. ¿Continuar de todas formas?`
      );
      if (!ok) return;
    }

    setSaving(true);
    const payload = {
      id_orden: ordenId,
      descripcion: form.descripcion,
      cantidad: Number(form.cantidad),
      precio_unitario: Number(form.precio_unitario),
      itbms_pct: Number(form.itbms_pct),
    };
    if (catSel) {
      payload.id_catalogo = catSel.id_catalogo;
      payload.sku = catSel.sku;
    }
    const { error } = await supabase.from('orden_repuestos').insert(payload);
    setSaving(false);
    if (error) return alert(error.message);
    cerrarForm();
    onChanged();
  };

  const cambiarItbms = async (id, pct) => {
    await supabase.from('orden_repuestos').update({ itbms_pct: Number(pct) }).eq('id_repuesto', id);
    onChanged();
  };

  const eliminar = async (id, vinculado) => {
    const msg = vinculado
      ? '¿Eliminar este repuesto? Si está vinculado al catálogo, se devolverá el stock reservado.'
      : '¿Eliminar este repuesto?';
    if (!confirm(msg)) return;
    await supabase.from('orden_repuestos').delete().eq('id_repuesto', id);
    onChanged();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Package className="h-4 w-4" /> Repuestos ({repuestos.length})
        </h3>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-3 w-3" /> Agregar
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={agregar} className="bg-blue-50 p-3 rounded mb-2 space-y-2">
          {/* Toggle catálogo / manual */}
          <div className="flex gap-1 text-xs mb-2">
            <button
              type="button"
              onClick={() => { setModoCustom(false); limpiarForm(); }}
              className={`px-3 py-1 rounded ${!modoCustom ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
            >
              Desde catálogo
            </button>
            <button
              type="button"
              onClick={() => { setModoCustom(true); setCatSel(null); }}
              className={`px-3 py-1 rounded ${modoCustom ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
            >
              Manual (sin catálogo)
            </button>
          </div>

          {!modoCustom && (
            <div>
              <CatalogoAutocomplete
                value={catSel}
                onChange={setCatSel}
                placeholder="Buscar en el catálogo (SKU, nombre, marca)..."
              />
              {catSel && Number(catSel.stock_disponible) <= 0 && (
                <div className="text-xs text-red-600 mt-1 p-2 bg-red-50 rounded border border-red-200">
                  ⚠️ Sin stock disponible. Si lo agregas, podrás cumplir el pedido cuando llegue el repuesto.
                </div>
              )}
              {catSel && Number(catSel.stock_disponible) > 0 && (
                <div className="text-xs text-emerald-600 mt-1">
                  ✓ Stock disponible: <strong>{catSel.stock_disponible}</strong>
                </div>
              )}
            </div>
          )}

          {(modoCustom || catSel) && (
            <Input
              placeholder="Descripción del repuesto"
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              required
              disabled={!!catSel}
            />
          )}

          {(modoCustom || catSel) && (
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number" step="1" min="1"
                placeholder="Cantidad"
                value={form.cantidad}
                onChange={e => setForm({ ...form, cantidad: e.target.value })}
              />
              <Input
                type="number" step="0.01" min="0"
                placeholder="Precio (Inc. ITBMS)"
                value={form.precio_unitario}
                onChange={e => setForm({ ...form, precio_unitario: e.target.value })}
                disabled={!!catSel}
              />
              <Select
                value={form.itbms_pct}
                onChange={e => setForm({ ...form, itbms_pct: e.target.value })}
                disabled={!!catSel}
              >
                {TASAS_ITBMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
          )}

          {(modoCustom || catSel) && catSel && (
            <p className="text-xs text-gray-600 italic">
              Precio e ITBMS bloqueados (vienen del catálogo). Si necesitas cambiarlos, edita el repuesto en el catálogo o usa modo Manual.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" type="button" onClick={cerrarForm}>Cancelar</Button>
            <Button size="sm" type="submit" loading={saving} disabled={!modoCustom && !catSel}>
              Guardar
            </Button>
          </div>
        </form>
      )}

      {repuestos.length === 0 ? (
        <div className="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded">Sin repuestos</div>
      ) : (
        <div className="border rounded overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-600">
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2 text-right">Cant.</th>
                <th className="px-3 py-2 text-right">P. unit.</th>
                <th className="px-3 py-2 text-center">ITBMS</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {repuestos.map(r => (
                <tr key={r.id_repuesto} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.sku ? <span className="text-brand-700 font-bold">{r.sku}</span> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2">{r.descripcion}</td>
                  <td className="px-3 py-2 text-right">{r.cantidad}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.precio_unitario)}</td>
                  <td className="px-3 py-2 text-center">
                    <select
                      value={r.itbms_pct ?? 7}
                      onChange={e => cambiarItbms(r.id_repuesto, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-1 py-0.5"
                    >
                      {TASAS_ITBMS.map(t => <option key={t.value} value={t.value}>{t.value}%</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.subtotal)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => eliminar(r.id_repuesto, !!r.id_catalogo)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// =============================================================
// Sección de MANO DE OBRA
// =============================================================
function ManoObraSection({ ordenId, manoObra, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ descripcion: '', horas: 1, precio_hora: 0, itbms_pct: 7 });
  const [saving, setSaving] = useState(false);

  const agregar = async (e) => {
    e.preventDefault();
    if (!form.descripcion.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('orden_mano_obra').insert({
      id_orden: ordenId,
      descripcion: form.descripcion,
      horas: Number(form.horas),
      precio_hora: Number(form.precio_hora),
      itbms_pct: Number(form.itbms_pct),
    });
    setSaving(false);
    if (error) return alert(error.message);
    setForm({ descripcion: '', horas: 1, precio_hora: 0, itbms_pct: 7 });
    setShowForm(false);
    onChanged();
  };

  const cambiarItbms = async (id, pct) => {
    await supabase.from('orden_mano_obra').update({ itbms_pct: Number(pct) }).eq('id_mano_obra', id);
    onChanged();
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await supabase.from('orden_mano_obra').delete().eq('id_mano_obra', id);
    onChanged();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Wrench className="h-4 w-4" /> Mano de obra ({manoObra.length})
        </h3>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-3 w-3" /> Agregar
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={agregar} className="bg-amber-50 p-3 rounded mb-2 space-y-2">
          <Input
            placeholder="Descripción del trabajo"
            value={form.descripcion}
            onChange={e => setForm({ ...form, descripcion: e.target.value })}
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number" step="0.5" min="0.5"
              placeholder="Horas"
              value={form.horas}
              onChange={e => setForm({ ...form, horas: e.target.value })}
            />
            <Input
              type="number" step="0.01" min="0"
              placeholder="$/h (Inc. ITBMS)"
              value={form.precio_hora}
              onChange={e => setForm({ ...form, precio_hora: e.target.value })}
            />
            <Select
              value={form.itbms_pct}
              onChange={e => setForm({ ...form, itbms_pct: e.target.value })}
            >
              {TASAS_ITBMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      )}

      {manoObra.length === 0 ? (
        <div className="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded">Sin mano de obra</div>
      ) : (
        <div className="border rounded overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-600">
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2 text-right">Horas</th>
                <th className="px-3 py-2 text-right">$/h</th>
                <th className="px-3 py-2 text-center">ITBMS</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {manoObra.map(m => (
                <tr key={m.id_mano_obra} className="border-t">
                  <td className="px-3 py-2">{m.descripcion}</td>
                  <td className="px-3 py-2 text-right">{m.horas}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(m.precio_hora)}</td>
                  <td className="px-3 py-2 text-center">
                    <select
                      value={m.itbms_pct ?? 7}
                      onChange={e => cambiarItbms(m.id_mano_obra, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-1 py-0.5"
                    >
                      {TASAS_ITBMS.map(t => <option key={t.value} value={t.value}>{t.value}%</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(m.subtotal)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => eliminar(m.id_mano_obra)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Indicador de fecha de diagnóstico (con badge si atrasado)
// ============================================================
function FechaDiagnosticoIndicador({ fecha, estado }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaDx = new Date(fecha + 'T00:00:00');
  const diasDiff = Math.floor((fechaDx - hoy) / (1000 * 60 * 60 * 24));
  const yaPaso = diasDiff < 0;
  const diagnosticado = !['RECIBIDO', 'DIAGNOSTICO'].includes(estado);

  // Si ya se diagnosticó, mostrar verde
  if (diagnosticado) {
    return (
      <div className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
        <span>📅 Diagnóstico prometido: {fecha}</span>
        <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
          ✓ Cumplido
        </span>
      </div>
    );
  }

  // Si pasó la fecha y aún no se diagnosticó → ATRASADO
  if (yaPaso) {
    return (
      <div className="text-xs text-red-700 mt-1 flex items-center gap-1 font-medium">
        <span>⚠️ Diagnóstico prometido: {fecha}</span>
        <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
          ATRASADO {Math.abs(diasDiff)} día{Math.abs(diasDiff) === 1 ? '' : 's'}
        </span>
      </div>
    );
  }

  // Si es hoy
  if (diasDiff === 0) {
    return (
      <div className="text-xs text-amber-700 mt-1 flex items-center gap-1 font-medium">
        <span>📅 Diagnóstico prometido: {fecha}</span>
        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
          HOY
        </span>
      </div>
    );
  }

  // Pendiente, en plazo
  return (
    <div className="text-xs text-blue-700 mt-1">
      📅 Diagnóstico prometido: {fecha} ({diasDiff} día{diasDiff === 1 ? '' : 's'})
    </div>
  );
}
