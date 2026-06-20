import React from 'react';
import { Mail } from 'lucide-react';

export default function CorreosLogView() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Mail className="h-6 w-6 text-brand-700" /> Correos enviados</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center text-gray-500">
        <Mail className="h-12 w-12 mx-auto text-gray-300 mb-2" />
        <p className="text-lg font-medium">Historial de correos</p>
        <p className="text-sm">M&oacute;dulo en construcci&oacute;n. Aqu&iacute; podr&aacute;s ver el registro de todos los correos enviados desde el sistema.</p>
      </div>
    </div>
  );
}
