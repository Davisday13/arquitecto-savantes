import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, FileText, Wrench, RefreshCcw, Plus, Trash2, Bell, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import VisitaDetalleModal from './VisitaDetalleModal';
import PresupuestoDetalleModal from './PresupuestoDetalleModal';
import OrdenDetalleModal from './OrdenDetalleModal';

export default function CalendarioView({ profile }) {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [vista, setVista] = useState('mes');
  const [visitas, setVisitas] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [recordatorios, setRecordatorios] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [visitaId, setVisitaId] = useState(null);
  const [presupuestoId, setPresupuestoId] = useState(null);
  const [ordenId, setOrdenId] = useState(null);

  const [showRecordatorio, setShowRecordatorio] = useState(false);
  const [editRecordatorio, setEditRecordatorio] = useState(null);

  const [mostrarVisitas, setMostrarVisitas] = useState(true);
  const [mostrarPresupuestos, setMostrarPresupuestos] = useState(true);
  const [mostrarOrdenes, setMostrarOrdenes] = useState(true);
  const [mostrarRecordatorios, setMostrarRecordatorios] = useState(true);
  const [filtroTecnico, setFiltroTecnico] = useState('');

  // 🆕 v8.9 — Filtro para ocultar recordatorios completados (persiste en localStorage)
  const [ocultarCompletados, setOcultarCompletados] = useState(() => {
    return localStorage.getItem('cal_ocultar_completados') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('cal_ocultar_completados', ocultarCompletados ? 'true' : 'false');
  }, [ocultarCompletados]);

  const [draggingVisita, setDraggingVisita] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const { inicio, fin } = rangoSegunVista(fechaActual, vista);
    const inicioStr = inicio.toISOString().split('T')[0];
    const finStr = fin.toISOString().split('T')[0];

    try {
      const [visRes, presupRes, ordRes, recRes, tecRes] = await Promise.all([
        supabase.from('v_visitas_completa')
          .select('id_visita, numero_visita, fecha_visita, hora_inicio, hora_fin, estado, cliente_nombre, tipo_visita, tecnico_nombre, id_tecnico')
          .gte('fecha_visita', inicioStr).lte('fecha_visita', finStr).order('fecha_visita'),
        supabase.from('v_presupuestos_completa')
          .select('id_presupuesto, numero_presupuesto, fecha_validez, estado, cliente_nombre, total_general')
          .in('estado', ['ENVIADO', 'BORRADOR'])
          .gte('fecha_validez', inicioStr).lte('fecha_validez', finStr).order('fecha_validez'),
        supabase.from('v_ordenes_completa')
          .select('id_orden, numero_ticket, fecha_diagnostico_prometida, estado, cliente_nombre, tipo_equipo, id_tecnico_asignado')
          .not('fecha_diagnostico_prometida', 'is', null)
          .gte('fecha_diagnostico_prometida', inicioStr).lte('fecha_diagnostico_prometida', finStr).order('fecha_diagnostico_prometida'),
        supabase.from('recordatorios').select('*')
          .gte('fecha', inicioStr).lte('fecha', finStr).order('fecha'),
        supabase.from('usuarios').select('id, nombre_completo, rol')
          .in('rol', ['TECNICO', 'ADMIN', 'ROOT']).eq('activo', true),
      ]);

      setVisitas(visRes.data || []);
      setPresupuestos(presupRes.data || []);
      setOrdenes(ordRes.data || []);
      setRecordatorios(recRes.data || []);
      setTecnicos(tecRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [fechaActual, vista]);

  // 🆕 v8.9 — Toggle completado con optimistic update
  const toggleRecordatorioCompletado = async (recordatorio) => {
    if (!profile?.id) {
      alert('Sesión no válida. Recarga la página.');
      return;
    }
    const nuevoEstado = !recordatorio.completado;
    const ahora = new Date().toISOString();

    // Optimistic update local
    setRecordatorios(prev => prev.map(r =>
      r.id_recordatorio === recordatorio.id_recordatorio
        ? {
            ...r,
            completado: nuevoEstado,
            fecha_completado: nuevoEstado ? ahora : null,
            completado_por: nuevoEstado ? profile.id : null,
          }
        : r
    ));

    const updates = nuevoEstado
      ? { completado: true, fecha_completado: ahora, completado_por: profile.id }
      : { completado: false, fecha_completado: null, completado_por: null };

    const { error } = await supabase
      .from('recordatorios')
      .update(updates)
      .eq('id_recordatorio', recordatorio.id_recordatorio);

    if (error) {
      // Revertir si falla
      setRecordatorios(prev => prev.map(r =>
        r.id_recordatorio === recordatorio.id_recordatorio
          ? {
              ...r,
              completado: recordatorio.completado,
              fecha_completado: recordatorio.fecha_completado,
              completado_por: recordatorio.completado_por,
            }
          : r
      ));
      alert('No se pudo actualizar el recordatorio: ' + error.message);
    }
  };

  const eventosPorDia = useMemo(() => {
    const map = {};
    const addEvento = (fechaStr, evento) => {
      if (filtroTecnico && evento.id_tecnico && evento.id_tecnico !== filtroTecnico) return;
      if (!map[fechaStr]) map[fechaStr] = [];
      map[fechaStr].push(evento);
    };

    if (mostrarVisitas) {
      visitas.forEach(v => addEvento(v.fecha_visita, {
        id: v.id_visita, tipo: 'VISITA', numero: v.numero_visita,
        titulo: v.cliente_nombre, subtitulo: v.tipo_visita || 'Visita técnica',
        hora_inicio: v.hora_inicio, hora_fin: v.hora_fin, estado: v.estado,
        id_tecnico: v.id_tecnico, tecnico_nombre: v.tecnico_nombre,
      }));
    }
    if (mostrarPresupuestos) {
      presupuestos.forEach(p => addEvento(p.fecha_validez, {
        id: p.id_presupuesto, tipo: 'PRESUPUESTO', numero: p.numero_presupuesto,
        titulo: p.cliente_nombre, subtitulo: `Vence — USD ${Number(p.total_general).toFixed(2)}`,
        estado: p.estado,
      }));
    }
    if (mostrarOrdenes) {
      ordenes.forEach(o => addEvento(o.fecha_diagnostico_prometida, {
        id: o.id_orden, tipo: 'ORDEN', numero: o.numero_ticket,
        titulo: o.cliente_nombre, subtitulo: `Diagnóstico — ${o.tipo_equipo || 'equipo'}`,
        estado: o.estado, id_tecnico: o.id_tecnico_asignado,
      }));
    }
    if (mostrarRecordatorios) {
      recordatorios.forEach(r => {
        // 🆕 v8.9 — Filtrar completados si está activo el toggle
        if (ocultarCompletados && r.completado) return;
        addEvento(r.fecha, {
          id: r.id_recordatorio, tipo: 'RECORDATORIO', numero: '🔔',
          titulo: r.titulo, subtitulo: r.descripcion || '',
          hora_inicio: r.hora, color: r.color, id_tecnico: r.id_tecnico,
          completado: r.completado,
          fecha_completado: r.fecha_completado,
          recordatorioRaw: r,
        });
      });
    }
    return map;
  }, [visitas, presupuestos, ordenes, recordatorios, mostrarVisitas, mostrarPresupuestos, mostrarOrdenes, mostrarRecordatorios, filtroTecnico, ocultarCompletados]);

  const navegarAtras = () => {
    const nueva = new Date(fechaActual);
    if (vista === 'mes') nueva.setMonth(nueva.getMonth() - 1);
    else if (vista === 'semana') nueva.setDate(nueva.getDate() - 7);
    else nueva.setDate(nueva.getDate() - 1);
    setFechaActual(nueva);
  };

  const navegarAdelante = () => {
    const nueva = new Date(fechaActual);
    if (vista === 'mes') nueva.setMonth(nueva.getMonth() + 1);
    else if (vista === 'semana') nueva.setDate(nueva.getDate() + 7);
    else nueva.setDate(nueva.getDate() + 1);
    setFechaActual(nueva);
  };

  const irAHoy = () => setFechaActual(new Date());

  const abrirEvento = (evento) => {
    if (evento.tipo === 'VISITA') setVisitaId(evento.id);
    else if (evento.tipo === 'PRESUPUESTO') setPresupuestoId(evento.id);
    else if (evento.tipo === 'ORDEN') setOrdenId(evento.id);
    else if (evento.tipo === 'RECORDATORIO') {
      setEditRecordatorio(evento.recordatorioRaw);
      setShowRecordatorio(true);
    }
  };

  const handleDragStart = (evento, e) => {
    if (evento.tipo !== 'VISITA') { e.preventDefault(); return; }
    setDraggingVisita(evento);
  };
  const handleDragOver = (e) => { if (draggingVisita) e.preventDefault(); };
  const handleDrop = async (fechaNueva, e) => {
    e.preventDefault();
    if (!draggingVisita) return;
    const fechaStr = fechaNueva.toISOString().split('T')[0];
    const visitaActual = visitas.find(v => v.id_visita === draggingVisita.id);
    if (!visitaActual || visitaActual.fecha_visita === fechaStr) {
      setDraggingVisita(null); return;
    }
    if (!confirm(`¿Reagendar la visita ${draggingVisita.numero} de ${visitaActual.fecha_visita} a ${fechaStr}?`)) {
      setDraggingVisita(null); return;
    }
    const { error } = await supabase.from('visitas').update({ fecha_visita: fechaStr }).eq('id_visita', draggingVisita.id);
    if (error) alert('Error: ' + error.message);
    else cargar();
    setDraggingVisita(null);
  };

  const totalEventos = visitas.length + presupuestos.length + ordenes.length + recordatorios.length;

  // 🆕 v8.9 — Conteo de recordatorios pendientes vs completados (para info)
  const recordatoriosPendientes = recordatorios.filter(r => !r.completado).length;
  const recordatoriosCompletados = recordatorios.filter(r => r.completado).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-brand-700" /> Calendario
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalEventos} evento{totalEventos !== 1 ? 's' : ''} en este rango
            {filtroTecnico && ' · filtrado por técnico'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex bg-gray-100 rounded-md p-1">
            {['mes', 'semana', 'dia'].map(v => (
              <button key={v} onClick={() => setVista(v)}
                className={`px-3 py-1 text-sm rounded ${vista === v ? 'bg-white shadow-sm font-medium text-brand-700' : 'text-gray-600 hover:text-gray-900'}`}>
                {v === 'mes' ? 'Mes' : v === 'semana' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={navegarAtras}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={irAHoy}>Hoy</Button>
          <Button variant="outline" onClick={navegarAdelante}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => { setEditRecordatorio(null); setShowRecordatorio(true); }}>
            <Plus className="h-4 w-4" /> Recordatorio
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-700 mr-1">Mostrar:</span>
            <FiltroChip activo={mostrarVisitas} onClick={() => setMostrarVisitas(!mostrarVisitas)} color="blue" icon={MapPin} label={`Visitas (${visitas.length})`} />
            <FiltroChip activo={mostrarPresupuestos} onClick={() => setMostrarPresupuestos(!mostrarPresupuestos)} color="red" icon={FileText} label={`Presupuestos (${presupuestos.length})`} />
            <FiltroChip activo={mostrarOrdenes} onClick={() => setMostrarOrdenes(!mostrarOrdenes)} color="emerald" icon={Wrench} label={`Órdenes (${ordenes.length})`} />
            <FiltroChip activo={mostrarRecordatorios} onClick={() => setMostrarRecordatorios(!mostrarRecordatorios)} color="amber" icon={Bell} label={`Recordatorios (${recordatoriosPendientes}/${recordatorios.length})`} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {tecnicos.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">Técnico:</span>
                <select value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1">
                  <option value="">Todos</option>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
                </select>
              </div>
            )}
            {/* 🆕 v8.9 — Toggle ocultar recordatorios completados */}
            {mostrarRecordatorios && recordatoriosCompletados > 0 && (
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none px-2 py-1 rounded hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={ocultarCompletados}
                  onChange={(e) => setOcultarCompletados(e.target.checked)}
                  className="rounded border-gray-300 text-brand-700 focus:ring-brand-700 focus:ring-offset-0"
                />
                <span className="text-gray-700">
                  Ocultar completados ({recordatoriosCompletados})
                </span>
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {vista === 'mes' && <VistaMes fechaActual={fechaActual} eventosPorDia={eventosPorDia} onAbrirEvento={abrirEvento} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onToggleCompletado={toggleRecordatorioCompletado} />}
      {vista === 'semana' && <VistaSemana fechaActual={fechaActual} eventosPorDia={eventosPorDia} onAbrirEvento={abrirEvento} onToggleCompletado={toggleRecordatorioCompletado} />}
      {vista === 'dia' && <VistaDia fechaActual={fechaActual} eventosPorDia={eventosPorDia} onAbrirEvento={abrirEvento} onToggleCompletado={toggleRecordatorioCompletado} />}

      {visitaId && <VisitaDetalleModal open={!!visitaId} onClose={() => { setVisitaId(null); cargar(); }} visitaId={visitaId} profile={profile} />}
      {presupuestoId && <PresupuestoDetalleModal open={!!presupuestoId} onClose={() => { setPresupuestoId(null); cargar(); }} presupuestoId={presupuestoId} profile={profile} />}
      {ordenId && <OrdenDetalleModal open={!!ordenId} onClose={() => { setOrdenId(null); cargar(); }} ordenId={ordenId} profile={profile} />}
      {showRecordatorio && <RecordatorioFormModal open={showRecordatorio} onClose={() => { setShowRecordatorio(false); setEditRecordatorio(null); cargar(); }} recordatorio={editRecordatorio} profile={profile} tecnicos={tecnicos} />}
    </div>
  );
}

function VistaMes({ fechaActual, eventosPorDia, onAbrirEvento, onDragStart, onDragOver, onDrop, onToggleCompletado }) {
  const grillaDias = useMemo(() => {
    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    let diaSemanaInicio = primerDia.getDay();
    diaSemanaInicio = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;
    const dias = [];
    for (let i = diaSemanaInicio; i > 0; i--) dias.push({ fecha: new Date(año, mes, 1 - i), esDelMes: false });
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push({ fecha: new Date(año, mes, i), esDelMes: true });
    while (dias.length % 7 !== 0) {
      const d = new Date(dias[dias.length - 1].fecha);
      d.setDate(d.getDate() + 1);
      dias.push({ fecha: d, esDelMes: false });
    }
    return dias;
  }, [fechaActual]);

  const hoy = new Date();
  const mesNombre = fechaActual.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 capitalize">{mesNombre}</h2>
        </div>
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="px-2 py-2 text-xs font-semibold text-gray-600 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grillaDias.map(({ fecha, esDelMes }, idx) => {
            const fechaKey = fecha.toISOString().split('T')[0];
            const eventos = eventosPorDia[fechaKey] || [];
            const esHoy = esMismoDia(fecha, hoy);
            const esFinDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
            return (
              <div key={idx} onDragOver={onDragOver} onDrop={(e) => onDrop(fecha, e)}
                className={`border-r border-b min-h-[110px] p-1.5 ${!esDelMes ? 'bg-gray-50' : esFinDeSemana ? 'bg-gray-50/50' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${esHoy ? 'bg-brand-700 text-white px-1.5 py-0.5 rounded-full' : !esDelMes ? 'text-gray-400' : 'text-gray-700'}`}>
                    {fecha.getDate()}
                  </span>
                </div>
                <div className="space-y-1">
                  {eventos.slice(0, 3).map((ev, i) => (
                    <EventoChip key={i} evento={ev} onClick={() => onAbrirEvento(ev)} onDragStart={(e) => onDragStart(ev, e)} draggable={ev.tipo === 'VISITA'} onToggleCompletado={onToggleCompletado} />
                  ))}
                  {eventos.length > 3 && <div className="text-[10px] text-gray-500 text-center pt-0.5">+ {eventos.length - 3} más</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function VistaSemana({ fechaActual, eventosPorDia, onAbrirEvento, onToggleCompletado }) {
  const dias = useMemo(() => {
    const fecha = new Date(fechaActual);
    let diaSemana = fecha.getDay();
    diaSemana = diaSemana === 0 ? 6 : diaSemana - 1;
    fecha.setDate(fecha.getDate() - diaSemana);
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(fecha);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [fechaActual]);

  const horas = Array.from({ length: 17 }, (_, i) => i + 6);
  const hoy = new Date();
  const inicioStr = dias[0].toLocaleDateString('es-PA', { day: '2-digit', month: 'short' });
  const finStr = dias[6].toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Semana del {inicioStr} al {finStr}</h2>
        </div>
        <div className="grid grid-cols-8 border-b bg-gray-50">
          <div className="px-2 py-2 text-xs font-semibold text-gray-500 text-center border-r">Hora</div>
          {dias.map((d, i) => {
            const esHoy = esMismoDia(d, hoy);
            return (
              <div key={i} className={`px-2 py-2 text-center border-r ${esHoy ? 'bg-brand-50' : ''}`}>
                <div className="text-xs text-gray-500 uppercase">{d.toLocaleDateString('es-PA', { weekday: 'short' })}</div>
                <div className={`text-lg font-semibold ${esHoy ? 'text-brand-700' : 'text-gray-900'}`}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
          {horas.map(hora => (
            <div key={hora} className="grid grid-cols-8 border-b min-h-[50px]">
              <div className="px-2 py-1 text-xs text-gray-500 text-right border-r font-mono">{String(hora).padStart(2, '0')}:00</div>
              {dias.map((d, i) => {
                const fechaKey = d.toISOString().split('T')[0];
                const eventos = (eventosPorDia[fechaKey] || []).filter(ev => {
                  const horaEv = ev.hora_inicio ? parseInt(ev.hora_inicio.split(':')[0]) : null;
                  return horaEv === hora;
                });
                const eventosSinHora = hora === 8 ? (eventosPorDia[fechaKey] || []).filter(ev => !ev.hora_inicio) : [];
                const todos = [...eventosSinHora, ...eventos];
                return (
                  <div key={i} className="border-r p-1 space-y-1">
                    {todos.map((ev, j) => <EventoChipDetallado key={j} evento={ev} onClick={() => onAbrirEvento(ev)} onToggleCompletado={onToggleCompletado} />)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VistaDia({ fechaActual, eventosPorDia, onAbrirEvento, onToggleCompletado }) {
  const horas = Array.from({ length: 17 }, (_, i) => i + 6);
  const fechaKey = fechaActual.toISOString().split('T')[0];
  const eventosDelDia = eventosPorDia[fechaKey] || [];
  const fechaStr = fechaActual.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 capitalize">{fechaStr}</h2>
          <p className="text-xs text-gray-500">{eventosDelDia.length} evento{eventosDelDia.length !== 1 ? 's' : ''} en el día</p>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
          {horas.map(hora => {
            const eventosHora = eventosDelDia.filter(ev => {
              const h = ev.hora_inicio ? parseInt(ev.hora_inicio.split(':')[0]) : null;
              return h === hora;
            });
            const eventosSinHora = hora === 8 ? eventosDelDia.filter(ev => !ev.hora_inicio) : [];
            const todos = [...eventosSinHora, ...eventosHora];
            return (
              <div key={hora} className="grid grid-cols-12 border-b min-h-[60px]">
                <div className="col-span-2 lg:col-span-1 px-3 py-2 text-sm text-gray-500 text-right border-r font-mono">{String(hora).padStart(2, '0')}:00</div>
                <div className="col-span-10 lg:col-span-11 p-2 space-y-2">
                  {todos.map((ev, i) => <EventoChipDetallado key={i} evento={ev} onClick={() => onAbrirEvento(ev)} onToggleCompletado={onToggleCompletado} grande />)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RecordatorioFormModal({ open, onClose, recordatorio, profile, tecnicos }) {
  const editar = !!recordatorio;
  const [form, setForm] = useState({
    titulo: recordatorio?.titulo || '',
    descripcion: recordatorio?.descripcion || '',
    fecha: recordatorio?.fecha || new Date().toISOString().split('T')[0],
    hora: recordatorio?.hora || '',
    color: recordatorio?.color || '#f59e0b',
    id_tecnico: recordatorio?.id_tecnico || '',
    // 🆕 v8.9 — Estado de completado
    completado: recordatorio?.completado || false,
    fecha_completado: recordatorio?.fecha_completado || null,
    completado_por: recordatorio?.completado_por || null,
  });
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!form.titulo.trim()) return alert('Falta el título');
    setSaving(true);
    try {
      if (editar) {
        const { error } = await supabase.from('recordatorios').update({
          titulo: form.titulo, descripcion: form.descripcion || null,
          fecha: form.fecha, hora: form.hora || null,
          color: form.color, id_tecnico: form.id_tecnico || null,
          // 🆕 v8.9 — Persistir estado de completado
          completado: form.completado,
          fecha_completado: form.fecha_completado,
          completado_por: form.completado_por,
        }).eq('id_recordatorio', recordatorio.id_recordatorio);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('recordatorios').insert({
          titulo: form.titulo, descripcion: form.descripcion || null,
          fecha: form.fecha, hora: form.hora || null,
          color: form.color, id_tecnico: form.id_tecnico || null,
          created_by: profile?.id || null,
          // 🆕 v8.9 — Default completado=false al crear
          completado: false,
        });
        if (error) throw error;
      }
      onClose();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const eliminar = async () => {
    if (!editar || !confirm('¿Eliminar este recordatorio?')) return;
    const { error } = await supabase.from('recordatorios').delete().eq('id_recordatorio', recordatorio.id_recordatorio);
    if (error) return alert('Error: ' + error.message);
    onClose();
  };

  // 🆕 v8.9 — Toggle del checkbox dentro del modal
  const toggleCompletado = (e) => {
    const checked = e.target.checked;
    const ahora = new Date().toISOString();
    setForm({
      ...form,
      completado: checked,
      fecha_completado: checked ? ahora : null,
      completado_por: checked ? (profile?.id || null) : null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editar ? 'Editar recordatorio' : 'Nuevo recordatorio'}>
      <div className="space-y-3">
        <Input label="Título" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
        <Textarea label="Descripción (opcional)" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label="Fecha" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
          <Input type="time" label="Hora (opcional)" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1">Color</label>
            <div className="flex gap-2">
              {['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map(c => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full border-2 ${form.color === c ? 'border-gray-900' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          {tecnicos.length > 0 && (
            <Select label="Asignar a (opcional)" value={form.id_tecnico} onChange={e => setForm({ ...form, id_tecnico: e.target.value })}>
              <option value="">— Sin asignar —</option>
              {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
            </Select>
          )}
        </div>

        {/* 🆕 v8.9 — Checkbox "Marcar como realizado" (solo al editar) */}
        {editar && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-emerald-50 transition-colors border border-gray-200">
              <input
                type="checkbox"
                checked={form.completado}
                onChange={toggleCompletado}
                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  {form.completado ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                  Marcar como realizado
                </div>
                {form.completado && form.fecha_completado ? (
                  <div className="text-xs text-gray-500 mt-1">
                    Completado el {new Date(form.fecha_completado).toLocaleString('es-PA', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mt-1">
                    Marca esta casilla cuando hayas realizado este recordatorio
                  </div>
                )}
              </div>
            </label>
          </div>
        )}

        <div className="flex justify-between gap-2 pt-3 border-t">
          {editar ? (
            <Button variant="outline" onClick={eliminar} className="!text-red-600 !border-red-300">
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} loading={saving}>{editar ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function FiltroChip({ activo, onClick, color, icon: Icon, label }) {
  const colors = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  };
  const c = colors[color];
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all ${activo ? `${c.bg} ${c.text} ${c.border}` : 'bg-gray-100 text-gray-400 border-gray-200 line-through opacity-60'}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

// 🆕 v8.9 — Mini checkbox para marcar recordatorios completados
function RecordatorioMiniCheck({ evento, onToggleCompletado, size = 'xs' }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await onToggleCompletado(evento.recordatorioRaw);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = size === 'xs'
    ? 'w-3.5 h-3.5'
    : 'w-4 h-4';
  const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={evento.completado ? 'Marcar como pendiente' : 'Marcar como realizado'}
      className={`
        ${sizeClasses} flex-shrink-0
        flex items-center justify-center
        rounded border transition-all
        ${evento.completado
          ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
          : 'bg-white border-gray-400 hover:border-emerald-500 hover:bg-emerald-50'
        }
        ${loading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
      `}
    >
      {loading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : evento.completado ? (
        <Check className={iconSize} strokeWidth={3} />
      ) : null}
    </button>
  );
}

function EventoChip({ evento, onClick, onDragStart, draggable, onToggleCompletado }) {
  const config = {
    VISITA: { bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:bg-blue-200', dot: 'bg-blue-500' },
    PRESUPUESTO: { bg: 'bg-red-100', text: 'text-red-700', hover: 'hover:bg-red-200', dot: 'bg-red-500' },
    ORDEN: { bg: 'bg-emerald-100', text: 'text-emerald-700', hover: 'hover:bg-emerald-200', dot: 'bg-emerald-500' },
    RECORDATORIO: { bg: 'bg-amber-100', text: 'text-amber-700', hover: 'hover:bg-amber-200', dot: 'bg-amber-500' },
  };
  const c = config[evento.tipo] || config.VISITA;
  const tooltip = `${evento.numero} · ${evento.titulo}\n${evento.subtitulo}${evento.hora_inicio ? '\n' + evento.hora_inicio : ''}${evento.tecnico_nombre ? '\n👤 ' + evento.tecnico_nombre : ''}${evento.tipo === 'RECORDATORIO' && evento.completado ? '\n✅ Realizado' : ''}`;

  // 🆕 v8.9 — Estilo especial para recordatorios completados
  const esCompletado = evento.tipo === 'RECORDATORIO' && evento.completado;

  return (
    <div className={`flex items-center gap-1 ${esCompletado ? 'opacity-50' : ''}`}>
      {evento.tipo === 'RECORDATORIO' && onToggleCompletado && (
        <RecordatorioMiniCheck evento={evento} onToggleCompletado={onToggleCompletado} size="xs" />
      )}
      <button onClick={onClick} title={tooltip} draggable={draggable} onDragStart={onDragStart}
        className={`flex-1 min-w-0 text-left px-1.5 py-1 rounded text-[11px] ${c.bg} ${c.text} ${c.hover} truncate flex items-center gap-1 transition-colors ${draggable ? 'cursor-move' : ''} ${esCompletado ? 'line-through' : ''}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} style={evento.color ? { backgroundColor: evento.color } : {}}></span>
        <span className="font-medium truncate">{evento.numero}</span>
        <span className="truncate opacity-75">· {evento.titulo}</span>
      </button>
    </div>
  );
}

function EventoChipDetallado({ evento, onClick, grande, onToggleCompletado }) {
  const config = {
    VISITA: { bg: 'bg-blue-50 hover:bg-blue-100', border: 'border-blue-300', text: 'text-blue-900' },
    PRESUPUESTO: { bg: 'bg-red-50 hover:bg-red-100', border: 'border-red-300', text: 'text-red-900' },
    ORDEN: { bg: 'bg-emerald-50 hover:bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900' },
    RECORDATORIO: { bg: 'bg-amber-50 hover:bg-amber-100', border: 'border-amber-300', text: 'text-amber-900' },
  };
  const c = config[evento.tipo] || config.VISITA;

  // 🆕 v8.9 — Estilo especial para recordatorios completados
  const esCompletado = evento.tipo === 'RECORDATORIO' && evento.completado;

  return (
    <div className={`flex items-stretch gap-1 ${esCompletado ? 'opacity-50' : ''}`}>
      {evento.tipo === 'RECORDATORIO' && onToggleCompletado && (
        <div className="flex items-center pl-1">
          <RecordatorioMiniCheck evento={evento} onToggleCompletado={onToggleCompletado} size={grande ? 'sm' : 'xs'} />
        </div>
      )}
      <button onClick={onClick}
        className={`flex-1 min-w-0 text-left rounded border-l-4 ${c.border} ${c.bg} ${c.text} px-2 py-1.5 transition-colors ${esCompletado ? 'line-through' : ''}`}>
        <div className={`flex items-center gap-2 ${grande ? 'text-sm' : 'text-xs'} font-semibold`}>
          {evento.hora_inicio && (
            <span className="font-mono opacity-75">{evento.hora_inicio}{evento.hora_fin ? `–${evento.hora_fin}` : ''}</span>
          )}
          <span>{evento.numero}</span>
          <span className="font-normal truncate">· {evento.titulo}</span>
        </div>
        {grande && evento.subtitulo && <div className="text-xs opacity-75 mt-0.5 truncate">{evento.subtitulo}</div>}
        {grande && evento.tecnico_nombre && <div className="text-xs opacity-75 mt-0.5">👤 {evento.tecnico_nombre}</div>}
        {grande && esCompletado && evento.fecha_completado && (
          <div className="text-xs opacity-75 mt-0.5">
            ✅ Realizado el {new Date(evento.fecha_completado).toLocaleDateString('es-PA')}
          </div>
        )}
      </button>
    </div>
  );
}

function esMismoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function rangoSegunVista(fechaActual, vista) {
  const inicio = new Date(fechaActual);
  const fin = new Date(fechaActual);
  if (vista === 'mes') {
    inicio.setDate(1);
    inicio.setDate(inicio.getDate() - 7);
    fin.setMonth(fin.getMonth() + 1, 0);
    fin.setDate(fin.getDate() + 7);
  } else if (vista === 'semana') {
    let d = inicio.getDay();
    d = d === 0 ? 6 : d - 1;
    inicio.setDate(inicio.getDate() - d);
    fin.setTime(inicio.getTime());
    fin.setDate(fin.getDate() + 6);
  }
  return { inicio, fin };
}
