import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, FileDown, Mail, CheckCircle2, XCircle, Send, AlertCircle,
  Wrench, MapPin, ShoppingCart, Eraser, ArrowRight, Pencil, Copy, History,
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import SignatureCanvas from 'react-signature-canvas';
import { generarPDFPresupuesto } from './pdfPresupuesto';
import EnviarCorreoModal from './EnviarCorreoModal';
import WhatsAppButton from './WhatsAppButton';
import { registrarAuditoria } from '../lib/presupuestoAuditoria';

const ESTADO_LABELS = {
  BORRADOR:   'Borrador',
  ENVIADO:    'Enviado',
  APROBADO:   'Aprobado',
  RECHAZADO:  'Rechazado',
  VENCIDO:    'Vencido',
  CONVERTIDO: 'Convertido',
  CANCELADO:  'Cancelado',
};

const ESTADO_CLS = {
  BORRADOR:   'bg-gray-100 text-gray-800 border-gray-300',
  ENVIADO:    'bg-blue-100 text-blue-800 border-blue-300',
  APROBADO:   'bg-emerald-100 text-emerald-800 border-emerald-300',
  RECHAZADO:  'bg-red-100 text-red-800 border-red-300',
  VENCIDO:    'bg-amber-100 text-amber-800 border-amber-300',
  CONVERTIDO: 'bg-purple-100 text-purple-800 border-purple-300',
  CANCELADO:  'bg-gray-200 text-gray-600 border-gray-400',
};

