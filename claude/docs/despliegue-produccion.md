# Despliegue en Producción

> Documentación del proceso de despliegue del proyecto a GitHub y Vercel
> Creado: 09/04/2026

---

## Repositorio GitHub

**URL:** https://github.com/jorgecejas55/observatorio.git  
**Rama principal:** `main`

### Configuración inicial

```bash
# Inicializar repositorio
git init

# Agregar remote
git remote add origin https://github.com/jorgecejas55/observatorio.git

# Configurar rama principal
git branch -M main

# Commit inicial
git add .
git commit -m "Commit inicial: estructura base del proyecto"

# Push a GitHub
git push -u origin main
```

### Archivos excluidos (`.gitignore`)

```gitignore
# Carpeta de documentación interna de Claude Code
.claude/

# Variables de entorno locales
.env*.local

# Build y dependencias
/node_modules
/.next/
/out/

# Otros archivos estándar de Next.js...
```

**IMPORTANTE:** La carpeta `.claude/` contiene documentación interna y configuración para Claude Code que NO debe ser pública. Está excluida del repositorio pero permanece en el proyecto local.

---

## Despliegue en Vercel

**Estado:** ✅ Funcionando en producción  
**Plataforma:** Vercel  
**Detección:** Automática desde GitHub (push a `main`)

### Correcciones aplicadas para build de producción

Durante el primer intento de deploy en Vercel, se encontraron **3 errores de TypeScript** que bloqueaban el build. Se corrigieron en el commit `bafb594`:

#### 1. `src/app/(main)/calidad/bus/page.tsx` (línea 66-67)

**Error:**
```typescript
mem: (navigator as Record<string, unknown>).deviceMemory ?? 0,
cpu: (navigator as Record<string, unknown>).hardwareConcurrency ?? 0,
```

**Solución:** Cambiar a `as any`
```typescript
mem: (navigator as any).deviceMemory ?? 0,
cpu: (navigator as any).hardwareConcurrency ?? 0,
```

**Razón:** Las propiedades `deviceMemory` y `hardwareConcurrency` no están en el tipo estándar `Navigator`, son extensiones opcionales. TypeScript no permite el cast directo a `Record<string, unknown>`.

#### 2. `src/app/(main)/dashboard/page.tsx` (líneas 313, 510)

**Error:**
```typescript
${datos.promedios2026?.meses > 0 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}
${datosFindes.resumen2026?.cantidad_findes > 0 ? 'lg:grid-cols-3' : ''}
```

**Solución:** Agregar coalescencia nula
```typescript
${(datos.promedios2026?.meses ?? 0) > 0 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}
${(datosFindes.resumen2026?.cantidad_findes ?? 0) > 0 ? 'lg:grid-cols-3' : ''}
```

**Razón:** TypeScript en modo strict no permite comparar directamente `T | undefined` con números. Hay que proporcionar un valor por defecto con `??`.

#### 3. `src/app/(main)/eventos/registro/page.tsx` (línea 33)

**Error:**
```typescript
return result as Evento
```

**Solución:** Doble cast
```typescript
return result as unknown as Evento
```

**Razón:** TypeScript no permite cast directo de `Record<string, unknown>` a un tipo complejo como `Evento` porque no hay suficiente solapamiento. El doble cast (`as unknown as Tipo`) es la solución estándar en estos casos.

### Proceso de despliegue

1. **Vercel detecta push a `main`** automáticamente
2. **Instala dependencias:** `npm install`
3. **Build:** `npm run build`
   - Compilación de TypeScript
   - Linting
   - Generación de páginas estáticas (31 rutas)
4. **Deploy automático** si el build es exitoso

### Validación pre-push

**Antes de hacer push a `main`**, SIEMPRE ejecutar localmente:

```bash
npm run build
```

Si hay errores de TypeScript, el deploy en Vercel fallará. Corregir todos los errores localmente antes de pushear.

---

## Variables de entorno en Vercel

Las siguientes variables deben estar configuradas en el dashboard de Vercel:

### URLs de Google Apps Script
- `NEXT_PUBLIC_GAS_URL` (si aplica)
- `EVENTOS_SCRIPT_URL`
- `ENCUESTA_DEMANDA_SCRIPT_URL`
- `ENCUESTA_PERFIL_SCRIPT_URL`
- `DASHBOARD_PERFIL_SCRIPT_URL`
- `INDICADORES_SCRIPT_URL`
- `ENCUESTA_BUS_SCRIPT_URL`
- `NEXT_PUBLIC_PERCEPCION_SCRIPT_URL`

### NextAuth (cuando se active)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Nota:** Las variables que comienzan con `NEXT_PUBLIC_` son expuestas al cliente. Las demás solo están disponibles en el servidor.

---

## Historial de commits

| Commit | Descripción |
|---|---|
| `c2e4c92` | Commit inicial: estructura base del proyecto |
| `99341b5` | Agregar carpeta .claude a .gitignore |
| `bafb594` | Corregir errores de TypeScript para build de producción |

---

## Checklist de deploy

- [x] Repositorio creado en GitHub
- [x] Código pusheado a rama `main`
- [x] `.gitignore` configurado correctamente
- [x] Build local exitoso (`npm run build`)
- [x] Proyecto conectado en Vercel
- [x] Deploy automático funcionando
- [ ] Variables de entorno configuradas en Vercel
- [ ] SSL/HTTPS automático (Vercel lo provee por defecto)
- [ ] Dominio personalizado (opcional, futuro)

---

## Notas importantes

- **NO commitear** archivos `.env.local` con credenciales reales
- **NO exponer** URLs de Google Apps Script con data sensible en variables `NEXT_PUBLIC_*` si contienen información privada
- La carpeta `.claude/` debe permanecer local (ya está en `.gitignore`)
- Los commits en este proyecto **NO incluyen** línea de co-autoría de Claude (preferencia de Jorge)
- Vercel regenera el build completo en cada push a `main` — no hay cache de build entre deploys
