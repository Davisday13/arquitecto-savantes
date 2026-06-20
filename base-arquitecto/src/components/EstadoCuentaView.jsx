import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileBarChart, Search } from 'lucide-react';
import { Card } from './ui/Card';
import { Input, Select } from './ui/Input';
import { formatCurrency, formatDate } from '../lib/utils';

export default function EstadoCuentaView({ profile }) {
  const [proyectos, setProyectos] = useState([]);
  const [proyectoId, setProyectoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    supabase.from('v_proyectos_completa').select('id_proyecto, codigo, nombre, cliente_nombre')
      .in('estado', ['EN_CURSO', 'COMPLETADO'])
      .order('codigo')
      .then(({ data }) => setProyectos(data || []));
  }, []);

  useEffect(() => {
    if (!proyectoId) { setEstado(null); return; }
    setLoading(true);
    Promise.all([
      supabase.from('v_proyectos_completa').select('*').eq('id_proyecto', proyectoId).single(),
      supabase.from('v_pagos_completa').select('*').eq('id_proyecto', proyectoId).eq('estado', 'CONFIRMADO').order('fecha_pago'),
      supabase.from('v_gastos_completa').select('*').eq('id_proyecto', proyectoId).order('fecha'),
      supabase.from('etapas').select('*, sub_etapas(*)').eq('id_proyecto', proyectoId).order('orden'),
    ]).then(([pRes, pagosRes, gastosRes, etapasRes]) => {
      setEstado({
        proyecto: pRes.data,
        pagos: pagosRes.data || [],
        gastos: gastosRes.data || [],
        etapas: etapasRes.data || [],
      });
      setLoading(false);
    });
  }, [proyectoId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-brand-700" />
          Estado de cuenta
        </h1>
        <p className="text-sm text-gray-500 mt-1">Resumen financiero por proyecto</p>
      </div>

      <Card>
        <Select value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
          <option value="">Seleccionar proyecto...</option>
          {proyectos.map(p => (
            <option key={p.id_proyecto} value={p.id_proyecto}>{p.codigo} &mdash; {p.nombre} ({p.cliente_nombre})</option>
          ))}
        </Select>
      </Card>

      {loading && <div className="text-center py-8 text-gray-500">Cargando...</div>}

      {estado && !loading && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <div className="text-xs text-gray-500 uppercase">Presupuesto</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(estado.proyecto.presupuesto_total)}</div>
            </Card>
            <Card>
              <div className="text-xs text-emerald-600 uppercase">Total cobrado</div>
              <div className="text-2xl font-bold text-emerald-700">{formatCurrency(estado.proyecto.total_pagado)}</div>
            </Card>
            <Card>
              <div className="text-xs text-red-600 uppercase">Gastos del proyecto</div>
              <div className="text-2xl font-bold text-red-700">
                {formatCurrency(estado.gastos.reduce((s, g) => s + Number(g.monto || 0), 0))}
              </div>
            </Card>
            <Card>
              <div className="text-xs text-blue-600 uppercase">Saldo (cobrado - gastos)</div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(Number(estado.proyecto.total_pagado) - estado.gastos.reduce((s, g) => s + Number(g.monto || 0), 0))}
              </div>
            </Card>
          </div>

          {/* Doble barra */}
          <Card>
            <h3 className="text-sm font-semibold mb-3">Avance vs Cobro</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>% Avance f&iacute;sico</span>
                  <span>{(Number(estado.proyecto.porcentaje_avance_general) || 0).toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full">
                  <div className="h-3 bg-brand-600 rounded-full transition-all" style={{ width: `${Number(estado.proyecto.porcentaje_avance_general) || 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>% Cobrado</span>
                  <span>{estado.proyecto.presupuesto_total > 0 ? ((Number(estado.proyecto.total_pagado) / Number(estado.proyecto.presupuesto_total)) * 100).toFixed(0) : 0}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full">
                  <div className="h-3 bg-emerald-600 rounded-full transition-all" style={{ width: `${estado.proyecto.presupuesto_total > 0 ? (Number(estado.proyecto.total_pagado) / Number(estado.proyecto.presupuesto_total)) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Pagos recibidos */}
          <Card>
            <h3 className="text-sm font-semibold mb-2">Pagos recibidos ({estado.pagos.length})</h3>
            {estado.pagos.length === 0 ? (
              <div className="text-sm text-gray-400">Sin pagos registrados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr><th className="px-2 py-1 text-left">Recibo</th><th className="px-2 py-1 text-left">Fecha</th><th className="px-2 py-1 text-left">Concepto</th><th className="px-2 py-1 text-right">Monto</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {estado.pagos.map(p => (
                      <tr key={p.id_pago}>
                        <td className="px-2 py-1 font-mono text-xs">{p.numero_recibo}</td>
                        <td className="px-2 py-1 text-xs">{formatDate(p.fecha_pago)}</td>
                        <td className="px-2 py-1">{p.concepto || '-'}</td>
                        <td className="px-2 py-1 text-right font-medium text-emerald-700">{formatCurrency(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t-2">
                      <td colSpan="3" className="px-2 py-1 text-right">Total cobrado</td>
                      <td className="px-2 py-1 text-right text-emerald-700">{formatCurrency(estado.pagos.reduce((s, p) => s + Number(p.monto), 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {/* Gastos del proyecto */}
          <Card>
            <h3 className="text-sm font-semibold mb-2">Gastos del proyecto ({estado.gastos.length})</h3>
            {estado.gastos.length === 0 ? (
              <div className="text-sm text-gray-400">Sin gastos registrados para este proyecto</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr><th className="px-2 py-1 text-left">C&oacute;digo</th><th className="px-2 py-1 text-left">Fecha</th><th className="px-2 py-1 text-left">Descripci&oacute;n</th><th className="px-2 py-1 text-right">Monto</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {estado.gastos.map(g => (
                      <tr key={g.id_gasto}>
                        <td className="px-2 py-1 font-mono text-xs">{g.codigo}</td>
                        <td className="px-2 py-1 text-xs">{formatDate(g.fecha)}</td>
                        <td className="px-2 py-1">{g.descripcion}</td>
                        <td className="px-2 py-1 text-right font-medium text-red-700">{formatCurrency(g.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t-2">
                      <td colSpan="3" className="px-2 py-1 text-right">Total gastos</td>
                      <td className="px-2 py-1 text-right text-red-700">{formatCurrency(estado.gastos.reduce((s, g) => s + Number(g.monto), 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {/* Rentabilidad */}
          <Card>
            <h3 className="text-sm font-semibold mb-2">Rentabilidad del proyecto</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-xs text-emerald-700">Total cobrado</div>
                <div className="text-lg font-bold text-emerald-700">{formatCurrency(estado.proyecto.total_pagado)}</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-xs text-red-700">Total gastos</div>
                <div className="text-lg font-bold text-red-700">
                  {formatCurrency(estado.gastos.reduce((s, g) => s + Number(g.monto || 0), 0))}
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg col-span-2">
                <div className="text-xs text-blue-700">Ganancia neta</div>
                <div className="text-lg font-bold text-blue-700">
                  {formatCurrency(Number(estado.proyecto.total_pagado) - estado.gastos.reduce((s, g) => s + Number(g.monto || 0), 0))}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {!proyectoId && !loading && (
        <div className="text-center py-12 text-gray-500">
          <FileBarChart className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p className="text-lg font-medium">Selecciona un proyecto</p>
          <p className="text-sm">Para ver su estado de cuenta detallado</p>
        </div>
      )}
    </div>
  );
}
