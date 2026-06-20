import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileBarChart } from 'lucide-react';
import { Card } from './ui/Card';
import { formatCurrency } from '../lib/utils';

export default function ReportesView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('v_estadisticas_proyectos').select('*').single(),
      supabase.from('v_resumen_mensual').select('*').limit(12),
      supabase.from('proyectos').select('presupuesto_total, total_pagado').in('estado', ['EN_CURSO', 'COMPLETADO']),
    ]).then(([statsRes, resumenRes, proyRes]) => {
      setData({
        stats: statsRes.data || {},
        resumen: resumenRes.data || [],
        proyectos: proyRes.data || [],
      });
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Cargando...</div>;

  const proyectos = data?.proyectos || [];
  const totalPresupuestado = proyectos.reduce((s, p) => s + Number(p.presupuesto_total || 0), 0);
  const totalCobrado = proyectos.reduce((s, p) => s + Number(p.total_pagado || 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FileBarChart className="h-6 w-6 text-brand-700" /> Reportes</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><div className="text-xs text-gray-500 uppercase">Proyectos totales</div><div className="text-2xl font-bold">{data?.stats?.total_proyectos || 0}</div></Card>
        <Card><div className="text-xs text-amber-600 uppercase">En curso</div><div className="text-2xl font-bold text-amber-700">{data?.stats?.en_curso || 0}</div></Card>
        <Card><div className="text-xs text-emerald-600 uppercase">Completados</div><div className="text-2xl font-bold text-emerald-700">{data?.stats?.completados || 0}</div></Card>
        <Card><div className="text-xs text-brand-600 uppercase">$ Presupuestado</div><div className="text-2xl font-bold text-brand-700">{formatCurrency(totalPresupuestado)}</div></Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Resumen financiero global</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-emerald-50 rounded-lg">
            <div className="text-xs text-emerald-700 uppercase">Total cobrado</div>
            <div className="text-xl font-bold text-emerald-700">{formatCurrency(totalCobrado)}</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-700 uppercase">Por cobrar</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(totalPresupuestado - totalCobrado)}</div>
          </div>
        </div>
      </Card>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center text-gray-500">
        <FileBarChart className="h-12 w-12 mx-auto text-gray-300 mb-2" />
        <p className="text-lg font-medium">M&aacute;s reportes disponibles</p>
        <p className="text-sm">Pr&oacute;ximamente: reportes detallados por cliente, rentabilidad por proyecto, gr&aacute;ficas comparativas y exportaci&oacute;n a Excel.</p>
      </div>
    </div>
  );
}
