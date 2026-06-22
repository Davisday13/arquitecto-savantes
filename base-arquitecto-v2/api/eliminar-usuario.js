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
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) return res.status(401).json({ error: 'Token inválido' });

    const { data: callerProfile } = await supabase
      .from('usuarios').select('rol').eq('id', caller.id).single();
    if (!callerProfile || !['ROOT', 'ADMIN'].includes(callerProfile.rol)) {
      return res.status(403).json({ error: 'Solo ROOT y ADMIN pueden eliminar usuarios' });
    }

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID de usuario requerido' });

    if (id === caller.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });

    const { data: targetUser } = await supabase.from('usuarios').select('rol').eq('id', id).single();
    if (targetUser?.rol === 'ROOT') return res.status(400).json({ error: 'No puedes eliminar un usuario ROOT' });

    const { error: deleteDbErr } = await supabase.from('usuarios').delete().eq('id', id);
    if (deleteDbErr) throw deleteDbErr;

    const { error: deleteAuthErr } = await supabase.auth.admin.deleteUser(id);
    if (deleteAuthErr) throw deleteAuthErr;

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
