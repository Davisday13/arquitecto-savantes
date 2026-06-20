# Base Savantix (sin Factura Electrónica) — Guía de reuso

Código fuente de **Savantix** en su versión **anterior a la factura electrónica** (de ahí
"ANTES DE FE"). Es la base de partida para el **Software de Control para Arquitectos**.
Ver `RUTA_PROYECTO_v2.pdf` (visión) y `ESPEC_TECNICA_DESARROLLADOR_v2.pdf` (esquema y deploy).

## Qué se incluyó / excluyó
- ✅ Código fuente completo: `src/`, `public/`, `supabase/schema.sql`, configs (Vite/Tailwind/Vercel).
- ❌ `node_modules/` → correr `npm install`.
- ❌ `dist/` → se regenera con `npm run build`.
- ❌ `.env` / `.env.production` → contenían credenciales reales de Savantix. Usar `.env.example`
  y crear un **proyecto Supabase nuevo** para el arquitecto.
- ❌ Sin factura electrónica (esta versión es previa a la FE).

## Puesta en marcha
```bash
npm install
cp .env.example .env   # y completar con el nuevo proyecto Supabase
npm run dev
```

## Mapa de reuso para el software del arquitecto

### Mantener tal cual (base genérica)
- `context/AuthContext.jsx`, `components/LoginView.jsx`, `UsuariosView.jsx`, `PermisosView.jsx`
- `components/ClientesView.jsx`, `ClienteRapidoModal.jsx`
- `AuditoriaView.jsx`, `NotificacionesView.jsx`, `Campanita.jsx`
- `ConfiguracionView.jsx` (ajustar moneda a B/. Panamá)
- `Navbar.jsx`, `components/ui/*`, `lib/supabase.js`, `lib/utils.js`, `lib/notificaciones.js`
- `DashboardView.jsx`, `ReportesView.jsx` (adaptar métricas a proyectos)
- Mensajería: `EnviarCorreoModal.jsx`, `WhatsAppButton.jsx`, `lib/correoPlantillas.js`, `lib/whatsapp.js`

### Adaptar
- `CatalogoView.jsx` → **Inventario** (stock + consumo por etapa)
- `PresupuestosView.jsx` / `PresupuestoFormModal.jsx` / `pdfPresupuesto.js` → **Cotización por proyecto** (etapas/sub-etapas, pesos, montos)
- `PagosView.jsx` / `PagoFormModal.jsx` / `PagosSection.jsx` / `pdfRecibo.js` → **Pagos por sub-etapa**
- `EstadoCuentaView.jsx` / `pdfEstadoCuenta.js` → **Estado de cuenta del proyecto**

### Construir nuevo (corazón del producto)
- **Proyectos**: lista + detalle con doble barra **% avance vs % pago** y roll-up sub-etapa → etapa → proyecto.
- **Gastos**: generales (oficina) vs por etapa (rentabilidad).

### Eliminar (específico de taller, no aplica a arquitectura)
- `OrdenesView.jsx`, `OrdenDetalleModal.jsx`, `pdfOrden.js`
- `EquiposView.jsx`, `EquipoRapidoModal.jsx`
- `RepuestoRapidoModal.jsx`
- `VisitasView.jsx`, `VisitaDetalleModal.jsx`, `pdfVisita.js`, `CalendarioView.jsx` (evaluar)
- Al quitarlos, depurar sus rutas/imports en `App.jsx` y `Navbar.jsx`.

## Nota sobre `supabase/schema.sql`
Es el esquema **de taller** (órdenes, equipos, repuestos). Sirve de **referencia de patrones**
(triggers de recálculo, RLS, auditoría). El esquema nuevo de proyectos/etapas está en
`ESPEC_TECNICA_DESARROLLADOR_v2.pdf` (sección 4).
