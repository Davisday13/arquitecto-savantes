import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { formatDateTime } from '../lib/utils';

export default function NotificacionesView({ profile }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    supabase.from('notificaciones').select('*').eq('destinatario_id', profile.id)
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setNotifs(data || []); setLoading(false); });
  }, [profile?.id]);

  const marcarLeida = async (id) => {
    await supabase.from('notificaciones').update({ estado: 'LEIDA', leida_at: new Date().toISOString() }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, estado: 'LEIDA', leida_at: new Date().toISOString() } : n));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bell className="h-6 w-6 text-brand-700" /> Notificaciones</h1>
      <Card>
        {loading ? <div className="text-center py-8 text-gray-500">Cargando...</div> : notifs.length === 0 ? (
          <div className="text-center py-8 text-gray-500"><Bell className="h-12 w-12 mx-auto text-gray-300 mb-2" /><p>Sin notificaciones</p></div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg border ${n.estado === 'PENDIENTE' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                <div className={`p-1.5 rounded-full ${n.canal === 'EMAIL' ? 'bg-purple-100' : 'bg-brand-100'}`}>
                  {n.canal === 'EMAIL' ? <Mail className="h-4 w-4 text-purple-700" /> : <Bell className="h-4 w-4 text-brand-700" />}
                </div>
                <div className="flex-1 min-w-0">
                  {n.asunto && <div className="text-sm font-medium text-gray-900">{n.asunto}</div>}
                  <div className="text-sm text-gray-600">{n.mensaje}</div>
                  <div className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</div>
                </div>
                {n.estado === 'PENDIENTE' && (
                  <button onClick={() => marcarLeida(n.id)} className="p-1 hover:bg-green-100 rounded text-green-600" title="Marcar como le&iacute;da">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
                {n.estado === 'ENVIADA' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {n.estado === 'FALLIDA' && <XCircle className="h-4 w-4 text-red-500" />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
