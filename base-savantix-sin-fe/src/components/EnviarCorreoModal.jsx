import React, { useState, useEffect } from 'react';
import { Mail, Send, AlertCircle, Check, Loader2 } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { supabase } from '../lib/supabase';
import {
  plantillaOrden, plantillaVisita, plantillaRecibo,
  plantillaPresupuesto, plantillaVentaDirecta,
} from '../lib/correoPlantillas';

/**
 * Modal reutilizable para enviar PDF por correo.
 *
 * Props:
 * - open / onClose: control del modal
 * - tipo: 'ORDEN' | 'VISITA' | 'RECIBO' | 'PRESUPUESTO' | 'VENTA_DIRECTA'
 * - documento: el objeto del documento (orden, visita, etc.) — usado en plantilla
 * - cliente: { nombre, correo, telefono, ... }
 * - pdfBlob: Blob del PDF generado (para adjuntar)
 * - pdfNombre: string — nombre del archivo (ej: "OT-1001.pdf")
 * - userId / userName: quien envía
 * - referencias: { id_orden, id_visita, id_pago, id_cliente } — para registrar log
 */
export default function EnviarCorreoModal({
  open, onClose, tipo, documento, cliente,
  pdfBlob, pdfNombre, userId, userName, referencias = {},
}) {
  const [empresa, setEmpresa] = useState({});
  const [destinatario, setDestinatario] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setResultado(null);

    // Cargar empresa
    supabase
      .from('configuracion_empresa')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEmpresa(data);
          armarMensaje(data);
        }
      });

    // Pre-llenar destinatario con el correo del cliente
    setDestinatario(cliente?.correo || '');
  }, [open, tipo, documento, cliente]);

  const armarMensaje = (emp) => {
    let html = '';
    let asuntoSugerido = '';

    switch (tipo) {
      case 'ORDEN':
        html = plantillaOrden({ empresa: emp, cliente, orden: documento });
        asuntoSugerido = `Orden de Taller ${documento.numero_ticket} — ${emp.nombre_empresa || 'Savante Solutions'}`;
        break;
      case 'VISITA':
        html = plantillaVisita({ empresa: emp, cliente, visita: documento });
        asuntoSugerido = `Reporte de Visita ${documento.numero_visita} — ${emp.nombre_empresa || 'Savante Solutions'}`;
        break;
      case 'RECIBO':
        html = plantillaRecibo({ empresa: emp, cliente, pago: documento });
        asuntoSugerido = `Recibo de Pago ${documento.numero_recibo} — ${emp.nombre_empresa || 'Savante Solutions'}`;
        break;
      case 'PRESUPUESTO':
        html = plantillaPresupuesto({ empresa: emp, cliente, presupuesto: documento });
        asuntoSugerido = `Presupuesto ${documento.numero_presupuesto} — ${emp.nombre_empresa || 'Savante Solutions'}`;
        break;
      case 'VENTA_DIRECTA':
        html = plantillaVentaDirecta({ empresa: emp, cliente, venta: documento });
        asuntoSugerido = `Comprobante de Venta — ${emp.nombre_empresa || 'Savante Solutions'}`;
        break;
      default:
        html = '';
        asuntoSugerido = `Documento — ${emp.nombre_empresa || 'Savante Solutions'}`;
    }

    setAsunto(asuntoSugerido);
    setMensaje(html);
  };

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1]; // Remove data:application/pdf;base64,
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const enviar = async () => {
    if (!destinatario || !destinatario.includes('@')) {
      setError('Ingresa un correo válido');
      return;
    }
    if (!pdfBlob) {
      setError('No se generó el PDF. Cierra y vuelve a abrir.');
      return;
    }

    setEnviando(true);
    setError('');
    setResultado(null);

    try {
      // 1. Convertir PDF a base64 para adjuntar
      const pdfBase64 = await blobToBase64(pdfBlob);

      // 2. Llamar a la Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('enviar-correo', {
        body: {
          to: destinatario,
          subject: asunto,
          html: mensaje,
          from_name: empresa.correo_remitente_nombre || 'Savantix',
          from_email: empresa.correo_remitente_email || 'notificaciones@savantesolutions.com',
          reply_to: empresa.correo_reply_to || empresa.correo || undefined,
          attachment_base64: pdfBase64,
          attachment_name: pdfNombre || 'documento.pdf',
        },
      });

      if (fnError) throw fnError;

      if (!data?.success) {
        throw new Error(data?.error || 'Error desconocido enviando');
      }

      // 3. Registrar log en BD
      await supabase.from('correos_log').insert({
        destinatario_email: destinatario,
        destinatario_nombre: cliente?.nombre || null,
        asunto,
        cuerpo_html: mensaje,
        tipo_documento: tipo,
        id_orden: referencias.id_orden || null,
        id_visita: referencias.id_visita || null,
        id_pago: referencias.id_pago || null,
        id_cliente: referencias.id_cliente || cliente?.id_cliente || null,
        documento_referencia: documento?.numero_ticket || documento?.numero_visita ||
                              documento?.numero_recibo || documento?.numero_presupuesto ||
                              documento?.numero_venta || null,
        estado: 'ENVIADO',
        resend_id: data.resend_id || null,
        pdf_nombre: pdfNombre || null,
        pdf_size_kb: pdfBlob ? Math.round(pdfBlob.size / 1024 * 100) / 100 : null,
        enviado_por: userId || null,
        enviado_por_nombre: userName || null,
      });

      setResultado({ success: true, message: '¡Correo enviado correctamente!' });

      // Cerrar después de 1.5 segundos
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      // Registrar log fallido también
      await supabase.from('correos_log').insert({
        destinatario_email: destinatario,
        destinatario_nombre: cliente?.nombre || null,
        asunto,
        cuerpo_html: mensaje,
        tipo_documento: tipo,
        id_orden: referencias.id_orden || null,
        id_visita: referencias.id_visita || null,
        id_pago: referencias.id_pago || null,
        id_cliente: referencias.id_cliente || cliente?.id_cliente || null,
        estado: 'FALLIDO',
        error_mensaje: err.message || 'Error desconocido',
        enviado_por: userId || null,
        enviado_por_nombre: userName || null,
      });

      setError(err.message || 'No se pudo enviar el correo');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Enviar ${pdfNombre || 'documento'} por correo`} size="lg">
      <div className="space-y-4">
        {/* Estado de éxito */}
        {resultado?.success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-emerald-700 font-medium">{resultado.message}</span>
          </div>
        )}

        {/* Errores */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-red-700 font-medium">Error al enviar</div>
              <div className="text-xs text-red-600 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Destinatario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destinatario *
          </label>
          <Input
            type="email"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            placeholder="cliente@ejemplo.com"
            disabled={enviando}
          />
          {cliente?.correo && (
            <p className="text-xs text-gray-500 mt-1">
              Pre-llenado con el correo del cliente. Puedes cambiarlo si necesitas.
            </p>
          )}
        </div>

        {/* Asunto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asunto
          </label>
          <Input
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            disabled={enviando}
          />
        </div>

        {/* Vista previa del mensaje */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vista previa del mensaje
          </label>
          <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-xs text-gray-500">
              Así se verá el correo en la bandeja del destinatario:
            </div>
            <div
              className="max-h-72 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: mensaje }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            El mensaje incluye los datos de la empresa configurados en{' '}
            <strong>Empresa → Documentos PDF</strong>.
          </p>
        </div>

        {/* Adjunto */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">Archivo adjunto:</span>
            <span className="text-blue-700">{pdfNombre || 'documento.pdf'}</span>
            {pdfBlob && (
              <span className="text-xs text-blue-600">
                ({Math.round(pdfBlob.size / 1024)} KB)
              </span>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} type="button" disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={enviar}
            disabled={enviando || !destinatario || resultado?.success}
          >
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Enviar correo
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
