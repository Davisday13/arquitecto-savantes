import React, { useState, useEffect } from 'react';
import { Target, Save, Calendar, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';

const MESES_LABEL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function MetasView({ profile }) {
  const ahora = new Date();
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth() + 1);

  const [metaEmpresa, setMetaEmpresa] = useState({ monto_objetivo: '', notas: '' });
  const [usuarios, setUsuarios] = useState([]);
  const [metasUsuarios, setMetasUsuarios] = useState({});

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, [anio, mes]);

  const cargar = async () => {
    setError(''); setMsg('');

    // 1) Meta empresa
    const { data: emp } = await supabase
      .from('metas_empresa')
      .select('*')
      .eq('anio', anio).eq('mes', mes)
      .maybeSingle();

    setMetaEmpresa(emp ? {
      monto_objetivo: String(emp.monto_objetivo),
      notas: emp.notas || '',
    } : { monto_objetivo: '', notas: '' });

    // 2) Usuarios técnicos/admin
    const { data: usus } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, rol')
      .eq('activo', true)
      .in('rol', ['ROOT', 'ADMIN', 'TECNICO', 'RECEPCIONISTA'])
      .order('nombre_completo');
    setUsuarios(usus || []);

    // 3) Metas individuales
    const { data: metasU } = await supabase
      .from('metas_usuario')
      .select('*')
      .eq('anio', anio).eq('mes', mes);

    const map = {};
    (metasU || []).forEach(m => {
      map[m.id_usuario] = String(m.monto_objetivo);
    });
    setMetasUsuarios(map);
  };

  const guardar = async () => {
    setError(''); setMsg('');
    setSaving(true);

    try {
      // Meta empresa
      const montoEmp = Number(metaEmpresa.monto_objetivo) || 0;
      if (montoEmp > 0) {
        await supabase.from('metas_empresa').upsert({
          anio, mes,
          monto_objetivo: montoEmp,
          notas: metaEmpresa.notas || null,
        }, { onConflict: 'anio,mes' });
      } else {
        await supabase.from('metas_empresa')
          .delete().eq('anio', anio).eq('mes', mes);
      }

      // Metas individuales
      for (const u of usuarios) {
        const monto = Number(metasUsuarios[u.id]) || 0;
        if (monto > 0) {
          await supabase.from('metas_usuario').upsert({
            id_usuario: u.id,
            anio, mes,
            monto_objetivo: monto,
          }, { onConflict: 'id_usuario,anio,mes' });
        } else {
          await supabase.from('metas_usuario')
            .delete().eq('id_usuario', u.id).eq('anio', anio).eq('mes', mes);
        }
      }

      setMsg('Metas guardadas correctamente');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const totalIndividuales = Object.values(metasUsuarios)
    .reduce((s, v) => s + (Number(v) || 0), 0);
  const metaEmpresaNum = Number(metaEmpresa.monto_objetivo) || 0;
  const diferencia = metaEmpresaNum - totalIndividuales;

  // Años disponibles (3 atrás, 2 adelante)
  const aniosDisp = [];
  for (let a = ahora.getFullYear() - 2; a <= ahora.getFullYear() + 1; a++) aniosDisp.push(a);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="h-6 w-6 text-brand-700" />
          Metas de Facturación
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Define objetivos mensuales para la empresa y para cada técnico
        </p>
      </div>

      {/* Selector de período */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
            <Select value={anio} onChange={e => setAnio(Number(e.target.value))}>
              {aniosDisp.map(a => <option key={a} value={a}>{a}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mes</label>
            <Select value={mes} onChange={e => setMes(Number(e.target.value))}>
              {MESES_LABEL.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </Select>
          </div>
          <div className="col-span-2 md:col-span-2 flex items-end justify-end gap-2">
            <Button onClick={cargar} variant="outline">
              <Calendar className="h-4 w-4" /> Cargar período
            </Button>
            <Button onClick={guardar} loading={saving}>
              <Save className="h-4 w-4" /> Guardar metas
            </Button>
          </div>
        </div>
      </Card>

      {msg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-sm text-emerald-700">
          ✓ {msg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* META EMPRESA */}
      <Card>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-brand-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Meta de la Empresa</h2>
            <p className="text-xs text-gray-500">
              Total facturable que se quiere alcanzar en {MESES_LABEL[mes - 1]} {anio}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Monto objetivo (USD) *"
            type="number" step="0.01" min="0"
            value={metaEmpresa.monto_objetivo}
            onChange={e => setMetaEmpresa({ ...metaEmpresa, monto_objetivo: e.target.value })}
            placeholder="20000.00"
          />
          <Input
            label="Notas"
            value={metaEmpresa.notas}
            onChange={e => setMetaEmpresa({ ...metaEmpresa, notas: e.target.value })}
            placeholder="Opcional"
          />
        </div>
      </Card>

      {/* METAS POR USUARIO */}
      <Card>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Metas Individuales</h2>
            <p className="text-xs text-gray-500">
              Asigna una meta a cada técnico/usuario activo
            </p>
          </div>
        </div>

        {usuarios.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No hay usuarios activos</p>
        ) : (
          <div className="space-y-2">
            {usuarios.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                  {u.nombre_completo?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{u.nombre_completo}</div>
                  <div className="text-xs text-gray-500">{u.rol}</div>
                </div>
                <div className="w-40">
                  <Input
                    type="number" step="0.01" min="0"
                    value={metasUsuarios[u.id] || ''}
                    onChange={e => setMetasUsuarios({ ...metasUsuarios, [u.id]: e.target.value })}
                    placeholder="USD"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resumen */}
        {(metaEmpresaNum > 0 || totalIndividuales > 0) && (
          <div className="mt-4 pt-3 border-t space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Suma de metas individuales:</span>
              <span className="font-medium">{formatCurrency(totalIndividuales)}</span>
            </div>
            {metaEmpresaNum > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Meta empresa:</span>
                  <span className="font-medium">{formatCurrency(metaEmpresaNum)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className={diferencia >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                    {diferencia >= 0 ? 'Holgura sobre meta empresa:' : 'Las metas individuales superan la empresa:'}
                  </span>
                  <span className={diferencia >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                    {formatCurrency(Math.abs(diferencia))}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
