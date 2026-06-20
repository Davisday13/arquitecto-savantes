import React, { useState, useEffect } from 'react';
import { MessageCircle, AlertCircle, ExternalLink, RotateCcw } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Textarea } from './ui/Input';
import {
  abrirWhatsApp,
  aplicarVariables,
  getPlantilla,
  PLANTILLAS_DEFAULT,
  formatearTelefonoUI,
} from '../lib/whatsapp';
import { formatCurrency } from '../lib/utils';

/**
 * Modal de envío por WhatsApp.
 *
 * Props:
 * - open / onClose
 * - empresa: para tomar el código país y plantillas custom
 * - tipo: 'ORDEN' | 'VISITA' | 'RECIBO' | 'PRESUPUESTO'
 * - documento: { numero, cliente_nombre, cliente_telefono, total }
 */
export default function EnviarWhatsAppModal({
  open, onClose, empresa, tipo, documento,
}) {
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!open || !documento) return;

    // Pre-llenar teléfono del cliente
    setTelefono(formatearTelefonoUI(documento.cliente_telefono || ''));

    // Pre-llenar mensaje con la plantilla
    const plantilla = getPlantilla(tipo, empresa);
    const mensajeInicial = aplicarVariables(plantilla, {
      cliente: documento.cliente_nombre || '',
      numero: documento.numero || '',
      empresa: empresa?.nombre_empresa || 'Savante Solutions',
      total: documento.total != null ? formatCurrency(documento.total) : '',
      link: documento.link || '',
    });

    setMensaje(mensajeInicial);
  }, [open, documento, tipo, empresa]);

  const restaurarPlantilla = () => {
    const plantilla = getPlantilla(tipo, empresa);
    setMensaje(aplicarVariables(plantilla, {
      cliente: documento.cliente_nombre || '',
      numero: documento.numero || '',
      empresa: empresa?.nombre_empresa || 'Savante Solutions',
      total: documento.total != null ? formatCurrency(documento.total) : '',
      link: documento.link || '',
    }));
  };

  const enviar = () => {
    if (!telefono.trim()) return;
    if (!mensaje.trim()) return;

    const codigoPais = empresa?.whatsapp_pais_codigo || '507';
    abrirWhatsApp(telefono, mensaje, codigoPais);
    onClose();
  };

  if (!documento) return null;

  return (
    <Modal open={open} onClose={onClose} title="Enviar por WhatsApp" size="md">
      <div className="space-y-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3 flex items-start gap-2 text-sm text-emerald-800">
          <MessageCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            Al hacer click en "Abrir en WhatsApp", se abrirá la app/web de WhatsApp con el mensaje listo. <strong>Tú le das Enviar manualmente</strong> al cliente.
          </div>
        </div>

        {!documento.cliente_telefono && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800">
              Este cliente no tiene teléfono registrado. Ingresa uno para enviar.
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número del destinatario *
          </label>
          <div className="flex gap-2">
            <div className="bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 flex items-center">
              +{empresa?.whatsapp_pais_codigo || '507'}
            </div>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="6992-1184"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Sin espacios ni guiones también funciona. Ej: 69921184
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Mensaje
            </label>
            <button
              type="button"
              onClick={restaurarPlantilla}
              className="text-xs text-brand-700 hover:text-brand-900 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Restaurar plantilla
            </button>
          </div>
          <Textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={9}
            placeholder="Escribe el mensaje..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Las plantillas se pueden personalizar desde Configuración → Empresa → WhatsApp
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={enviar}
            disabled={!telefono.trim() || !mensaje.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ExternalLink className="h-4 w-4" /> Abrir en WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  );
}
