import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileDown, ClipboardList, MapPin, AlertCircle } from 'lucide-react';
import { Card, CardContent, Badge } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { formatDate, formatCurrency } from '../lib/utils';
import { generarEstadoCuenta } from './pdfEstadoCuenta';

export default function EstadoCuentaView({ profile }) {
  const [clientes, setClientes] = useState([]);
  const [clienteSel, setClienteSel] = useState('');
  const [items, setItems] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [soloPendientes, setSoloPendientes] = useState(true);

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id_cliente, numero_cliente, nombre, ruc_cedula, dv, telefono, correo, direccion')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setClientes(data || []));
  }, []);

  const cargar = async () => {
    if (!clienteSel) return;
    setLoading(true);
    let q = supabase
      .from('v_estado_cuenta')
      .select('*')
      .eq('id_cliente', clienteSel)
      .order('fecha_documento', { ascending: false });
    if (filtroDesde) q = q.gte('fecha_documento', filtroDesde);
    if (filtroHasta) q = q.lte('fecha_documento', filtroHasta);
    if (soloPendientes) q = q.gt('saldo', 0);

    const { data: itemsData } = await q;
    setItems(itemsData || []);

    let qp = supabase
      .from('v_pagos_completa')
      .select('*')
      .eq('id_cliente', clienteSel)
      .eq('estado', 'CONFIRMADO')
      .order('fecha_pago', { ascending: false });
    if (filtroDesde) qp = qp.gte('fecha_pago', filtroDesde);
    if (filtroHasta) qp = qp.lte('fecha_pago', filtroHasta);

    const { data: pagosData } = await qp;
    setPagos(pagosData || []);
    setLoading(false);
  };

  useEffect(() => {
    if (clienteSel) cargar();
  }, [clienteSel, filtroDesde, filtroHasta, soloPendientes]);

  const totalDoc = items.reduce((s, i) => s + Number(i.monto_total || 0), 0);
  const totalPagado = items.reduce((s, i) => s + Number(i.monto_pagado || 0), 0);
  const totalSaldo = items.reduce((s, i) => s + Number(i.saldo || 0), 0);

  const cliente = clientes.find(c => c.id_cliente === clienteSel);

  const descargar = async () => {
    if (!cliente) return;
    try {
      const { data: empresa } = await supabase.from('configuracion_empresa').select('*').eq('id', 1).single();
      generarEstadoCuenta({
        cliente,
        items,
        pagos,
        empresa,
        desde: filtroDesde,
        hasta: filtroHasta,
        soloPendientes,
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estado de cuenta</h1>
        <p className="text-sm text-gray-500">Saldo y movimientos por cliente</p>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="md:col-span-2">
              <Select
                label="Cliente"
                value={clienteSel}
                onChange={e => setClienteSel(e.target.value)}
              >
                <option value="">— Selecciona un cliente —</option>
                {clientes.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.numero_cliente} · {c.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <Input
              label="Desde"
              type="date"
              value={filtroDesde}
              onChange={e => setFiltroDesde(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={filtroHasta}
              onChange={e => setFiltroHasta(e.target.value)}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloPendientes}
              onChange={e => setSoloPendientes(e.target.checked)}
              className="h-4 w-4 rounded text-brand-700"
            />
            Mostrar solo documentos con saldo pendiente
          </label>
        </CardContent>
      </Card>

      {!clienteSel ? (
        <Card>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Selecciona un cliente para ver su estado de cuenta</p>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent>
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="text-center">
                <div className="text-xs text-gray-500 uppercase">Total facturado</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalDoc)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <div className="text-xs text-gray-500 uppercase">Total pagado</div>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPagado)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <div className="text-xs text-gray-500 uppercase">Saldo pendiente</div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalSaldo)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Botón de descarga */}
          <div className="flex justify-end">
            <Button onClick={descargar} disabled={items.length === 0 && pagos.length === 0}>
              <FileDown className="h-4 w-4" /> Descargar estado de cuenta
            </Button>
          </div>

          {/* Tabla de documentos */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Documentos</h3>
              {items.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  {soloPendientes ? 'Sin documentos pendientes' : 'Sin documentos en el rango'}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="pb-2 pr-3 font-medium">Tipo</th>
                        <th className="pb-2 pr-3 font-medium">Documento</th>
                        <th className="pb-2 pr-3 font-medium">Fecha</th>
                        <th className="pb-2 pr-3 font-medium">Descripción</th>
                        <th className="pb-2 pr-3 font-medium text-right">Total</th>
                        <th className="pb-2 pr-3 font-medium text-right">Pagado</th>
                        <th className="pb-2 pr-3 font-medium text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(i => (
                        <tr key={i.id_documento} className="border-b border-gray-100">
                          <td className="py-2 pr-3">
                            {i.tipo_documento === 'ORDEN' ? (
                              <Badge variant="primary"><ClipboardList className="h-3 w-3 inline mr-1" />Orden</Badge>
                            ) : (
                              <Badge variant="success"><MapPin className="h-3 w-3 inline mr-1" />Visita</Badge>
                            )}
                          </td>
                          <td className="py-2 pr-3 font-mono text-xs">{i.numero_documento}</td>
                          <td className="py-2 pr-3 text-gray-500 text-xs">{formatDate(i.fecha_documento)}</td>
                          <td className="py-2 pr-3 text-gray-600 max-w-[300px] truncate">{i.descripcion}</td>
                          <td className="py-2 pr-3 text-right">{formatCurrency(i.monto_total)}</td>
                          <td className="py-2 pr-3 text-right text-emerald-600">{formatCurrency(i.monto_pagado)}</td>
                          <td className="py-2 pr-3 text-right font-bold text-red-600">{formatCurrency(i.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold border-t-2">
                        <td colSpan={4} className="py-2 pr-3 text-right">TOTALES:</td>
                        <td className="py-2 pr-3 text-right">{formatCurrency(totalDoc)}</td>
                        <td className="py-2 pr-3 text-right text-emerald-600">{formatCurrency(totalPagado)}</td>
                        <td className="py-2 pr-3 text-right text-red-600">{formatCurrency(totalSaldo)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabla de pagos */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Historial de pagos</h3>
              {pagos.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">Sin pagos registrados</div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="pb-2 pr-3 font-medium">Recibo</th>
                        <th className="pb-2 pr-3 font-medium">Factura</th>
                        <th className="pb-2 pr-3 font-medium">Fecha</th>
                        <th className="pb-2 pr-3 font-medium">Aplicado a</th>
                        <th className="pb-2 pr-3 font-medium">Método</th>
                        <th className="pb-2 pr-3 font-medium text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagos.map(p => (
                        <tr key={p.id_pago} className="border-b border-gray-100">
                          <td className="py-2 pr-3 font-mono text-xs">{p.numero_recibo}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{p.numero_factura || '—'}</td>
                          <td className="py-2 pr-3 text-gray-500 text-xs">{formatDate(p.fecha_pago)}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{p.documento_referencia}</td>
                          <td className="py-2 pr-3 text-xs">{p.metodo_pago}</td>
                          <td className="py-2 pr-3 text-right font-medium">{formatCurrency(p.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
