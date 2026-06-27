import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { PRESUPUESTO_CATEGORIAS } from '../lib/constants';
import { Card } from './ui/Card';
import { FolderOpen } from 'lucide-react';

const API_BASE = '';

const COLORES_CATEGORIA = {
  MATERIALES: 'border-l-blue-500',
  MANO_OBRA: 'border-l-amber-500',
  RENTABILIDAD: 'border-l-emerald-500',
  GARANTIA: 'border-l-purple-500',
  HERRAMIENTAS: 'border-l-orange-500',
};

export default function PresupuestoView() {
  const [proyectos, setProyectos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [presupuestoMap, setPresupuestoMap] = useState({});
  const [gastosMap, setGastosMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: proys }, budgetRes, { data: gastos }] = await Promise.all([
        supabase.from('proyectos').select('id_proyecto, numero_proyecto, nombre, monto_total').order('numero_proyecto'),
        fetch('/api/presupuesto.mjs'),
        supabase.from('proyecto_gastos').select('id_proyecto, categoria, monto'),
      ]);

      setProyectos(proys || []);

      const pMap = {};
      (budgetRes.ok ? await budgetRes.json() : []).forEach(p => {
        if (!pMap[p.id_proyecto]) pMap[p.id_proyecto] = {};
        pMap[p.id_proyecto][p.categoria] = p;
      });
      setPresupuestoMap(pMap);

      const gMap = {};
      (gastos || []).forEach(g => {
        if (!gMap[g.id_proyecto]) gMap[g.id_proyecto] = {};
        gMap[g.id_proyecto][g.categoria] = (gMap[g.id_proyecto][g.categoria] || 0) + Number(g.monto);
      });
      setGastosMap(gMap);

      setLoading(false);
    })();
  }, []);

  const actualizarMonto = async (categoria, monto) => {
    const ok = presupuestoMap[selected]?.[categoria];
    const body = ok
      ? { id_proyecto: selected, categoria, monto_estimado: monto }
      : { id_proyecto: selected, categoria, monto_estimado: monto };
    await fetch('/api/presupuesto.mjs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setPresupuestoMap(prev => {
      const next = { ...prev };
      if (!next[selected]) next[selected] = {};
      next[selected] = { ...next[selected], [categoria]: { ...(next[selected][categoria] || {}), monto_estimado: monto } };
      return next;
    });
  };

  const partidas = presupuestoMap[selected] || {};
  const gastosProy = gastosMap[selected] || {};
  const totalEstimado = Object.values(partidas).reduce((s, p) => s + Number(p.monto_estimado || 0), 0);
  const totalGastado = Object.values(gastosProy).reduce((s, v) => s + v, 0);
  const proyectoActual = proyectos.find(p => p.id_proyecto === selected);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <FolderOpen className="h-6 w-6 text-brand-700" /> Presupuesto por proyecto
      </h1>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-1">
            <h3 className="text-sm font-semibold mb-2">Proyectos</h3>
            <div className="space-y-1">
              {proyectos.map(p => (
                <button key={p.id_proyecto} onClick={() => setSelected(p.id_proyecto)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${selected === p.id_proyecto ? 'bg-brand-50 text-brand-800 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}>
                  <div className="font-medium">{p.nombre}</div>
                  <div className="text-xs text-gray-400">{p.numero_proyecto}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-3">
            {!selected ? (
              <div className="p-8 text-center text-gray-400 text-sm">Selecciona un proyecto para ver su presupuesto</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{proyectoActual?.nombre}</h3>
                    <p className="text-sm text-gray-500">{proyectoActual?.numero_proyecto} &middot; Total: {formatCurrency(proyectoActual?.monto_total)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-blue-50 p-2 rounded"><div className="font-bold">{formatCurrency(Number(partidas.MATERIALES?.monto_estimado || 0))}</div>Materiales</div>
                  <div className="bg-amber-50 p-2 rounded"><div className="font-bold">{formatCurrency(Number(partidas.MANO_OBRA?.monto_estimado || 0))}</div>Mano de obra</div>
                  <div className="bg-emerald-50 p-2 rounded"><div className="font-bold">{formatCurrency(Number(partidas.RENTABILIDAD?.monto_estimado || 0))}</div>Rentabilidad</div>
                  <div className="bg-purple-50 p-2 rounded"><div className="font-bold">{formatCurrency(Number(partidas.GARANTIA?.monto_estimado || 0))}</div>Garant&iacute;a</div>
                  <div className="bg-orange-50 p-2 rounded"><div className="font-bold">{formatCurrency(Number(partidas.HERRAMIENTAS?.monto_estimado || 0))}</div>Herramientas</div>
                </div>

                <div className="space-y-2">
                  {PRESUPUESTO_CATEGORIAS.map(cat => {
                    const estimado = Number(partidas[cat.id]?.monto_estimado || 0);
                    const gastado = Number(gastosProy[cat.id] || 0);
                    const restante = estimado - gastado;
                    const pctGastado = estimado > 0 ? (gastado / estimado) * 100 : 0;
                    return (
                      <div key={cat.id} className={`border-l-4 ${COLORES_CATEGORIA[cat.id] || 'border-l-gray-300'} p-3 bg-white rounded shadow-sm`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-sm">{cat.label}</div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-500">Estimado:</span>
                            <input type="number" step="0.01" min="0"
                              defaultValue={estimado || ''}
                              onBlur={e => {
                                const val = Number(e.target.value);
                                if (val !== estimado) actualizarMonto(cat.id, val);
                              }}
                              className="w-28 text-right border border-gray-300 rounded px-2 py-0.5 text-sm font-mono" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${pctGastado > 100 ? 'bg-red-500' : 'bg-brand-600'}`} style={{ width: `${Math.min(100, pctGastado)}%` }} />
                          </div>
                          <span className="font-mono w-20 text-right">{formatCurrency(gastado)}</span>
                          <span className={`font-mono w-20 text-right ${restante < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {restante >= 0 ? formatCurrency(restante) : `-${formatCurrency(Math.abs(restante))}`}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>Gastado</span>
                          <span>Restante</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t pt-3 flex justify-between text-sm">
                  <span className="font-semibold">Total presupuestado: <span className="text-brand-700">{formatCurrency(totalEstimado)}</span></span>
                  <span className="font-semibold">Total gastado: <span className="text-red-600">{formatCurrency(totalGastado)}</span></span>
                  <span className="font-semibold">Saldo: <span className={totalEstimado - totalGastado >= 0 ? 'text-emerald-700' : 'text-red-600'}>{formatCurrency(totalEstimado - totalGastado)}</span></span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