export default function PresupuestoDetalleModal({ open, onClose, presupuestoId, profile, onEditar }) {
  const [presupuesto, setPresupuesto] = useState(null);
  const [items, setItems] = useState([]);
  const [empresa, setEmpresa] = useState({});
  const [loading, setLoading] = useState(false);
  const [auditoria, setAuditoria] = useState([]);

  // Acciones
  const [showAprobar, setShowAprobar] = useState(false);
  const [showRechazar, setShowRechazar] = useState(false);
  const [showConvertir, setShowConvertir] = useState(false);

  // Correo
  const [showCorreo, setShowCorreo] = useState(false);
  const [pdfBlobCorreo, setPdfBlobCorreo] = useState(null);
  const [pdfNombreCorreo, setPdfNombreCorreo] = useState('');

  const cargar = async () => {
    if (!presupuestoId) return;
    setLoading(true);
    const [pRes, iRes, eRes, aRes] = await Promise.all([
      supabase.from('v_presupuestos_completa').select('*').eq('id_presupuesto', presupuestoId).single(),
      supabase.from('presupuesto_items').select('*').eq('id_presupuesto', presupuestoId).order('orden'),
      supabase.from('configuracion_empresa').select('*').eq('id', 1).single(),
      supabase.from('v_presupuesto_auditoria_completa').select('*')
        .eq('id_presupuesto', presupuestoId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    if (pRes.data) setPresupuesto(pRes.data);
    setItems(iRes.data || []);
    if (eRes.data) setEmpresa(eRes.data);
    setAuditoria(aRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (open) cargar(); }, [open, presupuestoId]);

  // ============== ACCIONES ==============
  const marcarComoEnviado = async () => {
    const { error } = await supabase
      .from('presupuestos').update({ estado: 'ENVIADO' })
      .eq('id_presupuesto', presupuestoId);
    if (error) return alert('Error: ' + error.message);
    await registrarAuditoria(presupuestoId, 'ENVIADO', 'Marcado como enviado al cliente');
    cargar();
  };

  const editarPresupuesto = () => {
    if (presupuesto.estado === 'ENVIADO') {
      const ok = window.confirm(
        '⚠️ Editar Presupuesto Enviado\n\n' +
        'Este presupuesto ya fue enviado al cliente.\n\n' +
        'Si lo modificas:\n' +
        '• Quedará registro en la auditoría\n' +
        '• Si lo reenvías, el cliente recibe la versión nueva\n' +
        '• Si NO lo reenvías, el cliente sigue teniendo la vieja\n\n' +
        '¿Continuar con la edición?'
      );
      if (!ok) return;
    }
    if (onEditar) {
      onEditar(presupuestoId);
      onClose();
    }
  };

  const duplicarPresupuesto = async () => {
    const ok = window.confirm(
      `Duplicar el presupuesto ${presupuesto.numero_presupuesto}?\n\n` +
      'Se creará un presupuesto nuevo en BORRADOR con todos los items.\n' +
      'Podrás editarlo antes de enviarlo.'
    );
    if (!ok) return;

    try {
      // 1. Crear el nuevo presupuesto con los datos del original
      const { data: nuevoPresup, error: errPresup } = await supabase
        .from('presupuestos')
        .insert({
          id_cliente: presupuesto.id_cliente,
          tipo_destino: presupuesto.tipo_destino,
          id_equipo: presupuesto.id_equipo,
          fecha_emision: new Date().toISOString().split('T')[0],
          fecha_validez: (() => {
            const v = new Date();
            v.setDate(v.getDate() + 15);
            return v.toISOString().split('T')[0];
          })(),
          estado: 'BORRADOR',
          requiere_firma: presupuesto.requiere_firma,
          precios_incluyen_itbms: presupuesto.precios_incluyen_itbms,
          asunto: presupuesto.asunto,
          observaciones: presupuesto.observaciones,
          condiciones: presupuesto.condiciones,
          descuento_tipo: presupuesto.descuento_tipo,
          descuento_valor: presupuesto.descuento_valor,
          descuento_monto_calculado: presupuesto.descuento_monto_calculado,
          notas_internas: presupuesto.notas_internas,
          presupuesto_origen: presupuesto.id_presupuesto,
          created_by: profile?.id || null,
        })
        .select()
        .single();

      if (errPresup) throw errPresup;

      // 2. Copiar los items
      if (items.length > 0) {
        const itemsNuevos = items.map(it => ({
          id_presupuesto: nuevoPresup.id_presupuesto,
          orden: it.orden,
          tipo: it.tipo,
          id_catalogo: it.id_catalogo,
          sku: it.sku,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          itbms_pct: it.itbms_pct,
          // subtotal: NO se inserta, es calculado por la BD
        }));
        const { error: errItems } = await supabase
          .from('presupuesto_items')
          .insert(itemsNuevos);
        if (errItems) throw errItems;
      }

      // 3. Auditoría
      await registrarAuditoria(
        nuevoPresup.id_presupuesto,
        'DUPLICADO',
        `Duplicado desde ${presupuesto.numero_presupuesto}`
      );

      alert(`✓ Presupuesto duplicado como ${nuevoPresup.numero_presupuesto}`);
      onClose();
    } catch (e) {
      alert('Error al duplicar: ' + e.message);
    }
  };

  const cancelar = async () => {
    if (!confirm('¿Cancelar este presupuesto? Si estaba aprobado, se liberará el stock reservado.')) return;
    const { data, error } = await supabase.rpc('rechazar_presupuesto', {
      p_id: presupuestoId,
      p_motivo: 'Cancelado por usuario',
      p_estado_destino: 'CANCELADO',
    });
    if (error) return alert('Error: ' + error.message);
    if (data && !data.success) return alert('Error: ' + data.error);
    cargar();
  };

  // ============== PDF ==============
  const descargarPDF = () => {
    try {
      generarPDFPresupuesto(presupuesto, items, empresa);
    } catch (err) {
      alert('Error generando PDF: ' + err.message);
    }
  };

  const abrirEnvioCorreo = () => {
    try {
      const { blob, nombre } = generarPDFPresupuesto(presupuesto, items, empresa, { soloBlob: true });
      setPdfBlobCorreo(blob);
      setPdfNombreCorreo(nombre);
      setShowCorreo(true);
    } catch (err) {
      alert('Error preparando envío: ' + err.message);
    }
  };

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={presupuesto ? presupuesto.numero_presupuesto : 'Cargando...'}
        size="xl"
      >
        {loading || !presupuesto ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <div className="space-y-4">
            {/* === HEADER CON ESTADO === */}
            <div className={`rounded border-l-4 p-3 ${ESTADO_CLS[presupuesto.estado]}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-75">Estado</div>
                  <div className="text-lg font-bold">{ESTADO_LABELS[presupuesto.estado]}</div>
                </div>
                {(presupuesto.estado === 'BORRADOR' || presupuesto.estado === 'ENVIADO') && (
                  <div className="text-right">
                    <div className="text-xs opacity-75">Validez</div>
                    <div className="text-sm font-medium">
                      {formatDate(presupuesto.fecha_validez)}
                      {presupuesto.dias_para_vencer >= 0 && (
                        <span className="ml-2 text-xs">
                          ({presupuesto.dias_para_vencer === 0 ? 'Vence hoy' : `Faltan ${presupuesto.dias_para_vencer} días`})
                        </span>
                      )}
                      {presupuesto.dias_para_vencer < 0 && (
                        <span className="ml-2 text-xs text-red-600 font-bold">
                          (Vencido hace {Math.abs(presupuesto.dias_para_vencer)} días)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {presupuesto.id_orden_generada && (
                <div className="mt-2 text-sm">
                  ✓ Convertido a Orden de Taller
                </div>
              )}
              {presupuesto.id_visita_generada && (
                <div className="mt-2 text-sm">
                  ✓ Convertido a Visita
                </div>
              )}
              {presupuesto.motivo_rechazo && (
                <div className="mt-2 text-sm">
                  <strong>Motivo:</strong> {presupuesto.motivo_rechazo}
                </div>
              )}
            </div>

            {/* === DATOS GENERALES === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card label="Cliente">
                <div className="font-semibold">{presupuesto.cliente_nombre}</div>
                <div className="text-xs text-gray-500">{presupuesto.numero_cliente}</div>
                {presupuesto.cliente_ruc && (
                  <div className="text-xs text-gray-600 mt-1">
                    RUC: {presupuesto.cliente_ruc}{presupuesto.cliente_dv ? '-' + presupuesto.cliente_dv : ''}
                  </div>
                )}
                {presupuesto.cliente_correo && (
                  <div className="text-xs text-gray-600">{presupuesto.cliente_correo}</div>
                )}
              </Card>

              <Card label="Tipo de destino">
                <TipoDestinoBadge tipo={presupuesto.tipo_destino} />
                {presupuesto.equipo_marca && (
                  <div className="text-xs text-gray-600 mt-1">
                    Equipo: {presupuesto.tipo_equipo} {presupuesto.equipo_marca} {presupuesto.equipo_modelo}
                  </div>
                )}
              </Card>

              <Card label="Fecha de emisión">
                <div className="text-sm">{formatDate(presupuesto.fecha_emision)}</div>
                <div className="text-xs text-gray-500">por {presupuesto.creado_por_nombre || '—'}</div>
              </Card>

              <Card label="Asunto">
                <div className="text-sm">{presupuesto.asunto || <span className="text-gray-400 italic">Sin asunto</span>}</div>
              </Card>
            </div>

            {/* === ITEMS === */}
            <div className="bg-gray-50 rounded p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">📦 Items ({items.length})</h3>
              <div className="overflow-x-auto bg-white rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Descripción</th>
                      <th className="px-2 py-1.5 text-right">Cant.</th>
                      <th className="px-2 py-1.5 text-right">Precio</th>
                      <th className="px-2 py-1.5 text-right">ITBMS</th>
                      <th className="px-2 py-1.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map(it => (
                      <tr key={it.id_item}>
                        <td className="px-2 py-1.5">
                          <div>{it.descripcion}</div>
                          {it.sku && <div className="text-xs text-gray-500">{it.sku}</div>}
                        </td>
                        <td className="px-2 py-1.5 text-right">{Number(it.cantidad).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right">{formatCurrency(it.precio_unitario)}</td>
                        <td className="px-2 py-1.5 text-right">{Number(it.itbms_pct).toFixed(0)}%</td>
                        <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* === TOTALES === */}
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-600">Subtotal sin ITBMS</div>
                  <div className="text-lg font-semibold">{formatCurrency(presupuesto.subtotal_sin_itbms)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">ITBMS</div>
                  <div className="text-lg font-semibold">{formatCurrency(presupuesto.total_itbms)}</div>
                </div>
                <div>
                  <div className="text-xs text-emerald-700">TOTAL</div>
                  <div className="text-2xl font-bold text-emerald-700">{formatCurrency(presupuesto.total_general)}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {presupuesto.precios_incluyen_itbms
                  ? '✓ Los precios mostrados incluyen ITBMS'
                  : '✓ El ITBMS se sumó al precio base'}
              </div>
            </div>

            {/* === OBSERVACIONES Y CONDICIONES === */}
            {(presupuesto.observaciones || presupuesto.condiciones) && (
              <div className="space-y-2">
                {presupuesto.observaciones && (
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Observaciones</div>
                    <div className="text-sm whitespace-pre-wrap">{presupuesto.observaciones}</div>
                  </div>
                )}
                {presupuesto.condiciones && (
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Términos y Condiciones</div>
                    <div className="text-sm whitespace-pre-wrap">{presupuesto.condiciones}</div>
                  </div>
                )}
              </div>
            )}

            {/* === FIRMA SI EXISTE === */}
            {presupuesto.firma_cliente && (
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Firma del cliente</div>
                <img src={presupuesto.firma_cliente} alt="Firma" className="max-h-24 bg-white border rounded" />
                {presupuesto.aprobado_por_nombre && (
                  <div className="text-xs text-gray-500 mt-1">
                    {presupuesto.aprobado_por_nombre} · {formatDateTime(presupuesto.fecha_aprobacion)}
                  </div>
                )}
              </div>
            )}

            {/* === NOTAS INTERNAS (no van en PDF) === */}
            {presupuesto.notas_internas && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <div className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                  🔒 Notas internas <span className="font-normal text-amber-700">(solo equipo)</span>
                </div>
                <div className="text-sm text-amber-800 whitespace-pre-wrap">{presupuesto.notas_internas}</div>
              </div>
            )}

            {/* === AUDITORÍA === */}
            {auditoria.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" /> Historial de cambios ({auditoria.length})
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {auditoria.map(a => (
                    <div key={a.id_auditoria} className="text-xs flex items-start gap-2 pb-1.5 border-b border-gray-200 last:border-0">
                      <span className="text-gray-500 shrink-0 font-mono">
                        {new Date(a.created_at).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit' })} {new Date(a.created_at).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-semibold text-gray-700">{a.usuario_nombre || 'Sistema'}:</span>
                      <span className="text-gray-600 flex-1">
                        <strong className="text-brand-700">{a.accion}</strong>
                        {a.detalle && ` — ${a.detalle}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* === BOTONES DE ACCIÓN === */}
            <div className="flex justify-end gap-2 pt-3 border-t flex-wrap sticky bottom-0 bg-white">
              {/* Editar (BORRADOR o ENVIADO con confirmación) */}
              {(presupuesto.estado === 'BORRADOR' || presupuesto.estado === 'ENVIADO') && (
                <Button variant="outline" type="button" onClick={editarPresupuesto}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              )}

              {/* Duplicar (siempre disponible) */}
              <Button variant="outline" type="button" onClick={duplicarPresupuesto}>
                <Copy className="h-4 w-4" /> Duplicar
              </Button>

              {/* Marcar como enviado (cuando es BORRADOR) */}
              {presupuesto.estado === 'BORRADOR' && (
                <Button variant="outline" type="button" onClick={marcarComoEnviado}>
                  <Send className="h-4 w-4" /> Marcar como Enviado
                </Button>
              )}

              {/* Aprobar (cuando está BORRADOR o ENVIADO) */}
              {(presupuesto.estado === 'BORRADOR' || presupuesto.estado === 'ENVIADO') && (
                <Button variant="outline" type="button" onClick={() => setShowAprobar(true)}
                        className="!border-emerald-600 !text-emerald-700 hover:!bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4" /> Aprobar
                </Button>
              )}

              {/* Rechazar (cuando está BORRADOR o ENVIADO) */}
              {(presupuesto.estado === 'BORRADOR' || presupuesto.estado === 'ENVIADO') && (
                <Button variant="outline" type="button" onClick={() => setShowRechazar(true)}
                        className="!border-red-600 !text-red-700 hover:!bg-red-50">
                  <XCircle className="h-4 w-4" /> Rechazar
                </Button>
              )}

              {/* Convertir (cuando está APROBADO) */}
              {presupuesto.estado === 'APROBADO' && (
                <Button type="button" onClick={() => setShowConvertir(true)}>
                  <ArrowRight className="h-4 w-4" /> Convertir
                </Button>
              )}

              {/* Cancelar (siempre que NO esté ya cancelado/convertido) */}
              {!['CANCELADO', 'CONVERTIDO', 'RECHAZADO'].includes(presupuesto.estado) && (
                <Button variant="outline" type="button" onClick={cancelar}
                        className="!text-gray-600">
                  Cancelar presupuesto
                </Button>
              )}

              {/* WhatsApp */}
              <WhatsAppButton
                empresa={empresa}
                tipo="PRESUPUESTO"
                documento={{
                  numero: presupuesto.numero_presupuesto,
                  cliente_nombre: presupuesto.cliente_nombre,
                  cliente_telefono: presupuesto.cliente_telefono,
                  total: presupuesto.total_general,
                }}
              />

              {/* Enviar correo */}
              <Button variant="outline" type="button" onClick={abrirEnvioCorreo}
                      disabled={!presupuesto.cliente_correo}>
                <Mail className="h-4 w-4" /> Enviar por correo
              </Button>

              {/* Descargar PDF */}
              <Button variant="outline" type="button" onClick={descargarPDF}>
                <FileDown className="h-4 w-4" /> Descargar PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modales secundarios */}
      {showAprobar && (
        <AprobarModal
          presupuesto={presupuesto}
          onClose={() => setShowAprobar(false)}
          onAprobado={() => { setShowAprobar(false); cargar(); }}
        />
      )}

      {showRechazar && (
        <RechazarModal
          presupuestoId={presupuestoId}
          onClose={() => setShowRechazar(false)}
          onRechazado={() => { setShowRechazar(false); cargar(); }}
        />
      )}

      {showConvertir && (
        <ConvertirModal
          presupuesto={presupuesto}
          items={items}
          profile={profile}
          onClose={() => setShowConvertir(false)}
          onConvertido={() => { setShowConvertir(false); cargar(); }}
        />
      )}

      {showCorreo && presupuesto && (
        <EnviarCorreoModal
          open={showCorreo}
          onClose={() => setShowCorreo(false)}
          tipo="PRESUPUESTO"
          documento={presupuesto}
          cliente={{
            id_cliente: presupuesto.id_cliente,
            nombre: presupuesto.cliente_nombre,
            correo: presupuesto.cliente_correo,
            telefono: presupuesto.cliente_telefono,
          }}
          pdfBlob={pdfBlobCorreo}
          pdfNombre={pdfNombreCorreo}
          userId={profile?.id}
          userName={profile?.nombre_completo}
          referencias={{
            id_cliente: presupuesto.id_cliente,
          }}
        />
      )}
    </>
  );
}

// =============================================================
// Subcomponentes
// =============================================================
function Card({ label, children }) {
  return (
    <div className="bg-gray-50 rounded p-3">
      <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">{label}</div>
      {children}
    </div>
  );
}

function TipoDestinoBadge({ tipo }) {
  const info = {
    TALLER:        { label: 'Taller',        icon: Wrench,       color: 'text-blue-700' },
    VISITA:        { label: 'Visita técnica', icon: MapPin,       color: 'text-emerald-700' },
    VENTA_DIRECTA: { label: 'Venta directa', icon: ShoppingCart, color: 'text-purple-700' },
  }[tipo] || { label: tipo, icon: FileText, color: 'text-gray-700' };
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 ${info.color} font-medium`}>
      <Icon className="h-4 w-4" /> {info.label}
    </span>
  );
}

// =============================================================
// Modal: Aprobar presupuesto (con firma opcional)
// =============================================================
function AprobarModal({ presupuesto, onClose, onAprobado }) {
  const [aprobadoPor, setAprobadoPor] = useState(presupuesto?.cliente_nombre || '');
  const [correoAprobador, setCorreoAprobador] = useState(presupuesto?.cliente_correo || '');
  const [firmando, setFirmando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const sigRef = useRef(null);

  const requiereFirma = presupuesto?.requiere_firma;

  const aprobar = async () => {
    setError('');

    if (!aprobadoPor.trim()) {
      return setError('Indica el nombre de quién aprueba');
    }

    let firmaB64 = null;
    if (requiereFirma) {
      if (!sigRef.current || sigRef.current.isEmpty()) {
        return setError('Se requiere la firma del cliente');
      }
      firmaB64 = sigRef.current.toDataURL('image/png');
    }

    setSaving(true);
    const { data, error: e } = await supabase.rpc('aprobar_presupuesto', {
      p_id: presupuesto.id_presupuesto,
      p_aprobado_por_nombre: aprobadoPor,
      p_aprobado_por_correo: correoAprobador || null,
      p_firma: firmaB64,
    });
    setSaving(false);

    if (e) return setError(e.message);
    if (data && !data.success) return setError(data.error);

    onAprobado();
  };

  return (
    <Modal open={true} onClose={onClose} title="Aprobar presupuesto" size="md">
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm">
          <div className="font-medium text-emerald-900">Vas a aprobar este presupuesto</div>
          <div className="text-xs text-emerald-700 mt-1">
            Se reservará el stock de los productos del catálogo. Después podrás convertirlo a Orden, Visita o Venta directa.
          </div>
        </div>

        <Input
          label="Aprobado por (nombre) *"
          value={aprobadoPor}
          onChange={e => setAprobadoPor(e.target.value)}
          placeholder="Nombre de quien aprueba"
        />

        <Input
          label="Correo de quien aprueba"
          type="email"
          value={correoAprobador}
          onChange={e => setCorreoAprobador(e.target.value)}
          placeholder="opcional"
        />

        {requiereFirma && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Firma del cliente *</label>
              <button
                type="button"
                onClick={() => sigRef.current?.clear()}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <Eraser className="h-3 w-3" /> Limpiar
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded bg-white">
              <SignatureCanvas
                ref={sigRef}
                penColor="black"
                canvasProps={{ className: 'w-full h-32' }}
                onBegin={() => setFirmando(true)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Firma con el dedo o el mouse</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="secondary" onClick={onClose} type="button" disabled={saving}>Cancelar</Button>
          <Button onClick={aprobar} type="button" loading={saving}>
            <CheckCircle2 className="h-4 w-4" /> Aprobar y reservar stock
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================
// Modal: Rechazar presupuesto
// =============================================================
function RechazarModal({ presupuestoId, onClose, onRechazado }) {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rechazar = async () => {
    setError('');
    if (!motivo.trim()) return setError('Indica el motivo del rechazo');
    setSaving(true);
    const { data, error: e } = await supabase.rpc('rechazar_presupuesto', {
      p_id: presupuestoId,
      p_motivo: motivo,
      p_estado_destino: 'RECHAZADO',
    });
    setSaving(false);
    if (e) return setError(e.message);
    if (data && !data.success) return setError(data.error);
    onRechazado();
  };

  return (
    <Modal open={true} onClose={onClose} title="Rechazar presupuesto" size="md">
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        <Textarea
          label="Motivo del rechazo *"
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          rows={3}
          placeholder="Ej: Cliente prefirió otra cotización, presupuesto fuera de su rango, etc."
        />
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="secondary" onClick={onClose} type="button" disabled={saving}>Cancelar</Button>
          <Button onClick={rechazar} type="button" loading={saving}
                  className="!bg-red-600 hover:!bg-red-700">
            <XCircle className="h-4 w-4" /> Rechazar presupuesto
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================
// Modal: Convertir a Orden / Visita / Venta
// =============================================================
function ConvertirModal({ presupuesto, items, profile, onClose, onConvertido }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const convertirAOrden = async () => {
    setError(''); setSaving(true);
    try {
      // Crear orden
      const { data: orden, error: eO } = await supabase.from('ordenes_taller').insert({
        id_cliente: presupuesto.id_cliente,
        id_equipo: presupuesto.id_equipo,
        falla_reportada: presupuesto.asunto || 'Trabajo según presupuesto ' + presupuesto.numero_presupuesto,
        diagnostico: presupuesto.observaciones || null,
        estado: 'RECIBIDO',
        costo_diagnostico: 0,
        diagnostico_itbms_pct: 0,
        precios_incluyen_itbms: presupuesto.precios_incluyen_itbms,
      }).select().single();
      if (eO) throw eO;

      // Insertar items: PRODUCTOS → orden_repuestos, SERVICIOS → orden_mano_obra
      const repuestos = items
        .filter(i => i.tipo === 'PRODUCTO')
        .map(i => ({
          id_orden: orden.id_orden,
          id_catalogo: i.id_catalogo,
          sku: i.sku,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          itbms_pct: i.itbms_pct,
        }));
      if (repuestos.length > 0) {
        const { error: eR } = await supabase.from('orden_repuestos').insert(repuestos);
        if (eR) throw eR;
      }

      const manoObra = items
        .filter(i => i.tipo === 'SERVICIO' || i.tipo === 'OTRO')
        .map(i => ({
          id_orden: orden.id_orden,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          itbms_pct: i.itbms_pct,
        }));
      if (manoObra.length > 0) {
        const { error: eM } = await supabase.from('orden_mano_obra').insert(manoObra);
        if (eM) throw eM;
      }

      // Marcar presupuesto como CONVERTIDO
      await supabase.from('presupuestos').update({
        estado: 'CONVERTIDO',
        id_orden_generada: orden.id_orden,
        fecha_conversion: new Date().toISOString(),
      }).eq('id_presupuesto', presupuesto.id_presupuesto);

      alert(`✓ Convertido a Orden ${orden.numero_ticket}`);
      onConvertido();
    } catch (err) {
      setError(err.message || 'Error convirtiendo');
    } finally {
      setSaving(false);
    }
  };

  const convertirAVisita = async () => {
    setError(''); setSaving(true);
    try {
      const { data: visita, error: eV } = await supabase.from('visitas').insert({
        id_cliente: presupuesto.id_cliente,
        motivo: presupuesto.asunto || 'Visita según presupuesto ' + presupuesto.numero_presupuesto,
        trabajo_realizado: presupuesto.observaciones || null,
        estado: 'PROGRAMADA',
        fecha_visita: new Date().toISOString().split('T')[0],
      }).select().single();
      if (eV) throw eV;

      // Por simplicidad, los items van como "trabajo realizado" en texto
      // (la tabla visitas no tiene items granulares)
      const itemsTexto = items.map(i =>
        `• ${i.descripcion} (${i.cantidad} x ${Number(i.precio_unitario).toFixed(2)})`
      ).join('\n');
      const trabajoFinal = (presupuesto.observaciones ? presupuesto.observaciones + '\n\n' : '') + itemsTexto;

      await supabase.from('visitas').update({
        trabajo_realizado: trabajoFinal,
      }).eq('id_visita', visita.id_visita);

      // Marcar como convertido
      await supabase.from('presupuestos').update({
        estado: 'CONVERTIDO',
        id_visita_generada: visita.id_visita,
        fecha_conversion: new Date().toISOString(),
      }).eq('id_presupuesto', presupuesto.id_presupuesto);

      alert(`✓ Convertido a Visita ${visita.numero_visita}`);
      onConvertido();
    } catch (err) {
      setError(err.message || 'Error convirtiendo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Convertir presupuesto" size="md">
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <div className="font-medium text-blue-900">Convierte este presupuesto en un documento operativo</div>
          <div className="text-xs text-blue-700 mt-1">
            Los items se transferirán automáticamente al nuevo documento.
          </div>
        </div>

        <div className="space-y-2">
          {presupuesto.tipo_destino === 'TALLER' && (
            <button
              type="button"
              onClick={convertirAOrden}
              disabled={saving}
              className="w-full p-3 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors text-left flex items-center gap-3 disabled:opacity-50"
            >
              <Wrench className="h-6 w-6 text-blue-600" />
              <div className="flex-1">
                <div className="font-semibold text-blue-900">Convertir a Orden de Taller</div>
                <div className="text-xs text-blue-700">Se creará una nueva OT con los items pre-llenados</div>
              </div>
              <ArrowRight className="h-5 w-5 text-blue-600" />
            </button>
          )}

          {presupuesto.tipo_destino === 'VISITA' && (
            <button
              type="button"
              onClick={convertirAVisita}
              disabled={saving}
              className="w-full p-3 bg-white border-2 border-emerald-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 transition-colors text-left flex items-center gap-3 disabled:opacity-50"
            >
              <MapPin className="h-6 w-6 text-emerald-600" />
              <div className="flex-1">
                <div className="font-semibold text-emerald-900">Convertir a Visita</div>
                <div className="text-xs text-emerald-700">Se creará una visita con los items como trabajo a realizar</div>
              </div>
              <ArrowRight className="h-5 w-5 text-emerald-600" />
            </button>
          )}

          {presupuesto.tipo_destino === 'VENTA_DIRECTA' && (
            <div className="w-full p-3 bg-gray-50 border-2 border-gray-300 rounded-lg flex items-center gap-3 opacity-60">
              <ShoppingCart className="h-6 w-6 text-gray-500" />
              <div className="flex-1">
                <div className="font-semibold text-gray-700">Convertir a Venta Directa</div>
                <div className="text-xs text-gray-500">Disponible en próximo parche v8.2</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button variant="secondary" onClick={onClose} type="button" disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
