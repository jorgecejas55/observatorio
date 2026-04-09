# Arquitectura del Sistema

## Diagrama general

```
[Next.js Frontend]
       │
       ├── src/app/           # App Router (Next.js 14)
       ├── src/components/    # Componentes reutilizables
       ├── src/lib/           # Utilidades, helpers, types
       └── src/hooks/         # Custom hooks
            │
            │ fetch() a Web App URL
            ▼
[Google Apps Script — gas/]
       │
       │ SpreadsheetApp API
       ▼
[Google Sheets — backend de datos]
       ├── Sheet: Estadísticas
       ├── Sheet: Encuestas / Oferta
       ├── Sheet: Atractivos
       └── Sheet: Eventos
```

---

## Rutas del sistema (App Router)

```
/                          # Home / Dashboard principal
/estadisticas              # Dashboard de estadísticas turísticas
/encuestas                 # Formularios de relevamiento
/mapa                      # Mapa interactivo de atractivos
/eventos                   # Gestión de eventos turísticos
/admin                     # Panel de administración (si aplica)
```
> ⚠️ Actualizar cuando se agreguen o cambien rutas

---

## Integración GAS ↔ Sheets

### Flujo de datos
1. El frontend hace `fetch()` a la URL de la Web App GAS desplegada
2. El script GAS recibe el request, consulta/escribe en Sheets
3. Devuelve JSON al frontend

### Variables de entorno (.env.local)
```
NEXT_PUBLIC_GAS_URL=https://script.google.com/macros/s/[ID]/exec
```

### Endpoints GAS implementados
| Acción | Parámetro | Sheet destino |
|---|---|---|
| (completar a medida que se implementan) | | |

---

## Componentes principales

> Completar a medida que se desarrollan

| Componente | Ubicación | Descripción |
|---|---|---|
| (pendiente) | | |

---

## Dependencias clave

Ver `package.json` para lista completa. Librerías destacadas:
- (completar con las que se van agregando: recharts, leaflet, etc.)

---

## Notas de deploy

- **Desarrollo:** `npm run dev` en local
- **Producción:** (definir: Vercel / hosting propio)
- **GAS:** redesplegar manualmente desde Google Apps Script editor cuando cambia `gas/`
