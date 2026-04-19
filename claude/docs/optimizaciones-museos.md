# Optimizaciones de Rendimiento - Módulo de Museos
> Optimizaciones implementadas el 11/04/2026 para mejorar velocidad y experiencia de usuario

---

## Resumen Ejecutivo

**Problema:** El sistema cargaba datos repetidamente de Google Sheets en cada request, causando tiempos de carga lentos (2-3 segundos) y uso ineficiente de recursos.

**Solución:** Implementamos caché a 3 niveles (GAS, Next.js API, React) más optimización de hooks.

**Resultado esperado:**
- Primera carga: ~3s (igual que antes)
- Cargas siguientes: ~0.1-0.3s (10-30x más rápido)
- UI más fluida, sin re-renders innecesarios

---

## 1. Caché en Google Apps Script (Backend)

### Implementación

```javascript
// Duración: 5 minutos (300 segundos)
const CACHE_DURATION = 300;

function getCachedData(key) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

function setCachedData(key, data) {
  const cache = CacheService.getScriptCache();
  cache.put(key, JSON.stringify(data), CACHE_DURATION);
}

function invalidateCache(key) {
  const cache = CacheService.getScriptCache();
  cache.remove(key);
}
```

### Aplicación

**En lecturas (GET):**
```javascript
if (action === 'getOcasionales') {
  const cacheKey = 'ocasionales_list';
  let data = getCachedData(cacheKey);
  
  if (!data) {
    data = getSheetData(SHEETS.OCASIONALES);
    setCachedData(cacheKey, data);
  }
  
  return returnJSON({ success: true, data: data });
}
```

**En escrituras (POST/PUT/DELETE):**
```javascript
if (action === 'createOcasional') {
  const newVisit = createRow(SHEETS.OCASIONALES, params.data);
  invalidateCache('ocasionales_list'); // Importante!
  return returnJSON({ success: true, data: newVisit });
}
```

### Beneficio
- **Cache hit:** ~0.05s (lectura de memoria)
- **Cache miss:** ~2s (lectura de Sheets + escritura en caché)
- **Ahorro:** 95% de tiempo en requests repetidos

---

## 2. Caché en Next.js API Routes (Desactivada)

### Estado Actual
**Se ha desactivado la caché de Next.js (`revalidate: 60`) a favor de `{ cache: 'no-store' }`.**

### Razón del Cambio (19/04/2026)
Se detectó un problema de **sincronización de UI**. Aunque el backend (GAS) invalidaba su caché correctamente al eliminar o crear datos, Next.js seguía sirviendo la versión obsoleta guardada en su propia caché por hasta 60 segundos. Esto causaba:
1. El usuario eliminaba un dato.
2. La tabla se refrescaba pero el dato seguía apareciendo (por la caché de Next.js).
3. El usuario intentaba eliminarlo de nuevo y recibía un error porque el dato ya no existía en la base real.

### Implementación Final
```typescript
// Forzar a Next.js a pedir siempre datos frescos al backend (GAS)
const res = await fetch(url.toString(), { cache: 'no-store' })
```

### Beneficio
- **Sincronización Total:** La UI refleja los cambios inmediatamente después de cualquier operación de escritura.
- **Simplicidad:** Se elimina una capa de caché redundante.
- **Eficiencia:** El backend (GAS) sigue manteniendo su propia caché de 5 minutos, por lo que el rendimiento sigue siendo óptimo sin sobrecargar las Google Sheets.

---

## 3. Optimización React - useCallback y useMemo

### Problema Original

Hooks después de returns condicionales violaban las Reglas de Hooks:

```typescript
// ❌ INCORRECTO
function Component() {
  const [state] = useState()
  
  if (loading) return <Loading />
  
  const callback = useCallback(...) // Hook después de return!
}
```

### Solución

Mover TODOS los hooks antes de cualquier early return:

```typescript
// ✅ CORRECTO
function Component() {
  // 1. Todos los hooks primero
  const [state] = useState()
  const callback = useCallback(...)
  const memoized = useMemo(...)
  
  // 2. Early returns después
  if (loading) return <Loading />
  if (!auth) return <Login />
  
  // 3. Lógica y JSX
  return <Content />
}
```

### Hooks Optimizados

