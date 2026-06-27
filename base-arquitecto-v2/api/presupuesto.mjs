import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const id_proyecto = url.searchParams.get('id_proyecto');
      if (id_proyecto) {
        const { data } = await supabase.from('proyecto_presupuesto').select('*').eq('id_proyecto', id_proyecto);
        return res.status(200).json(data || []);
      }
      const { data } = await supabase.from('proyecto_presupuesto').select('*');
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const { id_proyecto, categoria, monto_estimado } = body;

      const { data: existing } = await supabase
        .from('proyecto_presupuesto')
        .select('id_partida')
        .eq('id_proyecto', id_proyecto)
        .eq('categoria', categoria)
        .limit(1);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('proyecto_presupuesto')
          .update({ monto_estimado })
          .eq('id_partida', existing[0].id_partida);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('proyecto_presupuesto')
          .insert({ id_proyecto, categoria, monto_estimado });
        if (error) throw error;
      }

      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'Invalid request method' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
