# Plan de Optimización de Carga - Módulos de Visualización

Este documento detalla la estrategia para optimizar el rendimiento y la experiencia de usuario (UX) **exclusivamente** en los módulos de visualización de datos y reportes del Observatorio de Turismo.

## 1. Alcance
La optimización se aplicará estrictamente a los siguientes módulos de lectura (read-heavy):
- **Dashboard Principal** (`/dashboard`)
- **Perfil del Visitante** (`/estadisticas/perfil-visitante`)
- **Dashboard de Eventos** (`/estadisticas/eventos`)

*(Nota de alcance: Los módulos de gestión y carga de datos en tiempo real, como los ingresos a Museos, se excluyen de este plan, ya que requieren un enfoque distinto orientado a transacciones y Optimistic Updates).*

---

## 2. Pilares de la Optimización

Para los módulos de visualización, el objetivo es reducir drásticamente el tiempo de carga inicial (FCP) y proporcionar una navegación fluida (sin pantallas en blanco), aplicando cuatro técnicas clave:

### A. Server-Side Fetching (RSC) y Streaming
- **Pre-carga en Servidor:** Trasladar la petición inicial de datos al servidor. Las páginas enviarán el HTML pre-renderizado junto con los datos esenciales, reduciendo el "waterfall" de peticiones en el cliente.
- **Suspense y Skeleton Loaders:** Utilizar archivos `loading.tsx` a nivel de ruta. En lugar de mostrar un spinner global bloqueante, se mostrará instantáneamente un esqueleto de la UI (KPIs y gráficos vacíos) mientras los datos terminan de llegar, evitando saltos de contenido (Layout Shift).

### B. Caché Cliente con TanStack Query (React Query)
- **Sustitución de `useEffect`:** Se reemplazará el fetching manual (con `useEffect` y `useState`) por `useQuery`.
- **Stale-While-Revalidate:** Al cambiar de pestañas o filtros, si los datos ya están en caché, se mostrarán de forma instantánea mientras se actualizan silenciosamente en segundo plano.

### C. Code Splitting (Dynamic Imports)
- **Carga Diferida de Gráficos:** Librerías pesadas como `recharts` o `leaflet` se importarán dinámicamente (`next/dynamic`) solo en los componentes del cliente que las requieran, y preferiblemente sin SSR (`ssr: false` para gráficos complejos), reduciendo el peso del bundle JavaScript inicial.

### D. Optimización de Payloads (APIs)
- **Procesamiento en Backend:** Mover cálculos pesados (como promedios multianuales o transformaciones de arrays) desde los componentes React hacia las rutas de API (`/api/...`), enviando al cliente un JSON ligero y "listo para usar".

---

## 3. Hoja de Ruta de Implementación y Avance

### Fase 1: Infraestructura Global (Setup) - [Completado]
- [x] Integrar `QueryClientProvider` de TanStack Query en el Layout principal del sistema (`src/app/(main)/layout.tsx` o en un Provider dedicado).
- [x] Asegurar que los componentes `SkeletonCard`, `SkeletonChart` y `SkeletonFilters` estén listos y disponibles.

### Fase 2: Dashboard Principal (`/dashboard`) - [Completado]
- [x] **API:** Refactorizar `/api/indicadores` para devolver promedios calculados dinámicamente según los años disponibles.
- [x] **Componentes:** Dividir el código actual en un Server Component (`page.tsx`) y un Client Component (`DashboardClient.tsx`).
- [x] **Data:** Inyectar los datos iniciales desde el servidor hacia el cliente, y usar `useQuery` para el polling (`refetchInterval`).
- [x] **Performance:** Aplicar dynamic imports a todos los componentes de Recharts.

### Fase 3: Dashboard de Eventos (`/estadisticas/eventos`) - [Completado]
- [x] **Componentes:** Convertir la página actual a un modelo híbrido (RSC + Client Component), al igual que el Dashboard principal.
- [x] **Data:** Refactorizar el fetching que actualmente depende de `useEffect` para utilizar `useQuery`, vinculándolo directamente al estado de los filtros (fechas, tipo, origen).
- [x] **UX:** Implementar el `loading.tsx` correspondiente usando el diseño de Skeletons ya existente.

### Fase 4: Perfil del Visitante (`/estadisticas/perfil-visitante`) - [Completado]
- [x] **Refactorización Menor:** Este módulo ya utiliza un modelo híbrido (`page.tsx` + `DashboardClient.tsx`), pero su cliente aún usa `useState/useEffect` para cargar datos al cambiar los filtros.
- [x] **Data:** Reemplazar el `fetchStats` manual por `useQuery`, pasando el `initialStats` proveniente del servidor como data inicial, asegurando una transición inmediata al aplicar filtros.
