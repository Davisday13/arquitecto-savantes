// =====================================================================
// MÓDULO DE NOTIFICACIONES
// =====================================================================
// Por ahora solo inserta en la tabla `notificaciones` con estado PENDIENTE.
// Más adelante, conecta esto con tu proveedor de email (Resend, SendGrid)
// y de WhatsApp/SMS (Twilio) usando Supabase Edge Functions.
// =====================================================================

import { supabase } from './supabase';

/**
 * Encolar una notificación para enviar.
 * @param {Object} params
 * @param {string} [params.destinatario_id] - UUID del usuario destino (opcional)
 * @param {string} [params.destinatario_email] - Correo destino (si no es usuario interno)
 * @param {string} [params.destinatario_telefono] - Teléfono destino (whatsapp/sms)
 * @param {('APP'|'EMAIL'|'WHATSAPP'|'SMS')} params.canal
 * @param {string} [params.asunto] - Asunto (para email)
 * @param {string} params.mensaje - Cuerpo del mensaje
 * @param {('ORDEN'|'VISITA')} [params.entidad_tipo]
 * @param {string} [params.entidad_id]
 */
export async function encolarNotificacion(params) {
  const payload = {
    destinatario_id: params.destinatario_id || null,
    destinatario_email: params.destinatario_email || null,
    destinatario_telefono: params.destinatario_telefono || null,
    canal: params.canal || 'APP',
    asunto: params.asunto || null,
    mensaje: params.mensaje,
    entidad_tipo: params.entidad_tipo || null,
    entidad_id: params.entidad_id || null,
    estado: 'PENDIENTE',
  };

  const { data, error } = await supabase.from('notificaciones').insert(payload).select().single();
  if (error) {
    console.error('[notificaciones] Error encolando:', error);
    return { error };
  }
  return { data };
}

/**
 * Notificar al cliente que su orden cambió de estado.
 * Envía por todos los canales disponibles (email + whatsapp + app).
 */
export async function notificarCambioEstadoOrden(orden, estadoAnterior, estadoNuevo) {
  const promises = [];

  // Notificación interna (APP)
  promises.push(encolarNotificacion({
    canal: 'APP',
    asunto: `Orden ${orden.numero_ticket} cambió de estado`,
    mensaje: `La orden ${orden.numero_ticket} pasó de ${estadoAnterior || '—'} a ${estadoNuevo}.`,
    entidad_tipo: 'ORDEN',
    entidad_id: orden.id_orden,
  }));

  // Email al cliente si tiene correo
  if (orden.cliente_correo) {
    promises.push(encolarNotificacion({
      destinatario_email: orden.cliente_correo,
      canal: 'EMAIL',
      asunto: `Actualización de tu orden ${orden.numero_ticket}`,
      mensaje: `Hola ${orden.cliente_nombre},\n\nTe informamos que tu orden ${orden.numero_ticket} (${orden.tipo_equipo} ${orden.marca} ${orden.modelo}) ha cambiado al estado: ${estadoNuevo}.\n\nGracias por confiar en nosotros.`,
      entidad_tipo: 'ORDEN',
      entidad_id: orden.id_orden,
    }));
  }

  // WhatsApp/SMS si tiene teléfono
  if (orden.cliente_telefono) {
    promises.push(encolarNotificacion({
      destinatario_telefono: orden.cliente_telefono,
      canal: 'WHATSAPP',
      mensaje: `Tu orden ${orden.numero_ticket} ahora está: ${estadoNuevo}`,
      entidad_tipo: 'ORDEN',
      entidad_id: orden.id_orden,
    }));
  }

  return Promise.all(promises);
}

/**
 * Notificar al técnico que se le asignó una orden o visita.
 */
export async function notificarAsignacion(tipo, registro, tecnicoId) {
  return encolarNotificacion({
    destinatario_id: tecnicoId,
    canal: 'APP',
    asunto: tipo === 'ORDEN' ? `Nueva orden asignada` : `Nueva visita asignada`,
    mensaje: tipo === 'ORDEN'
      ? `Se te asignó la orden ${registro.numero_ticket}`
      : `Se te asignó la visita ${registro.numero_visita}`,
    entidad_tipo: tipo,
    entidad_id: tipo === 'ORDEN' ? registro.id_orden : registro.id_visita,
  });
}

// =====================================================================
// PARA INTEGRACIÓN REAL (TODO):
// =====================================================================
// 1. Crear una Edge Function en Supabase que se ejecute cada N minutos.
// 2. La función lee `notificaciones WHERE estado = 'PENDIENTE'`.
// 3. Para cada una:
//    - Si canal = EMAIL: usar Resend o SendGrid
//    - Si canal = WHATSAPP/SMS: usar Twilio
//    - Si canal = APP: solo marcar como ENVIADA (la app las consulta)
// 4. Actualizar estado a ENVIADA o FALLIDA + error_mensaje.
// 5. Para canal APP, agregar bell con conteo en el Navbar
//    consultando notificaciones del usuario logueado con estado != 'LEIDA'.
// =====================================================================
