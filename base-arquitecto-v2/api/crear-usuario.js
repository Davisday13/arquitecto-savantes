import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Falta configuración de Supabase en Vercel (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { data: callerProfile } = await supabase
      .from('usuarios').select('rol').eq('id', caller.id).single();

    if (!callerProfile || !['ROOT', 'ADMIN'].includes(callerProfile.rol)) {
      return res.status(403).json({ error: 'Solo ROOT y ADMIN pueden crear usuarios' });
    }

    const { email, password, nombre, rol } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, password y nombre son requeridos' });
    }

    const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { nombre, rol: rol || 'ARQUITECTO' },
    });
    if (createErr) throw createErr;

    const { error: insertErr } = await supabase.from('usuarios').insert({
      id: authData.user.id, email, nombre, rol: rol || 'ARQUITECTO', activo: true,
    });
    if (insertErr) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw insertErr;
    }

    return res.status(201).json({ success: true, user: { id: authData.user.id, email, nombre, rol: rol || 'ARQUITECTO' } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
