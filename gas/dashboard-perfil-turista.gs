/**
 * Google Apps Script — Dashboard Perfil del Visitante
 * ─────────────────────────────────────────────────────
 * Lee la hoja de respuestas, filtra por rango de fechas y procedencia,
 * y devuelve un objeto JSON con todas las estadísticas pre-agregadas.
 *
 * ── PASOS PARA ACTIVAR ───────────────────────────────────────────────────────
 *  1. Nuevo proyecto en script.google.com (independiente, no ligado a la hoja)
 *     Nombre sugerido: obs-dashboard-perfil-turista
 *  2. Pegá este código y guardá
 *  3. Implementar → Nueva implementación → Aplicación web
 *     - Ejecutar como: Yo
 *     - Acceso: Cualquier usuario
 *  4. Copiar URL → .env.local: DASHBOARD_PERFIL_SCRIPT_URL=https://...
 *
 * ── PARÁMETROS GET ───────────────────────────────────────────────────────────
 *  fechaDesde  YYYY-MM-DD  (opcional)
 *  fechaHasta  YYYY-MM-DD  (opcional)
 *  procedencia NACIONAL | PROVINCIAL | INTERNACIONAL  (opcional, vacío = todos)
 */

var SPREADSHEET_ID = '1M3mPZnra9Wu5E-RvCp6X_MgV3_MliypCOOPeMzdbNF0'
var SHEET_NAME     = 'Respuestas de formulario 1'
var CACHE_TTL      = 300  // 5 minutos

// ─── Punto de entrada ─────────────────────────────────────────────────────────

function doGet(e) {
  var params     = (e && e.parameter) ? e.parameter : {}
  var fechaDesde = params.fechaDesde  || ''
  var fechaHasta = params.fechaHasta  || ''
  var procedencia = params.procedencia || ''

  var cacheKey = ['dash', fechaDesde, fechaHasta, procedencia].join('|')
  var cache    = CacheService.getScriptCache()
  var cached   = cache.get(cacheKey)
  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON)
  }

  try {
    var sheet   = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)
    var lastRow = sheet.getLastRow()
    if (lastRow < 2) return json({ total: 0, aniosDisponibles: [] })

    var lastCol = sheet.getLastColumn()
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    var data    = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues()

    // Índice de columnas (con trim para eliminar espacios extra de encabezados)
    var idx = {}
    for (var h = 0; h < headers.length; h++) {
      idx[String(headers[h]).trim()] = h
    }

    // Índices de las columnas de valoración (búsqueda por substring)
    var iVal = {
      alojamiento:    buscarIdx(idx, '[SERVICIOS DE ALOJAMIENTO]'),
      gastronomia:    buscarIdx(idx, '[SERVICIOS DE GASTRONOMÍA]'),
      calidad_precio: buscarIdx(idx, '[RELACION CALIDAD/PRECIO'),
      hospitalidad:   buscarIdx(idx, '[HOSPITALIDAD/TRATO'),
      seguridad:      buscarIdx(idx, '[SEGURIDAD DEL DESTINO]'),
      info_turistica: buscarIdx(idx, '[INFORMACIÓN TURÍSTICA'),
      senaletica:     buscarIdx(idx, '[SEÑALÉTICA'),
      oferta_cultural:buscarIdx(idx, '[OFERTA CULTURAL'),
      estadia_general:buscarIdx(idx, '[ESTADÍA GENERAL'),
    }

    var iTimestamp  = idx['Marca temporal']
    var iProcedencia = idx['PROCEDENCIA']

    // Años disponibles (de todos los datos, sin filtrar)
    var aniosDisponibles = getAnios(data, iTimestamp)

    // Filtrar por fecha y procedencia
    var filtrados = filtrar(data, iTimestamp, iProcedencia, fechaDesde, fechaHasta, procedencia)

    // Agregar estadísticas
    var result = agregar(filtrados, idx, iVal)
    result.aniosDisponibles = aniosDisponibles
    result.total = filtrados.length

    var output = JSON.stringify(result)
    cache.put(cacheKey, output, CACHE_TTL)
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON)

  } catch (err) {
    return json({ error: err.message })
  }
}

// ─── Filtrado ─────────────────────────────────────────────────────────────────

