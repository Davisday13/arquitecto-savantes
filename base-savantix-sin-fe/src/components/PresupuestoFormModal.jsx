import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, AlertCircle, Save, FileText,
  Wrench, MapPin, ShoppingCart, Lightbulb,
  UserPlus, Cpu, Package,
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { registrarAuditoria, detectarCambios } from '../lib/presupuestoAuditoria';
import CatalogoAutocomplete from './CatalogoAutocomplete';
import ClienteRapidoModal from './ClienteRapidoModal';
import EquipoRapidoModal from './EquipoRapidoModal';
import RepuestoRapidoModal from './RepuestoRapidoModal';

const TIPO_DESTINO_OPTS = [
  { value: 'TALLER',        label: 'Taller (con equipo)',     icon: Wrench },
  { value: 'VISITA',        label: 'Visita técnica',          icon: MapPin },
  { value: 'VENTA_DIRECTA', label: 'Venta directa (productos)', icon: ShoppingCart },
];

const ITBMS_OPCIONES = [
  { value: 0, label: 'Exento (0%)' },
  { value: 7, label: 'Estándar (7%)' },
  { value: 10, label: 'Bebidas/Hospedaje (10%)' },
  { value: 15, label: 'Tabaco (15%)' },
];

export default function PresupuestoFormModal({ open, onClose, presupuestoId, profile }) {
  const editing = !!presupuestoId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Datos
  const [clientes, setClientes] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [empresa, setEmpresa] = useState({});

  // Form
  const [form, setForm] = useState({
    id_cliente: '',
    tipo_destino: 'TALLER',
    id_equipo: '',
    fecha_validez: '',
    requiere_firma: false,
    precios_incluyen_itbms: true,
    asunto: '',
    observaciones: '',
    condiciones: '',
    descuento_tipo: '',         // '' | 'PORCENTAJE' | 'MONTO'
    descuento_valor: 0,
    notas_internas: '',
  });

  const [items, setItems] = useState([]);
  const [showPlantillas, setShowPlantillas] = useState(false);

  // Modales rápidos de creación
  const [showClienteRapido, setShowClienteRapido] = useState(false);
  const [showEquipoRapido, setShowEquipoRapido] = useState(false);
  const [showRepuestoRapido, setShowRepuestoRapido] = useState(false);
  const [repuestoIdxDestino, setRepuestoIdxDestino] = useState(null); // a qué item asignamos el repuesto creado
  const [repuestoNombreSugerido, setRepuestoNombreSugerido] = useState('');

  // Cargar inicial
  useEffect(() => {
    if (!open) return;
    setError('');
    cargarInicial();
  }, [open, presupuestoId]);

  const cargarInicial = async () => {
    setLoading(true);

    // Empresa
    const { data: emp } = await supabase
      .from('configuracion_empresa').select('*').eq('id', 1).single();
    setEmpresa(emp || {});

    // Clientes activos
    const { data: cli } = await supabase
      .from('clientes').select('id_cliente, numero_cliente, nombre, ruc_cedula, dv, correo, telefono')
      .eq('activo', true).order('nombre');
    setClientes(cli || []);

    // Plantillas activas
    const { data: pl } = await supabase
      .from('presupuesto_plantillas').select('*')
      .eq('activa', true).order('nombre');
    setPlantillas(pl || []);

    if (editing) {
      // Cargar presupuesto existente
      const { data: presup } = await supabase
        .from('presupuestos').select('*').eq('id_presupuesto', presupuestoId).single();
      if (presup) {
        setForm({
          id_cliente: presup.id_cliente,
          tipo_destino: presup.tipo_destino,
          id_equipo: presup.id_equipo || '',
          fecha_validez: presup.fecha_validez,
          requiere_firma: presup.requiere_firma,
          precios_incluyen_itbms: presup.precios_incluyen_itbms,
          asunto: presup.asunto || '',
          observaciones: presup.observaciones || '',
          condiciones: presup.condiciones || '',
          descuento_tipo: presup.descuento_tipo || '',
          descuento_valor: Number(presup.descuento_valor) || 0,
          notas_internas: presup.notas_internas || '',
        });
      }
      // Items
      const { data: its } = await supabase
        .from('presupuesto_items').select('*').eq('id_presupuesto', presupuestoId).order('orden');
      setItems(its || []);
    } else {
      // Nuevo: defaults
      const validezDefault = new Date();
      validezDefault.setDate(validezDefault.getDate() + 15);
      setForm(f => ({
        ...f,
        fecha_validez: validezDefault.toISOString().split('T')[0],
        precios_incluyen_itbms: emp?.precios_incluyen_itbms !== false,
        condiciones: emp?.terminos_presupuesto || emp?.terminos_orden || '',
      }));
      setItems([]);
    }

    setLoading(false);
  };

  // Cargar equipos cuando cambia el cliente
  useEffect(() => {
    if (!form.id_cliente) { setEquipos([]); return; }
    supabase
      .from('equipos').select('id_equipo, tipo_equipo, marca, modelo, numero_serie')
      .eq('id_cliente', form.id_cliente).eq('activo', true)
      .then(({ data }) => setEquipos(data || []));
  }, [form.id_cliente]);

  // ============== ITEMS ==============
  const agregarItem = () => {
    setItems([
      ...items,
      {
        _key: Date.now() + Math.random(),
        tipo: 'PRODUCTO',
        id_catalogo: null,
        sku: '',
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        itbms_pct: empresa?.itbms_default_pct ?? 7,
      },
    ]);
  };

  const agregarServicio = () => {
    setItems([
      ...items,
      {
        _key: Date.now() + Math.random(),
        tipo: 'SERVICIO',
        id_catalogo: null,
        sku: '',
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        itbms_pct: empresa?.itbms_default_pct ?? 7,
      },
    ]);
  };

  const actualizarItem = (idx, campo, valor) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], [campo]: valor };
    setItems(nuevos);
  };

  const eliminarItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const seleccionarProducto = (idx, producto) => {
    if (!producto) {
      // Deseleccionar
      const nuevos = [...items];
      nuevos[idx] = {
        ...nuevos[idx],
        id_catalogo: null,
        sku: '',
        descripcion: '',
        precio_unitario: 0,
      };
      setItems(nuevos);
      return;
    }
    const nuevos = [...items];
    nuevos[idx] = {
      ...nuevos[idx],
      id_catalogo: producto.id_catalogo,
      sku: producto.sku,
      descripcion: producto.nombre,
      precio_unitario: Number(producto.precio_venta || 0),
      itbms_pct: Number(producto.itbms_pct ?? empresa?.itbms_default_pct ?? 7),
    };
    setItems(nuevos);
  };

  // Aplicar plantilla
  const aplicarPlantilla = (plantilla) => {
    if (!plantilla?.items || !Array.isArray(plantilla.items)) return;
    const nuevos = plantilla.items.map(it => ({
      _key: Date.now() + Math.random(),
      tipo: it.tipo || 'SERVICIO',
      id_catalogo: null,
      sku: it.sku || '',
      descripcion: it.descripcion || '',
      cantidad: Number(it.cantidad || 1),
      precio_unitario: Number(it.precio_unitario || 0),
      itbms_pct: Number(it.itbms_pct ?? empresa?.itbms_default_pct ?? 7),
    }));
    setItems([...items, ...nuevos]);
    setShowPlantillas(false);
    if (plantilla.tipo_destino_default && !editing) {
      setForm(f => ({ ...f, tipo_destino: plantilla.tipo_destino_default }));
    }
  };

  // ============== HANDLERS DE MODALES RÁPIDOS ==============
  const onClienteCreado = (cliente) => {
    // Agregar cliente nuevo al listado y seleccionarlo
    setClientes(prev => [...prev, cliente].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setForm(f => ({ ...f, id_cliente: cliente.id_cliente, id_equipo: '' }));
    setShowClienteRapido(false);
  };

  const onEquipoCreado = (equipo) => {
    setEquipos(prev => [...prev, equipo]);
    setForm(f => ({ ...f, id_equipo: equipo.id_equipo }));
    setShowEquipoRapido(false);
  };

  const onRepuestoCreado = (producto) => {
    if (repuestoIdxDestino !== null) {
      // Asignar al item específico
      const nuevos = [...items];
      nuevos[repuestoIdxDestino] = {
        ...nuevos[repuestoIdxDestino],
        id_catalogo: producto.id_catalogo,
        sku: producto.sku,
        descripcion: producto.nombre,
        precio_unitario: Number(producto.precio_venta || 0),
        itbms_pct: Number(producto.itbms_pct ?? 7),
      };
      setItems(nuevos);
    } else {
      // Agregar como item nuevo
      setItems([
        ...items,
        {
          _key: Date.now() + Math.random(),
          tipo: 'PRODUCTO',
          id_catalogo: producto.id_catalogo,
          sku: producto.sku,
          descripcion: producto.nombre,
          cantidad: 1,
          precio_unitario: Number(producto.precio_venta || 0),
          itbms_pct: Number(producto.itbms_pct ?? 7),
        },
      ]);
    }
    setShowRepuestoRapido(false);
    setRepuestoIdxDestino(null);
    setRepuestoNombreSugerido('');
  };


  // ============== TOTALES ==============
  const totales = (() => {
    let subtotal = 0, itbms = 0, total = 0;
    items.forEach(it => {
      const cant = Number(it.cantidad || 0);
      const precio = Number(it.precio_unitario || 0);
      const pct = Number(it.itbms_pct || 0);
      const lineTotal = cant * precio;
      if (form.precios_incluyen_itbms) {
        const sub = lineTotal / (1 + pct / 100);
        subtotal += sub;
        itbms += lineTotal - sub;
        total += lineTotal;
      } else {
        subtotal += lineTotal;
        const tax = lineTotal * pct / 100;
        itbms += tax;
        total += lineTotal + tax;
      }
    });

    // Calcular descuento global
    let descuento = 0;
    if (form.descuento_tipo === 'PORCENTAJE' && form.descuento_valor > 0) {
      descuento = total * Number(form.descuento_valor) / 100;
    } else if (form.descuento_tipo === 'MONTO' && form.descuento_valor > 0) {
      descuento = Math.min(Number(form.descuento_valor), total);
    }

    const totalConDescuento = total - descuento;

    return {
      subtotal,
      itbms,
      total,
      descuento,
      totalConDescuento,
    };
  })();

  // ============== GUARDAR ==============
  const guardar = async () => {
    setError('');

    // Validaciones
    if (!form.id_cliente) return setError('Selecciona un cliente');
    if (!form.tipo_destino) return setError('Selecciona el tipo de destino');
    if (form.tipo_destino === 'TALLER' && !form.id_equipo) {
      return setError('Para presupuesto de Taller, selecciona el equipo');
    }
    if (!form.fecha_validez) return setError('Selecciona fecha de validez');
    if (items.length === 0) return setError('Agrega al menos un item');

    // Validar items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.descripcion?.trim()) return setError(`Item ${i + 1}: falta descripción`);
      if (Number(it.cantidad) <= 0) return setError(`Item ${i + 1}: cantidad debe ser mayor a 0`);
      if (Number(it.precio_unitario) < 0) return setError(`Item ${i + 1}: precio inválido`);
    }

    setSaving(true);

    try {
      let idPresup = presupuestoId;

      if (editing) {
        // Capturar estado anterior para auditoría
        const { data: antesData } = await supabase
          .from('presupuestos').select('*').eq('id_presupuesto', idPresup).single();

        const { error: e } = await supabase.from('presupuestos').update({
          id_cliente: form.id_cliente,
          tipo_destino: form.tipo_destino,
          id_equipo: form.tipo_destino === 'TALLER' ? form.id_equipo : null,
          fecha_validez: form.fecha_validez,
          requiere_firma: form.requiere_firma,
          precios_incluyen_itbms: form.precios_incluyen_itbms,
          asunto: form.asunto || null,
          observaciones: form.observaciones || null,
          condiciones: form.condiciones || null,
          descuento_tipo: form.descuento_tipo || null,
          descuento_valor: Number(form.descuento_valor) || 0,
          descuento_monto_calculado: totales.descuento || 0,
          notas_internas: form.notas_internas || null,
        }).eq('id_presupuesto', idPresup);
        if (e) throw e;

        // Registrar auditoría si hubo cambios
        if (antesData) {
          const cambios = detectarCambios(antesData, form);
          if (cambios.length > 0) {
            await registrarAuditoria(
              idPresup,
              'EDITADO',
              cambios.join(' • '),
              { antes: antesData, despues: form }
            );
          }
        }
      } else {
        const { data, error: e } = await supabase.from('presupuestos').insert({
          id_cliente: form.id_cliente,
          tipo_destino: form.tipo_destino,
          id_equipo: form.tipo_destino === 'TALLER' ? form.id_equipo : null,
          fecha_validez: form.fecha_validez,
          requiere_firma: form.requiere_firma,
          precios_incluyen_itbms: form.precios_incluyen_itbms,
          asunto: form.asunto || null,
          observaciones: form.observaciones || null,
          condiciones: form.condiciones || null,
          descuento_tipo: form.descuento_tipo || null,
          descuento_valor: Number(form.descuento_valor) || 0,
          descuento_monto_calculado: totales.descuento || 0,
          notas_internas: form.notas_internas || null,
          created_by: profile?.id || null,
        }).select().single();
        if (e) throw e;
        idPresup = data.id_presupuesto;

        // Auditoría: presupuesto creado
        await registrarAuditoria(idPresup, 'CREADO', `Presupuesto creado con ${items.length} items`);
      }

      // Borrar items previos y reinsertar (más simple que diff)
      if (editing) {
        await supabase.from('presupuesto_items').delete().eq('id_presupuesto', idPresup);
      }

      const itemsParaInsertar = items.map((it, idx) => ({
        id_presupuesto: idPresup,
        tipo: it.tipo,
        id_catalogo: it.id_catalogo || null,
        sku: it.sku || null,
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario),
        itbms_pct: Number(it.itbms_pct),
        orden: idx,
      }));

      if (itemsParaInsertar.length > 0) {
        const { error: eIt } = await supabase.from('presupuesto_items').insert(itemsParaInsertar);
        if (eIt) throw eIt;
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando presupuesto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Cargando..." size="lg">
        <div className="p-8 text-center text-gray-500">Cargando datos...</div>
      </Modal>
    );
  }

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      size="xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* === DATOS GENERALES === */}
        <div className="bg-gray-50 rounded p-3 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">📋 Datos generales</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Cliente *</label>
                <button
                  type="button"
                  onClick={() => setShowClienteRapido(true)}
                  className="text-xs text-brand-700 hover:text-brand-900 font-medium flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" /> Nuevo cliente
                </button>
              </div>
              <Select
                value={form.id_cliente}
                onChange={(e) => setForm({ ...form, id_cliente: e.target.value, id_equipo: '' })}
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.numero_cliente} — {c.nombre}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de destino *</label>
              <Select
                value={form.tipo_destino}
                onChange={(e) => setForm({ ...form, tipo_destino: e.target.value, id_equipo: '' })}
              >
                {TIPO_DESTINO_OPTS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>
          </div>

          {form.tipo_destino === 'TALLER' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Equipo *</label>
                <button
                  type="button"
                  onClick={() => setShowEquipoRapido(true)}
                  disabled={!form.id_cliente}
                  className="text-xs text-brand-700 hover:text-brand-900 font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Cpu className="h-3 w-3" /> Nuevo equipo
                </button>
              </div>
              <Select
                value={form.id_equipo}
                onChange={(e) => setForm({ ...form, id_equipo: e.target.value })}
                disabled={!form.id_cliente}
              >
                <option value="">{form.id_cliente ? 'Seleccionar equipo...' : 'Primero elige cliente'}</option>
                {equipos.map(eq => (
                  <option key={eq.id_equipo} value={eq.id_equipo}>
                    {eq.tipo_equipo} {eq.marca} {eq.modelo} {eq.numero_serie ? `(${eq.numero_serie})` : ''}
                  </option>
                ))}
              </Select>
              {form.id_cliente && equipos.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Este cliente no tiene equipos. Click en "Nuevo equipo" para registrar uno.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Asunto"
              value={form.asunto}
              onChange={e => setForm({ ...form, asunto: e.target.value })}
              placeholder="Ej: Mantenimiento preventivo trimestral"
            />
            <Input
              label="Válido hasta *"
              type="date"
              value={form.fecha_validez}
              onChange={e => setForm({ ...form, fecha_validez: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-start gap-2 cursor-pointer p-2 bg-white rounded border">
              <input
                type="checkbox"
                checked={form.precios_incluyen_itbms}
                onChange={e => setForm({ ...form, precios_incluyen_itbms: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded text-brand-700"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Precios incluyen ITBMS</div>
                <div className="text-xs text-gray-500">
                  {form.precios_incluyen_itbms
                    ? 'El sistema desglosa el ITBMS automáticamente'
                    : 'El ITBMS se sumará al precio ingresado'}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer p-2 bg-white rounded border">
              <input
                type="checkbox"
                checked={form.requiere_firma}
                onChange={e => setForm({ ...form, requiere_firma: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded text-brand-700"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Requiere firma del cliente</div>
                <div className="text-xs text-gray-500">
                  Habilita campo de firma digital al aprobar
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* === ITEMS === */}
        <div className="bg-gray-50 rounded p-3">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-900">📦 Items del presupuesto</h3>
            <div className="flex gap-2">
              {plantillas.length > 0 && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowPlantillas(!showPlantillas)}
                  className="text-xs"
                >
                  <Lightbulb className="h-3 w-3" /> Plantillas
                </Button>
              )}
              <Button variant="outline" type="button" onClick={agregarServicio} className="text-xs">
                <Plus className="h-3 w-3" /> Servicio
              </Button>
              <Button variant="outline" type="button" onClick={agregarItem} className="text-xs">
                <Plus className="h-3 w-3" /> Producto
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setRepuestoIdxDestino(null);
                  setRepuestoNombreSugerido('');
                  setShowRepuestoRapido(true);
                }}
                className="text-xs"
                title="Crear un repuesto nuevo en el catálogo y agregarlo al presupuesto"
              >
                <Package className="h-3 w-3" /> Crear repuesto
              </Button>
            </div>
          </div>

          {/* Plantillas */}
          {showPlantillas && plantillas.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-3">
              <div className="text-xs font-semibold text-amber-900 mb-2">
                💡 Selecciona una plantilla para agregar todos sus items:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {plantillas.map(p => (
                  <button
                    key={p.id_plantilla}
                    type="button"
                    onClick={() => aplicarPlantilla(p)}
                    className="text-left p-2 bg-white rounded border hover:border-amber-400 hover:bg-amber-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900">{p.nombre}</div>
                    {p.descripcion && (
                      <div className="text-xs text-gray-500 truncate">{p.descripcion}</div>
                    )}
                    <div className="text-xs text-amber-700 mt-1">
                      {(p.items?.length || 0)} items
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista de items */}
          {items.length === 0 ? (
            <div className="text-center text-gray-500 py-6 bg-white rounded border-2 border-dashed">
              <FileText className="h-8 w-8 mx-auto text-gray-300 mb-1" />
              <p className="text-sm">No hay items agregados</p>
              <p className="text-xs">Usa los botones de arriba para agregar productos o servicios</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={it._key || it.id_item || idx} className="bg-white border rounded p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-6">
                        {it.tipo === 'PRODUCTO' ? (
                          <CatalogoAutocomplete
                            value={it.id_catalogo ? {
                              id_catalogo: it.id_catalogo,
                              sku: it.sku,
                              nombre: it.descripcion,
                            } : null}
                            onChange={(prod) => seleccionarProducto(idx, prod)}
                            onCreateNew={(nombreSugerido) => {
                              setRepuestoIdxDestino(idx);
                              setRepuestoNombreSugerido(nombreSugerido || '');
                              setShowRepuestoRapido(true);
                            }}
                            placeholder="Buscar producto del catálogo..."
                          />
                        ) : (
                          <Input
                            value={it.descripcion}
                            onChange={(e) => actualizarItem(idx, 'descripcion', e.target.value)}
                            placeholder={it.tipo === 'SERVICIO' ? 'Servicio prestado...' : 'Descripción...'}
                          />
                        )}
                        <div className="text-xs text-gray-500 mt-0.5">
                          {it.tipo === 'PRODUCTO' && '📦 Producto'}
                          {it.tipo === 'SERVICIO' && '🔧 Servicio'}
                          {it.sku && ` · ${it.sku}`}
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <Input
                          type="number" step="0.01" min="0.01"
                          value={it.cantidad}
                          onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                          placeholder="Cant."
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Input
                          type="number" step="0.01" min="0"
                          value={it.precio_unitario}
                          onChange={(e) => actualizarItem(idx, 'precio_unitario', e.target.value)}
                          placeholder="Precio"
                        />
                      </div>
                      <div className="col-span-5 sm:col-span-2">
                        <Select
                          value={it.itbms_pct}
                          onChange={(e) => actualizarItem(idx, 'itbms_pct', e.target.value)}
                        >
                          {ITBMS_OPCIONES.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarItem(idx)}
                      className="p-1.5 hover:bg-red-100 rounded text-red-600"
                      title="Quitar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-right text-xs text-gray-600 mt-1">
                    Subtotal línea: <strong>{formatCurrency(Number(it.cantidad || 0) * Number(it.precio_unitario || 0))}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* === TOTALES + DESCUENTO === */}
        {items.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-3 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-600">Subtotal (sin ITBMS)</div>
                <div className="text-lg font-semibold">{formatCurrency(totales.subtotal)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">ITBMS</div>
                <div className="text-lg font-semibold">{formatCurrency(totales.itbms)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Subtotal con ITBMS</div>
                <div className="text-lg font-semibold">{formatCurrency(totales.total)}</div>
              </div>
            </div>

            {/* Descuento Global */}
            <div className="border-t border-emerald-300 pt-3">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <label className="block text-xs text-gray-700 mb-1">Descuento</label>
                  <select
                    value={form.descuento_tipo}
                    onChange={e => setForm({ ...form, descuento_tipo: e.target.value, descuento_valor: 0 })}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                  >
                    <option value="">Sin descuento</option>
                    <option value="PORCENTAJE">% Porcentaje</option>
                    <option value="MONTO">$ Monto fijo</option>
                  </select>
                </div>
                {form.descuento_tipo && (
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-700 mb-1">
                      {form.descuento_tipo === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto (USD)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={form.descuento_tipo === 'PORCENTAJE' ? 100 : totales.total}
                      step="0.01"
                      value={form.descuento_valor}
                      onChange={e => setForm({ ...form, descuento_valor: Number(e.target.value) || 0 })}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                      placeholder={form.descuento_tipo === 'PORCENTAJE' ? '10' : '50.00'}
                    />
                  </div>
                )}
                {totales.descuento > 0 && (
                  <div className="col-span-3">
                    <div className="text-xs text-amber-700">Descuento aplicado</div>
                    <div className="text-base font-semibold text-amber-700">
                      − {formatCurrency(totales.descuento)}
                    </div>
                  </div>
                )}
                <div className={totales.descuento > 0 ? 'col-span-3' : 'col-span-6'}>
                  <div className="text-right">
                    <div className="text-xs text-emerald-700">TOTAL FINAL</div>
                    <div className="text-2xl font-bold text-emerald-700">
                      {formatCurrency(totales.totalConDescuento)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === OBSERVACIONES === */}
        <div className="bg-gray-50 rounded p-3 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">📝 Notas</h3>
          <Textarea
            label="Observaciones (visibles en el PDF)"
            value={form.observaciones}
            onChange={e => setForm({ ...form, observaciones: e.target.value })}
            rows={2}
            placeholder="Notas adicionales para el cliente..."
          />
          <Textarea
            label="Términos y condiciones"
            value={form.condiciones}
            onChange={e => setForm({ ...form, condiciones: e.target.value })}
            rows={3}
            placeholder="Condiciones de aceptación, garantía, etc."
          />
        </div>

        {/* === NOTAS INTERNAS (NO van en PDF) === */}
        <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-2">
          <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
            🔒 Notas internas
            <span className="text-xs text-amber-700 font-normal">(solo para tu equipo, NO van en el PDF)</span>
          </h3>
          <Textarea
            value={form.notas_internas}
            onChange={e => setForm({ ...form, notas_internas: e.target.value })}
            rows={2}
            placeholder="Recordatorios, contexto del cliente, negociaciones, etc."
          />
        </div>

        {/* === BOTONES === */}
        <div className="flex justify-end gap-2 pt-3 border-t sticky bottom-0 bg-white">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={guardar} loading={saving}>
            <Save className="h-4 w-4" /> {editing ? 'Guardar cambios' : 'Crear presupuesto'}
          </Button>
        </div>
      </div>
    </Modal>

    {/* Modales de creación rápida */}
    {showClienteRapido && (
      <ClienteRapidoModal
        open={showClienteRapido}
        onClose={() => setShowClienteRapido(false)}
        onCreated={onClienteCreado}
      />
    )}

    {showEquipoRapido && form.id_cliente && (
      <EquipoRapidoModal
        open={showEquipoRapido}
        onClose={() => setShowEquipoRapido(false)}
        idCliente={form.id_cliente}
        clienteNombre={clientes.find(c => c.id_cliente === form.id_cliente)?.nombre || ''}
        onCreated={onEquipoCreado}
      />
    )}

    {showRepuestoRapido && (
      <RepuestoRapidoModal
        open={showRepuestoRapido}
        onClose={() => {
          setShowRepuestoRapido(false);
          setRepuestoIdxDestino(null);
          setRepuestoNombreSugerido('');
        }}
        userId={profile?.id}
        empresa={empresa}
        nombreSugerido={repuestoNombreSugerido}
        onCreated={onRepuestoCreado}
      />
    )}
    </>
  );
}
