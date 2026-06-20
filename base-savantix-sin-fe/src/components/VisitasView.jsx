import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Eye, Edit2, FileDown } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input, Select, Textarea } from './ui/Input';
import {
  TIPOS_VISITA, TIPOS_VISITA_LABEL, ESTADOS_VISITA, ESTADOS_VISITA_LABEL, ESTADOS_VISITA_COLOR, ROLES,
  ESTADO_PAGO_LABEL, ESTADO_PAGO_COLOR,
} from '../lib/constants';
import { formatDate, formatCurrency } from '../lib/utils';
import VisitaDetalleModal from './VisitaDetalleModal';
import { generarPDFVisita } from './pdfVisita';

export default function VisitasView({ profile }) {
  const [visitas, setVisitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetalle, setShowDetalle] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detalleId, setDetalleId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const [vRes, cRes, tRes] = await Promise.all([
      supabase.from('v_visitas_completa').select('*').order('fecha_visita', { ascending: false }).limit(200),
      supabase.from('clientes').select('id_cliente, numero_cliente, nombre, direccion, telefono, correo').eq('activo', true).order('nombre'),
      supabase.from('usuarios').select('id, nombre_completo').in('rol', ['TECNICO', 'ADMIN', 'ROOT']).eq('activo', true).order('nombre_completo'),
    ]);
    if (!vRes.error) setVisitas(vRes.data || []);
    if (!cRes.error) setClientes(cRes.data || []);
    if (!tRes.error) setTecnicos(tRes.data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtradas = visitas.filter(v => {
    if (filtroEstado && v.estado !== filtroEstado) return false;
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return [v.numero_visita, v.cliente_nombre, v.motivo, v.tipo_visita, v.tecnico_nombre]
      .some(x => x?.toLowerCase().includes(t));
  });

  const descargarPDF = async (v) => {
    try {
      const { data: empresa } = await supabase.from('configuracion_empresa').select('*').eq('id', 1).single();
      // Recargar la visita completa con firma y fotos
      const { data: full } = await supabase.from('v_visitas_completa').select('*').eq('id_visita', v.id_visita).single();
      generarPDFVisita(full, empresa);
    } catch (err) {
      alert('Error generando PDF: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Visitas en Sitio</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Nueva visita
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, cliente, motivo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_VISITA_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {search || filtroEstado ? 'No se encontraron visitas' : 'No hay visitas registradas.'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="pb-2 pr-3 font-medium">Número</th>
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 pr-3 font-medium">Cliente</th>
                    <th className="pb-2 pr-3 font-medium">Tipo</th>
                    <th className="pb-2 pr-3 font-medium">Motivo</th>
                    <th className="pb-2 pr-3 font-medium">Técnico</th>
                    <th className="pb-2 pr-3 font-medium">Costo</th>
                    <th className="pb-2 pr-3 font-medium">Pago</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 pr-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(v => (
                    <tr key={v.id_visita} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-3 font-mono text-xs font-semibold">{v.numero_visita}</td>
                      <td className="py-2 pr-3 text-gray-500 text-xs">{formatDate(v.fecha_visita)}</td>
                      <td className="py-2 pr-3">{v.cliente_nombre}</td>
                      <td className="py-2 pr-3 text-gray-600 text-xs">{TIPOS_VISITA_LABEL[v.tipo_visita]}</td>
                      <td className="py-2 pr-3 text-gray-600 max-w-[200px] truncate" title={v.motivo}>{v.motivo}</td>
                      <td className="py-2 pr-3 text-gray-600">{v.tecnico_nombre || '-'}</td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {Number(v.costo_visita) > 0 ? formatCurrency(v.costo_visita) : '-'}
                      </td>
                      <td className="py-2 pr-3">
                        {Number(v.costo_visita) > 0 ? (
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${ESTADO_PAGO_COLOR[v.estado_pago]}`}>
                            {ESTADO_PAGO_LABEL[v.estado_pago]}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${ESTADOS_VISITA_COLOR[v.estado]}`}>
                          {ESTADOS_VISITA_LABEL[v.estado]}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => { setDetalleId(v.id_visita); setShowDetalle(true); }}
                            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                            title="Ver / completar"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => descargarPDF(v)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Descargar PDF"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <VisitaForm
        open={showForm}
        onClose={() => setShowForm(false)}
        visita={editing}
        clientes={clientes}
        tecnicos={tecnicos}
        userId={profile?.id}
        userName={profile?.nombre_completo}
        onSaved={() => { setShowForm(false); cargar(); }}
      />

      <VisitaDetalleModal
        open={showDetalle}
        onClose={() => { setShowDetalle(false); cargar(); }}
        visitaId={detalleId}
        profile={profile}
      />
    </div>
  );
}

function VisitaForm({ open, onClose, visita, clientes, tecnicos, userId, userName, onSaved }) {
  const [form, setForm] = useState({
    id_cliente: '', tipo_visita: 'ASISTENCIA', fecha_visita: new Date().toISOString().split('T')[0],
    motivo: '', direccion_visita: '', id_tecnico: '', costo_visita: 0, costo_itbms_pct: 7,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm({
        id_cliente: '', tipo_visita: 'ASISTENCIA', fecha_visita: new Date().toISOString().split('T')[0],
        motivo: '', direccion_visita: '', id_tecnico: userId || '', costo_visita: 0, costo_itbms_pct: 7,
      });
    }
  }, [open, userId]);

  // Auto-llenar dirección con la del cliente
  useEffect(() => {
    if (!form.id_cliente) return;
    const c = clientes.find(x => x.id_cliente === form.id_cliente);
    if (c?.direccion && !form.direccion_visita) {
      setForm(f => ({ ...f, direccion_visita: c.direccion }));
    }
  }, [form.id_cliente]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_cliente) return setError('Selecciona un cliente');
    if (!form.motivo.trim()) return setError('Describe el motivo de la visita');

    setLoading(true);
    setError('');
    try {
      const tecnicoSel = tecnicos.find(t => t.id === form.id_tecnico);
      const { error } = await supabase.from('visitas').insert({
        id_cliente: form.id_cliente,
        tipo_visita: form.tipo_visita,
        fecha_visita: form.fecha_visita,
        motivo: form.motivo,
        direccion_visita: form.direccion_visita || null,
        id_tecnico: form.id_tecnico || null,
        tecnico_nombre: tecnicoSel?.nombre_completo || null,
        costo_visita: Number(form.costo_visita) || 0,
        costo_itbms_pct: Number(form.costo_itbms_pct),
        estado: 'PROGRAMADA',
        created_by: userId,
      });
      if (error) throw error;
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva visita en sitio" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Cliente *"
            value={form.id_cliente}
            onChange={e => setForm({ ...form, id_cliente: e.target.value })}
            required
          >
            <option value="">— Selecciona —</option>
            {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}
          </Select>

          <Select
            label="Tipo de visita"
            value={form.tipo_visita}
            onChange={e => setForm({ ...form, tipo_visita: e.target.value })}
          >
            {Object.entries(TIPOS_VISITA_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Fecha de visita"
            type="date"
            value={form.fecha_visita}
            onChange={e => setForm({ ...form, fecha_visita: e.target.value })}
          />
          <Select
            label="Técnico asignado"
            value={form.id_tecnico}
            onChange={e => setForm({ ...form, id_tecnico: e.target.value })}
          >
            <option value="">— Sin asignar —</option>
            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
          </Select>
        </div>

        <Textarea
          label="Motivo / Solicitud del cliente *"
          value={form.motivo}
          onChange={e => setForm({ ...form, motivo: e.target.value })}
          rows={3}
          required
          placeholder="¿Qué solicitó el cliente? ¿Qué se va a revisar o atender?"
        />

        <Input
          label="Dirección de la visita"
          value={form.direccion_visita}
          onChange={e => setForm({ ...form, direccion_visita: e.target.value })}
        />

        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              label="Costo de la visita (Inc. ITBMS)"
              type="number" step="0.01" min="0"
              value={form.costo_visita}
              onChange={e => setForm({ ...form, costo_visita: e.target.value })}
              placeholder="0.00"
            />
            <Select
              label="Tasa ITBMS"
              value={form.costo_itbms_pct}
              onChange={e => setForm({ ...form, costo_itbms_pct: e.target.value })}
            >
              {[
                { value: 0,  label: 'Exento (0%)' },
                { value: 7,  label: 'Estándar (7%)' },
                { value: 10, label: 'Bebidas/Hospedaje (10%)' },
                { value: 15, label: 'Tabaco (15%)' },
              ].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            Si la visita tiene costo, podrás registrar pagos sobre ella desde el detalle.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" loading={loading}>Crear visita</Button>
        </div>
      </form>
    </Modal>
  );
}
