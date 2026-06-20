import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, Plus, Search, RefreshCw, Eye, Pencil, Trash2,
} from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { CATEGORIAS_GASTO, CATEGORIAS_GASTO_LABEL, TIPOS_GASTO, TIPOS_GASTO_LABEL } from '../lib/constants';
import GastoFormModal from './GastoFormModal';

export default function GastosView({ profile }) {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    let query = supabase
      .from('v_gastos_completa')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(500);

    if (filtroTipo) query = query.eq('tipo', filtroTipo);
    if (filtroCategoria) query = query.eq('categoria', filtroCategoria);

    const { data, error } = await query;
    if (!error) setGastos(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtroTipo, filtroCategoria]);

  const filtrados = useMemo(() => {
    if (!busqueda) return gastos;
    const q = busqueda.toLowerCase();
    return gastos.filter(g =>
      g.descripcion?.toLowerCase().includes(q) ||
      g.codigo?.toLowerCase().includes(q) ||
      g.proyecto_nombre?.toLowerCase().includes(q) ||
      g.etapa_nombre?.toLowerCase().includes(q)
    );
  }, [gastos, busqueda]);

  const totalGastos = useMemo(() =>
    filtrados.reduce((s, g) => s + Number(g.monto || 0), 0),
  [filtrados]);

  const eliminar = async (g) => {
    if (!confirm(`Eliminar gasto ${g.codigo}?`)) return;
    const { error } = await supabase.from('gastos').delete().eq('id_gasto', g.id_gasto);
    if (error) { alert('Error: ' + error.message); return; }
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-brand-700" />
            Gastos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Control de gastos generales y por proyecto</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Recargar
          </Button>
          <Button onClick={() => { setEditId(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Nuevo gasto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><div className="text-xs text-gray-500 uppercase">Total gastos</div><div className="text-2xl font-bold text-red-700">{formatCurrency(totalGastos)}</div></Card>
        <Card><div className="text-xs text-gray-500 uppercase">Cantidad</div><div className="text-2xl font-bold text-gray-900">{filtrados.length}</div></Card>
        <Card><div className="text-xs text-amber-600 uppercase">Generales</div><div className="text-2xl font-bold text-amber-700">{gastos.filter(g => g.tipo === 'GENERAL').length}</div></Card>
        <Card><div className="text-xs text-blue-600 uppercase">Por etapa</div><div className="text-2xl font-bold text-blue-700">{gastos.filter(g => g.tipo === 'POR_ETAPA').length}</div></Card>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar gasto..." className="pl-8" />
          </div>
          <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_GASTO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
            <option value="">Todas las categor&iacute;as</option>
            {CATEGORIAS_GASTO.map(c => (
              <option key={c} value={c}>{CATEGORIAS_GASTO_LABEL[c] || c}</option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Wallet className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-lg font-medium">No hay gastos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">C&oacute;digo</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Descripci&oacute;n</th>
                  <th className="px-3 py-2 text-left">Proyecto</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Categor&iacute;a</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(g => (
                  <tr key={g.id_gasto} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs font-medium text-brand-700">{g.codigo}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDate(g.fecha)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{g.descripcion}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{g.proyecto_nombre || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${g.tipo === 'GENERAL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {TIPOS_GASTO_LABEL[g.tipo] || g.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{CATEGORIAS_GASTO_LABEL[g.categoria] || g.categoria}</td>
                    <td className="px-3 py-2 text-right font-medium text-red-700">{formatCurrency(g.monto)}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditId(g.id_gasto); setShowForm(true); }} className="p-1 hover:bg-gray-200 rounded text-blue-700" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {(profile?.rol === 'ROOT' || profile?.rol === 'ADMIN') && (
                          <button onClick={() => eliminar(g)} className="p-1 hover:bg-red-100 rounded text-red-700" title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showForm && (
        <GastoFormModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditId(null); cargar(); }}
          gastoId={editId}
          profile={profile}
        />
      )}
    </div>
  );
}
