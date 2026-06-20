import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, nombre, rol } = req.body;
  if (!email || !password || !nombre) {
    return res.status(400).json({ error: 'Email, password y nombre son requeridos' });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) throw authError;

    const { error: insertError } = await supabase.from('usuarios').insert({
      id: authData.user.id, email, nombre, rol: rol || 'ARQUITECTO', activo: true,
    });
    if (insertError) throw insertError;

    return res.status(201).json({ id: authData.user.id, email, nombre });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
