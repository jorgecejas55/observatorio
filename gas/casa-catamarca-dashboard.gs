/**
 * Google Apps Script — Dashboard Casa de Catamarca (Buenos Aires)
 * ──────────────────────────────────────────────────────────────
 * Lee la hoja "Respuestas" de la planilla, filtra por rango de fechas,
 * y devuelve estadísticas agregadas en JSON. También exporta a XLSX.
 *
 * ── PASOS PARA ACTIVAR ───────────────────────────────────────────────────────
 *  1. Nuevo proyecto en script.google.com (independiente, no ligado a la hoja)
 *     Nombre sugerido: obs-dashboard-casa-catamarca
 *  2. Pegá este código y guardá
 *  3. Configurar SPREADSHEET_ID (mismo ID que el escritor)
 *  4. Guardar API_KEY en ScriptProperties:
 *       Ejecutar → setApiKey() → ingresar el mismo token del escritor
 *  5. Implementar → Nueva implementación → Aplicación web
 *     - Ejecutar como: Yo
 *     - Acceso: Cualquier usuario
 *  6. Copiar URL → .env.local: CASA_CATAMARCA_DASHBOARD_SCRIPT_URL=https://...
 *
 * ── PARÁMETROS GET ───────────────────────────────────────────────────────────
 *  path        stats | export   (obligatorio)
 *  fechaDesde  YYYY-MM-DD       (opcional)
 *  fechaHasta  YYYY-MM-DD       (opcional)
 *  apiKey      string           (obligatorio — mismo token que el escritor)
 */

var SPREADSHEET_ID = '<CAMBIAR_POR_ID_DE_LA_PLANILLA>'
var SHEET_NAME     = 'Respuestas'
var CACHE_TTL      = 300  // 5 minutos

// ─── Punto de entrada ─────────────────────────────────────────────────────────

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {}
  var path   = params.path || ''

  // Validar API key
  var API_KEY = PropertiesService.getScriptProperties().getProperty('CASA_CATAMARCA_API_KEY')
  if (!API_KEY || params.apiKey !== API_KEY) {
    return json({ error: 'unauthorized' })
  }

  try {
    if (path === 'stats') return getStats(params)
    if (path === 'export') return getExport(params)
    return json({ error: 'path inválido. Usar ?path=stats o ?path=export' })
  } catch (err) {
    return json({ error: err.message })
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function getStats(params) {
  var fechaDesde = params.fechaDesde || ''
  var fechaHasta = params.fechaHasta || ''

  var cacheKey = ['casa-cat-stats', fechaDesde, fechaHasta].join('|')
  var cache    = CacheService.getScriptCache()
  var cached   = cache.get(cacheKey)
  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON)
  }

  var sheet   = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)
  var lastRow = sheet.getLastRow()
  if (lastRow < 2) return json({ total: 0 })

  var lastCol = sheet.getLastColumn()
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
  var data    = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues()

  // Mapa de encabezados → índice
  var idx = {}
  for (var h = 0; h < headers.length; h++) {
    var header = String(headers[h]).trim()
    idx[header] = h
  }

  // Obtener índice de Marca temporal (columna de fecha)
  var iTS = idx['Marca temporal']

  // Filtrar por rango de fechas
  var filtrados = filtrarPorFecha(data, iTS, fechaDesde, fechaHasta)

  // Agregar
  var result = agregarStats(filtrados, idx)

  // Agregar metadatos
  result.total = filtrados.length
  result.aniosDisponibles = getAnios(data, iTS)

  var output = JSON.stringify(result)
  cache.put(cacheKey, output, CACHE_TTL)
  return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON)
}

// ─── Export ───────────────────────────────────────────────────────────────────
// Opción A: copiar a hoja temporal si hay filtros, exportar como XLSX

function getExport(params) {
  var fechaDesde = params.fechaDesde || ''
  var fechaHasta = params.fechaHasta || ''

  var sheet   = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)
  var lastRow = sheet.getLastRow()
  if (lastRow < 2) return json({ error: 'Sin datos para exportar' })

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID)
  var blob

  if (fechaDesde || fechaHasta) {
    // Filtrar → hoja temporal → exportar → borrar hoja temporal
    var lastCol = sheet.getLastColumn()
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    var data    = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues()

    var iTS = -1
    for (var h = 0; h < headers.length; h++) {
      if (String(headers[h]).trim() === 'Marca temporal') { iTS = h; break }
    }

    var filtrados = iTS >= 0 ? filtrarPorFecha(data, iTS, fechaDesde, fechaHasta) : data

    // Crear hoja temporal
    var tempName = '__ExportTemp_' + Utilities.getUuid().slice(0, 8)
    var tempSheet = ss.insertSheet(tempName)
    tempSheet.getRange(1, 1, 1, lastCol).setValues([headers])
    if (filtrados.length > 0) {
      tempSheet.getRange(2, 1, filtrados.length, lastCol).setValues(filtrados)
    }

    blob = DriveApp.getFileById(SPREADSHEET_ID).getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    ss.deleteSheet(tempSheet)
  } else {
    // Sin filtros → export directo
    blob = DriveApp.getFileById(SPREADSHEET_ID).getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }

  return ContentService
    .createTextOutput(Utilities.base64Encode(blob.getBytes()))
    .setMimeType(ContentService.MimeType.JSON)
}

