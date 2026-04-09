# Estado Actual del Proyecto
> Actualizar este archivo al FINAL de cada sesión de trabajo.
> Última actualización: 27/03/2026 (sesión 3)

---

## 🟢 Módulos completados / funcionando

### Infraestructura base
- [x] Proyecto Next.js 15 + TypeScript + Tailwind configurado
- [x] Sistema de diseño (paleta, componentes base, globals.css)
- [x] Auth: NextAuth.js con Google OAuth (`src/auth.ts`, `src/middleware.ts`)
- [x] Layout principal con Header + Sidebar (`src/components/layout/`)
- [x] Componentes UI reutilizables: `FormField`, `Badge`, `Button`, `LoadingSpinner`
- [x] Tipos globales (`src/lib/types.ts`) y cliente GAS (`src/lib/sheets-api.ts`)

### Turismo de Eventos
- [x] **Registro de Eventos** (`/eventos/registro`) — CRUD completo, 3 secciones, tabla con filtros
  - GAS: script integrado · API Route: `api/eventos/`, `api/eventos/[id]/`
  - Planilla: `1DKihpmJyUIEx1QzwY3gxgMcRq2z44GBtW6ekEVkw1Cc`
  - Env var: `EVENTOS_SCRIPT_URL` ✅ configurada
- [x] **Encuesta de Demanda de Eventos** (`/eventos/encuesta`) — 819 líneas, formulario completo
  - GAS: `gas/encuesta-demanda-eventos.gs` · API Route: `api/eventos/encuesta/`
  - Planilla: `1DKihpmJyUIEx1QzwY3gxgMcRq2z44GBtW6ekEVkw1Cc`
  - Env var: `ENCUESTA_DEMANDA_SCRIPT_URL` ✅ configurada

### Turismo de Ocio
- [x] **Encuesta Perfil del Turista** (`/ocio/encuesta`) — formulario completo, probado y funcionando
  - 7 secciones: Origen, Viaje, Turista, Decisión, Valoraciones (9 dimensiones), Satisfacción, Operativo
  - ComboboxField para países (95 opciones, sin texto libre)
  - Movilidad en ciudad: condicional a OMNIBUS/AVION
  - GAS: `gas/encuesta-perfil-turista.gs` deployado · API Route: `api/ocio/encuesta/`
  - Planilla: `1M3mPZnra9Wu5E-RvCp6X_MgV3_MliypCOOPeMzdbNF0`
  - Env var: `ENCUESTA_PERFIL_SCRIPT_URL` ✅ configurada
- [x] **Dashboard Perfil del Visitante** (`/estadisticas/perfil-visitante`) — acceso público, sin auth ← *sesión 27/03 #2*
  - Filtros: año (botones), rango de fechas personalizado, procedencia (chips)
  - KPIs: total encuestas, edad promedio, estadía promedio, % primera visita
  - Gráficos: procedencia (torta), países/provincias/deptos top 5 (barras horizontales), motivos, grupo de viaje, transporte, alojamiento, promedios por procedencia, satisfacción (4 tortas), valoraciones (1-5)
  - Todos los valores en porcentajes (top 5 con % relativo al total de la muestra)
  - Accesible desde: card en `/dashboard` + sidebar en grupo "Estadísticas"
  - GAS: `gas/dashboard-perfil-turista.gs` · API Route: `api/ocio/dashboard/`
  - Env var: `DASHBOARD_PERFIL_SCRIPT_URL` ✅ configurada (pendiente verificar en producción)

### Estadísticas Generales
- [x] **Dashboard Principal** (`/dashboard`) — 634 líneas, KPIs + gráficos Recharts
  - Indicadores mensuales, feriados, ingresos por atractivo
  - API Routes: `api/indicadores/` (GET), `api/indicadores/atractivos/`, `api/indicadores/findes/`
- [x] **Carga de Indicadores Mensuales** (`/estadisticas/indicadores`) — 214 líneas
  - GAS: `gas/indicadores-mensuales.gs` · API Route: `api/indicadores/carga/`
  - Env var: `INDICADORES_SCRIPT_URL` ✅ configurada

---

## 🔄 En desarrollo activo

- (ninguno activo en este momento)

---

## ⏳ Pendiente / planificado

### Turismo de Ocio
- [ ] **Ingresos a Atractivos** (`/ocio/ingresos`) — grid de atractivos creado, falta página de detalle `/ocio/ingresos/[id]` con formulario de registro y GAS
- [ ] **Camping Municipal** (`/ocio/camping`) — stub vacío, falta implementar

