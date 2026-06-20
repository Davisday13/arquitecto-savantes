import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Trash2, Pencil, CheckCircle2, FileText, DollarSign, History,
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import { ESTADOS_PROYECTO_LABEL, ESTADOS_PROYECTO_COLOR, ESTADOS_SUB_ETAPA_LABEL, ESTADOS_SUB_ETAPA_COLOR } from '../lib/constants';

const SAVANTE_BLUE = '#1a3a4a';

export default function ProyectoDetalleModal({ open, onClose, proyectoId, profile, onEditar }) {
  const [proyecto, setProyecto] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editEtapa, setEditEtapa] = useState(null);
  const [editSubEtapa, setEditSubEtapa] = useState(null);

  const cargar = async () => {
    if (!proyectoId) return;
    setLoading(true);
    const [pRes, eRes] = await Promise.all([
      supabase.from('v_proyectos_completa').select('*').eq('id_proyecto', proyectoId).single(),
      supabase.from('etapas').select('*, sub_etapas(*, avance_sub_etapa(porcentaje_avance, fecha_actualizacion, notas, created_at, created_by))').eq('id_proyecto', proyectoId).order('orden').order('orden', { foreignTable: 'sub_etapas' }),
    ]);
    if (pRes.data) setProyecto(pRes.data);
    setEtapas(eRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (open) cargar(); }, [open, proyectoId]);

  const cambiarEstadoProyecto = async (nuevoEstado) => {
    await supabase.from('proyectos').update({ estado: nuevoEstado }).eq('id_proyecto', proyectoId);
    cargar();
  };

  const agregarEtapa = () => {
    const orden = etapas.length;
    const nombre = prompt('Nombre de la etapa:');
    if (!nombre) return;
    supabase.from('etapas').insert({
      id_proyecto: proyectoId, nombre, orden, peso_porcentaje: 0, presupuesto: 0,
    }).then(() => cargar());
  };

  const agregarSubEtapa = (idEtapa) => {
    const etapa = etapas.find(e => e.id_etapa === idEtapa);
    const orden = etapa?.sub_etapas?.length || 0;
    const nombre = prompt('Nombre de la sub-etapa:');
    if (!nombre) return;
    supabase.from('sub_etapas').insert({
      id_etapa: idEtapa, nombre, orden, peso_porcentaje: 0, presupuesto: 0, estado: 'PENDIENTE',
    }).then(() => cargar());
  };

  const actualizarAvance = async (idSubEtapa) => {
    const pct = prompt('Porcentaje de avance (0-100):');
    if (pct === null) return;
    const num = Number(pct);
    if (isNaN(num) || num < 0 || num > 100) return alert('Valor inv\u00e1lido (0-100)');
    await supabase.from('avance_sub_etapa').insert({
      id_sub_etapa: idSubEtapa, porcentaje_avance: num,
      created_by: profile?.id,
    });
    if (num === 100) {
      await supabase.from('sub_etapas').update({ estado: 'COMPLETADA' }).eq('id_sub_etapa', idSubEtapa);
    } else if (num > 0) {
      const { data: se } = await supabase.from('sub_etapas').select('estado').eq('id_sub_etapa', idSubEtapa).single();
      if (se && se.estado === 'PENDIENTE') {
        await supabase.from('sub_etapas').update({ estado: 'EN_CURSO' }).eq('id_sub_etapa', idSubEtapa);
      }
    }
    cargar();
  };

  const eliminarEtapa = async (id) => {
    if (!confirm('Eliminar esta etapa y todas sus sub-etapas?')) return;
    await supabase.from('etapas').delete().eq('id_etapa', id);
    cargar();
  };

  const eliminarSubEtapa = async (id) => {
    if (!confirm('Eliminar esta sub-etapa?')) return;
    await supabase.from('sub_etapas').delete().eq('id_sub_etapa', id);
    cargar();
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={proyecto ? proyecto.codigo + ' - ' + proyecto.nombre : 'Cargando...'}
      size="full"
    >
      {loading || !proyecto ? (
        <div className="p-8 text-center text-gray-500">Cargando...</div>
      ) : (
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          {/* Header */}
          <div className={`rounded border-l-4 p-3 ${ESTADOS_PROYECTO_COLOR[proyecto.estado] || 'border-gray-300'}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs uppercase tracking-wider opacity-75">Estado</div>
                <div className="text-lg font-bold">{ESTADOS_PROYECTO_LABEL[proyecto.estado]}</div>
              </div>
              <div className="flex gap-2">
                {proyecto.estado === 'COTIZACION' && (
                  <Button size="sm" onClick={() => cambiarEstadoProyecto('EN_CURSO')}>Iniciar proyecto</Button>
                )}
                {proyecto.estado === 'EN_CURSO' && (
                  <Button size="sm" variant="outline" onClick={() => cambiarEstadoProyecto('COMPLETADO')}
                    className="!border-emerald-600 !text-emerald-700">Marcar completado</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onEditar(proyecto.id_proyecto)}>
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Cliente</div>
              <div className="font-semibold">{proyecto.cliente_nombre}</div>
              <div className="text-xs text-gray-500">{proyecto.numero_cliente}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Fechas</div>
              <div className="text-sm">Inicio: {proyecto.fecha_inicio ? formatDate(proyecto.fecha_inicio) : '-'}</div>
              <div className="text-sm">Entrega: {proyecto.fecha_estimada_entrega ? formatDate(proyecto.fecha_estimada_entrega) : '-'}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Presupuesto</div>
              <div className="text-lg font-bold text-brand-700">{formatCurrency(proyecto.presupuesto_total)}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Cobrado</div>
              <div className="text-lg font-bold text-emerald-700">{formatCurrency(proyecto.total_pagado)}</div>
            </div>
          </div>

          {proyecto.descripcion && (
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Descripci&oacute;n</div>
              <div className="text-sm">{proyecto.descripcion}</div>
            </div>
          )}

          {proyecto.direccion_obra && (
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Direcci&oacute;n de obra</div>
              <div className="text-sm">{proyecto.direccion_obra}</div>
            </div>
          )}

          {/* Doble barra de avance */}
          {etapas.length > 0 && (
            <div className="bg-white border rounded p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Avance del proyecto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">% Avance f&iacute;sico</div>
                  <DobleBarra value={Number(proyecto.porcentaje_avance_general || 0)} color={SAVANTE_BLUE} />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {(Number(proyecto.porcentaje_avance_general) || 0).toFixed(0)}% completado
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">% Pagado</div>
                  <DobleBarra
                    value={proyecto.presupuesto_total > 0 ? (Number(proyecto.total_pagado) / Number(proyecto.presupuesto_total)) * 100 : 0}
                    color="#059669"
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {formatCurrency(proyecto.total_pagado)} de {formatCurrency(proyecto.presupuesto_total)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Etapas y Sub-etapas */}
          <div className="bg-white border rounded overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Etapas del proyecto</h3>
              <Button size="sm" variant="outline" onClick={agregarEtapa}>
                <Plus className="h-3 w-3" /> Agregar etapa
              </Button>
            </div>

            {etapas.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No hay etapas definidas. Agrega la primera etapa del proyecto.
              </div>
            ) : (
              <div className="divide-y">
                {etapas.map(etapa => (
                  <div key={etapa.id_etapa} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{etapa.nombre}</span>
                        <span className="text-xs text-gray-500">(peso: {Number(etapa.peso_porcentaje).toFixed(0)}%)</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => agregarSubEtapa(etapa.id_etapa)} className="text-xs">
                          <Plus className="h-3 w-3" /> Sub-etapa
                        </Button>
                        <button onClick={() => eliminarEtapa(etapa.id_etapa)} className="p-1 hover:bg-red-100 rounded text-red-600">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {(!etapa.sub_etapas || etapa.sub_etapas.length === 0) ? (
                      <div className="text-xs text-gray-400 ml-4">Sin sub-etapas</div>
                    ) : (
                      <div className="ml-4 space-y-1.5">
                        {etapa.sub_etapas.map(se => {
                          const ultimoAvance = se.avance_sub_etapa?.[0];
                          const pct = Number(ultimoAvance?.porcentaje_avance || 0);
                          return (
                            <div key={se.id_sub_etapa} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 group">
                              <div className={`w-2 h-2 rounded-full ${ESTADOS_SUB_ETAPA_COLOR[se.estado]?.split(' ')[0] || 'bg-gray-300'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-700 truncate">{se.nombre}</div>
                                {ultimoAvance && (
                                  <div className="text-xs text-gray-500">
                                    {pct.toFixed(0)}% - {formatDate(ultimoAvance.fecha_actualizacion)}
                                    {ultimoAvance.notas && ` - ${ultimoAvance.notas}`}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                  <div className="h-1.5 rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <button onClick={() => actualizarAvance(se.id_sub_etapa)} className="p-1 hover:bg-blue-100 rounded text-blue-600 opacity-0 group-hover:opacity-100" title="Actualizar avance">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => eliminarSubEtapa(se.id_sub_etapa)} className="p-1 hover:bg-red-100 rounded text-red-400 opacity-0 group-hover:opacity-100" title="Eliminar">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function DobleBarra({ value, color }) {
  const val = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${val}%`, backgroundColor: color }}
      />
    </div>
  );
}
