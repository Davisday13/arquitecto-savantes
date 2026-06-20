import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Eye, Edit2, UserPlus, Cpu, FileDown } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import {
  ESTADOS_ORDEN_LABEL, ESTADOS_ORDEN_COLOR,
  ROLES, TIPOS_CLIENTE_LABEL, TIPOS_EQUIPO,
  ESTADO_PAGO_LABEL, ESTADO_PAGO_COLOR,
} from '../lib/constants';
import { formatDate, formatCurrency } from '../lib/utils';
import OrdenDetalleModal from './OrdenDetalleModal';
import { generarPDFOrden } from './pdfOrden';

export default function OrdenesView({ profile }) {
  const [ordenes, setOrdenes] = useState([]);
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
    const [ordenesRes, clientesRes, tecnicosRes] = await Promise.all([
      supabase.from('v_ordenes_completa').select('*').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id_cliente, numero_cliente, nombre, tipo_cliente, telefono, correo').eq('activo', true).order('nombre'),
      supabase.from('usuarios').select('id, nombre_completo, rol').in('rol', ['TECNICO', 'ADMIN', 'ROOT']).eq('activo', true).order('nombre_completo'),
    ]);
    if (!ordenesRes.error) setOrdenes(ordenesRes.data || []);
    if (!clientesRes.error) setClientes(clientesRes.data || []);
    if (!tecnicosRes.error) setTecnicos(tecnicosRes.data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtradas = ordenes.filter(o => {
    if (filtroEstado && o.estado !== filtroEstado) return false;
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return [o.numero_ticket, o.cliente_nombre, o.numero_serie, o.marca, o.modelo, o.falla_reportada]
      .some(v => v?.toLowerCase().includes(t));
  });

  const verDetalle = (o) => {
    setDetalleId(o.id_orden);
    setShowDetalle(true);
  };

  const editar = (o) => {
    setEditing(o);
    setShowForm(true);
  };

  const descargarPDF = async (o) => {
    try {
      const { data: empresa } = await supabase.from('configuracion_empresa').select('*').eq('id', 1).single();
      const { data: full } = await supabase.from('v_ordenes_completa').select('*').eq('id_orden', o.id_orden).single();
      const { data: repuestos } = await supabase.from('orden_repuestos').select('*').eq('id_orden', o.id_orden).order('created_at');
      const { data: manoObra } = await supabase.from('orden_mano_obra').select('*').eq('id_orden', o.id_orden).order('created_at');
      generarPDFOrden(full, repuestos || [], manoObra || [], empresa);
    } catch (err) {
      alert('Error generando PDF: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Órdenes de Taller</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Nueva orden
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por ticket, cliente, equipo, serie, falla..."
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
              {Object.entries(ESTADOS_ORDEN_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {search || filtroEstado ? 'No se encontraron órdenes' : 'No hay órdenes registradas.'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="pb-2 pr-3 font-medium">Ticket</th>
                    <th className="pb-2 pr-3 font-medium">Cliente</th>
                    <th className="pb-2 pr-3 font-medium">Equipo</th>
                    <th className="pb-2 pr-3 font-medium">Falla</th>
                    <th className="pb-2 pr-3 font-medium">Técnico</th>
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 pr-3 font-medium">Total</th>
                    <th className="pb-2 pr-3 font-medium">Pago</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 pr-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(o => (
                    <tr key={o.id_orden} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-3 font-mono text-xs font-semibold">{o.numero_ticket}</td>
                      <td className="py-2 pr-3">{o.cliente_nombre}</td>
                      <td className="py-2 pr-3 text-gray-600 text-xs">
                        <div>{o.tipo_equipo} {o.marca}</div>
                        <div className="font-mono">{o.numero_serie}</div>
                      </td>
                      <td className="py-2 pr-3 text-gray-600 max-w-[200px] truncate" title={o.falla_reportada}>
                        {o.falla_reportada}
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{o.tecnico_nombre || '-'}</td>
                      <td className="py-2 pr-3 text-gray-500 text-xs">{formatDate(o.fecha_entrada)}</td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {Number(o.total_general) > 0 ? formatCurrency(o.total_general) : '-'}
                      </td>
                      <td className="py-2 pr-3">
                        {Number(o.total_general) > 0 ? (
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${ESTADO_PAGO_COLOR[o.estado_pago]}`}>
                            {ESTADO_PAGO_LABEL[o.estado_pago]}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${ESTADOS_ORDEN_COLOR[o.estado]}`}>
                          {ESTADOS_ORDEN_LABEL[o.estado]}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => verDetalle(o)}
                            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => descargarPDF(o)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Descargar PDF"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                          {profile?.rol !== ROLES.CLIENTE && (
                            <button
                              onClick={() => editar(o)}
                              className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
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
        </CardContent>
      </Card>

      <OrdenForm
        open={showForm}
        onClose={() => setShowForm(false)}
        orden={editing}
        clientes={clientes}
        tecnicos={tecnicos}
        userId={profile?.id}
        onSaved={() => { setShowForm(false); cargar(); }}
        onClienteCreated={() => cargar()}
      />

      <OrdenDetalleModal
        open={showDetalle}
        onClose={() => { setShowDetalle(false); cargar(); }}
        ordenId={detalleId}
        profile={profile}
      />
    </div>
  );
}

// =============================================================
// FORMULARIO DE ORDEN con creación rápida de cliente y equipo
// =============================================================
function OrdenForm({ open, onClose, orden, clientes, tecnicos, userId, onSaved, onClienteCreated }) {
  const [form, setForm] = useState({
    id_cliente: '', id_equipo: '', falla_reportada: '',
    estado: 'RECIBIDO', id_tecnico_asignado: '', notas: '',
    costo_diagnostico: 0,
    fecha_diagnostico_prometida: '',
  });
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showEquipoModal, setShowEquipoModal] = useState(false);
  const [costoDiagDefault, setCostoDiagDefault] = useState(0);

  // Cargar el costo de diagnóstico por defecto
  useEffect(() => {
    if (open && !orden) {
      supabase.from('configuracion_empresa').select('costo_diagnostico_default').eq('id', 1).single()
        .then(({ data }) => {
          const def = Number(data?.costo_diagnostico_default || 0);
          setCostoDiagDefault(def);
          setForm(f => ({ ...f, costo_diagnostico: def }));
        });
    }
  }, [open, orden]);

  useEffect(() => {
    if (open) {
      setError('');
      if (orden) {
        setForm({
          id_cliente: orden.id_cliente || '',
          id_equipo: orden.id_equipo || '',
          falla_reportada: orden.falla_reportada || '',
          estado: orden.estado || 'RECIBIDO',
          id_tecnico_asignado: orden.id_tecnico_asignado || '',
          notas: orden.notas || '',
          costo_diagnostico: Number(orden.costo_diagnostico || 0),
          fecha_diagnostico_prometida: orden.fecha_diagnostico_prometida || '',
        });
      } else {
        // Default: hoy + 2 días para diagnóstico
        const fechaDefault = new Date();
        fechaDefault.setDate(fechaDefault.getDate() + 2);
        setForm({
          id_cliente: '', id_equipo: '', falla_reportada: '',
          estado: 'RECIBIDO', id_tecnico_asignado: '', notas: '',
          costo_diagnostico: costoDiagDefault,
          fecha_diagnostico_prometida: fechaDefault.toISOString().split('T')[0],
        });
      }
    }
  }, [open, orden]);

  const cargarEquiposCliente = async (clienteId) => {
    if (!clienteId) return setEquipos([]);
    const { data } = await supabase
      .from('equipos')
      .select('id_equipo, tipo_equipo, marca, modelo, numero_serie')
      .eq('id_cliente', clienteId)
      .eq('activo', true)
      .order('tipo_equipo');
    setEquipos(data || []);
  };

  useEffect(() => {
    cargarEquiposCliente(form.id_cliente);
  }, [form.id_cliente]);

  const handleClienteCreado = (nuevoCliente) => {
    setForm(f => ({ ...f, id_cliente: nuevoCliente.id_cliente, id_equipo: '' }));
    setShowClienteModal(false);
    onClienteCreated?.();
  };

  const handleEquipoCreado = (nuevoEquipo) => {
    cargarEquiposCliente(form.id_cliente);
    setForm(f => ({ ...f, id_equipo: nuevoEquipo.id_equipo }));
    setShowEquipoModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_cliente) return setError('Selecciona un cliente');
    if (!form.id_equipo) return setError('Selecciona un equipo');
    if (!form.falla_reportada.trim()) return setError('Describe la falla reportada');
    if (!form.fecha_diagnostico_prometida) return setError('Establece la fecha posible de diagnóstico');

    setLoading(true);
    setError('');
    try {
      const payload = {
        id_cliente: form.id_cliente,
        id_equipo: form.id_equipo,
        falla_reportada: form.falla_reportada,
        estado: form.estado,
        id_tecnico_asignado: form.id_tecnico_asignado || null,
        notas: form.notas || null,
        costo_diagnostico: Number(form.costo_diagnostico) || 0,
        fecha_diagnostico_prometida: form.fecha_diagnostico_prometida,
      };
      if (orden) {
        const { error } = await supabase.from('ordenes_taller').update(payload).eq('id_orden', orden.id_orden);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ordenes_taller').insert({
          ...payload, recibido_por: userId,
        });
        if (error) throw error;
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={orden ? `Editar orden ${orden.numero_ticket}` : 'Nueva orden de taller'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

          {/* Cliente con botón rápido */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Cliente *</label>
            <div className="flex gap-2">
              <select
                value={form.id_cliente}
                onChange={e => setForm({ ...form, id_cliente: e.target.value, id_equipo: '' })}
                disabled={!!orden}
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100"
              >
                <option value="">— Selecciona —</option>
                {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}
              </select>
              {!orden && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowClienteModal(true)}
                  title="Crear nuevo cliente"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nuevo</span>
                </Button>
              )}
            </div>
          </div>

          {/* Equipo con botón rápido */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Equipo *</label>
            <div className="flex gap-2">
              <select
                value={form.id_equipo}
                onChange={e => setForm({ ...form, id_equipo: e.target.value })}
                disabled={!!orden || !form.id_cliente}
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100"
              >
                <option value="">{form.id_cliente ? '— Selecciona —' : 'Selecciona cliente primero'}</option>
                {equipos.map(eq => (
                  <option key={eq.id_equipo} value={eq.id_equipo}>
                    {eq.tipo_equipo} - {eq.marca} {eq.modelo} ({eq.numero_serie})
                  </option>
                ))}
              </select>
              {!orden && form.id_cliente && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEquipoModal(true)}
                  title="Crear nuevo equipo"
                >
                  <Cpu className="h-4 w-4" />
                  <span className="hidden sm:inline">Nuevo</span>
                </Button>
              )}
            </div>
          </div>

          <Textarea
            label="Falla reportada *"
            value={form.falla_reportada}
            onChange={e => setForm({ ...form, falla_reportada: e.target.value })}
            rows={3}
            required
            placeholder="Describe el problema reportado por el cliente..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Técnico asignado"
              value={form.id_tecnico_asignado}
              onChange={e => setForm({ ...form, id_tecnico_asignado: e.target.value })}
            >
              <option value="">— Sin asignar —</option>
              {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
            </Select>

            <Select
              label="Estado"
              value={form.estado}
              onChange={e => setForm({ ...form, estado: e.target.value })}
            >
              {Object.entries(ESTADOS_ORDEN_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>

          {/* Fecha posible de diagnóstico */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <Input
              type="date"
              label="📅 Fecha posible de diagnóstico *"
              value={form.fecha_diagnostico_prometida}
              onChange={e => setForm({ ...form, fecha_diagnostico_prometida: e.target.value })}
              required
            />
            <p className="text-xs text-blue-700 mt-1">
              Cuándo prometemos al cliente tener el diagnóstico listo. Aparece en el calendario y genera alertas si se atrasa.
            </p>
          </div>

          {/* Costo de diagnóstico */}
          <div className="bg-amber-50 border border-amber-200 rounded p-3">
            <Input
              label="Costo de diagnóstico (a cobrar al recibir)"
              type="number" step="0.01" min="0"
              value={form.costo_diagnostico}
              onChange={e => setForm({ ...form, costo_diagnostico: e.target.value })}
            />
            <p className="text-xs text-amber-700 mt-1">
              Este monto se cobra al recibir. Si el cliente autoriza la reparación, se descuenta del total final.
            </p>
          </div>

          <Textarea
            label="Notas internas"
            value={form.notas}
            onChange={e => setForm({ ...form, notas: e.target.value })}
            rows={2}
          />

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
            <Button type="submit" loading={loading}>
              {orden ? 'Guardar cambios' : 'Crear orden'}
            </Button>
          </div>
        </form>
      </Modal>

      <ClienteRapidoModal
        open={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        userId={userId}
        onCreated={handleClienteCreado}
      />

      <EquipoRapidoModal
        open={showEquipoModal}
        onClose={() => setShowEquipoModal(false)}
        idCliente={form.id_cliente}
        userId={userId}
        onCreated={handleEquipoCreado}
      />
    </>
  );
}

// =============================================================
// MODAL DE CREACIÓN RÁPIDA DE CLIENTE
// =============================================================
function ClienteRapidoModal({ open, onClose, userId, onCreated }) {
  const [form, setForm] = useState({
    tipo_cliente: 'EMPRESA', nombre: '', ruc_cedula: '', dv: '',
    contacto_nombre: '', telefono: '', correo: '', direccion: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        tipo_cliente: 'EMPRESA', nombre: '', ruc_cedula: '', dv: '',
        contacto_nombre: '', telefono: '', correo: '', direccion: '',
      });
      setError('');
    }
  }, [open]);

  const generarNumero = async () => {
    const { count } = await supabase.from('clientes').select('id_cliente', { count: 'exact', head: true });
    return `C-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('Nombre es obligatorio');
    setLoading(true);
    try {
      const numero_cliente = await generarNumero();
      const { data, error } = await supabase
        .from('clientes')
        .insert({ ...form, numero_cliente, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      onCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Crear cliente rápido" size="md">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

        <div className="grid grid-cols-3 gap-3">
          <Select
            label="Tipo"
            value={form.tipo_cliente}
            onChange={e => setForm({ ...form, tipo_cliente: e.target.value })}
          >
            {Object.entries(TIPOS_CLIENTE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Input
            label={form.tipo_cliente === 'EMPRESA' ? 'RUC' : 'Cédula'}
            value={form.ruc_cedula}
            onChange={e => setForm({ ...form, ruc_cedula: e.target.value })}
          />
          <Input
            label="DV"
            value={form.dv}
            onChange={e => setForm({ ...form, dv: e.target.value })}
            maxLength={3}
          />
        </div>

        <Input
          label={form.tipo_cliente === 'EMPRESA' ? 'Razón social *' : 'Nombre completo *'}
          value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })}
          required
        />

        {form.tipo_cliente === 'EMPRESA' && (
          <Input
            label="Contacto"
            value={form.contacto_nombre}
            onChange={e => setForm({ ...form, contacto_nombre: e.target.value })}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={e => setForm({ ...form, telefono: e.target.value })}
          />
          <Input
            label="Correo"
            type="email"
            value={form.correo}
            onChange={e => setForm({ ...form, correo: e.target.value })}
          />
        </div>

        <Input
          label="Dirección"
          value={form.direccion}
          onChange={e => setForm({ ...form, direccion: e.target.value })}
        />

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" loading={loading}>Crear y seleccionar</Button>
        </div>
      </form>
    </Modal>
  );
}

// =============================================================
// MODAL DE CREACIÓN RÁPIDA DE EQUIPO
// =============================================================
function EquipoRapidoModal({ open, onClose, idCliente, userId, onCreated }) {
  const [form, setForm] = useState({
    tipo_equipo: 'IMPRESORA', marca: '', modelo: '', numero_serie: '', ubicacion: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ tipo_equipo: 'IMPRESORA', marca: '', modelo: '', numero_serie: '', ubicacion: '' });
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idCliente) return setError('Falta cliente');
    if (!form.numero_serie.trim()) return setError('Número de serie obligatorio');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipos')
        .insert({ ...form, id_cliente: idCliente, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      onCreated(data);
    } catch (err) {
      if (err.message?.includes('duplicate')) {
        setError('Este número de serie ya existe para este cliente');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Crear equipo rápido" size="md">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo *"
            value={form.tipo_equipo}
            onChange={e => setForm({ ...form, tipo_equipo: e.target.value })}
          >
            {TIPOS_EQUIPO.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input
            label="Serie *"
            value={form.numero_serie}
            onChange={e => setForm({ ...form, numero_serie: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Marca"
            value={form.marca}
            onChange={e => setForm({ ...form, marca: e.target.value })}
          />
          <Input
            label="Modelo"
            value={form.modelo}
            onChange={e => setForm({ ...form, modelo: e.target.value })}
          />
        </div>

        <Input
          label="Ubicación"
          value={form.ubicacion}
          onChange={e => setForm({ ...form, ubicacion: e.target.value })}
        />

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" loading={loading}>Crear y seleccionar</Button>
        </div>
      </form>
    </Modal>
  );
}
