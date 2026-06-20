import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Upload, Image as ImageIcon, FileText, DollarSign, Building2, Mail, MessageCircle, Bell } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import { Input, Textarea } from './ui/Input';

const STORAGE_BUCKET = 'soporte-tecnico';

const TERMINOS_ORDEN_DEFAULT = `1. El cliente acepta el costo de diagnóstico al momento de recibir el equipo, sea o no autorizada la reparación.
2. Una vez autorizada la reparación, el costo del diagnóstico se descuenta del total final.
3. Los equipos no retirados después de 30 días serán considerados abandonados.
4. La garantía aplica únicamente sobre la falla reportada y la solución aplicada, por un período de {DIAS} días.
5. La garantía no cubre daños por mal uso, golpes, humedad o intervención de terceros.`;

const TERMINOS_VISITA_DEFAULT = `1. La firma del cliente confirma que los trabajos descritos fueron realizados a satisfacción.
2. Cualquier observación posterior debe ser reportada dentro de 7 días.
3. La garantía aplica sobre la mano de obra realizada, no sobre fallas de equipos no atendidos en esta visita.`;

const TERMINOS_PRESUPUESTO_DEFAULT = `1. Este presupuesto tiene una validez de 15 días desde su emisión.
2. Los precios pueden variar sin previo aviso por razones de mercado.
3. Para iniciar el trabajo se requiere la aprobación formal de este presupuesto.
4. Cualquier trabajo adicional no contemplado aquí será cotizado aparte.
5. Las garantías aplican según los términos del servicio prestado.`;

