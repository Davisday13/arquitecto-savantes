import React, { useState, useRef } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';

export default function EnviarCorreoModal({ open, onClose, tipo, documento, cliente, pdfBlob, pdfNombre, userId, userName, referencias }) {
  const [correo, setCorreo] = useState(cliente?.correo || '');
  const [asunto, setAsunto] = useState(`Documento ${tipo} - ${documento?.numero || ''}`);
  const [mensaje, setMensaje] = useState(`Hola ${cliente?.nombre || ''},\n\nAdjunto encontrará el documento ${tipo} ${documento?.numero || ''}.\n\nSaludos cordiales.`);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const enviar = async () => {
    setSaving(true);
    setSuccess('');
    try {
      // In a real implementation, this would call a Supabase Edge Function
      // For now, we simulate success and log to console
      console.log('Enviando correo:', { para: correo, asunto, mensaje, tipo, documento: documento?.numero });
      setSuccess('Correo encolado para env\u00edo');
      setTimeout(() => { onClose(); }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Enviar por correo" size="lg">
      <div className="space-y-3">
        {success && <div className="bg-emerald-50 text-emerald-700 p-3 rounded text-sm">{success}</div>}
        <Input label="Para" type="email" value={correo} onChange={e => setCorreo(e.target.value)} />
        <Input label="Asunto" value={asunto} onChange={e => setAsunto(e.target.value)} />
        <Textarea label="Mensaje" value={mensaje} onChange={e => setMensaje(e.target.value)} rows={4} />
        <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
          <strong>Adjunto:</strong> {pdfNombre || `${tipo}_${documento?.numero || ''}.pdf`}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={enviar} loading={saving}><MailIcon /> Enviar</Button>
        </div>
      </div>
    </Modal>
  );
}

function MailIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
