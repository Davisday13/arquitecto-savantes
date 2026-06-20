import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Camera, Eraser, Save, FileDown, CheckSquare, Square, Mail } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import SignatureCanvas from 'react-signature-canvas';
import {
  TIPOS_VISITA_LABEL, ESTADOS_VISITA_LABEL, ESTADOS_VISITA_COLOR, ROLES,
  ESTADO_PAGO_LABEL, ESTADO_PAGO_COLOR, TASAS_ITBMS,
} from '../lib/constants';
import { formatDate, formatDateTime, formatCurrency } from '../lib/utils';
import { generarPDFVisita } from './pdfVisita';
import EnviarCorreoModal from './EnviarCorreoModal';
import WhatsAppButton from './WhatsAppButton';
import PagosSection from './PagosSection';

const STORAGE_BUCKET = 'soporte-tecnico';

export default function VisitaDetalleModal({ open, onClose, visitaId, profile }) {
  const [visita, setVisita] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Modal de envío por correo
  const [showCorreo, setShowCorreo] = useState(false);
  const [pdfBlobCorreo, setPdfBlobCorreo] = useState(null);
  const [pdfNombreCorreo, setPdfNombreCorreo] = useState('');

  // Empresa (para WhatsApp y PDFs)
  const [empresa, setEmpresa] = useState(null);

  // Campos editables
  const [trabajoRealizado, setTrabajoRealizado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [estado, setEstado] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [nuevoItem, setNuevoItem] = useState('');
  const [fotos, setFotos] = useState([]);
  const [firmaNombre, setFirmaNombre] = useState('');
  const [costoVisita, setCostoVisita] = useState(0);
  const [costoItbms, setCostoItbms] = useState(7);
  const [savingCosto, setSavingCosto] = useState(false);

  const sigCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const cargar = async () => {
    if (!visitaId) return;
    setLoading(true);
    const [vRes, eRes] = await Promise.all([
      supabase.from('v_visitas_completa').select('*').eq('id_visita', visitaId).single(),
      supabase.from('configuracion_empresa').select('*').eq('id', 1).single(),
    ]);
    const { data, error } = vRes;
    if (!error && data) {
      setVisita(data);
      setTrabajoRealizado(data.trabajo_realizado || '');
      setObservaciones(data.observaciones || '');
      setHoraInicio(data.hora_inicio || '');
      setHoraFin(data.hora_fin || '');
      setEstado(data.estado);
      setChecklist(Array.isArray(data.checklist) ? data.checklist : []);
      setFotos(Array.isArray(data.fotos) ? data.fotos : []);
      setFirmaNombre(data.firma_cliente_nombre || '');
      setCostoVisita(Number(data.costo_visita) || 0);
      setCostoItbms(Number(data.costo_itbms_pct ?? 7));
      // Cargar firma previa si existe
      setTimeout(() => {
        if (data.firma_cliente && sigCanvasRef.current) {
          sigCanvasRef.current.fromDataURL(data.firma_cliente);
        }
      }, 100);
    }
    setEmpresa(eRes.data || null);
    setLoading(false);
  };

  useEffect(() => {
    if (open && visitaId) cargar();
    if (!open) {
      setVisita(null);
      setChecklist([]); setFotos([]);
    }
  }, [open, visitaId]);

  const puedeEditar = profile?.rol !== ROLES.CLIENTE && estado !== 'CANCELADA';

  // ---------- Costo ----------
  const guardarCosto = async () => {
    setSavingCosto(true);
    const { error } = await supabase
      .from('visitas')
      .update({
        costo_visita: Number(costoVisita) || 0,
        costo_itbms_pct: Number(costoItbms),
      })
      .eq('id_visita', visitaId);
    setSavingCosto(false);
    if (error) return alert('Error: ' + error.message);
    cargar();
  };

  // ---------- Checklist ----------
  const agregarItemChecklist = () => {
    if (!nuevoItem.trim()) return;
    setChecklist([...checklist, { item: nuevoItem.trim(), ok: false, nota: '' }]);
    setNuevoItem('');
  };

  const toggleItemChecklist = (idx) => {
    const nuevos = [...checklist];
    nuevos[idx] = { ...nuevos[idx], ok: !nuevos[idx].ok };
    setChecklist(nuevos);
  };

  const updateNotaChecklist = (idx, nota) => {
    const nuevos = [...checklist];
    nuevos[idx] = { ...nuevos[idx], nota };
    setChecklist(nuevos);
  };

  const eliminarItemChecklist = (idx) => {
    setChecklist(checklist.filter((_, i) => i !== idx));
  };

  // ---------- Fotos ----------
  const subirFoto = async (file) => {
    if (!file) return;
    setUploadingFoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `visitas/${visitaId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      setFotos([...fotos, urlData.publicUrl]);
    } catch (err) {
      alert('Error subiendo foto: ' + err.message);
    } finally {
      setUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const eliminarFoto = (idx) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    setFotos(fotos.filter((_, i) => i !== idx));
  };

  // ---------- Firma ----------
  const limpiarFirma = () => {
    sigCanvasRef.current?.clear();
  };

  // ---------- Guardar ----------
  const guardar = async () => {
    setSaving(true);
    try {
      // Capturar firma como base64 si hay algo dibujado
      let firmaBase64 = visita.firma_cliente || null;
      if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
        firmaBase64 = sigCanvasRef.current.toDataURL('image/png');
      }

      const payload = {
        trabajo_realizado: trabajoRealizado || null,
        observaciones: observaciones || null,
        hora_inicio: horaInicio || null,
        hora_fin: horaFin || null,
        estado,
        checklist: checklist,
        fotos: fotos,
        firma_cliente: firmaBase64,
        firma_cliente_nombre: firmaNombre || null,
      };

      const { error } = await supabase
        .from('visitas')
        .update(payload)
        .eq('id_visita', visitaId);
      if (error) throw error;
      await cargar();
      alert('Visita guardada');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const descargarPDF = async () => {
    try {
      const { data: empresa } = await supabase
        .from('configuracion_empresa')
        .select('*')
        .eq('id', 1)
        .single();
      const visitaParaPDF = construirVisitaParaPDF();
      generarPDFVisita(visitaParaPDF, empresa);
    } catch (err) {
      alert('Error generando PDF: ' + err.message);
    }
  };

  const construirVisitaParaPDF = () => ({
    ...visita,
    trabajo_realizado: trabajoRealizado,
    observaciones,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    checklist,
    fotos,
    firma_cliente: sigCanvasRef.current && !sigCanvasRef.current.isEmpty()
      ? sigCanvasRef.current.toDataURL('image/png')
      : visita.firma_cliente,
    firma_cliente_nombre: firmaNombre,
  });

  const abrirEnvioCorreo = async () => {
    try {
      const { data: empresa } = await supabase.from('configuracion_empresa').select('*').eq('id', 1).single();
      const visitaParaPDF = construirVisitaParaPDF();
      const { blob, nombre } = generarPDFVisita(visitaParaPDF, empresa, { soloBlob: true });
      setPdfBlobCorreo(blob);
      setPdfNombreCorreo(nombre);
      setShowCorreo(true);
    } catch (err) {
      alert('Error preparando envío: ' + err.message);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={visita ? `Visita ${visita.numero_visita}` : 'Cargando...'}
      size="full"
    >
      {loading || !visita ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        <div className="space-y-6">
          {/* Encabezado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 uppercase">Cliente</div>
              <div className="font-semibold">{visita.cliente_nombre}</div>
              <div className="text-xs text-gray-500 font-mono">{visita.numero_cliente}</div>
              {visita.cliente_telefono && <div className="text-xs text-gray-600">📞 {visita.cliente_telefono}</div>}
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Tipo · Fecha</div>
              <div className="font-semibold">{TIPOS_VISITA_LABEL[visita.tipo_visita]}</div>
              <div className="text-xs text-gray-500">{formatDate(visita.fecha_visita)}</div>
              {visita.tecnico_nombre && (
                <div className="text-xs text-gray-600">👷 {visita.tecnico_nombre}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Estado</div>
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                <span className={`inline-flex px-2 py-1 rounded text-sm border ${ESTADOS_VISITA_COLOR[estado]}`}>
                  {ESTADOS_VISITA_LABEL[estado]}
                </span>
                {Number(visita.costo_visita) > 0 && (
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${ESTADO_PAGO_COLOR[visita.estado_pago]}`}>
                    {ESTADO_PAGO_LABEL[visita.estado_pago]}
                  </span>
                )}
              </div>
              {puedeEditar && (
                <select
                  value={estado}
                  onChange={e => setEstado(e.target.value)}
                  className="mt-2 text-xs border border-gray-300 rounded px-2 py-1 w-full"
                >
                  {Object.entries(ESTADOS_VISITA_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Motivo */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Motivo / Solicitud</h3>
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
              {visita.motivo}
            </div>
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hora inicio"
              type="time"
              value={horaInicio}
              onChange={e => setHoraInicio(e.target.value)}
              disabled={!puedeEditar}
            />
            <Input
              label="Hora fin"
              type="time"
              value={horaFin}
              onChange={e => setHoraFin(e.target.value)}
              disabled={!puedeEditar}
            />
          </div>

          {/* Costo de la visita - editable inline */}
          {puedeEditar && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">Costo de la visita</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <Input
                  label="Monto (Inc. ITBMS)"
                  type="number" step="0.01" min="0"
                  value={costoVisita}
                  onChange={e => setCostoVisita(e.target.value)}
                />
                <Select
                  label="ITBMS"
                  value={costoItbms}
                  onChange={e => setCostoItbms(e.target.value)}
                >
                  {TASAS_ITBMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Button
                  size="sm"
                  onClick={guardarCosto}
                  loading={savingCosto}
                  disabled={
                    Number(costoVisita) === Number(visita.costo_visita) &&
                    Number(costoItbms) === Number(visita.costo_itbms_pct ?? 7)
                  }
                >
                  Guardar costo
                </Button>
              </div>
              {Number(visita.costo_visita) > 0 && (
                <div className="text-xs text-amber-800 mt-2 grid grid-cols-3 gap-2 bg-white p-2 rounded border border-amber-200">
                  <div>
                    <span className="text-amber-600">Subtotal:</span>{' '}
                    <span className="font-semibold">{formatCurrency(visita.subtotal_sin_itbms)}</span>
                  </div>
                  <div>
                    <span className="text-amber-600">ITBMS {visita.costo_itbms_pct}%:</span>{' '}
                    <span className="font-semibold">{formatCurrency(visita.monto_itbms)}</span>
                  </div>
                  <div>
                    <span className="text-amber-600">Total:</span>{' '}
                    <span className="font-bold">{formatCurrency(visita.costo_visita)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sección de pagos integrada */}
          {puedeEditar && Number(visita.costo_visita) > 0 && (
            <PagosSection
              tipo="VISITA"
              userId={profile?.id}
              documento={{
                id: visita.id_visita,
                id_cliente: visita.id_cliente,
                numero: visita.numero_visita,
                cliente_nombre: visita.cliente_nombre,
                total: visita.costo_visita,
                pagado: visita.total_pagado,
                saldo: visita.saldo_pendiente,
                estado_pago: visita.estado_pago,
                descripcion: visita.motivo,
              }}
              onChanged={cargar}
            />
          )}

          {/* Trabajo realizado */}
          <Textarea
            label="Trabajo realizado"
            value={trabajoRealizado}
            onChange={e => setTrabajoRealizado(e.target.value)}
            rows={3}
            disabled={!puedeEditar}
            placeholder="Describe qué se hizo en sitio..."
          />

          {/* Checklist */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Checklist de revisión</h3>
            {puedeEditar && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Nuevo punto a revisar..."
                  value={nuevoItem}
                  onChange={e => setNuevoItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarItemChecklist())}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Button size="sm" onClick={agregarItemChecklist} type="button">
                  <Plus className="h-4 w-4" /> Añadir
                </Button>
              </div>
            )}
            {checklist.length === 0 ? (
              <div className="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded">Sin items en checklist</div>
            ) : (
              <div className="space-y-2 border rounded p-3 bg-white">
                {checklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <button
                      onClick={() => puedeEditar && toggleItemChecklist(idx)}
                      disabled={!puedeEditar}
                      className="mt-1 shrink-0"
                      type="button"
                    >
                      {item.ok
                        ? <CheckSquare className="h-5 w-5 text-emerald-600" />
                        : <Square className="h-5 w-5 text-gray-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${item.ok ? 'line-through text-gray-500' : ''}`}>{item.item}</div>
                      {puedeEditar ? (
                        <input
                          type="text"
                          placeholder="Nota (opcional)"
                          value={item.nota || ''}
                          onChange={e => updateNotaChecklist(idx, e.target.value)}
                          className="text-xs w-full mt-1 px-2 py-1 border border-gray-200 rounded"
                        />
                      ) : (
                        item.nota && <div className="text-xs text-gray-500 mt-0.5 italic">{item.nota}</div>
                      )}
                    </div>
                    {puedeEditar && (
                      <button
                        onClick={() => eliminarItemChecklist(idx)}
                        type="button"
                        className="text-gray-400 hover:text-red-600 mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fotos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Fotos ({fotos.length})</h3>
              {puedeEditar && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={e => e.target.files?.[0] && subirFoto(e.target.files[0])}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploadingFoto}
                    type="button"
                  >
                    <Camera className="h-4 w-4" /> Agregar foto
                  </Button>
                </>
              )}
            </div>
            {fotos.length === 0 ? (
              <div className="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded">Sin fotos</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {fotos.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <a href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-32 object-cover rounded border" />
                    </a>
                    {puedeEditar && (
                      <button
                        onClick={() => eliminarFoto(idx)}
                        type="button"
                        className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <Textarea
            label="Observaciones / Recomendaciones"
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            rows={2}
            disabled={!puedeEditar}
            placeholder="Recomendaciones, notas adicionales..."
          />

          {/* Firma */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Firma del cliente</h3>
            <div className="space-y-2">
              <Input
                label="Nombre de quien firma"
                value={firmaNombre}
                onChange={e => setFirmaNombre(e.target.value)}
                disabled={!puedeEditar}
                placeholder="Nombre completo"
              />
              <div className="border-2 border-dashed border-gray-300 rounded bg-white">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  canvasProps={{
                    className: 'w-full h-40',
                    style: { width: '100%', height: '160px' },
                  }}
                  penColor="black"
                />
              </div>
              {puedeEditar && (
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={limpiarFirma} type="button">
                    <Eraser className="h-4 w-4" /> Limpiar firma
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <WhatsAppButton
              empresa={empresa}
              tipo="VISITA"
              documento={{
                numero: visita.numero_visita,
                cliente_nombre: visita.cliente_nombre,
                cliente_telefono: visita.cliente_telefono,
                total: visita.costo_visita,
              }}
            />
            <Button variant="outline" onClick={abrirEnvioCorreo} type="button" disabled={!visita?.cliente_correo}>
              <Mail className="h-4 w-4" /> Enviar por correo
            </Button>
            <Button variant="outline" onClick={descargarPDF} type="button">
              <FileDown className="h-4 w-4" /> Descargar PDF
            </Button>
            {puedeEditar && (
              <Button onClick={guardar} loading={saving} type="button">
                <Save className="h-4 w-4" /> Guardar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Modal de envío por correo */}
      {showCorreo && visita && (
        <EnviarCorreoModal
          open={showCorreo}
          onClose={() => setShowCorreo(false)}
          tipo="VISITA"
          documento={visita}
          cliente={{
            id_cliente: visita.id_cliente,
            nombre: visita.cliente_nombre,
            correo: visita.cliente_correo,
            telefono: visita.cliente_telefono,
          }}
          pdfBlob={pdfBlobCorreo}
          pdfNombre={pdfNombreCorreo}
          userId={profile?.id}
          userName={profile?.nombre_completo}
          referencias={{
            id_visita: visita.id_visita,
            id_cliente: visita.id_cliente,
          }}
        />
      )}
    </Modal>
  );
}
