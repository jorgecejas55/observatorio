# Estado Actual del Proyecto
> Actualizar este archivo al FINAL de cada sesión de trabajo.
> Última actualización: 19/04/2026 (sesión museos - Eliminación masiva completada)

---

## 🟢 Módulos completados / funcionando

### Infraestructura base
- [x] Proyecto Next.js 15 + TypeScript + Tailwind configurado
- [x] Sistema de diseño (paleta, componentes base, globals.css)
- [x] Auth: NextAuth.js con Google OAuth (`src/auth.ts`, `src/middleware.ts`)
- [x] Layout principal con Header + Sidebar (`src/components/layout/`)
- [x] Componentes UI reutilizables: `FormField`, `Badge`, `Button`, `LoadingSpinner`
- [x] Tipos globales (`src/lib/types.ts`) y cliente GAS (`src/lib/sheets-api.ts`)
- [x] **Repositorio GitHub**: https://github.com/jorgecejas55/observatorio.git (rama `main`)
  - Carpeta `.claude/` excluida del repositorio público
- [x] **Deploy en Vercel**: ✅ funcionando en producción
  - Correcciones de TypeScript aplicadas para build de producción

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

### Museos Municipales
- [x] **Módulo de Museos - Museo Virgen del Valle** — FASE 1 COMPLETADA ✅
  - [x] GAS: `gas/museo-virgen-valle.gs` con CacheService (5 min) + función `generarIDsFaltantes()`
  - [x] API Routes: `/api/ocio/ingresos/museo-virgen-valle/` (auth, ocasionales, institucionales)
  - [x] Páginas: `/ocio/ingresos/museo-virgen-valle/` (ocasionales, institucionales)
  - [x] Componentes: FormVisitaOcasional, FormVisitaInstitucional, TablaVisitas, MuseoLoginForm
  - [x] Context: MuseoVirgenValleAuthContext con localStorage
  - [x] Lib: `src/lib/geografia.ts` (95 países, 24 provincias, 15 departamentos)
  - [x] Optimizaciones: useCallback, useMemo, caché Next.js (60s), caché GAS (5min)
  - [x] Rutas dinámicas adaptadas a Next.js 15 (await params)
  - [x] IDs generados para registros históricos
  - Sheet: `1lEjhsZkcWmE5Rp1IuYc9_LHRKIebURXqdkXHp6sTPEk`
  - Env var: `MUSEO_VIRGEN_VALLE_SCRIPT_URL` ✅ configurada
  - URL: http://localhost:3003/ocio/ingresos/museo-virgen-valle
  
- [x] **Módulo de Museos - Museo Arqueológico Adán Quiroga** — FASE 2 COMPLETADA ✅
  - [x] GAS: `gas/museo-adan-quiroga.gs` con CacheService (5 min) + función `generarIDsFaltantes()`
  - [x] API Routes: `/api/ocio/ingresos/museo-adan-quiroga/` (auth, ocasionales, institucionales)
  - [x] Páginas: `/ocio/ingresos/museo-adan-quiroga/` (ocasionales, institucionales)
  - [x] Context: MuseoAdanQuirogaAuthContext con localStorage
  - [x] Rutas dinámicas adaptadas a Next.js 15 desde el inicio
  - [x] Manejo de errores mejorado en API routes
  - [x] IDs generados para registros históricos
  - Sheet: `15_ZDtwVIxhqT-C5YAjEvVXPJaduvqtuuur5hQq74aew`
  - Env var: `MUSEO_ADAN_QUIROGA_SCRIPT_URL` ✅ configurada
  - URL: http://localhost:3003/ocio/ingresos/museo-adan-quiroga

- [x] **Módulo de Museos - Museo de la Ciudad Casa Caravati** — FASE 3 COMPLETADA ✅
  - [x] GAS: `gas/museo-casa-caravati.gs` con CacheService (5 min) + función `generarIDsFaltantes()`
  - [x] API Routes: `/api/ocio/ingresos/museo-casa-caravati/` (auth, ocasionales, institucionales)
  - [x] Páginas: `/ocio/ingresos/museo-casa-caravati/` (ocasionales, institucionales)
  - [x] Context: MuseoCasaCaravatiAuthContext con localStorage
  - [x] Service: `museoCasaCaravatiAuthService.ts`
  - [x] Optimizaciones aplicadas desde el inicio
  - [x] Corrección tipos: 'casa-caravati' → 'museo-casa-caravati' en `types.ts`
  - [x] Corrección `.env.local`: eliminar espacio antes de URL
  - Sheet: `1kBIMwf7I5KVDxBHz9IuiyW0J2KZY6W4P4KcMlt7Pshs`
  - Env var: `MUSEO_CASA_CARAVATI_SCRIPT_URL` ⏳ pendiente configurar
  - URL: http://localhost:3003/ocio/ingresos/museo-casa-caravati
  - Credenciales test: admin@casa-caravati.com / 123456
  - **Estado:** ✅ Código completo, pendiente deploy GAS y configuración
  - Ver documentación: `.claude/docs/modulo-museos.md`

