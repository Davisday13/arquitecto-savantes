import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Eye, Pencil, Trash2, RefreshCw,
} from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../lib/supabase';
import { TIPOS_CLIENTE, TIPOS_CLIENTE_LABEL } from '../lib/constants';
import ClienteRapidoModal from './ClienteRapidoModal';

export default function ClientesView({ profile }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCliente, setEditCliente] = useState(null);

  const cargar = async () => {
    setLoading(true);
    let query = supabase.from('clientes').select('*').order('nombre');
    if (filtroTipo) query = query.eq('tipo_cliente', filtroTipo);
    const { data, error } = await query;
    if (!error) setClientes(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtroTipo]);

  const filtrados = clientes.filter(c => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return c.nombre?.toLowerCase().includes(q) || c.numero_cliente?.toLowerCase().includes(q) ||
      c.ruc_cedula?.toLowerCase().includes(q) || c.contacto_nombre?.toLowerCase().includes(q);
  });

  const eliminar = async (c) => {
    if (!confirm(`Eliminar cliente ${c.nombre}?`)) return;
    await supabase.from('clientes').update({ activo: false }).eq('id_cliente', c.id_cliente);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-700" />
            Clientes
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gesti&oacute;n de clientes y contratantes</p>
        </div>
        <Button onClick={() => { setEditCliente(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Nuevo cliente</Button>
      </div>

      <Card>
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar cliente..." className="pl-8" />
          </div>
          <div className="w-48">
            <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(TIPOS_CLIENTE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>No hay clientes registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">C&oacute;digo</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">RUC/C&eacute;dula</th>
                  <th className="px-3 py-2 text-left">Contacto</th>
                  <th className="px-3 py-2 text-left">Tel&eacute;fono</th>
                  <th className="px-3 py-2 text-left">Correo</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtrados.filter(c => c.activo !== false).map(c => (
                  <tr key={c.id_cliente} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-brand-700">{c.numero_cliente}</td>
                    <td className="px-3 py-2 font-medium">{c.nombre}</td>
                    <td className="px-3 py-2">{TIPOS_CLIENTE_LABEL[c.tipo_cliente]}</td>
                    <td className="px-3 py-2 text-xs">{c.ruc_cedula || '-'}</td>
                    <td className="px-3 py-2 text-xs">{c.contacto_nombre || '-'}</td>
                    <td className="px-3 py-2 text-xs">{c.telefono || '-'}</td>
                    <td className="px-3 py-2 text-xs">{c.correo || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${c.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditCliente(c); setShowForm(true); }} className="p-1 hover:bg-blue-100 rounded text-blue-700"><Pencil className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ClienteRapidoModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditCliente(null); cargar(); }}
        editCliente={editCliente}
        onCreated={() => { setShowForm(false); setEditCliente(null); cargar(); }}
      />
    </div>
  );
}
