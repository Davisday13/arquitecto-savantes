// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const { email, password, nombre, rol } = await req.json();

    if (!email || !password || !nombre) {
      return new Response(JSON.stringify({ error: "email, password y nombre son requeridos" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verificar permisos del usuario que hace la solicitud
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabase
      .from("usuarios").select("rol").eq("id", caller.id).single();

    if (!callerProfile || !["ROOT", "ADMIN"].includes(callerProfile.rol)) {
      return new Response(JSON.stringify({ error: "Permiso denegado. Solo ROOT/ADMIN pueden crear usuarios." }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }

    // Crear usuario en Auth
    const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { nombre },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    // Insertar en tabla usuarios
    const { error: insertErr } = await supabase.from("usuarios").insert({
      id: authData.user.id,
      email,
      nombre,
      rol: rol || "ARQUITECTO",
      activo: true,
    });

    if (insertErr) {
      // Rollback: eliminar usuario de Auth si falla insert en tabla
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user: { id: authData.user.id, email, nombre, rol: rol || "ARQUITECTO" } }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