// ─── Filtrado por fecha ───────────────────────────────────────────────────────

function filtrarPorFecha(data, iTimestamp, fechaDesde, fechaHasta) {
  var dDesde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null
  var dHasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null

  if (!dDesde && !dHasta) return data

  var result = []
  for (var i = 0; i < data.length; i++) {
    var row = data[i]
    var cellValue = row[iTimestamp]
    if (!cellValue) continue

    // El timestamp está como string DD/MM/YYYY HH:mm:ss
    var fecha = parseFechaArg(cellValue)
    if (!fecha) continue
    if (dDesde && fecha < dDesde) continue
    if (dHasta && fecha > dHasta) continue

    result.push(row)
  }
  return result
}

/** Convierte string DD/MM/YYYY HH:mm:ss o Date a Date */
function parseFechaArg(val) {
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  var s = String(val).trim()
  var parts = s.split(' ')[0]  // tomar solo la parte de fecha
  var d = parts.split('/')
  if (d.length !== 3) return null
  // DD/MM/YYYY → Date (mes es 0-indexed)
  var fecha = new Date(Number(d[2]), Number(d[1]) - 1, Number(d[0]))
  return isNaN(fecha.getTime()) ? null : fecha
}

// ─── Años disponibles ─────────────────────────────────────────────────────────

function getAnios(data, iTimestamp) {
  var anios = {}
  for (var i = 0; i < data.length; i++) {
    var fecha = parseFechaArg(data[i][iTimestamp])
    if (fecha) anios[fecha.getFullYear()] = true
  }
  return Object.keys(anios).map(Number).sort()
}

// ─── Agregación ───────────────────────────────────────────────────────────────