- [x] **Módulo de Museos - FASE 4: Funcionalidades Avanzadas** — COMPLETADA ✅
  - [x] **Dashboard de métricas con Recharts**
    - Componente: `src/components/museos/DashboardMuseo.tsx` (~450 LOC)
    - KPIs: total ocasionales, institucionales, personas, promedios
    - Gráficos: AreaChart (visitas/mes), PieChart/Donut (procedencia), BarChart (tipos/canales)
    - Filtros: año + periodo de fechas (combinados)
    - Optimizado con `useMemo` para filtrado
  - [x] **Exportación XLSX y CSV**
    - Librería: `xlsx` (SheetJS)
    - Dropdown con 2 opciones de formato
    - Exporta solo registros filtrados
    - Nombres de archivo con timestamp
  - [x] **Carga masiva de registros**
    - Páginas: `/ocasionales/carga-masiva` y `/institucionales/carga-masiva`
    - Formulario dinámico con array de visitas
    - Botones agregar/quitar filas
    - Campos idénticos a formulario individual
    - Validación + contador exitosas/errores
    - `usuario_registro` incluido automáticamente
  - [x] **Filtros avanzados en tablas**
    - Selector de año (todos, 2023, 2024, 2025, 2026...)
    - Filtro por periodo (fecha desde - fecha hasta)
    - Ambos filtros trabajan combinados
  - [x] **Eliminación masiva (Bulk Delete)**
    - Implementada en los 3 museos (Ocasionales e Institucionales)
    - Checkboxes de selección múltiple en `TablaVisitas.tsx`
    - Barra de acciones flotante con confirmación
    - Procesamiento en paralelo con `Promise.allSettled`
  - **Estado:** ✅ 3 museos completos (Virgen Valle, Adán Quiroga, Casa Caravati)

**MÓDULO DE MUSEOS:** 
- Fase 3 (CRUD): 3/3 museos (100%) ✅
- Fase 4 (Avanzado): 3/3 museos (100%) ✅

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
- TypeScript en build de producción: usar `as any` para propiedades opcionales de Navigator API; operador de coalescencia nula (`??`) para comparaciones con propiedades opcionales; doble cast (`as unknown as Type`) para transformaciones de tipos complejas
- **Sincronización de UI y Caché**: Se eliminó la caché de Next.js (`revalidate: 60`) en las rutas API de Museos para evitar que los usuarios vean datos obsoletos después de una eliminación o carga. Ahora se utiliza `{ cache: 'no-store' }`, delegando la gestión de caché exclusivamente al backend (GAS), que maneja una invalidación nativa correcta ante escrituras.

---

## 🔑 Puntos de atención para próxima sesión

- ⚠️ **IMPORTANTE**: Validar `npm run build` localmente antes de push a GitHub — errores TypeScript bloquean deploy en Vercel
- **Calidad Bus**: crear planilla Google Sheets con encabezados según `gas/encuesta-calidad-bus.gs`, configurar `ENCUESTA_BUS_SCRIPT_URL` en `.env.local`
- Variables de entorno en Vercel: asegurarse de que todas las `NEXT_PUBLIC_*` y URLs de GAS estén configuradas en el dashboard de Vercel
- **Dependencia nueva:** `npm install xlsx` (SheetJS para exportación)

---

## 📅 Log de sesiones

| Fecha | Qué se trabajó | Estado al cerrar |
|---|---|---|
| 26/03/2026 | Inicio del proyecto, estructura base Next.js | Base funcional |
| 27/03/2026 | Configuración memoria Claude Code (.claude/) | Archivos de contexto creados |
| 27/03/2026 | **Encuesta Perfil del Turista** completa (form + API route + GAS) | Implementado, falta deploy GAS |
| 27/03/2026 | **Dashboard Perfil del Visitante** · sidebar colapsable · card en dashboard principal · reorganización rutas | Todo funcionando |
| 27/03/2026 | **Encuesta Calidad Bus** (form + API route + GAS) — 16 preguntas, 6 pasos, fingerprinting anti-duplicado | Implementado, falta configurar planilla y env var |
| 09/04/2026 | **Deploy a producción**: GitHub + Vercel · corrección de errores TypeScript · carpeta `.claude/` excluida de repo | ✅ Sistema en producción funcionando |
| 11/04/2026 | **Módulo Museos - Fase 1**: Museo Virgen del Valle completo · CacheService · generación IDs históricos | ✅ Museo 1/3 funcionando |
| 12/04/2026 | **Módulo Museos - Fase 2**: Museo Adán Quiroga completo · corrección bugs Next.js 15 | ✅ Museo 2/3 funcionando |
| 13/04/2026 | **Módulo Museos - Fase 3 y 4**: Dashboard · Exportación · Carga masiva · Filtros avanzados | ✅ 3/3 museos completos |
| 19/04/2026 | **Módulo Museos - Bulk Delete**: Selección múltiple y eliminación masiva en 3 museos | ✅ Funcionalidad 100% completada |
