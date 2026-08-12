# Deploy — Módulo de Ingresos a Atractivos (`gas/atractivos/`)

Un solo proyecto Apps Script que sirve a **los dos atractivos** (Casa de la Puna y Pueblo Perdido).
El aislamiento entre atractivos lo da el RBAC de Next.js + la validación `atractivo` en Config.gs.

## 1. Crear el proyecto

1. En <https://script.google.com> → **Nuevo proyecto**, nombre sugerido: `Observatorio — Ingresos Atractivos`.
2. Borrar el `Code.gs` por defecto y pegar los archivos de esta carpeta, **uno por archivo**:
   - `appsscript.json` (manifiesto)
   - `Config.gs`
   - `Datos.gs`
   - `Ingresos.gs`
   - `Actividades.gs`
   - `Resumen.gs`
   - `Setup.gs`
   - `Migracion.gs`
   - `Main.gs`
3. Verificar que las planillas (IDs en `Config.gs`) existan y sean accesibles desde la **misma cuenta** que usás para ejecutar el deploy. Si las creaste con otra cuenta, compartí ambas planillas con la cuenta del GAS.

## 2. Cargar la API key

1. Proyecto → **Configuración del proyecto** → **Propiedades del script** → **Agregar propiedad**.
2. Clave `ATRACTIVOS_GAS_API_KEY` (o `API_KEY`), valor = una clave aleatoria segura (`openssl rand -hex 32`).
3. Guardar. **La key NO va en el repo** ni en `Config.gs`.

## 3. Crear las hojas (una vez)

Desde el editor, ejecutar a mano (pedirá autorización):
- `setupAmbasPlanillas()` — crea `Ingresos`, `Actividades Especiales` y `Histórico` con los headers exactos en ambas planillas.

## 4. Desplegar

1. **Implementar → Nueva implementación → Aplicación web**.
2. Ejecutar como: **Yo** · Quién tiene acceso: **Cualquiera** (la API key protege).
3. Copiar la URL `/exec`. Agregarla a `.env.local` y a Vercel:
   - `ATRACTIVOS_GAS_URL=https://script.google.com/macros/s/AK.../exec`
   - `ATRACTIVOS_GAS_API_KEY=<la misma API_KEY>` ✔ (mismo secreto)

## 5. Migración histórica (una sola vez)

1. Ejecutar `verificarHeadersLegacy()` → revisar en **Registros** (Logs) los headers reales con `JSON.stringify`.
2. Comparar contra `MAPEO_LEGACY` / `MAPEO_LEGACY_ACTIVIDADES` en `Config.gs` y corregir el mapeo si difiere.
3. Ejecutar (funciones sin argumentos, para correr desde el editor):
   - `migrarHistoricoCasaPuna()` — migra las visitas guiadas de Casa de la Puna
   - `migrarHistoricoPuebloPerdido()` — migra las de Pueblo Perdido
   - `verificarActividadesLegacy()` luego `migrarActividadesHistorico()`
4. Verificar en las planillas nuevas la hoja `Histórico` (fecha | cantidad_personas | origen).

> `migrarActividadesHistorico()` reparte las filas **entre los dos atractivos** según la
> columna `Atractivo` de la planilla legacy, que mezcla varios espacios. Los que no están
> en `ATRACTIVO_LEGACY_NOMBRES` (Casa de SFVC, Dique el Jumeal, Seminario Diocesano…) se
> descartan y quedan contados en el log. Si mañana alguno de esos pasa a ser un atractivo
> del módulo, se agrega ahí.
>
> El orden entre migraciones no importa: `escribirFilasHistorico` reemplaza solo las filas
> del mismo `origen`, así que las tres son idempotentes y no se pisan entre sí.

> Nota: `migrarHistorico(atractivo)` es la función interna con parámetro; el dropdown
> del editor ejecuta sin argumentos, por eso se usan los wrappers `*CasaPuna`/`*PuebloPerdido`.

## 6. Notas técnicas

- **Fechas y números como texto**: toda celda se escribe con `setCeldaTexto` (formato `@`). El contrato Next↔GAS es: números llegan como texto y se convierten en `Number()` al leer/resumir. Evita coerción a Date/serial y corrimientos de timezone.
- **Borrado lógico**: DELETE pone `activo = FALSE` + `usuario_modificacion` + `fecha_hora_modificacion`. Nunca borra filas.
- **Dos cachés, distinto TTL**: el resumen se cachea 300 s y lo invalida cada mutación. El total de la hoja `Histórico` se cachea aparte 6 h (`getTotalHistorico`), porque esa hoja solo la escribe la migración y tiene miles de filas: sumarla en cada expiración de los 300 s hacía que la lectura fría se pasara del timeout del cliente. Si se vuelve a correr una migración, `invalidarHistorico()` ya se llama sola.
- **Idempotencia**: `id_local` (UUID del cliente) se persiste; un POST reintentado con el mismo `id_local` devuelve el id ya creado sin duplicar fila (prepara la Fase B offline).
- **Resumen**: `CacheService` TTL 300 s por atractivo; toda mutación invalida la clave.
- **Lock**: toda mutación corre bajo `LockService.tryLock(15000)` con verificación del retorno.
- **Errores**: nunca se devuelve `error.toString()` al cliente; se loguea y se responde genérico.

## 7. Operativo

- Asignar los módulos `atractivos-casa-puna` / `atractivos-pueblo-perdido` a guías y responsables en `/admin/usuarios` (obs-admin).
- Recién después de una jornada real validada: dar de baja el Google Form.