import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import EnviarWhatsAppModal from './EnviarWhatsAppModal';

/**
 * Botón "Enviar por WhatsApp" reutilizable.
 *
 * Props:
 * - empresa: configuración de empresa (con código país y plantillas)
 * - tipo: 'ORDEN' | 'VISITA' | 'RECIBO' | 'PRESUPUESTO'
 * - documento: { numero, cliente_nombre, cliente_telefono, total }
 * - variant: 'button' (default) | 'icon' (solo icono pequeño)
 * - className: clases adicionales
 */
export default function WhatsAppButton({
  empresa, tipo, documento, variant = 'button', className = '',
}) {
  const [open, setOpen] = useState(false);

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Enviar por WhatsApp"
          className={`p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors ${className}`}
        >
          <MessageCircle className="h-4 w-4" />
        </button>
        {open && (
          <EnviarWhatsAppModal
            open={open}
            onClose={() => setOpen(false)}
            empresa={empresa}
            tipo={tipo}
            documento={documento}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors ${className}`}
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </button>
      {open && (
        <EnviarWhatsAppModal
          open={open}
          onClose={() => setOpen(false)}
          empresa={empresa}
          tipo={tipo}
          documento={documento}
        />
      )}
    </>
  );
}