### Calidad
- [ ] **Percepción Social** (`/calidad/percepcion`) — stub, tiene GAS (`NEXT_PUBLIC_PERCEPCION_SCRIPT_URL` ✅ configurada), falta formulario completo
- [x] **Calidad Bus** (`/calidad/bus`) — formulario completo implementado ← *sesión 27/03 #3*
  - 16 preguntas en 6 pasos: datos del viaje, servicio (4 estrellas), guía (4 estrellas), experiencia general, comentarios
  - Fingerprinting SHA-256 del dispositivo — prevención de duplicados (48 h)
  - GAS: `gas/encuesta-calidad-bus.gs` · API Route: `api/calidad/bus/`
  - Env var: `ENCUESTA_BUS_SCRIPT_URL` ⚠️ pendiente configurar en `.env.local`
  - Planilla: pendiente crear (ver instrucciones en `gas/encuesta-calidad-bus.gs`)
- [ ] **Calidad Atractivos** (`/calidad/atractivos`) — stub
- [ ] **Calidad Servicios** (`/calidad/servicios`) — stub

### Oferta
- [ ] **Registro de Alojamientos** (`/oferta/alojamientos`) — stub

### Admin
- [ ] **Configuración** (`/admin/config`) — mini implementación (~50 líneas), ampliar
- [ ] **Usuarios** (`/admin/usuarios`) — stub

### Extras
- [ ] Activar autenticación Google OAuth (credenciales en `.env.local`)
- [ ] Deploy en Vercel

---

## 🐛 Bugs conocidos / problemas abiertos

- Auth deshabilitada (`middleware.ts` sin redirecciones) — intencional hasta tener OAuth configurado
- `GOOGLE_APPS_SCRIPT_URL` y `GAS_API_KEY` en `.env.local` son placeholders sin usar (integración alternativa por módulo)

---

## 📋 Decisiones técnicas recientes

- Stack: Next.js 15 + TypeScript + Tailwind + GAS + Google Sheets (sin Supabase ni BD extra)
- Patrón de integración GAS: `page.tsx` → `fetch('/api/[modulo]/[form]')` → API Route → GAS `doPost()`
- `Content-Type: text/plain;charset=utf-8` en el fetch al GAS (requerido para CORS / redirect)
- GAS mapea columnas por nombre exacto de la fila 1 (incluyendo tildes, espacios, mayúsculas)
- Valoraciones: se guardan como número entero (1–5), vacío si S/D — igual que Google Forms
- Dashboard de estadísticas: valores en porcentajes (top 5 con % relativo al total, no al subconjunto)
- Sidebar: colapsable en desktop y mobile, estado gestionado en `MainLayoutClient.tsx`; rutas públicas anotadas en `middleware.ts` para cuando se active auth
- Organización de rutas: encuestas (instrumentos de recolección) bajo `/ocio/`, `/eventos/`; dashboards públicos bajo `/estadisticas/`

---

## 🔑 Puntos de atención para próxima sesión

- Verificar que los encabezados exactos de la hoja de Perfil coincidan con el mapeo del GAS (especialmente "GRUPO DE VIAJE " con espacio final y "¿CU ES EL PRINCIPAL..." con tilde faltante)
- Pendiente: ajustes visuales del dashboard de perfil (mejorar visualización de gráficos)
- **Calidad Bus**: crear planilla Google Sheets con encabezados según `gas/encuesta-calidad-bus.gs`, configurar `ENCUESTA_BUS_SCRIPT_URL` en `.env.local`
- El GAS del sistema anterior (Supabase/GSheets) está en `ENCUESTAS CALIDAD/SISTEMA CALIDAD BUS/app-google-sheets.js` — se puede reutilizar la URL si ya fue desplegado
- Próximo formulario a implementar: `/calidad/percepcion` o `/ocio/ingresos/[id]`

---

## 📅 Log de sesiones

| Fecha | Qué se trabajó | Estado al cerrar |
|---|---|---|
| 26/03/2026 | Inicio del proyecto, estructura base Next.js | Base funcional |
| 27/03/2026 | Configuración memoria Claude Code (.claude/) | Archivos de contexto creados |
| 27/03/2026 | **Encuesta Perfil del Turista** completa (form + API route + GAS) | Implementado, falta deploy GAS |
| 27/03/2026 | **Dashboard Perfil del Visitante** · sidebar colapsable · card en dashboard principal · reorganización rutas | Todo funcionando |
| 27/03/2026 | **Encuesta Calidad Bus** (form + API route + GAS) — 16 preguntas, 6 pasos, fingerprinting anti-duplicado | Implementado, falta configurar planilla y env var |
