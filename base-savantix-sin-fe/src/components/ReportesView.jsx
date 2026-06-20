import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileDown, BarChart3 } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import {
  ESTADOS_ORDEN_LABEL, ESTADOS_VISITA_LABEL, ESTADOS_ORDEN_COLOR, ESTADOS_VISITA_COLOR,
  TIPOS_VISITA_LABEL,
} from '../lib/constants';
import { formatDate, formatCurrency } from '../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#ec4899'];

export default function ReportesView() {
  const [tab, setTab] = useState('ordenes');
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [desde, setDesde] = useState(monthAgo);
  const [hasta, setHasta] = useState(today);

  const tabs = [
    { id: 'ordenes', label: 'Órdenes' },
    { id: 'visitas', label: 'Visitas' },
    { id: 'ingresos', label: 'Ingresos por técnico' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500">Análisis y exportación de datos</p>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Input label="Desde" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
            <Input label="Hasta" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>

          <div className="border-b mb-4">
            <div className="flex gap-1">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'ordenes' && <ReporteOrdenes desde={desde} hasta={hasta} />}
          {tab === 'visitas' && <ReporteVisitas desde={desde} hasta={hasta} />}
          {tab === 'ingresos' && <ReporteIngresos desde={desde} hasta={hasta} />}
        </CardContent>
      </Card>
    </div>
  );
}

