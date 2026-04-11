# Módulo: Alojamientos No Registrados

Sistema de visualización y gestión de alojamientos turísticos no registrados oficialmente, identificados por el Observatorio Municipal de Turismo.

---

## 📍 Características

### Mapa Público
- **URL:** `/alojamientos-no-registrados`
- Visualización interactiva con Leaflet
- Marcadores por cada alojamiento
- Mapa de calor (densidad)
- Popups informativos con datos del alojamiento
- Filtros por tipo de alojamiento
- Estadísticas en tiempo real

### Panel de Administración
- **URL:** `/alojamientos-no-registrados/admin`
- Login con sistema de usuarios compartido (hoja `usuarios`)
- CRUD completo de alojamientos
- Formulario con validación de campos
- Auditoría de cambios (creado_por, modificado_por)

---

## 🗂️ Estructura del módulo

```
observatorio-app/
├── gas/
│   └── alojamientos-no-registrados.gs      # Backend Google Apps Script
├── src/
│   ├── app/
│   │   └── alojamientos-no-registrados/
│   │       ├── page.tsx                    # Mapa público
│   │       └── admin/
│   │           └── page.tsx                # Panel admin (protegido)
│   ├── components/
│   │   └── MapaAlojamientosNoRegistrados.tsx  # Componente del mapa
│   └── services/
│       ├── alojamientosService.ts          # API calls a GAS
│       └── alojamientosAuthService.ts      # Autenticación
├── ALOJAMIENTOS-NO-REGISTRADOS-SETUP.md    # Guía de instalación completa
├── GUIA-RAPIDA-ALOJAMIENTOS.md             # Guía rápida de configuración
└── MODULO-ALOJAMIENTOS.md                  # Este archivo (documentación técnica)
```

---

## 🔌 Endpoints del Google Apps Script

### GET endpoints

#### `?action=login`
Verificar credenciales de usuario.

**Parámetros:**
- `email` (string): Email del usuario
- `password` (string): Contraseña

**Respuesta:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "rol": "admin"
  }
}
```

#### `?action=getAlojamientos`
Obtener todos los alojamientos (todos los campos).

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Casa de Mirtha",
      "tipo": "Casa",
      "direccion": "Av. Virgen Del Valle 888",
      "coordenadas": "-28.472570592785047, -65.78672579338392",
      "habitaciones": 2,
      "plazas": 5,
      ...
    }
  ]
}
```

#### `?action=getMapData`
Obtener datos optimizados para el mapa (con coordenadas parseadas).

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Casa de Mirtha",
      "tipo": "Casa",
      "direccion": "Av. Virgen Del Valle 888",
      "lat": -28.472570592785047,
      "lng": -65.78672579338392,
      "habitaciones": 2,
      "plazas": 5,
      "precio": 15000
    }
  ]
}
```

#### `?action=getAlojamiento&id=uuid`
Obtener un alojamiento específico por ID.

**Parámetros:**
- `id` (string): ID del alojamiento

**Respuesta:**
```json
{
  "success": true,
  "data": { /* objeto alojamiento */ }
}
```

### POST endpoints

Todos los POST reciben JSON en el body.

#### `action=createAlojamiento`
Crear nuevo alojamiento.

**Body:**
```json
{
  "action": "createAlojamiento",
  "creado_por": "Juan Pérez",
  "data": {
    "nombre": "Nuevo Alojamiento",
    "tipo": "Departamento",
    "direccion": "Calle Falsa 123",
    "coordenadas": "-28.469, -65.779",
    "habitaciones": 3,
    "plazas": 6,
    ...
  }
}
```

**Campos obligatorios:**
- `nombre`
- `tipo`
- `direccion`
- `coordenadas` (formato: "lat, lng")

#### `action=updateAlojamiento`
Actualizar alojamiento existente.

**Body:**
```json
{
  "action": "updateAlojamiento",
  "id": "uuid-del-alojamiento",
  "modificado_por": "Juan Pérez",
  "data": {
    "nombre": "Nombre actualizado",
    "precio": 20000,
    ...
  }
}
```

#### `action=deleteAlojamiento`
Eliminar alojamiento.

**Body:**
```json
{
  "action": "deleteAlojamiento",
  "id": "uuid-del-alojamiento"
}
```

---

## 🗄️ Esquema de datos

### Tabla: `alojamientos_no_registrados`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí (auto) | Identificador único |
| `timestamp` | DateTime | Sí (auto) | Fecha/hora de registro |
| `nombre` | String | Sí | Nombre del alojamiento |
| `tipo` | String | Sí | Casa, Departamento, Hostel, etc. |
| `direccion` | String | Sí | Dirección física |
| `coordenadas` | String | Sí | Formato: "lat, lng" |
| `estado` | String | No | Estado del alojamiento |
| `propietario` | String | No | Nombre del propietario/responsable |
| `telefono` | String | No | Teléfono de contacto |
| `email` | String | No | Email de contacto |
| `redes_sociales` | String | No | Links a redes sociales |
| `habitaciones` | Number | No | Cantidad de habitaciones |
| `plazas` | Number | No | Capacidad total de personas |
| `tipo_unidades` | String | No | Descripción de unidades |
| `precio` | Number | No | Precio base por noche (ARS) |
| `servicios` | Text | No | Descripción de servicios |
| `movilidad_reducida` | String | No | Apto para movilidad reducida |
| `horario_ingreso` | String | No | Horario de check-in |
| `horario_salida` | String | No | Horario de check-out |
| `observaciones` | Text | No | Notas adicionales |
| `creado_por` | String | Sí (auto) | Usuario que creó el registro |
| `fecha_creacion` | DateTime | Sí (auto) | Fecha de creación |
| `modificado_por` | String | No | Usuario de última modificación |
| `fecha_modificacion` | DateTime | No | Fecha de última modificación |

---

## 🔐 Autenticación

El módulo usa la hoja `usuarios` que se crea **en el mismo Google Sheet** donde están los datos de alojamientos.

### Estructura de la tabla `usuarios`

| Campo | Descripción |
|---|---|
| `id` | UUID del usuario |
| `email` | Email (login) |
| `password` | Contraseña (⚠️ plain text, considerar hash en producción) |
| `nombre` | Nombre del usuario |
| `apellido` | Apellido del usuario |
| `rol` | `admin` o `operador` |
| `created_at` | Fecha de creación |
| `last_login` | Último login (actualizado automáticamente) |

### Usuario administrador por defecto

Al ejecutar `setup()` se crea automáticamente:
- Email: `admin@observatorio.com`
- Password: `admin123`
- Rol: `admin`

⚠️ **Cambiar la contraseña** editando la hoja `usuarios` directamente.

### Crear nuevo usuario administrador

1. Ir a la hoja `usuarios` en tu Google Sheet (mismo archivo que los alojamientos)
2. Agregar nueva fila:
   ```
   id: [generar UUID en https://www.uuidgenerator.net/]
   email: usuario@ejemplo.com
   password: contraseña123
   nombre: Juan
   apellido: Pérez
   rol: admin
   created_at: 2026-04-10
   last_login: 
   ```

---

## 🧪 Testing

### Probar endpoints directamente

```bash
# Login
curl "URL_DEL_SCRIPT?action=login&email=admin@admin.com&password=123456"

# Obtener datos del mapa
curl "URL_DEL_SCRIPT?action=getMapData"

# Crear alojamiento (POST)
curl -X POST URL_DEL_SCRIPT \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createAlojamiento",
    "creado_por": "Test User",
    "data": {
      "nombre": "Test Alojamiento",
      "tipo": "Casa",
      "direccion": "Av. Test 123",
      "coordenadas": "-28.469, -65.779"
    }
  }'