**useCallback aplicado a:**
- `cargarVisitas` - fetch de datos
- `handleSave` - guardar visita
- `handleDelete` - eliminar visita
- `handleEdit` - abrir modal edición
- `handleLogout` - cerrar sesión

**useMemo aplicado a:**
- `totalPages` - cálculo de páginas
- `visitasPaginadas` - slice del array para paginación

### Beneficio
- Funciones no se recrean en cada render
- Componentes hijos no se re-renderean innecesariamente
- Cálculos no se repiten si las dependencias no cambiaron
- UI más fluida y responsiva

---

## 4. Otras Optimizaciones

### Desplegables Geográficos

**Biblioteca centralizada:** `src/lib/geografia.ts`
- 95 países
- 24 provincias argentinas
- 15 departamentos de Catamarca

**Beneficio:**
- Un solo archivo, reutilizable en múltiples formularios
- Desplegables dinámicos según procedencia (mejor UX)
- Sin texto libre = datos más limpios

### Paginación Cliente

- 20 items por página
- Cálculos memoizados
- Navegación: primera, anterior, siguiente, última

**Beneficio:**
- Tablas grandes no ralentizan la UI
- Solo se renderean 20 filas a la vez

---

## Problemas Resueltos en el Proceso

### 1. Login con contraseña numérica

**Problema:** Password `123456` guardado como `number` en Sheets, comparación `===` fallaba

**Solución:**
```javascript
String(u.password) === String(password)
```

### 2. Campo numérico no editable

**Problema:** `parseInt()` inmediato convertía campo vacío a NaN → 1, imposible borrar

**Solución:**
```typescript
// Antes: onChange={(e) => handleChange('field', parseInt(e.target.value))}
// Después: onChange={(e) => handleChange('field', e.target.value)}
// Parsear solo al validar en submit
```

### 3. API 404 en institucionales

**Problema:** Faltaba `route.ts` base, solo existía `[id]/route.ts`

**Solución:** Crear `institucionales/route.ts` con GET y POST

### 4. Error de Hooks de React

**Problema:** Hooks después de early returns

**Solución:** Reorganizar código con hooks primero, returns después

---

## Métricas Estimadas

| Escenario | Sin optimización | Con optimización | Mejora |
|-----------|------------------|------------------|--------|
| Primera carga | 3s | 3s | - |
| Recarga misma página (< 60s) | 3s | 0.1s | 30x |
| Otro usuario carga página (< 5min) | 3s | 0.1s | 30x |
| Navegación entre páginas | N/A | Sin lag | Fluida |
| Interacción con tabla | Lag visible | Instantánea | Mucho mejor |

---

## Lecciones Aprendidas

### Para próximas implementaciones (Adán Quiroga, Casa Caravati):

1. **Siempre usar caché en GAS** para lecturas frecuentes
2. **Siempre invalidar caché** en escrituras
3. **Hooks primero, returns después** - regla de oro de React
4. **useCallback/useMemo** desde el inicio en componentes con tablas grandes
5. **Biblioteca centralizada** para datos reutilizables (geografía, categorías, etc.)
6. **Paginación desde el inicio** si habrá más de 50 registros

### Cuándo NO optimizar prematuramente:

- Componentes pequeños sin hijos pesados
- Funciones simples sin dependencias
- Cálculos triviales (ej: `array.length`)

En este proyecto optimizamos porque:
- Datos reales de museos pueden crecer significativamente
- Múltiples usuarios concurrentes
- Experiencia de usuario es prioritaria para Jorge

---

## Checklist para Replicar en Otros Módulos

- [ ] Agregar CacheService en GAS (funciones helper)
- [ ] Cachear GET actions con keys descriptivas
- [ ] Invalidar caché en CREATE/UPDATE/DELETE
- [ ] `revalidate: 60` en API routes de Next.js
- [ ] useCallback en handlers de eventos
- [ ] useMemo en cálculos costosos
- [ ] Hooks antes de early returns (¡CRÍTICO!)
- [ ] Paginación si >50 registros esperados
- [ ] Biblioteca centralizada para datos reutilizables

---

## Problemas Resueltos en Fase 2 (12/04/2026)

### 1. Next.js 15: Error 405 en rutas dinámicas

