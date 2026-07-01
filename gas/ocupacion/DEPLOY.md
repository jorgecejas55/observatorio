# Despliegue GAS — Sistema de Ocupación Hotelera (Observatorio)

## 1. Crear el spreadsheet nuevo

1. Ir a https://sheets.new
2. Renombrar como **"OBS_OCUPACION_HOTELERA"**
3. Crear 3 hojas (pestañas) con los siguientes encabezados:

### Hoja `Relevamientos`
```
ID | Tipo | Nombre | FechaInicio | FechaFin | Estado | FechaCreacion | UsuarioCreador | FechaCierre | UsuarioCierre | OHTotal | OHMin | OHMax | OHModa | CantidadRelevados
```

### Hoja `CargasOH`
```
ID | RelevamientoID | AlojamientoID | AlojamientoNombre | Tipo | Categoria | PorcentajeOH | FechaCarga | HoraCarga | UsuarioCarga | CapacidadHab
```

### Hoja `Auditoria`
```
Timestamp | Email | Accion | Detalle
```

4. Copiar el ID del spreadsheet (de la URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`)

## 2. Configurar y desplegar el GAS

### 2.1. Configurar IDs

1. Abrir https://script.google.com
2. Crear nuevo proyecto
3. Copiar los archivos de `gas/ocupacion/` en el orden:
   - `Config.gs`
   - `Utils.gs`
   - `Relevamiento.gs`
   - `Cargasoh.gs`
   - `Main.gs`
4. En `Config.gs`, reemplazar:
   - `SPREADSHEET_ID` con el ID del spreadsheet creado
   - `API_KEY` con una clave segura (ej: generar con `openssl rand -hex 32`)

### 2.2. Desplegar

1. Clic en **"Implementar" > "Nueva implementación"**
2. Tipo: **"Aplicación web"**
3. Ejecutar como: **"Yo"**
4. Acceso: **"Cualquiera"**
5. Copiar la URL de la Web App

## 3. Configurar Next.js

Agregar al `.env.local`:

```bash
# Ocupación Hotelera (GAS nuevo)
OCUPACION_GAS_URL="https://script.google.com/macros/s/{DEPLOY_ID}/exec"
OCUPACION_GAS_API_KEY="<misma clave de Config.gs>"
```

## 4. Verificar

```bash
curl -X POST "https://script.google.com/macros/s/{DEPLOY_ID}/exec" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"<clave>","path":"system/health","data":{}}'
```

Respuesta esperada: `{"success":true,"status":"OK",...}`
