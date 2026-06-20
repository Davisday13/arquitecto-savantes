import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { Card } from './ui/Card';
import { Select } from './ui/Input';
import { PieChart } from 'lucide-react';

export default function EstadoCuentaView() {
  const [proyectos, setProyectos] = useState([]);
  const [idProyecto, setIdProyecto] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    supabase.from('proyectos').select('id_proyecto, numero_proyecto, nombre').in('estado', ['EN_CURSO', 'PAUSADO', 'FINALIZADO']).order('numero_proyecto').then(({ data }) => setProyectos(data || []));
  }, []);

  useEffect(() => {
    if (!idProyecto) { setData(null); return; }
    Promise.all([
      supabase.from('v_proyectos_completa').select('*').eq('id_proyecto', idProyecto).single(),
      supabase.from('proyecto_etapas').select('*').eq('id_proyecto', idProyecto).order('orden'),
      supabase.from('proyecto_subetapas').select('*, proyecto_etapas!inner(nombre, tipo)').in('id_etapa', supabase.from('proyecto_etapas').select('id_etapa').eq('id_proyecto', idProyecto)).order('orden'),
      supabase.from('proyecto_pagos').select('*').eq('id_proyecto', idProyecto).eq('anulado', false).order('created_at', { ascending: false }),
      supabase.from('proyecto_gastos').select('*').eq('id_proyecto', idProyecto).order('created_at', { ascending: false }),
    ]).then(([proyRes, etapasRes, subsRes, pagosRes, gastosRes]) => {
      setData({
        proyecto: proyRes.data,
        etapas: etapasRes.data || [],
        sub_etapas: subsRes.data || [],
        pagos: pagosRes.data || [],
        gastos: gastosRes.data || [],
      });
    });
  }, [idProyecto]);

  const totalGastos = data?.gastos?.reduce((s, g) => s + Number(g.monto), 0) || 0;
  const rentabilidad = (data?.proyecto?.monto_total || 0) - (data?.proyecto?.pagado_total || 0) - totalGastos;
  const brecha = (data?.proyecto?.avance_pct || 0) - (data?.proyecto?.pago_pct || 0);

  const Barra = ({ pct, color }) => (
    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct || 0))}%` }} />
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><PieChart className="h-6 w-6 text-brand-700" /> Estado de cuenta</h1>

      <Card>
        <Select value={idProyecto} onChange={e => setIdProyecto(e.target.value)}>
          <option value="">Seleccionar proyecto</option>
          {proyectos.map(p => <option key={p.id_proyecto} value={p.id_proyecto}>{p.numero_proyecto} — {p.nombre}</option>)}
        </Select>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><div className="text-xs text-gray-500">Presupuesto</div><div className="text-xl font-bold">{formatCurrency(data.proyecto?.monto_total)}</div></Card>
            <Card><div className="text-xs text-emerald-600">Cobrado</div><div className="text-xl font-bold text-emerald-700">{formatCurrency(data.proyecto?.pagado_total)}</div></Card>
            <Card><div className="text-xs text-amber-600">Por cobrar</div><div className="text-xl font-bold text-amber-700">{formatCurrency((data.proyecto?.monto_total || 0) - (data.proyecto?.pagado_total || 0))}</div></Card>
            <Card><div className="text-xs text-red-600">Gastos</div><div className="text-xl font-bold text-red-700">{formatCurrency(totalGastos)}</div></Card>
          </div>

          <Card>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Rentabilidad estimada</div>
                <div className={`text-2xl font-bold ${rentabilidad >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(rentabilidad)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Brecha avance vs pago</div>
                <div className={`text-2xl font-bold ${brecha > 0 ? 'text-amber-600' : brecha < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {brecha > 0 ? '+' : ''}{brecha.toFixed(1)}%
                </div>
                <div className="text-xs mt-1">
                  {brecha > 0 ? <span className="text-amber-600">Has avanzado más de lo cobrado</span> : brecha < 0 ? <span className="text-emerald-600">El cliente ha pagado por adelantado</span> : <span className="text-gray-400">Al día</span>}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold mb-2">Doble barra — Proyecto</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2"><span className="text-xs w-14">Avance <strong>{Number(data.proyecto?.avance_pct || 0).toFixed(1)}%</strong></span><Barra pct={data.proyecto?.avance_pct} color="bg-blue-600" /></div>
              <div className="flex items-center gap-2"><span className="text-xs w-14">Pago <strong>{Number(data.proyecto?.pago_pct || 0).toFixed(1)}%</strong></span><Barra pct={data.proyecto?.pago_pct} color="bg-emerald-600" /></div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <h3 className="text-sm font-semibold mb-2">Pagos recibidos ({data.pagos.length})</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {data.pagos.map(p => (
                  <div key={p.id_pago} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded">
                    <span className="font-mono">{p.numero_recibo || '—'}</span>
                    <span>{p.metodo_pago}</span>
                    <span className="font-mono font-medium text-emerald-700">{formatCurrency(p.monto)}</span>
                  </div>
                ))}
                {data.pagos.length === 0 && <div className="text-xs text-gray-400 text-center py-2">Sin pagos registrados</div>}
              </div>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold mb-2">Gastos del proyecto ({data.gastos.length})</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {data.gastos.map(g => (
                  <div key={g.id_gasto} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded">
                    <span className="truncate mr-1">{g.descripcion}</span>
                    <span className="font-mono text-red-600">{formatCurrency(g.monto)}</span>
                  </div>
                ))}
                {data.gastos.length === 0 && <div className="text-xs text-gray-400 text-center py-2">Sin gastos registrados</div>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
