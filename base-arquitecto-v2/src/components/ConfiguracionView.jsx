import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Save, Upload } from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Textarea } from './ui/Input';

export default function ConfiguracionView() {
  const [form, setForm] = useState({
    nombre_empresa: 'Mi Empresa', ruc: '', telefono: '', correo: '', direccion: '',
    logo_url: '', pie_pagina_pdf: '', moneda_simbolo: 'B/.', moneda_codigo: 'PAB',
    precios_incluyen_itbms: false, itbms_default_pct: 7, terminos_cotizacion: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.from('configuracion_empresa').select('*').eq('id', 1).single().then(({ data }) => { if (data) setForm(data); });
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `logos/logo.${file.name.split('.').pop()}`;
    await supabase.storage.from('arquitecto').upload(path, file, { upsert: true });
    const { data: { publicUrl } } = supabase.storage.from('arquitecto').getPublicUrl(path);
    setForm(f => ({ ...f, logo_url: publicUrl }));
  };

  const guardar = async () => {
    setSaving(true); setMsg('');
    await supabase.from('configuracion_empresa').update(form).eq('id', 1);
    window.dispatchEvent(new Event('arq:empresa-actualizada'));
    setMsg('Configuración guardada'); setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings className="h-6 w-6 text-brand-700" /> Configuración</h1>
      <Card>
        {msg && <div className="bg-emerald-50 text-emerald-700 p-3 rounded text-sm mb-3">{msg}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Input label="Nombre de la empresa" value={form.nombre_empresa} onChange={e => setForm({ ...form, nombre_empresa: e.target.value })} />
          <Input label="RUC" value={form.ruc || ''} onChange={e => setForm({ ...form, ruc: e.target.value })} />
          <Input label="Teléfono" value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} />
          <Input label="Correo" value={form.correo || ''} onChange={e => setForm({ ...form, correo: e.target.value })} />
          <div className="md:col-span-2"><Input label="Dirección" value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
        </div>
        <div className="border-t pt-3 mb-4">
          <h3 className="text-sm font-semibold mb-2">Logo</h3>
          <div className="flex items-center gap-3">
            {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-16 w-16 object-contain border rounded" />}
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-white border rounded-md text-sm hover:bg-gray-50"><Upload className="h-4 w-4" /> Subir logo<input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} /></label>
          </div>
        </div>
        <div className="border-t pt-3 mb-4">
          <h3 className="text-sm font-semibold mb-2">Moneda e ITBMS</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input label="Símbolo" value={form.moneda_simbolo} onChange={e => setForm({ ...form, moneda_simbolo: e.target.value })} />
            <Input label="Código" value={form.moneda_codigo} onChange={e => setForm({ ...form, moneda_codigo: e.target.value })} />
            <Input label="ITBMS %" type="number" step="0.01" value={form.itbms_default_pct} onChange={e => setForm({ ...form, itbms_default_pct: Number(e.target.value) })} />
            <label className="flex items-center gap-2 pt-5 cursor-pointer"><input type="checkbox" checked={form.precios_incluyen_itbms} onChange={e => setForm({ ...form, precios_incluyen_itbms: e.target.checked })} className="h-4 w-4 rounded text-brand-700" /><span className="text-sm">Incluye ITBMS</span></label>
          </div>
        </div>
        <div className="border-t pt-3 mb-4">
          <Textarea label="Términos cotización" value={form.terminos_cotizacion || ''} onChange={e => setForm({ ...form, terminos_cotizacion: e.target.value })} rows={3} />
          <Textarea label="Pie de página PDF" value={form.pie_pagina_pdf || ''} onChange={e => setForm({ ...form, pie_pagina_pdf: e.target.value })} rows={2} />
        </div>
        <Button onClick={guardar} loading={saving}><Save className="h-4 w-4" /> Guardar configuración</Button>
      </Card>
    </div>
  );
}
