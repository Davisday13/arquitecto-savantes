# Sistema de Soporte Técnico

Aplicación web para gestionar **entradas a taller** (CCTV, impresoras, copiadoras, computadoras, redes, etc.) y **visitas técnicas en sitio** con checklist, fotos, firma digital del cliente y reporte PDF.

Construida sobre la misma arquitectura del proyecto Oasis: **Vite + React + Supabase + Tailwind**, lista para desplegar en Vercel.

---

## ✨ Funcionalidades

- 👥 **Gestión de clientes** (empresas y personas) con código autogenerado
- 🖥️ **Inventario de equipos** por cliente, identificados por número de serie
- 🛠️ **Órdenes de taller** con flujo de 7 estados (Recibido → Diagnóstico → Esperando repuesto → Reparación → Pruebas → Listo → Entregado), repuestos, mano de obra, totales, timeline de cambios
- 📍 **Visitas en sitio** con checklist dinámico, fotos, firma digital del cliente y generación de **PDF**
- 👤 **5 roles**: Root, Admin, Recepcionista, Técnico, Cliente
- 🔐 **Permisos granulares por usuario** (configurables más allá del rol)
- 📊 **Reportes** con filtros, gráficas y exportación a Excel
- 📜 **Auditoría** de cambios sensibles
- 🏢 **Configuración de empresa** (logo + datos para el PDF)
- 🔔 **Estructura de notificaciones** (App + Email + WhatsApp/SMS) — pendiente integrar proveedor real
- 📱 **Diseño responsive**, funciona en celular para técnicos en sitio

---

## 🚀 Instalación

### 1) Clonar e instalar dependencias

```bash
git clone <tu-repo>
cd soporte-tecnico
npm install
```

### 2) Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto.
2. En el dashboard, copia la **URL del proyecto** y la **anon key** (Settings → API).

### 3) Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:

```
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 4) Crear el schema de la base de datos

1. En el dashboard de Supabase, ve a **SQL Editor → New query**.
2. Abre el archivo `supabase/schema.sql` de este repo.
3. Copia y pega TODO su contenido en el editor de Supabase.
4. Click en **Run**.

Esto crea todas las tablas, vistas, triggers, políticas RLS, secuencias, el bucket de Storage `soporte-tecnico` y datos iniciales.

### 5) Crear el primer usuario ROOT

1. En Supabase: **Authentication → Users → Add user**.
2. Email: `admin@tuempresa.com` (o el que quieras), password: el que quieras.
3. Marca **Auto Confirm User** (para que pueda entrar sin verificar email).
4. Una vez creado, copia el **UUID** del usuario.
5. Vuelve al **SQL Editor** y corre, reemplazando `<UUID>`:

```sql
INSERT INTO public.usuarios
  (id, email, email_login, nombre_completo, rol, activo, permisos)
VALUES (
  '<UUID>',
  'admin@tuempresa.com',
  'admin@tuempresa.com',
  'Administrador',
  'ROOT',
  true,
  '{"dashboard":true,"clientes":true,"equipos":true,"ordenes":true,
    "visitas":true,"usuarios":true,"permisos":true,"reportes":true,
    "auditoria":true,"configuracion":true}'::jsonb
);
```

### 6) Ejecutar localmente

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e ingresa con el usuario ROOT.

---

## 🌐 Despliegue en Vercel

1. Sube el código a GitHub/GitLab/Bitbucket.
2. En [vercel.com](https://vercel.com), importa el repo.
3. **Framework**: Vite (autodetectado).
4. **Environment Variables**: agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. **Deploy**.

El archivo `vercel.json` ya está configurado para que las rutas SPA funcionen.

---

## 🔧 Configuración inicial

Una vez logueado como ROOT:

1. **Empresa** → sube tu logo y completa los datos (esto se usa en los PDF de visitas).
2. **Usuarios** → crea técnicos, recepcionistas, etc.
3. **Permisos** → ajusta los permisos finos por usuario (los defaults del rol son un buen punto de partida).
4. **Clientes** → registra tus clientes (empresas y personas).
5. **Equipos** → registra los equipos de cada cliente.

A partir de ahí, ya puedes empezar a crear órdenes de taller y visitas.

---

## 📂 Estructura del proyecto

```
soporte-tecnico/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/                       # Button, Input, Modal, Card, Badge
│   │   ├── LoginView.jsx
│   │   ├── Navbar.jsx
│   │   ├── DashboardView.jsx
│   │   ├── ClientesView.jsx
│   │   ├── EquiposView.jsx
│   │   ├── OrdenesView.jsx
│   │   ├── OrdenDetalleModal.jsx     # detalle: estados, repuestos, mano obra, timeline
│   │   ├── VisitasView.jsx
│   │   ├── VisitaDetalleModal.jsx    # checklist, fotos, firma
│   │   ├── pdfVisita.js              # genera el PDF de la visita
│   │   ├── UsuariosView.jsx
│   │   ├── PermisosView.jsx
│   │   ├── ReportesView.jsx
│   │   ├── AuditoriaView.jsx
│   │   └── ConfiguracionView.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── constants.js              # roles, estados, tipos, labels, colores
│   │   ├── utils.js
│   │   └── notificaciones.js         # cola de notificaciones (stubs)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   └── schema.sql                    # schema completo de la DB
├── .env.example
├── package.json
├── tailwind.config.js
├── vite.config.js
└── vercel.json
```

---

## 🔔 Notificaciones (siguiente paso)

La estructura ya está lista (`src/lib/notificaciones.js` + tabla `notificaciones`), pero el envío real (email, WhatsApp/SMS) requiere integrar un proveedor.

**Recomendación:**

- **Email:** [Resend](https://resend.com) (3,000 envíos/mes gratis)
- **WhatsApp/SMS:** [Twilio](https://twilio.com)

Crear una **Supabase Edge Function** que cada N minutos lea `notificaciones WHERE estado='PENDIENTE'` y dispare los envíos.

---

## 🔐 Roles y permisos

| Rol            | Por defecto                                                              |
|----------------|--------------------------------------------------------------------------|
| **ROOT**       | Acceso total. Único que puede crear otro ROOT.                           |
| **ADMIN**      | Acceso total excepto crear ROOT.                                         |
| **RECEPCIONISTA** | Clientes, equipos, órdenes, visitas, reportes.                        |
| **TECNICO**    | Clientes (lectura), equipos, órdenes, visitas. Sin reportes.             |
| **CLIENTE**    | Ve solo sus propios equipos, órdenes y visitas (RLS).                    |

Los permisos default de cada rol están en `src/lib/constants.js → PERMISOS_POR_ROL` y se pueden personalizar por usuario desde **Permisos**.

---

## 🛡️ Seguridad

- **RLS habilitado** en `equipos`, `ordenes_taller` y `visitas`. Un usuario con rol CLIENTE solo ve los registros de su `id_cliente_asociado`.
- Personal interno (ROOT/ADMIN/RECEPCIONISTA/TECNICO) ve todo.
- Las demás tablas confían en la lógica de permisos del cliente (igual que Oasis), suficiente porque solo personal interno las consulta.

Si quieres endurecer aún más, puedes añadir políticas RLS adicionales en `supabase/schema.sql`.

---

## 📝 Licencia

Uso interno.
