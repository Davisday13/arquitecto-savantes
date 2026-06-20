import { supabase } from './supabase';

/**
 * Registra una acción en la auditoría del presupuesto.
 *
 * @param {string} idPresupuesto - UUID del presupuesto
 * @param {string} accion - 'CREADO', 'EDITADO', 'ENVIADO', 'DUPLICADO', etc
 * @param {string} detalle - texto descriptivo
 * @param {object} cambios - { antes: {...}, despues: {...} } opcional
 */
export async function registrarAuditoria(idPresupuesto, accion, detalle, cambios = null) {
  if (!idPresupuesto || !accion) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('presupuesto_auditoria').insert({
    id_presupuesto: idPresupuesto,
    id_usuario: user.id,
    accion,
    detalle,
    cambios,
  });
}

/**
 * Detecta qué cambió entre dos versiones de un presupuesto.
 * Retorna texto legible para el detalle de auditoría.
 */
export function detectarCambios(antes, despues) {
  const cambios = [];

  const camposAComparar = {
    cliente_nombre: 'Cliente',
    asunto: 'Asunto',
    observaciones: 'Observaciones',
    condiciones: 'Condiciones',
    fecha_validez: 'Fecha de validez',
    descuento_tipo: 'Tipo de descuento',
    descuento_valor: 'Valor de descuento',
    notas_internas: 'Notas internas',
    estado: 'Estado',
  };

  Object.entries(camposAComparar).forEach(([key, label]) => {
    const valorAntes = antes?.[key];
    const valorDespues = despues?.[key];
    if (String(valorAntes ?? '') !== String(valorDespues ?? '')) {
      cambios.push(`${label}: "${valorAntes || '(vacío)'}" → "${valorDespues || '(vacío)'}"`);
    }
  });

  return cambios;
}

/**
 * Calcula el descuento monto en USD según el tipo y valor.
 */
export function calcularDescuento(subtotal, tipo, valor) {
  if (!tipo || !valor || valor <= 0) return 0;
  if (tipo === 'PORCENTAJE') {
    return Math.round((subtotal * valor / 100) * 100) / 100;
  }
  if (tipo === 'MONTO') {
    return Math.min(valor, subtotal);
  }
  return 0;
}