**Problema:** Al intentar editar un registro, el PUT fallaba con error 405 Method Not Allowed

**Causa:** Breaking change en Next.js 15 — los `params` de rutas dinámicas ahora son `Promise` y deben ser awaited

**Síntomas:**
```
Request URL: /api/.../ocasionales (sin el ID)
Status: 405 Method Not Allowed
```

**Solución:**
```typescript
// ❌ ANTES (Next.js 14)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const result = await update(params.id, data)
}

// ✅ AHORA (Next.js 15)
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params  // ← Await aquí
  const result = await update(params.id, data)
}
```

**Archivos afectados:**
- `museo-virgen-valle/ocasionales/[id]/route.ts`
- `museo-virgen-valle/institucionales/[id]/route.ts`
- `museo-adan-quiroga/ocasionales/[id]/route.ts`
- `museo-adan-quiroga/institucionales/[id]/route.ts`

---

### 2. Registros históricos sin ID no editables

**Problema:** Los registros creados antes de implementar el sistema no tenían ID, por lo que `editando.id` era `undefined` y el PUT fallaba

**Causa:** La columna `id` se agregó con el `setup()`, pero los miles de registros existentes en Google Sheets no fueron actualizados

**Síntomas:**
```javascript
console.log(editando.id) // undefined
// URL generada: /api/.../ocasionales/undefined → 405
```

**Solución:** Crear función `generarIDsFaltantes()` en GAS

```javascript
function generarIDsFaltantes() {
  // Lee todas las filas
  // Para cada celda vacía en columna 'id', genera UUID
  // Escribe el UUID en la celda
  // Invalida caché
}
```

**Ejecución:** Una sola vez después del `setup()` en cada museo

**Resultado:**
- Virgen del Valle: ~1000+ IDs generados
- Adán Quiroga: ~500+ IDs generados

---

### 3. Mejor manejo de errores en API routes

**Problema:** Cuando el GAS no estaba configurado o devolvía error, el mensaje era críptico: "Unexpected end of JSON input"

**Solución:** Mejorar el helper `gasPost()` con validaciones

```typescript
async function gasPost(body: object) {
  if (!GAS) {
    throw new Error('MUSEO_*_SCRIPT_URL no está configurada en .env.local')
  }

  const res = await fetch(GAS, { method: 'POST', body: JSON.stringify(body) })

  if (!res.ok) {
    throw new Error(`Error en GAS: ${res.status} ${res.statusText}`)
  }

  const text = await res.text()
  if (!text) {
    throw new Error('GAS devolvió una respuesta vacía')
  }

  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error(`GAS devolvió respuesta inválida: ${text.substring(0, 100)}`)
  }
}
```

**Beneficio:** Mensajes de error claros y accionables para debugging

---

### 4. Console.logs temporales para debugging

**Técnica:** Agregar logs temporales con emojis para facilitar identificación

```typescript
console.log('🔍 DEBUG editando:', editando)
console.log('🔍 DEBUG editando.id:', editando.id)
console.log('🔍 DEBUG institucionales - data.data:', data.data)
```

**Ventaja:** Fácil de encontrar en consola del navegador, se pueden remover después

---

## Checklist Actualizado para Próximos Módulos

- [ ] Agregar CacheService en GAS (funciones helper)
- [ ] Cachear GET actions con keys descriptivas
- [ ] Invalidar caché en CREATE/UPDATE/DELETE
- [ ] `revalidate: 60` en API routes de Next.js
- [ ] useCallback en handlers de eventos
- [ ] useMemo en cálculos costosos
- [ ] **Hooks antes de early returns (¡CRÍTICO!)**
- [ ] **Rutas dinámicas con `await params` (Next.js 15)**
- [ ] **Función `generarIDsFaltantes()` incluida en GAS base**
- [ ] **Manejo de errores mejorado en gasPost helper**
- [ ] Paginación si >50 registros esperados
- [ ] Biblioteca centralizada para datos reutilizables
- [ ] Console.logs temporales con emojis para debugging

---

**Fecha:** 11/04/2026 (Fase 1) - 12/04/2026 (Fase 2)  
**Módulos:** Museos - Virgen del Valle y Adán Quiroga  
**Aplicable a:** Casa Caravati y cualquier módulo con tablas grandes
