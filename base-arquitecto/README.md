# Arquitecto

Sistema de control de proyectos para arquitectos.

Basado en Savantix (sistema de soporte técnico), adaptado al dominio de arquitectura con gestión de proyectos, etapas, sub-etapas, cotizaciones, gastos e inventario.

## Stack

- **Frontend:** Vite + React 18 + Tailwind CSS 3 + Framer Motion + Recharts
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **PWA:** Service worker mínimo (solo para instalable)
- **Moneda:** B/. (Balboa panameño, código PAB)

## Estructura del proyecto

```
base-arquitecto/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── .gitignore
├── vercel.json
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── supabase/
│   └── schema.sql              # Schema completo con 16 tablas + vistas
├── src/
│   ├── main.jsx
│   ├── index.css
│   ├── App.jsx                  # Router principal
│   ├── context/
│   │   └── AuthContext.jsx      # Autenticación y sesión
│   ├── lib/
│   │   ├── constants.js         # Roles, estados, permisos, categorías
│   │   ├── supabase.js          # Cliente Supabase
│   │   ├── utils.js             # formatDate, formatCurrency (B/.), etc.
│   │   ├── whatsapp.js          # WhatsApp Click-to-Chat
│   │   └── correoPlantillas.js  # Plantillas HTML para correos
│   └── components/
│       ├── ui/                  # Componentes base reutilizables
│       │   ├── Button.jsx
│       │   ├── Input.jsx        # Input, Select, Textarea
│       │   ├── Modal.jsx
│       │   └── Card.jsx         # Card, CardContent, Badge
│       ├── Navbar.jsx           # Menú lateral colapsable
│       ├── LoginView.jsx        # Pantalla de inicio de sesión
│       ├── DashboardView.jsx    # KPIs y resumen general
│       │
│       │── MÓDULO PROYECTOS
│       ├── ProyectosView.jsx
│       ├── ProyectoFormModal.jsx
│       ├── ProyectoDetalleModal.jsx  # Gestión de etapas/sub-etapas, doble barra
│       │
│       │── MÓDULO COTIZACIONES
│       ├── CotizacionesView.jsx
│       ├── CotizacionFormModal.jsx
│       │
│       │── MÓDULO GASTOS
│       ├── GastosView.jsx
│       ├── GastoFormModal.jsx
│       │
│       │── MÓDULO INVENTARIO
│       ├── InventarioView.jsx   # Stock bajo, edición inline
│       │
│       │── MÓDULO PAGOS
│       ├── PagosView.jsx
│       ├── PagoFormModal.jsx
│       │
│       │── MÓDULO ESTADO DE CUENTA
│       ├── EstadoCuentaView.jsx # Rentabilidad, doble barra avance vs pago
│       │
│       │── MÓDULO CLIENTES
│       ├── ClientesView.jsx
│       ├── ClienteRapidoModal.jsx
│       │
│       │── MÓDULO ADMINISTRACIÓN
│       ├── UsuariosView.jsx
│       ├── PermisosView.jsx
│       ├── AuditoriaView.jsx
│       ├── NotificacionesView.jsx
│       ├── ConfiguracionView.jsx
│       │
│       │── MÓDULO REPORTES
│       ├── ReportesView.jsx
│       │
│       │── MÓDULO CORREOS
│       ├── CorreosLogView.jsx
│       ├── EnviarCorreoModal.jsx
│       │
│       │── UTILIDADES
│       ├── WhatsAppButton.jsx
│       └── Campanita.jsx
```

## Roles

| Rol | Descripción |
|-----|-------------|
| ROOT | Acceso total, puede gestionar usuarios y permisos |
| ADMIN | Acceso total excepto gestión de usuarios ROOT |
| ARQUITECTO | Dashboard, proyectos, cotizaciones, gastos, inventario, pagos, clientes |
| ASISTENTE | Módulos operativos, sin reportes, auditoría ni configuración |
| CLIENTE | Solo su dashboard, proyectos y estado de cuenta |

## Instalación

```bash
# 1. Clonar y entrar
cd base-arquitecto

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con las credenciales de Supabase

# 4. Iniciar en desarrollo
npm run dev
```

## Configuración de Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y pegar el contenido de `supabase/schema.sql`
3. Ejecutar todo el script (crea 16 tablas, 6 vistas, triggers, índices y datos iniciales)
4. En **Authentication > Settings** configurar:
   - `SITE_URL`: `http://localhost:5173` (o la URL de producción)
   - Redirect URLs: `http://localhost:5173/**`
5. En **Authentication > Providers** habilitar Email
6. Crear el primer usuario en **Authentication > Users**
7. En **Storage** crear un bucket llamado `arquitecto` (público) para logos
8. Copiar las credenciales (`Project URL` y `anon public key`) al `.env`

### Nota sobre el primer inicio de sesión

El sistema verifica que el usuario exista en la tabla `usuarios`. Si no existe, redirige al login. Para crear el primer usuario:

```sql
-- Ejecutar en SQL Editor después de crear el usuario en Auth
INSERT INTO usuarios (id, email, nombre, rol, activo)
VALUES (
  '<UUID-del-usuario-en-auth>',
  'correo@ejemplo.com',
  'Admin',
  'ROOT',
  true
);
```

## Despliegue

### Vercel (recomendado)

```bash
npm run build
vercel --prod
```

### Netlify / Otros

Ajustar `_redirects` o Netlify config para SPA. El `vercel.json` ya incluye la configuración necesaria.

## Convenciones de desarrollo

- **Moneda:** Siempre usar B/. (Balboas panameños). En `utils.js` está `formatCurrency()`.
- **Permisos:** Se definen en `constants.js` como `PERMISOS_POR_ROL`. Por usuario se sobreescriben desde la tabla `usuarios`.
- **Fechas:** El schema usa `timestamptz` de PostgreSQL, el front usa `toLocaleDateString('es-PA')`.
- **Iconos:** Lucide React (`lucide-react`).
- **Tablas:** Vistas materializadas en Supabase para resúmenes (prefijo `v_`).
- **Navbar:** Escucha eventos `arq:sidebar-toggle` y `arq:empresa-actualizada` para actualizaciones dinámicas.

## Mapa de reuso (desde base-savantix-sin-fe)

| Savantix original | Arquitecto |
|-------------------|------------|
| Presupuestos → | Cotizaciones (por proyecto) |
| Órdenes/Equipos | Eliminado → Proyectos + Etapas + Sub-etapas |
| Visitas técnicas | Eliminado → Avance por sub-etapa |
| Pagos → | Pagos (por sub-etapa/proyecto) |
| Estado de cuenta → | Estado de cuenta del proyecto |
| Catálogo → | Inventario (materiales/insumos) |
| Repuestos | Eliminado → Consumo de inventario |
| Clientes → | Clientes (con tipo PERSONA/EMPRESA) |
| Usuarios/Permisos → | Usuarios/Permisos (roles: ARQUITECTO, ASISTENTE, CLIENTE) |
| Dashboard → | Dashboard (con KPIs de proyectos) |
| Login → | Login (sin cambios) |

---

Proyecto generado a partir de `base-savantix-sin-fe` siguiendo la guía de reuso `_GUIA_REUSO.md`.