function filtrar(data, iTimestamp, iProcedencia, fechaDesde, fechaHasta, procedencia) {
  var dDesde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null
  var dHasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null

  var result = []
  for (var i = 0; i < data.length; i++) {
    var row  = data[i]
    var ts   = row[iTimestamp]
    if (!ts) continue

    var fecha = (ts instanceof Date) ? ts : new Date(ts)
    if (isNaN(fecha.getTime())) continue
    if (dDesde && fecha < dDesde) continue
    if (dHasta && fecha > dHasta) continue

    var proc = String(row[iProcedencia] || '').trim().toUpperCase()
    if (procedencia && procedencia !== 'TODOS' && proc !== procedencia) continue

    result.push(row)
  }
  return result
}

// ─── Años disponibles ─────────────────────────────────────────────────────────

function getAnios(data, iTimestamp) {
  var anios = {}
  for (var i = 0; i < data.length; i++) {
    var ts = data[i][iTimestamp]
    if (!ts) continue
    var fecha = (ts instanceof Date) ? ts : new Date(ts)
    if (!isNaN(fecha.getTime())) anios[fecha.getFullYear()] = true
  }
  return Object.keys(anios).map(Number).sort()
}

// ─── Agregación ───────────────────────────────────────────────────────────────

function agregar(data, idx, iVal) {
  // Contadores
  var porProcedencia   = {}
  var porPais          = {}
  var porProvincia     = {}
  var porDepartamento  = {}
  var porMotivo        = {}
  var porGrupo         = {}
  var porTransporte    = {}
  var porAlojamiento   = {}
  var primeraVez       = {}
  var otrosDestinos    = {}
  var recomendaria     = {}
  var volveria         = {}

  // Acumuladores para promedios
  var edadSum = 0, edadCount = 0
  var nochesSum = 0, nochesCount = 0
  var edadPorProc = {}, nochesPorProc = {}
  var edadCountPorProc = {}, nochesCountPorProc = {}
  var valSum = {}, valCount = {}
  for (var k in iVal) { valSum[k] = 0; valCount[k] = 0 }

  var SIN_ALOJA = 'NO SE ALOJA/SE ENCUENTRA DE PASO'

  for (var i = 0; i < data.length; i++) {
    var row = data[i]

    var proc    = String(row[idx['PROCEDENCIA']]   || '').trim()
    var pais    = String(row[idx['¿CUAL ES SU PAIS DE ORIGEN?']] || '').trim()
    var prov    = String(row[idx['¿CUAL ES SU PROVINCIA DE ORIGEN?']] || '').trim()
    var depto   = String(row[idx['¿CUAL ES SU DEPARTAMENTO DE ORIGEN?']] || '').trim()
    var motivo  = String(row[idx['PRINCIPAL MOTIVO DE SU VISITA A LA CIUDAD']] || '').trim()
    var grupo   = String(row[idx['GRUPO DE VIAJE']] || '').trim()
    var transp  = String(row[idx['MEDIO DE TRANSPORTE UTILIZADO PARA ARRIBAR A ESTA CIUDAD']] || '').trim()
    var aloj    = String(row[idx['TIPO DE ALOJAMIENTO QUE ELIGIÓ']] || '').trim()
    var pvez    = String(row[idx['¿VISITA LA CIUDAD POR PRIMERA VEZ?']] || '').trim()
    var otros   = String(row[idx['¿PENSÓ EN OTROS DESTINOS ANTES QUE EN SFVC?']] || '').trim()
    var recom   = String(row[idx['¿RECOMENDARÍA VISITAR SFVC?']] || '').trim()
    var vuelve  = String(row[idx['¿VISITARÍA SFVC NUEVAMENTE?']] || '').trim()
    var edadRaw  = row[idx['EDAD']]
    var nochesRaw = row[idx['CANTIDAD DE NOCHES QUE SE ALOJA']]

    // Conteos
    if (proc)   porProcedencia[proc]   = (porProcedencia[proc]   || 0) + 1
    if (pais)   porPais[pais]          = (porPais[pais]          || 0) + 1
    if (prov)   porProvincia[prov]     = (porProvincia[prov]     || 0) + 1
    if (depto)  porDepartamento[depto] = (porDepartamento[depto] || 0) + 1
    if (motivo) porMotivo[motivo]      = (porMotivo[motivo]      || 0) + 1
    if (grupo)  porGrupo[grupo]        = (porGrupo[grupo]        || 0) + 1
    if (transp) porTransporte[transp]  = (porTransporte[transp]  || 0) + 1
    if (aloj)   porAlojamiento[aloj]   = (porAlojamiento[aloj]   || 0) + 1
    if (pvez)   primeraVez[pvez]       = (primeraVez[pvez]       || 0) + 1
    if (otros)  otrosDestinos[otros]   = (otrosDestinos[otros]   || 0) + 1
    if (recom)  recomendaria[recom]    = (recomendaria[recom]    || 0) + 1
    if (vuelve) volveria[vuelve]       = (volveria[vuelve]       || 0) + 1

    // Edad promedio
    var edad = parseFloat(edadRaw)
    if (!isNaN(edad) && edad > 0 && edad < 120) {
      edadSum += edad; edadCount++
      if (proc) {
        edadPorProc[proc]      = (edadPorProc[proc]      || 0) + edad
        edadCountPorProc[proc] = (edadCountPorProc[proc] || 0) + 1
      }
    }

    // Estadía promedio (excluir "no se aloja")
    if (aloj !== SIN_ALOJA) {
      var noches = parseFloat(nochesRaw)
      if (!isNaN(noches) && noches > 0 && noches <= 365) {
        nochesSum += noches; nochesCount++
        if (proc) {
          nochesPorProc[proc]      = (nochesPorProc[proc]      || 0) + noches
          nochesCountPorProc[proc] = (nochesCountPorProc[proc] || 0) + 1
        }
      }
    }

    // Valoraciones (solo 1-5, descartar 0, negativos y texto)
    for (var dim in iVal) {
      var ci = iVal[dim]
      if (ci < 0) continue
      var v = parseFloat(row[ci])
      if (!isNaN(v) && v >= 1 && v <= 5) {
        valSum[dim] += v; valCount[dim]++
      }
    }
  }

  // Calcular promedios finales
  var edadPorProcPromedio   = {}
  var nochesPorProcPromedio = {}
  for (var p in edadPorProc) {
    edadPorProcPromedio[p] = round2(edadPorProc[p] / edadCountPorProc[p])
  }
  for (var p in nochesPorProc) {
    nochesPorProcPromedio[p] = round2(nochesPorProc[p] / nochesCountPorProc[p])
  }

  var valoracionesPromedio = {}
  for (var dim in valSum) {
    valoracionesPromedio[dim] = valCount[dim] > 0 ? round2(valSum[dim] / valCount[dim]) : null
  }

  return {
    porProcedencia:        ordenarDesc(porProcedencia),
    paisesFrecuentes:      ordenarDesc(porPais),
    provinciasFrecuentes:  ordenarDesc(porProvincia),
    departamentosFrecuentes: ordenarDesc(porDepartamento),
    motivosVisita:         ordenarDesc(porMotivo),
    gruposViaje:           ordenarDesc(porGrupo),
    mediosTransporte:      ordenarDesc(porTransporte),
    tiposAlojamiento:      ordenarDesc(porAlojamiento),
    primeraVez:            primeraVez,
    otrosDestinos:         otrosDestinos,
    recomendaria:          recomendaria,
    volveria:              volveria,
    edadPromedio:          edadCount > 0 ? round2(edadSum / edadCount) : null,
    estadiaPromedio:       nochesCount > 0 ? round2(nochesSum / nochesCount) : null,
    edadPorProcedencia:    edadPorProcPromedio,
    estadiaPorProcedencia: nochesPorProcPromedio,
    valoraciones:          valoracionesPromedio,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte un objeto {clave: n} en [{nombre, cantidad}] ordenado de mayor a menor */
function ordenarDesc(obj) {
  return Object.keys(obj)
    .filter(function(k) { return k && obj[k] > 0 })
    .map(function(k) { return { nombre: k, cantidad: obj[k] } })
    .sort(function(a, b) { return b.cantidad - a.cantidad })
}

/** Busca el índice de la primera columna cuyo nombre contiene la subcadena dada */
function buscarIdx(idx, sub) {
  for (var k in idx) {
    if (k.indexOf(sub) !== -1) return idx[k]
  }
  return -1
}

function round2(n) { return Math.round(n * 100) / 100 }

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