function agregarStats(data, idx) {
  // Inicializar contadores
  var porProcedencia     = {}
  var porPais            = {}
  var porProvincia       = {}
  var porDepartamento    = {}
  var porPartidoBsAs     = {}
  var porBarrioCaba      = {}
  var porRangoEdad       = {}
  var porViajeCon        = {}
  var porDuracionViaje   = {}
  var porEtapaViaje      = {}
  var porConociaCatamarca = {}
  var porInteresCapital  = {}
  var porDiasEnCapital   = {}
  var porAceptaInfo      = {}

  // Multi-respuesta (contamos cada opción seleccionada)
  var interesesEnCatamarca = {}
  var actividadesCapital   = {}
  var dondeBuscaInfo       = {}
  var comoSeEntero         = {}
  var redSocialInspiracion = {}

  // KPIs
  var probSum = 0, probCount = 0
  var interesCapitalSi = 0
  var aceptaInfoSi = 0

  // Textos libres — frecuencia
  var lugaresImperdibles = {}

  // Helpers para resolver índices por nombre de encabezado
  function val(row, headerName) {
    var i = idx[headerName]
    if (i === undefined || i < 0) return ''
    return String(row[i] || '').trim()
  }

  function valList(row, headerName) {
    var raw = val(row, headerName)
    if (!raw) return []
    return raw.split(',').map(function(s) { return s.trim() }).filter(Boolean)
  }

  for (var i = 0; i < data.length; i++) {
    var row = data[i]

    // Procedencia y geografía
    var proc   = val(row, 'Procedencia')
    var pais   = val(row, 'País de origen')
    var prov   = val(row, 'Provincia de origen')
    var depto  = val(row, 'Departamento de origen')
    var loc    = val(row, 'Localidad de origen')

    if (proc) porProcedencia[proc] = (porProcedencia[proc] || 0) + 1
    if (pais) porPais[pais] = (porPais[pais] || 0) + 1
    if (prov) {
      porProvincia[prov] = (porProvincia[prov] || 0) + 1
      if (prov === 'BUENOS AIRES' && loc) {
        porPartidoBsAs[loc] = (porPartidoBsAs[loc] || 0) + 1
      } else if (prov === 'CABA' && loc) {
        porBarrioCaba[loc] = (porBarrioCaba[loc] || 0) + 1
      }
    }
    if (depto) porDepartamento[depto] = (porDepartamento[depto] || 0) + 1

    // Distribuciones
    contar(porRangoEdad, val(row, 'Rango de edad'))
    contar(porViajeCon, val(row, 'Con quién viajaría'))
    contar(porDuracionViaje, val(row, 'Duración habitual del viaje'))
    contar(porEtapaViaje, val(row, 'Etapa respecto al viaje'))
    contar(porConociaCatamarca, val(row, 'Conocía Catamarca antes'))
    contar(porInteresCapital, val(row, 'Interés en visitar la capital'))
    contar(porDiasEnCapital, val(row, 'Días en la capital'))

    // Acepta info
    var acepta = val(row, 'Acepta recibir info turística')
    if (acepta) {
      porAceptaInfo[acepta] = (porAceptaInfo[acepta] || 0) + 1
      if (acepta === 'SÍ') aceptaInfoSi++
    }

    // KPI: probabilidad de viaje
    var probRaw = val(row, 'Probabilidad de viajar (1-10)')
    var prob = parseFloat(probRaw)
    if (!isNaN(prob) && prob >= 1 && prob <= 10) {
      probSum += prob
      probCount++
    }

    // KPI: interés en capital
    var intCap = val(row, 'Interés en visitar la capital')
    if (intCap === 'SÍ') interesCapitalSi++

    // Multi-respuesta
    contarLista(interesesEnCatamarca, valList(row, 'Intereses en Catamarca'))
    contarLista(actividadesCapital, valList(row, 'Actividades en la capital'))
    contarLista(dondeBuscaInfo, valList(row, 'Dónde busca info de viajes'))
    contarLista(comoSeEntero, [val(row, 'Cómo se enteró de Catamarca')])
    contarLista(redSocialInspiracion, [val(row, 'Red social más usada para inspirarse')])

    // Textos libres: lugares
    var lugar = val(row, 'Lugar que le gustaría conocer')
    if (lugar) {
      var key = lugar.toUpperCase()
      lugaresImperdibles[key] = (lugaresImperdibles[key] || 0) + 1
    }
  }

  // Top lugares
  var topLugares = Object.keys(lugaresImperdibles)
    .map(function(k) { return { texto: k, count: lugaresImperdibles[k] } })
    .sort(function(a, b) { return b.count - a.count })
    .slice(0, 20)

  return {
    // KPIs
    probabilidadPromedio: probCount > 0 ? round2(probSum / probCount) : null,
    porcentajeInteresadosCapital: data.length > 0 ? round2((interesCapitalSi / data.length) * 100) : 0,
    porcentajeAceptaInfo: data.length > 0 ? round2((aceptaInfoSi / data.length) * 100) : 0,

    // Procedencia y geografía
    porProcedencia: ordenarDesc(porProcedencia),
    porPais: ordenarDesc(porPais),
    porProvincia: ordenarDesc(porProvincia),
    porDepartamento: ordenarDesc(porDepartamento),
    porPartidoBsAs: ordenarDesc(porPartidoBsAs),
    porBarrioCaba: ordenarDesc(porBarrioCaba),

    // Distribuciones
    porRangoEdad: ordenarDesc(porRangoEdad),
    porViajeCon: ordenarDesc(porViajeCon),
    porDuracionViaje: ordenarDesc(porDuracionViaje),
    porEtapaViaje: ordenarDesc(porEtapaViaje),
    porConociaCatamarca: ordenarDesc(porConociaCatamarca),
    porInteresCapital: ordenarDesc(porInteresCapital),
    porDiasEnCapital: ordenarDesc(porDiasEnCapital),
    porAceptaInfo: ordenarDesc(porAceptaInfo),

    // Multi-respuesta
    interesesEnCatamarca: ordenarDesc(interesesEnCatamarca),
    actividadesCapital: ordenarDesc(actividadesCapital),
    dondeBuscaInfo: ordenarDesc(dondeBuscaInfo),
    comoSeEntero: ordenarDesc(comoSeEntero),
    redSocialInspiracion: ordenarDesc(redSocialInspiracion),

    // Top textos libres
    topLugaresImperdibles: topLugares,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contar(obj, val) {
  if (val) obj[val] = (obj[val] || 0) + 1
}

function contarLista(obj, lista) {
  for (var i = 0; i < lista.length; i++) {
    if (lista[i]) obj[lista[i]] = (obj[lista[i]] || 0) + 1
  }
}

function ordenarDesc(obj) {
  return Object.keys(obj)
    .filter(function(k) { return k && obj[k] > 0 })
    .map(function(k) { return { nombre: k, cantidad: obj[k] } })
    .sort(function(a, b) { return b.cantidad - a.cantidad })
}

function round2(n) { return Math.round(n * 100) / 100 }

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

/** Guardar API key en ScriptProperties (ejecutar UNA VEZ desde editor) */
function setApiKey() {
  var ui = SpreadsheetApp.getUi()
  var response = ui.prompt(
    'Configurar API Key',
    'Pegá el token CASA_CATAMARCA_API_KEY (mismo que en el escritor):',
    ui.ButtonSet.OK_CANCEL
  )
  if (response.getSelectedButton() === ui.Button.OK) {
    var key = response.getResponseText().trim()
    if (key) {
      PropertiesService.getScriptProperties().setProperty('CASA_CATAMARCA_API_KEY', key)
      ui.alert('API Key guardada correctamente.')
    } else {
      ui.alert('Error: la key no puede estar vacía.')
    }
  }
}
