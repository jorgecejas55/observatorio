# Reglas — Integración Google Apps Script & Sheets

## Principios generales

- GAS es el único punto de acceso a los datos en Sheets — el frontend NUNCA accede directo a Sheets
- Toda la lógica de negocio sobre los datos va en GAS, no en el frontend
- El frontend solo consume/envía JSON

## Estructura de un script GAS

```javascript
// gas/nombre-modulo.gs

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getEstadisticas') return getEstadisticas(e);
  // ...
  
  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Acción no válida' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // Para envíos de formularios
}
```

## CORS en GAS

Siempre incluir headers CORS en las respuestas:
```javascript
function setCorsHeaders(output) {
  return output; // GAS maneja CORS automáticamente con doGet/doPost públicos
}
```

## Fetch desde Next.js

```typescript
const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;

async function fetchDatos(action: string, params?: Record<string, string>) {
  const url = new URL(GAS_URL);
  url.searchParams.append('action', action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  }
  
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Error al conectar con el servidor de datos');
  return res.json();
}
```

## Naming de Sheets

| Sheet | Nombre exacto en Google Sheets | Archivo de Google Sheets |
|---|---|---|
| Estadísticas | (completar) | (completar) |
| Encuestas oferta | (completar) | (completar) |
| Atractivos | (completar) | (completar) |
| Eventos | `eventos` | Planilla de eventos |
| Usuarios eventos | `usuarios` | Planilla de eventos |
| Alojamientos No Registrados | `Respuestas de formulario 1` (o nombre real) | **Mismo archivo** que alojamientos |
| Usuarios alojamientos | `usuarios` | **Mismo archivo** que alojamientos |
| **Museos - Virgen del Valle** | | |
| Visitas ocasionales | `Respuestas de formulario 1` | **Sheet existente** (ID: 1lEjhsZkcWmE5Rp1IuYc9_LHRKIebURXqdkXHp6sTPEk) |
| Visitas institucionales | `visitas_institucionales` | **Mismo archivo** |
| Usuarios | `usuarios` | **Mismo archivo** |
| **Museos - Adán Quiroga** | | |
| Visitas ocasionales | `Respuestas de formulario 1` | **Sheet existente** (ID: 15_ZDtwVIxhqT-C5YAjEvVXPJaduvqtuuur5hQq74aew) |
| Visitas institucionales | `visitas_institucionales` | **Mismo archivo** |
| Usuarios | `usuarios` | **Mismo archivo** |
| **Museos - Casa Caravati** | | |
| Visitas ocasionales | `Respuestas de formulario 1` | **Sheet existente** (ID: 1kBIMwf7I5KVDxBHz9IuiyW0J2KZY6W4P4KcMlt7Pshs) |
| Visitas institucionales | `visitas_institucionales` | **Mismo archivo** |
| Usuarios | `usuarios` | **Mismo archivo** |

> ⚠️ NO renombrar Sheets sin actualizar gas/ y esta tabla
> 
> **Notas importantes:**
> - **Eventos:** La hoja `eventos` y `usuarios` están en la MISMA planilla de Google Sheets
> - **Alojamientos:** La hoja de datos y `usuarios` están en la MISMA planilla de Google Sheets (diferente a eventos)
> - **Museos:** Cada museo tiene su PROPIO archivo de Google Sheets (3 archivos separados)
> - **Museos - Hojas existentes:** La hoja `Respuestas de formulario 1` ya existe y está conectada a Google Forms y Looker Studio — NO eliminar ni renombrar
> - **Museos - Hojas nuevas:** Las hojas `visitas_institucionales` y `usuarios` se crean con la función `setup()` del GAS
> - Cada módulo tiene su propia hoja `usuarios` en su respectivo archivo
> - El nombre de la hoja de alojamientos puede variar (configurar en `SHEETS.ALOJAMIENTOS` del script GAS)

## Limitaciones de GAS a tener en cuenta

- Tiempo máximo de ejecución: 6 minutos (más que suficiente para consultas)
- Cuota de escritura en Sheets: ~300 escrituras/minuto
- Cold start: primera request puede tardar 2-3s
- Cache: considerar `CacheService` para datos que no cambian frecuentemente

## Deploy de GAS

1. Editar en Google Apps Script editor
2. Guardar nueva versión
3. Desplegar → Gestionar implementaciones → Nueva versión
4. Copiar nueva URL si cambió → actualizar `.env.local`
