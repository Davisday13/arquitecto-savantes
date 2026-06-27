import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { PRESUPUESTO_CATEGORIAS } from '../lib/constants';
import { Card, Badge } from './ui/Card';
import Button from './ui/Button';
import { FolderOpen, Plus, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORES_CATEGORIA = {
  MATERIALES: 'border-l-blue-500',
  MANO_OBRA: 'border-l-amber-500',
  RENTABILIDAD: 'border-l-emerald-500',
  GARANTIA: 'border-l-purple-500',
  HERRAMIENTAS: 'border-l-orange-500',
};

export default function PresupuestoView() {
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [partidas, setPartidas] = useState([]);
  const [gastosPorCategoria, setGastosPorCategoria] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('proyectos').select('id_proyecto, numero_proyecto, nombre, monto_total').order('numero_proyecto').then(({ data }) => {
      setProyectos(data || []);
      setLoading(false);
    });
  }, []);

  const cargarPresupuesto = async (id_proyecto) => {
    setSelected(id_proyecto);
    let partidas = [];
    try {
      const r = await supabase.from('proyecto_presupuesto').select('*').eq('id_proyecto', id_proyecto);
      partidas = r.data || [];
    } catch (e) {
      console.warn('Tabla proyecto_presupuesto no existe', e);
    }
    const map = {};
    partidas.forEach(p => { map[p.categoria] = p; });
    setPartidas(partidas);
    setGastosPorCategoria(map);

    const { data: gastos } = await supabase.from('proyecto_gastos').select('categoria, monto').eq('id_proyecto', id_proyecto);
    const gastoMap = {};
    (gastos || []).forEach(g => {
      gastoMap[g.categoria] = (gastoMap[g.categoria] || 0) + Number(g.monto);
    });
    setGastosPorCategoria(prev => ({ ...prev, _gastos: gastoMap }));
  };

  const actualizarMonto = async (categoria, monto) => {
    try {
      const existente = partidas.find(p => p.categoria === categoria && p.id_proyecto === selected);
      if (existente) {
        await supabase.from('proyecto_presupuesto').update({ monto_estimado: monto }).eq('id_partida', existente.id_partida);
      } else {
        await supabase.from('proyecto_presupuesto').insert({ id_proyecto: selected, categoria, monto_estimado: monto });
      }
    } catch (e) {
      alert('La tabla de presupuesto aun no existe en la base de datos. Ejecuta el schema.sql en Supabase.');
    }
    cargarPresupuesto(selected);
  };

  const totalEstimado = partidas.reduce((s, p) => s + Number(p.monto_estimado || 0), 0);
  const gastosMap = gastosPorCategoria._gastos || {};
  const totalGastado = Object.values(gastosMap).reduce((s, v) => s + v, 0);

  const proyectoActual = proyectos.find(p => p.id_proyecto === selected);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <FolderOpen className="h-6 w-6 text-brand-700" /> Presupuesto por proyecto
      </h1>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando proyectos...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar de proyectos */}
          <Card className="lg:col-span-1">
            <h3 className="text-sm font-semibold mb-2">Proyectos</h3>
            <div className="space-y-1">
              {proyectos.map(p => (
                <button key={p.id_proyecto} onClick={() => cargarPresupuesto(p.id_proyecto)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${selected === p.id_proyecto ? 'bg-brand-50 text-brand-800 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}>
                  <div className="font-medium">{p.nombre}</div>
                  <div className="text-xs text-gray-400">{p.numero_proyecto}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Panel de presupuesto */}
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
                  <div className="bg-blue-50 p-2 rounded"><div className="font-bold text-blue-700">{formatCurrency(partidas.find(p => p.categoria === 'MATERIALES')?.monto_estimado || 0)}</div>Materiales</div>
                  <div className="bg-amber-50 p-2 rounded"><div className="font-bold text-amber-700">{formatCurrency(partidas.find(p => p.categoria === 'MANO_OBRA')?.monto_estimado || 0)}</div>Mano de obra</div>
                  <div className="bg-emerald-50 p-2 rounded"><div className="font-bold text-emerald-700">{formatCurrency(partidas.find(p => p.categoria === 'RENTABILIDAD')?.monto_estimado || 0)}</div>Rentabilidad</div>
                  <div className="bg-purple-50 p-2 rounded"><div className="font-bold text-purple-700">{formatCurrency(partidas.find(p => p.categoria === 'GARANTIA')?.monto_estimado || 0)}</div>Garant&iacute;a</div>
                  <div className="bg-orange-50 p-2 rounded"><div className="font-bold text-orange-700">{formatCurrency(partidas.find(p => p.categoria === 'HERRAMIENTAS')?.monto_estimado || 0)}</div>Herramientas</div>
                </div>

                <div className="space-y-2">
                  {PRESUPUESTO_CATEGORIAS.map(cat => {
                    const partida = partidas.find(p => p.categoria === cat.id);
                    const estimado = Number(partida?.monto_estimado || 0);
                    const gastado = Number(gastosMap[cat.id] || 0);
                    const restante = estimado - gastado;
                    const pctGastado = estimado > 0 ? (gastado / estimado) * 100 : 0;
                    return (
                      <div key={cat.id} className={`border-l-4 ${COLORES_CATEGORIA[cat.id] || 'border-l-gray-300'} p-3 bg-white rounded shadow-sm`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-sm">{cat.label}</div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-500">Estimado:</span>
                            <input type="number" step="0.01" min="0"
                              value={estimado || ''}
                              onChange={e => actualizarMonto(cat.id, Number(e.target.value))}
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