function ReporteOrdenes({ desde, hasta }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('v_ordenes_completa')
      .select('*')
      .gte('fecha_entrada', desde)
      .lte('fecha_entrada', hasta)
      .order('fecha_entrada', { ascending: false })
      .then(({ data }) => {
        setData(data || []);
        setLoading(false);
      });
  }, [desde, hasta]);

  // Conteo por estado
  const porEstado = Object.entries(
    data.reduce((acc, o) => {
      acc[o.estado] = (acc[o.estado] || 0) + 1;
      return acc;
    }, {})
  ).map(([estado, cantidad]) => ({
    estado: ESTADOS_ORDEN_LABEL[estado] || estado,
    cantidad,
  }));

  const totalGeneral = data.reduce((sum, o) => sum + Number(o.total_general || 0), 0);

  const exportar = () => {
    const rows = data.map(o => ({
      Ticket: o.numero_ticket,
      Fecha: formatDate(o.fecha_entrada),
      Cliente: o.cliente_nombre,
      'Tipo Equipo': o.tipo_equipo,
      Marca: o.marca,
      Modelo: o.modelo,
      Serie: o.numero_serie,
      Falla: o.falla_reportada,
      Estado: ESTADOS_ORDEN_LABEL[o.estado] || o.estado,
      'Técnico': o.tecnico_nombre || '',
      'Total Repuestos': Number(o.total_repuestos || 0),
      'Total Mano Obra': Number(o.total_mano_obra || 0),
      'Total General': Number(o.total_general || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Órdenes');
    XLSX.writeFile(wb, `ordenes-${desde}-a-${hasta}.xlsx`);
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="text-xs text-blue-600 uppercase font-semibold">Órdenes</div>
          <div className="text-2xl font-bold text-blue-900">{data.length}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
          <div className="text-xs text-emerald-600 uppercase font-semibold">Entregadas</div>
          <div className="text-2xl font-bold text-emerald-900">
            {data.filter(o => o.estado === 'ENTREGADO').length}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <div className="text-xs text-amber-600 uppercase font-semibold">Total facturado</div>
          <div className="text-2xl font-bold text-amber-900">{formatCurrency(totalGeneral)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <h3 className="text-sm font-semibold mb-2">Órdenes por estado</h3>
          {porEstado.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={porEstado}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="estado" angle={-20} textAnchor="end" height={70} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="border rounded p-3">
          <h3 className="text-sm font-semibold mb-2">Distribución</h3>
          {porEstado.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={porEstado} dataKey="cantidad" nameKey="estado" outerRadius={80} label>
                  {porEstado.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend fontSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={exportar} disabled={data.length === 0}>
          <FileDown className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>
    </div>
  );
}

function ReporteVisitas({ desde, hasta }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('v_visitas_completa')
      .select('*')
      .gte('fecha_visita', desde)
      .lte('fecha_visita', hasta)
      .order('fecha_visita', { ascending: false })
      .then(({ data }) => {
        setData(data || []);
        setLoading(false);
      });
  }, [desde, hasta]);

  const porTipo = Object.entries(
    data.reduce((acc, v) => {
      acc[v.tipo_visita] = (acc[v.tipo_visita] || 0) + 1;
      return acc;
    }, {})
  ).map(([t, c]) => ({ tipo: TIPOS_VISITA_LABEL[t] || t, cantidad: c }));

  const exportar = () => {
    const rows = data.map(v => ({
      Numero: v.numero_visita,
      Fecha: formatDate(v.fecha_visita),
      Tipo: TIPOS_VISITA_LABEL[v.tipo_visita] || v.tipo_visita,
      Cliente: v.cliente_nombre,
      Motivo: v.motivo,
      'Trabajo realizado': v.trabajo_realizado || '',
      Estado: ESTADOS_VISITA_LABEL[v.estado] || v.estado,
      Técnico: v.tecnico_nombre || '',
      'Hora inicio': v.hora_inicio || '',
      'Hora fin': v.hora_fin || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visitas');
    XLSX.writeFile(wb, `visitas-${desde}-a-${hasta}.xlsx`);
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="text-xs text-blue-600 uppercase font-semibold">Total visitas</div>
          <div className="text-2xl font-bold text-blue-900">{data.length}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
          <div className="text-xs text-emerald-600 uppercase font-semibold">Completadas</div>
          <div className="text-2xl font-bold text-emerald-900">
            {data.filter(v => v.estado === 'COMPLETADA').length}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="text-xs text-red-600 uppercase font-semibold">Canceladas</div>
          <div className="text-2xl font-bold text-red-900">
            {data.filter(v => v.estado === 'CANCELADA').length}
          </div>
        </div>
      </div>

      <div className="border rounded p-3">
        <h3 className="text-sm font-semibold mb-2">Visitas por tipo</h3>
        {porTipo.length > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={porTipo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={exportar} disabled={data.length === 0}>
          <FileDown className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>
    </div>
  );
}

function ReporteIngresos({ desde, hasta }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      // Sumar mano de obra por técnico en el rango
      const { data: ordenes } = await supabase
        .from('v_ordenes_completa')
        .select('id_orden, id_tecnico_asignado, tecnico_nombre, fecha_entrada, total_mano_obra, total_repuestos, total_general')
        .gte('fecha_entrada', desde)
        .lte('fecha_entrada', hasta);

      const map = new Map();
      (ordenes || []).forEach(o => {
        const key = o.id_tecnico_asignado || 'sin-asignar';
        const nombre = o.tecnico_nombre || 'Sin asignar';
        const prev = map.get(key) || { tecnico: nombre, ordenes: 0, mano_obra: 0, repuestos: 0, total: 0 };
        prev.ordenes += 1;
        prev.mano_obra += Number(o.total_mano_obra || 0);
        prev.repuestos += Number(o.total_repuestos || 0);
        prev.total += Number(o.total_general || 0);
        map.set(key, prev);
      });
      setData(Array.from(map.values()).sort((a, b) => b.total - a.total));
      setLoading(false);
    };
    cargar();
  }, [desde, hasta]);

  const exportar = () => {
    const rows = data.map(d => ({
      Técnico: d.tecnico,
      Órdenes: d.ordenes,
      'Mano de obra': d.mano_obra,
      Repuestos: d.repuestos,
      Total: d.total,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ingresos');
    XLSX.writeFile(wb, `ingresos-tecnico-${desde}-a-${hasta}.xlsx`);
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="border rounded p-3">
        <h3 className="text-sm font-semibold mb-2">Mano de obra por técnico</h3>
        {data.length > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tecnico" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="mano_obra" fill="#f59e0b" name="Mano de obra" />
              <Bar dataKey="repuestos" fill="#3b82f6" name="Repuestos" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="border rounded overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs text-gray-600">
              <th className="px-3 py-2">Técnico</th>
              <th className="px-3 py-2 text-right">Órdenes</th>
              <th className="px-3 py-2 text-right">Mano de obra</th>
              <th className="px-3 py-2 text-right">Repuestos</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-gray-500">Sin datos</td></tr>
            ) : data.map((d, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2 font-medium">{d.tecnico}</td>
                <td className="px-3 py-2 text-right">{d.ordenes}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(d.mano_obra)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(d.repuestos)}</td>
                <td className="px-3 py-2 text-right font-bold">{formatCurrency(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={exportar} disabled={data.length === 0}>
          <FileDown className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>
    </div>
  );
}