```

---

## 📊 Datos existentes

Los **149 registros** de alojamientos ya están en Google Sheets.

**No se necesita migración.** El sistema lee directamente de tu planilla existente.

### Requisitos de la hoja de datos

Tu Google Sheet debe tener:
- ✅ Una hoja con los datos de alojamientos (cualquier nombre)
- ✅ Columna con coordenadas en formato: `"lat, lng"`
- ✅ Columna `id` (se agrega automáticamente con `agregarColumnasNecesarias()` si falta)
- ✅ Headers en la primera fila

---

## 🚀 Despliegue

### Desarrollo
```bash
npm run dev
# Acceder a http://localhost:3003/alojamientos-no-registrados
```

### Producción
```bash
npm run build
npm start
```

El mapa es de acceso público (sin autenticación).  
El panel admin requiere login.

---

## 🎨 Personalización

### Cambiar centro del mapa
Editar `src/components/MapaAlojamientosNoRegistrados.tsx`:
```typescript
const centroSFVC = { lat: -28.4696, lng: -65.7795 } // San Fernando
```

### Cambiar tiles del mapa
Por defecto usa OpenStreetMap. Para cambiar:
```typescript
<TileLayer
  attribution='&copy; Tu Atribución'
  url="https://tu-tile-server/{z}/{x}/{y}.png"
/>
```

### Ajustar intensidad del heatmap
Editar `src/components/MapaAlojamientosNoRegistrados.tsx`:
```typescript
const heatLayer = L.heatLayer(heatData, {
  radius: 25,      // Radio del punto
  blur: 15,        // Difuminado
  maxZoom: 17,     // Zoom máximo del efecto
  max: 1.0,        // Intensidad máxima
})
```

---

## 🐛 Errores comunes

### "Leaflet is not defined"
Asegurarse de que las dependencias están instaladas:
```bash
npm install leaflet react-leaflet leaflet.heat
```

### Coordenadas no se muestran
Verificar formato: debe ser `"lat, lng"` con coma.  
Ejemplo: `"-28.469, -65.779"`

### Login falla
- Verificar que `NEXT_PUBLIC_ALOJAMIENTOS_SCRIPT_URL` está configurada
- Verificar que el usuario existe en la hoja `usuarios`
- Revisar consola del navegador y logs de Apps Script

---

## 📚 Dependencias

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "leaflet.heat": "^0.2.0",
  "@types/leaflet": "^1.9.8",
  "@types/leaflet.heat": "^0.2.2"
}
```

---

## 🔗 Links útiles

- [Leaflet Documentation](https://leafletjs.com/)
- [react-leaflet Documentation](https://react-leaflet.js.org/)
- [Google Apps Script Reference](https://developers.google.com/apps-script/reference)
- [ALOJAMIENTOS-NO-REGISTRADOS-SETUP.md](./ALOJAMIENTOS-NO-REGISTRADOS-SETUP.md) — Guía de instalación completa

---

**Desarrollado para el Observatorio Municipal de Turismo**  
Municipalidad de San Fernando del Valle de Catamarca
