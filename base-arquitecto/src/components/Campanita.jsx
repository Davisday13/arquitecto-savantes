import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Campanita({ profile, setCurrentView }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    const cargar = async () => {
      const { count: c } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('destinatario_id', profile.id)
        .eq('estado', 'PENDIENTE');
      setCount(c || 0);
    };
    cargar();
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  return (
    <button
      onClick={() => setCurrentView?.('notificaciones')}
      className="relative p-1.5 rounded-md text-white hover:bg-brand-600"
      title="Notificaciones"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
