// src/components/calendario/RecordatorioCheckbox.jsx
// =====================================================
// SAVANTIX v8.9 — Checkbox para marcar recordatorios completados
// Optimistic update + auditoría automática
// =====================================================

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toggleRecordatorioCompletado } from '../../lib/recordatorios'

/**
 * Checkbox para marcar un recordatorio como completado.
 * 
 * Props:
 * - recordatorio: objeto con id_recordatorio y completado
 * - usuarioId: UUID del usuario actual (para auditoría)
 * - onUpdate: callback(recordatorioActualizado) tras éxito
 * - size: 'sm' | 'md' (default 'sm')
 * - disabled: bool
 */
export default function RecordatorioCheckbox({ 
  recordatorio, 
  usuarioId,
  onUpdate,
  size = 'sm',
  disabled = false,
}) {
  const [loading, setLoading] = useState(false)
  const [optimistic, setOptimistic] = useState(!!recordatorio.completado)

  const handleToggle = async (e) => {
    e.stopPropagation() // No abrir modal del recordatorio al clickear el checkbox
    e.preventDefault()
    if (loading || disabled) return

    if (!usuarioId) {
      console.warn('[RecordatorioCheckbox] Falta usuarioId')
      alert('Sesión no válida. Recarga la página.')
      return
    }

    const nuevoEstado = !optimistic
    setOptimistic(nuevoEstado) // Optimistic update inmediato
    setLoading(true)

    try {
      const actualizado = await toggleRecordatorioCompletado(
        recordatorio.id_recordatorio,
        nuevoEstado,
        usuarioId
      )
      onUpdate?.(actualizado)
    } catch (err) {
      console.error('Error al togglear recordatorio:', err)
      setOptimistic(!nuevoEstado) // Revertir si falla
      alert('No se pudo actualizar el recordatorio. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const sizes = {
    sm: { box: 'w-4 h-4', icon: 'w-3 h-3' },
    md: { box: 'w-5 h-5', icon: 'w-3.5 h-3.5' },
  }
  const s = sizes[size] || sizes.sm

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading || disabled}
      className={`
        ${s.box}
        flex-shrink-0
        flex items-center justify-center
        rounded border-2 transition-all
        ${optimistic 
          ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600' 
          : 'bg-white border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
        }
        ${loading ? 'opacity-60 cursor-wait' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1
      `}
      title={optimistic ? 'Marcar como pendiente' : 'Marcar como realizado'}
      aria-label={optimistic ? 'Recordatorio realizado, click para desmarcar' : 'Marcar recordatorio como realizado'}
      aria-pressed={optimistic}
    >
      {loading ? (
        <Loader2 className={`${s.icon} animate-spin`} />
      ) : optimistic ? (
        <Check className={s.icon} strokeWidth={3} />
      ) : null}
    </button>
  )
}