export default function ConfiguracionView() {
  const [tab, setTab] = useState('empresa');
  const [form, setForm] = useState({
    nombre_empresa: '', ruc: '', dv: '', telefono: '', correo: '',
    direccion: '', logo_url: '', pie_pagina_pdf: '',
    costo_diagnostico_default: 0,
    dias_garantia: 30,
    terminos_orden: '',
    terminos_visita: '',
    terminos_presupuesto: '',
    cuentas_bancarias: '',
    whatsapp_pais_codigo: '507',
    whatsapp_plantilla_orden_recibido: '',
    whatsapp_plantilla_orden_diagnosticado: '',
    whatsapp_plantilla_orden_reparado: '',
    whatsapp_plantilla_orden_entregado: '',
    whatsapp_plantilla_visita: '',
    whatsapp_plantilla_recibo: '',
    whatsapp_plantilla_presupuesto: '',
    alerta_orden_estancada_dias: 5,
    alerta_reparado_sin_retirar_dias: 2,
    alerta_pago_pendiente_dias: 7,
    itbms_default_pct: 7,
    precios_incluyen_itbms: true,
    correo_remitente_nombre: 'Savantix',
    correo_remitente_email: 'notificaciones@savantesolutions.com',
    correo_reply_to: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('configuracion_empresa')
        .select('*')
        .eq('id', 1)
        .single();
      if (!error && data) {
        setForm({
          nombre_empresa: data.nombre_empresa || '',
          ruc: data.ruc || '',
          dv: data.dv || '',
          telefono: data.telefono || '',
          correo: data.correo || '',
          direccion: data.direccion || '',
          logo_url: data.logo_url || '',
          pie_pagina_pdf: data.pie_pagina_pdf || '',
          costo_diagnostico_default: Number(data.costo_diagnostico_default || 0),
          dias_garantia: Number(data.dias_garantia || 30),
          terminos_orden: data.terminos_orden || TERMINOS_ORDEN_DEFAULT,
          terminos_visita: data.terminos_visita || TERMINOS_VISITA_DEFAULT,
          terminos_presupuesto: data.terminos_presupuesto || TERMINOS_PRESUPUESTO_DEFAULT,
          cuentas_bancarias: data.cuentas_bancarias || '',
          whatsapp_pais_codigo: data.whatsapp_pais_codigo || '507',
          whatsapp_plantilla_orden_recibido: data.whatsapp_plantilla_orden_recibido || '',
          whatsapp_plantilla_orden_diagnosticado: data.whatsapp_plantilla_orden_diagnosticado || '',
          whatsapp_plantilla_orden_reparado: data.whatsapp_plantilla_orden_reparado || '',
          whatsapp_plantilla_orden_entregado: data.whatsapp_plantilla_orden_entregado || '',
          whatsapp_plantilla_visita: data.whatsapp_plantilla_visita || '',
          whatsapp_plantilla_recibo: data.whatsapp_plantilla_recibo || '',
          whatsapp_plantilla_presupuesto: data.whatsapp_plantilla_presupuesto || '',
          alerta_orden_estancada_dias: data.alerta_orden_estancada_dias ?? 5,
          alerta_reparado_sin_retirar_dias: data.alerta_reparado_sin_retirar_dias ?? 2,
          alerta_pago_pendiente_dias: data.alerta_pago_pendiente_dias ?? 7,
          itbms_default_pct: Number(data.itbms_default_pct ?? 7),
          precios_incluyen_itbms: data.precios_incluyen_itbms !== false,
          correo_remitente_nombre: data.correo_remitente_nombre || 'Savantix',
          correo_remitente_email: data.correo_remitente_email || 'notificaciones@savantesolutions.com',
          correo_reply_to: data.correo_reply_to || '',
        });
      }
      setLoading(false);
    };
    cargar();
  }, []);

  const subirLogo = async (file) => {
    if (!file) return;
    setUploadingLogo(true);
    setErr('');
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/empresa-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      setForm({ ...form, logo_url: urlData.publicUrl });
    } catch (e) {
      setErr('Error subiendo logo: ' + e.message);
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const guardar = async () => {
    setSaving(true);
    setMsg(''); setErr('');
    const { error } = await supabase
      .from('configuracion_empresa')
      .update({
        ...form,
        costo_diagnostico_default: Number(form.costo_diagnostico_default) || 0,
        dias_garantia: Number(form.dias_garantia) || 30,
        itbms_default_pct: Number(form.itbms_default_pct) || 0,
      })
      .eq('id', 1);
    setSaving(false);
    if (error) return setErr(error.message);
    // Notificar al sidebar para que refresque el logo si cambió
    window.dispatchEvent(new Event('savantix:empresa-actualizada'));
    setMsg('Configuración guardada');
    setTimeout(() => setMsg(''), 2000);
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando...</div>;

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Building2 },
    { id: 'pdf', label: 'Documentos PDF', icon: FileText },
    { id: 'precios', label: 'Precios y garantía', icon: DollarSign },
    { id: 'correo', label: 'Correo', icon: Mail },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'alertas', label: 'Alertas', icon: Bell },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500">Datos de la empresa, plantillas de PDF y políticas comerciales</p>
      </div>

      {msg && <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded">{msg}</div>}
      {err && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{err}</div>}

      <Card>
        <CardContent>
          {/* Tabs */}
          <div className="border-b mb-4">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      tab === t.id
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB: EMPRESA */}
          {tab === 'empresa' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo de la empresa</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={e => e.target.files?.[0] && subirLogo(e.target.files[0])}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                      loading={uploadingLogo}
                      type="button"
                    >
                      <Upload className="h-4 w-4" /> Subir logo
                    </Button>
                    {form.logo_url && (
                      <button
                        onClick={() => setForm({ ...form, logo_url: '' })}
                        className="block text-xs text-red-600 hover:underline"
                        type="button"
                      >
                        Quitar logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <Input
                label="Nombre de la empresa *"
                value={form.nombre_empresa}
                onChange={e => setForm({ ...form, nombre_empresa: e.target.value })}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="RUC"
                  value={form.ruc}
                  onChange={e => setForm({ ...form, ruc: e.target.value })}
                />
                <Input
                  label="DV"
                  value={form.dv}
                  onChange={e => setForm({ ...form, dv: e.target.value })}
                  maxLength={3}
                  placeholder="Ej: 45"
                />
                <Input
                  label="Teléfono"
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                />
              </div>

              <Input
                label="Correo electrónico"
                type="email"
                value={form.correo}
                onChange={e => setForm({ ...form, correo: e.target.value })}
              />

              <Textarea
                label="Dirección"
                value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })}
                rows={2}
              />
            </div>
          )}

          {/* TAB: DOCUMENTOS PDF */}
          {tab === 'pdf' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-700">
                💡 Estos textos aparecerán automáticamente al final de los PDF de órdenes y visitas.
              </div>

              <Textarea
                label="Pie de página de los PDF"
                value={form.pie_pagina_pdf}
                onChange={e => setForm({ ...form, pie_pagina_pdf: e.target.value })}
                rows={2}
                placeholder="Ej: Gracias por confiar en nosotros · www.miempresa.com"
              />

              <div>
                <Textarea
                  label="Términos y condiciones — Órdenes de Taller"
                  value={form.terminos_orden}
                  onChange={e => setForm({ ...form, terminos_orden: e.target.value })}
                  rows={8}
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, terminos_orden: TERMINOS_ORDEN_DEFAULT })}
                  className="text-xs text-brand-600 hover:underline mt-1"
                >
                  Restaurar texto por defecto
                </button>
              </div>

              <div>
                <Textarea
                  label="Términos y condiciones — Visitas en Sitio"
                  value={form.terminos_visita}
                  onChange={e => setForm({ ...form, terminos_visita: e.target.value })}
                  rows={6}
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, terminos_visita: TERMINOS_VISITA_DEFAULT })}
                  className="text-xs text-brand-600 hover:underline mt-1"
                >
                  Restaurar texto por defecto
                </button>
              </div>

              <div>
                <Textarea
                  label="Términos y condiciones — Presupuestos"
                  value={form.terminos_presupuesto}
                  onChange={e => setForm({ ...form, terminos_presupuesto: e.target.value })}
                  rows={6}
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, terminos_presupuesto: TERMINOS_PRESUPUESTO_DEFAULT })}
                  className="text-xs text-brand-600 hover:underline mt-1"
                >
                  Restaurar texto por defecto
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Este texto aparecerá pre-llenado al crear nuevos presupuestos. Puedes editarlo en cada presupuesto si necesitas algo específico.
                </p>
              </div>

              <div>
                <Textarea
                  label="Cuentas bancarias y métodos de pago"
                  value={form.cuentas_bancarias}
                  onChange={e => setForm({ ...form, cuentas_bancarias: e.target.value })}
                  rows={6}
                  placeholder={'BANCO GENERAL\nNombre de la cuenta\nCuenta de ahorros: 00-00-00-000000-0\n\nYAPPY\nNombre (directorio)'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Estas cuentas aparecerán en los <strong>presupuestos</strong> para que el cliente sepa cómo pagarte. Una cuenta por bloque, separadas por línea en blanco.
                </p>
              </div>
            </div>
          )}

          {/* TAB: PRECIOS Y GARANTÍA */}
          {tab === 'precios' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <Input
                  label="Costo de diagnóstico por defecto (USD)"
                  type="number" step="0.01" min="0"
                  value={form.costo_diagnostico_default}
                  onChange={e => setForm({ ...form, costo_diagnostico_default: e.target.value })}
                />
                <p className="text-xs text-amber-700 mt-1">
                  Este monto se sugerirá automáticamente al crear nuevas órdenes. Se puede cambiar caso por caso.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <Input
                  label="Días de garantía por defecto"
                  type="number" step="1" min="0"
                  value={form.dias_garantia}
                  onChange={e => setForm({ ...form, dias_garantia: e.target.value })}
                />
                <p className="text-xs text-blue-700 mt-1">
                  Período de garantía estándar que aparece en los PDF.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 space-y-3">
                <h4 className="text-sm font-semibold text-emerald-900">ITBMS (Impuesto)</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tasa ITBMS por defecto
                  </label>
                  <select
                    value={form.itbms_default_pct}
                    onChange={e => setForm({ ...form, itbms_default_pct: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                  >
                    <option value={0}>Exento (0%)</option>
                    <option value={7}>Estándar (7%)</option>
                    <option value={10}>Bebidas/Hospedaje (10%)</option>
                    <option value={15}>Tabaco (15%)</option>
                  </select>
                  <p className="text-xs text-emerald-700 mt-1">
                    Tasa que se aplica automáticamente a nuevos repuestos, mano de obra, diagnósticos y visitas.
                  </p>
                </div>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.precios_incluyen_itbms}
                    onChange={e => setForm({ ...form, precios_incluyen_itbms: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-brand-700"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Los precios ingresados incluyen ITBMS
                    </div>
                    <div className="text-xs text-emerald-700">
                      {form.precios_incluyen_itbms
                        ? 'Cuando ingresas un precio, el sistema desglosa automáticamente el ITBMS (recomendado para clientes finales).'
                        : 'El ITBMS se suma al precio ingresado al final.'}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB: CORREO */}
          {tab === 'correo' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Configuración del remitente
                </h4>
                <p className="text-xs text-blue-700">
                  Los correos enviados desde Savantix usarán esta información como remitente.
                  Asegúrate de que el dominio esté verificado en Resend.
                </p>
              </div>

              <Input
                label="Nombre del remitente"
                value={form.correo_remitente_nombre}
                onChange={e => setForm({ ...form, correo_remitente_nombre: e.target.value })}
                placeholder="Savantix"
              />
              <p className="text-xs text-gray-500 -mt-2">
                Es el nombre que verán los clientes en su bandeja de entrada.
              </p>

              <Input
                label="Email del remitente"
                type="email"
                value={form.correo_remitente_email}
                onChange={e => setForm({ ...form, correo_remitente_email: e.target.value })}
                placeholder="notificaciones@savantesolutions.com"
              />
              <p className="text-xs text-gray-500 -mt-2">
                Debe ser un email del dominio verificado en Resend (ej: cualquiera@savantesolutions.com).
              </p>

              <Input
                label="Reply-To (respuestas van aquí)"
                type="email"
                value={form.correo_reply_to}
                onChange={e => setForm({ ...form, correo_reply_to: e.target.value })}
                placeholder="administracion@savantesolutions.com"
              />
              <p className="text-xs text-gray-500 -mt-2">
                Cuando un cliente le dé "Responder" al correo, se enviará a esta dirección.
                Si lo dejas vacío, se usará el correo principal de la empresa.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-4">
                <h5 className="text-sm font-semibold text-amber-900 mb-1">📌 Resumen de cómo funciona</h5>
                <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                  <li>El cliente recibe el correo desde: <strong>{form.correo_remitente_nombre} &lt;{form.correo_remitente_email}&gt;</strong></li>
                  <li>Si responde, va a: <strong>{form.correo_reply_to || form.correo || '(no configurado)'}</strong></li>
                  <li>Cada correo enviado queda registrado en <em>Administración → Correos</em></li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-800">
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> WhatsApp Click-to-Chat
                </div>
                <p className="text-xs">
                  Personaliza los mensajes que se envían por WhatsApp. Variables disponibles:
                  <code className="bg-white px-1 mx-1 rounded">{'{cliente}'}</code>
                  <code className="bg-white px-1 mx-1 rounded">{'{numero}'}</code>
                  <code className="bg-white px-1 mx-1 rounded">{'{empresa}'}</code>
                  <code className="bg-white px-1 mx-1 rounded">{'{total}'}</code>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de país</label>
                  <Input
                    value={form.whatsapp_pais_codigo}
                    onChange={e => setForm({ ...form, whatsapp_pais_codigo: e.target.value.replace(/\D/g, '') })}
                    placeholder="507"
                    maxLength={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">Panamá: 507</p>
                </div>
              </div>

              {/* Plantillas dinámicas para órdenes (según estado) */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                📋 <strong>Órdenes de Taller — plantillas dinámicas</strong>
                <br/>
                El mensaje cambia automáticamente según el estado de la orden.
              </div>

              <div>
                <Textarea
                  label="🟦 Cuando llega al taller (RECIBIDO / EN_DIAGNOSTICO)"
                  value={form.whatsapp_plantilla_orden_recibido}
                  onChange={e => setForm({ ...form, whatsapp_plantilla_orden_recibido: e.target.value })}
                  rows={5}
                  placeholder="Hola {cliente}, hemos recibido tu equipo..."
                />
              </div>

              <div>
                <Textarea
                  label="🟧 Cuando ya hay diagnóstico (DIAGNOSTICADO / AUTORIZADO / EN_REPARACION)"
                  value={form.whatsapp_plantilla_orden_diagnosticado}
                  onChange={e => setForm({ ...form, whatsapp_plantilla_orden_diagnosticado: e.target.value })}
                  rows={5}
                  placeholder="Hola {cliente}, tu equipo ya fue evaluado..."
                />
              </div>

              <div>
                <Textarea
                  label="🟢 Cuando está listo para retirar (REPARADO)"
                  value={form.whatsapp_plantilla_orden_reparado}
                  onChange={e => setForm({ ...form, whatsapp_plantilla_orden_reparado: e.target.value })}
                  rows={5}
                  placeholder="Hola {cliente}, tu equipo está listo..."
                />
              </div>

              <div>
                <Textarea
                  label="✅ Cuando ya se entregó (ENTREGADO)"
                  value={form.whatsapp_plantilla_orden_entregado}
                  onChange={e => setForm({ ...form, whatsapp_plantilla_orden_entregado: e.target.value })}
                  rows={5}
                  placeholder="Hola {cliente}, te confirmamos la entrega..."
                />
              </div>

              <div>
                <Textarea
                  label="Plantilla — Visitas Técnicas"
                  value={form.whatsapp_plantilla_visita}
                  onChange={e => setForm({ ...form, whatsapp_plantilla_visita: e.target.value })}
                  rows={5}
                />
              </div>

              <div>
                <Textarea
                  label="Plantilla — Recibos de Pago"
                  value={form.whatsapp_plantilla_recibo}
                  onChange={e => setForm({ ...form, whatsapp_plantilla_recibo: e.target.value })}
                  rows={5}
                />
              </div>

              <div>
                <Textarea
                  label="Plantilla — Presupuestos"
                  value={form.whatsapp_plantilla_presupuesto}
                  onChange={e => setForm({ ...form, whatsapp_plantilla_presupuesto: e.target.value })}
                  rows={5}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
                💡 <strong>Cómo funciona:</strong> Click en "WhatsApp" en cualquier documento → se abre WhatsApp con tu mensaje listo → el cliente recibe el link y puede ver el documento. Tú le das "Enviar" manualmente — esto es por diseño y no tiene costos.
              </div>
            </div>
          )}

          {tab === 'alertas' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Centro de Alertas
                </div>
                <p className="text-xs">
                  Define cuándo Savantix debe alertarte automáticamente sobre situaciones que requieren atención.
                  Las alertas aparecen en la 🔔 campanita del navbar y en el centro de notificaciones.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orden estancada (días)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={form.alerta_orden_estancada_dias}
                    onChange={e => setForm({ ...form, alerta_orden_estancada_dias: Number(e.target.value) || 5 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si una orden lleva más de N días en RECIBIDO o EN_DIAGNOSTICO, alertar.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reparado sin retirar (días)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={form.alerta_reparado_sin_retirar_dias}
                    onChange={e => setForm({ ...form, alerta_reparado_sin_retirar_dias: Number(e.target.value) || 2 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si un equipo está REPARADO sin retirar más de N días, alertar.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pago pendiente (días)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={form.alerta_pago_pendiente_dias}
                    onChange={e => setForm({ ...form, alerta_pago_pendiente_dias: Number(e.target.value) || 7 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si una orden ENTREGADA tiene saldo pendiente más de N días.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Presupuestos por vencer</h4>
                <p className="text-xs text-gray-600 mb-2">
                  Las alertas se generan <strong>1 día y 3 días antes</strong> de la fecha de vencimiento del presupuesto.
                </p>
                <p className="text-xs text-gray-500">
                  💡 Para personalizar estos días, edita la columna <code className="bg-white px-1 rounded">alerta_presupuesto_dias_avisos</code> en la BD directamente.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-800">
                ✅ <strong>Sistema actual:</strong> Las alertas se calculan al vuelo cada vez que abres la app o haces click en la campanita 🔔. No requieren configuración adicional.
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                🤖 <strong>Próximamente — Cron job automático:</strong> Cada mañana a las 8:00 AM se enviarán correos/WhatsApp automáticos a los clientes según las alertas activas. Esta funcionalidad requiere configuración adicional en Supabase (pg_cron + Edge Function).
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t mt-4">
            <Button onClick={guardar} loading={saving}>
              <Save className="h-4 w-4" /> Guardar configuración
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
