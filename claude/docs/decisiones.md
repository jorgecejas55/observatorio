# Registro de Decisiones Técnicas

> Este archivo evita que se vuelvan a debatir decisiones ya tomadas.
> Formato: fecha · decisión · razón · alternativas descartadas

---

## [26/03/2026] Stack tecnológico

**Decisión:** Next.js 14 + TypeScript + Tailwind CSS  
**Razón:** Familiaridad del desarrollador, buen ecosistema, SSR para SEO si se necesita  
**Alternativas descartadas:** Create React App (sin SSR), Vite puro (sin routing integrado)

---

## [26/03/2026] Backend de datos: Google Sheets vía GAS

**Decisión:** Google Sheets como base de datos, accedida a través de Google Apps Script Web App  
**Razón:** Los datos ya existen en Sheets (flujo de trabajo institucional), sin costo de infraestructura, Jorge ya maneja GAS  
**Alternativas descartadas:** Directus CMS (mayor complejidad de deploy), Supabase (requiere infraestructura adicional), base de datos SQL (overkill para el volumen de datos)  
**Limitaciones asumidas:** Sin transacciones, sin queries complejas, latencia de GAS (~500ms-2s)

---

## [11/04/2026] Módulo Museos: Escribir en Sheets existentes vs. crear nuevos

**Decisión:** Escribir en los Google Sheets existentes, agregando hojas nuevas (`visitas_institucionales`, `usuarios`) y columnas nuevas a la hoja existente ("Respuestas de formulario 1")  
**Razón:** Los Sheets actuales están conectados a Looker Studio y Google Forms activos. Crear Sheets nuevos duplicaría datos y requeriría migración manual posterior. Trabajar sobre los existentes permite transición gradual sin interrupciones.  
**Alternativas descartadas:** 
- Crear Google Sheets nuevos (duplicación de datos, doble mantenimiento)
- Modificar/renombrar hojas existentes (riesgo de romper dashboards de Looker Studio)  
**Limitaciones asumidas:** Convivencia temporal de Google Forms y sistema Next.js escribiendo en paralelo

---

## [11/04/2026] Módulo Museos: Un auth service por museo vs. uno genérico

**Decisión:** Crear un auth service y context separado por cada museo (3 pares de archivos: service + context)  
**Razón:** Evita bugs de sesiones cruzadas entre museos, código más simple y explícito, cada museo tiene su propio localStorage namespace  
**Alternativas descartadas:** 
- Un service genérico con parámetro `museoId` (mayor complejidad, riesgo de estado compartido entre museos)
- Un único auth para todos los museos (usuarios tendrían acceso a todos los museos, no queremos eso)  
**Limitaciones asumidas:** Más archivos de código (código duplicado), pero más seguro y simple

---

## [11/04/2026] Módulo Museos: Rutas estáticas vs. dinámicas

**Decisión:** Usar rutas estáticas `/museos/virgen-valle`, `/museos/adan-quiroga`, `/museos/casa-caravati` en lugar de `/museos/[museo]`  
**Razón:** Cada museo tiene su propio AuthProvider de React Context. Con rutas dinámicas, tendríamos que resolver qué provider cargar en runtime, complicando el código. Rutas estáticas permiten wrapping directo con el provider correcto.  
**Alternativas descartadas:** 
- Rutas dinámicas `[museo]` con lógica condicional de providers (mayor complejidad, peor DX)  
**Limitaciones asumidas:** Más repetición de código en estructura de carpetas, pero claridad y simplicidad

---

## [12/04/2026] Next.js 15: Parámetros dinámicos asíncronos

**Decisión:** En Next.js 15, los parámetros de rutas dinámicas (`params`) deben ser awaited porque ahora son Promises  
**Razón:** Breaking change de Next.js 15. El patrón anterior `{ params }: { params: { id: string } }` ya no funciona y genera error 405 Method Not Allowed  
**Implementación correcta:**
```typescript
// ❌ Next.js 14 (ya no funciona en v15)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const result = await update(params.id, data)
}

// ✅ Next.js 15 (correcto)
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const result = await update(params.id, data)
}
```
**Impacto:** Afecta TODAS las rutas dinámicas `[id]` del proyecto. Se actualizaron 4 archivos de API routes en el módulo de museos.

---

## [12/04/2026] Generación automática de IDs en registros existentes

**Decisión:** Crear función `generarIDsFaltantes()` en GAS para asignar UUIDs a registros históricos sin ID  
**Razón:** La columna `id` se agregó después de que ya existían miles de registros en los Sheets. Sin ID, los registros no se pueden editar ni eliminar (error 405 al hacer PUT sin ID en la URL).  
**Implementación:** Función ejecutable manualmente en GAS que:
1. Lee todos los registros de las hojas
2. Genera UUID para cada celda vacía en columna `id`
3. Escribe el UUID en el Sheet
4. Invalida caché  

**Ejecución:** Una sola vez por museo después del `setup()`  
**Alternativas descartadas:**
- Generar IDs on-the-fly al leer (no persistente, IDs cambiarían en cada lectura)
- Migrar datos a Sheet nuevo (duplicación innecesaria, rompe Looker Studio)  
**Resultado:** ~1000+ IDs generados en Virgen del Valle, permitiendo edición de registros históricos

---

## Plantilla para nuevas decisiones

```
## [DD/MM/AAAA] Título de la decisión

**Decisión:** 
**Razón:** 
**Alternativas descartadas:** 
**Limitaciones asumidas:** 
```
