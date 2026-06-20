import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Campanita() {
  const { profile } = useAuth();
  const [count, setCount] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from('notificaciones').select('*', { count: 'exact', head: true }).eq('destinatario_id', profile.id).eq('estado', 'PENDIENTE')
      .then(({ count }) => setCount(count || 0));
    supabase.from('notificaciones').select('*').eq('destinatario_id', profile.id).eq('estado', 'PENDIENTE').order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setNotifs(data || []));
  }, [profile?.id]);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const irNotificaciones = () => { setOpen(false); navigate('/notificaciones'); };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-1.5 text-gray-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors">
        <Bell className="h-5 w-5" />
        {count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Notificaciones</span>
            <button onClick={irNotificaciones} className="text-xs text-brand-700 hover:underline">Ver todas</button>
          </div>
          {notifs.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Sin notificaciones pendientes</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {notifs.map(n => (
                <div key={n.id_notificacion} className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={irNotificaciones}>
                  <div className="text-sm font-medium text-gray-900">{n.titulo || 'Notificación'}</div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
