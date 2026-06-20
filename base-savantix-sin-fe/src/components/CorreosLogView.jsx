import React, { useState, useEffect } from 'react';
import { Mail, Search, Filter, RefreshCw, AlertCircle, Check, Clock, Eye } from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import Modal from './ui/Modal';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/utils';

const ESTADO_BADGES = {
  PENDIENTE:  { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-800', icon: Clock },
  ENVIADO:    { label: 'Enviado',   cls: 'bg-blue-100 text-blue-800',     icon: Mail },
  ENTREGADO:  { label: 'Entregado', cls: 'bg-emerald-100 text-emerald-800', icon: Check },
  ABIERTO:    { label: 'Abierto',   cls: 'bg-emerald-100 text-emerald-800', icon: Check },
  REBOTADO:   { label: 'Rebotado',  cls: 'bg-red-100 text-red-800',       icon: AlertCircle },
  FALLIDO:    { label: 'Fallido',   cls: 'bg-red-100 text-red-800',       icon: AlertCircle },
};

const TIPOS_DOC = {
  ORDEN: 'Orden de Taller',
  VISITA: 'Visita',
  RECIBO: 'Recibo de Pago',
  PRESUPUESTO: 'Presupuesto',
  VENTA_DIRECTA: 'Venta Directa',
  ESTADO_CUENTA: 'Estado de Cuenta',
  FACTURA: 'Factura',
  OTRO: 'Otro',
};

export default function CorreosLogView() {
  const [correos, setCorreos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [detalleId, setDetalleId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    let query = supabase
      .from('v_correos_completa')
      .select('*')
      .order('fecha_envio', { ascending: false })
      .limit(500);

    if (filtroEstado) query = query.eq('estado', filtroEstado);
    if (filtroTipo) query = query.eq('tipo_documento', filtroTipo);
    if (fechaDesde) query = query.gte('fecha_envio', fechaDesde);
    if (fechaHasta) query = query.lte('fecha_envio', fechaHasta + 'T23:59:59');

    const { data, error } = await query;
    if (!error) setCorreos(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtroEstado, filtroTipo, fechaDesde, fechaHasta]);

  // Filtrado en cliente por búsqueda
  const correosFiltrados = correos.filter((c) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      c.destinatario_email?.toLowerCase().includes(q) ||
      c.cliente_nombre?.toLowerCase().includes(q) ||
      c.asunto?.toLowerCase().includes(q) ||
      c.documento_referencia?.toLowerCase().includes(q) ||
      c.orden_numero?.toLowerCase().includes(q) ||
      c.visita_numero?.toLowerCase().includes(q) ||
      c.recibo_numero?.toLowerCase().includes(q)
    );
  });

  const totalEnviados = correos.filter(c => c.estado === 'ENVIADO' || c.estado === 'ENTREGADO' || c.estado === 'ABIERTO').length;
  const totalFallidos = correos.filter(c => c.estado === 'FALLIDO' || c.estado === 'REBOTADO').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-brand-700" />
            Historial de Correos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro de todos los correos enviados desde Savantix
          </p>
        </div>
        <Button onClick={cargar} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Recargar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Total enviados</div>
          <div className="text-2xl font-bold text-gray-900">{correos.length}</div>
        </Card>
        <Card>
          <div className="text-xs text-emerald-600 uppercase tracking-wider">Exitosos</div>
          <div className="text-2xl font-bold text-emerald-700">{totalEnviados}</div>
        </Card>
        <Card>
          <div className="text-xs text-red-600 uppercase tracking-wider">Con problemas</div>
          <div className="text-2xl font-bold text-red-700">{totalFallidos}</div>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Email, cliente, documento..."
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ESTADO_BADGES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
            <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(TIPOS_DOC).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : correosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Mail className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>No hay correos para mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Destinatario</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Documento</th>
                  <th className="px-3 py-2 text-left">Asunto</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {correosFiltrados.map((c) => {
                  const badge = ESTADO_BADGES[c.estado] || ESTADO_BADGES.PENDIENTE;
                  const Icon = badge.icon;
                  const docNumero = c.orden_numero || c.visita_numero || c.recibo_numero || c.documento_referencia || '—';

                  return (
                    <tr key={c.id_correo} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                        {formatDateTime(c.fecha_envio)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{c.destinatario_email}</div>
                        {c.cliente_nombre && (
                          <div className="text-xs text-gray-500">{c.cliente_nombre}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                        {TIPOS_DOC[c.tipo_documento] || c.tipo_documento}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{docNumero}</td>
                      <td className="px-3 py-2 max-w-xs truncate" title={c.asunto}>{c.asunto}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
                          <Icon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setDetalleId(c.id_correo)}
                          className="text-brand-700 hover:text-brand-900"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal detalle */}
      {detalleId && (
        <DetalleCorreoModal
          id={detalleId}
          onClose={() => setDetalleId(null)}
        />
      )}
    </div>
  );
}

// =============================================================
// Modal de detalle de un correo
// =============================================================
function DetalleCorreoModal({ id, onClose }) {
  const [correo, setCorreo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('v_correos_completa')
      .select('*')
      .eq('id_correo', id)
      .single()
      .then(({ data }) => {
        setCorreo(data);
        setLoading(false);
      });
  }, [id]);

  return (
    <Modal open={true} onClose={onClose} title="Detalle del correo" size="lg">
      {loading ? (
        <div className="p-8 text-center text-gray-500">Cargando...</div>
      ) : !correo ? (
        <div className="p-8 text-center text-gray-500">No se encontró el correo</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 uppercase">Para</div>
              <div className="font-medium">{correo.destinatario_email}</div>
              {correo.destinatario_nombre && (
                <div className="text-xs text-gray-500">{correo.destinatario_nombre}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Estado</div>
              <div className="font-medium">{ESTADO_BADGES[correo.estado]?.label || correo.estado}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Fecha</div>
              <div>{formatDateTime(correo.fecha_envio)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Enviado por</div>
              <div>{correo.usuario_nombre || correo.enviado_por_nombre || '—'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-gray-500 uppercase">Asunto</div>
              <div className="font-medium">{correo.asunto}</div>
            </div>
            {correo.pdf_nombre && (
              <div className="col-span-2">
                <div className="text-xs text-gray-500 uppercase">Adjunto</div>
                <div className="text-sm text-blue-700">📎 {correo.pdf_nombre} ({correo.pdf_size_kb} KB)</div>
              </div>
            )}
            {correo.resend_id && (
              <div className="col-span-2">
                <div className="text-xs text-gray-500 uppercase">Resend ID</div>
                <div className="font-mono text-xs">{correo.resend_id}</div>
              </div>
            )}
            {correo.error_mensaje && (
              <div className="col-span-2">
                <div className="text-xs text-red-600 uppercase">Error</div>
                <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{correo.error_mensaje}</div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-gray-500 uppercase mb-1">Vista previa del mensaje</div>
            <div className="border border-gray-200 rounded overflow-hidden max-h-96 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: correo.cuerpo_html || '<p class="p-4">Sin contenido</p>' }} />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
