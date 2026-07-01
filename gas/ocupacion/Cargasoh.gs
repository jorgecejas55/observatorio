// ==============================================================================
// CARGAS_OH.GS — Gestión de cargas de ocupación hotelera
// Versión simplificada: snapshot completo desde Next.js (incl. tipo/categoria),
// sin consulta a Alojamientos, sin estado de registro.
// ==============================================================================

/**
 * Crea una nueva carga de OH.
 *
 * El payload (desde Next.js) ya incluye el snapshot del alojamiento:
 * { relevamientoId, alojamientoId, nombre, tipo, categoria,
 *   capacidadHab, porcentajeOH, usuarioEmail }
 *
 * No se consulta la hoja Alojamientos. Los datos del snapshot se persisten
 * tal cual, lo que permite calcular OH por tipo/categoría respetando
 * el principio "sin datos ≠ 0%".
 */
function createCargaOH(carga) {
  // Validar datos requeridos
  if (!carga.relevamientoId || !carga.alojamientoId || carga.porcentajeOH === undefined) {
    return {
      success: false,
      error: 'relevamientoId, alojamientoId y porcentajeOH son requeridos'
    };
  }

  if (!carga.usuarioEmail) {
    return {
      success: false,
      error: 'Email de usuario requerido'
    };
  }

  // Validar rango de porcentaje
  if (carga.porcentajeOH < 0 || carga.porcentajeOH > 100) {
    return {
      success: false,
      error: 'El porcentaje de OH debe estar entre 0 y 100'
    };
  }

  // Verificar que el relevamiento existe y está EN_CURSO
  const relevamiento = getRelevamiento(carga.relevamientoId);
  if (!relevamiento.success) {
    return {
      success: false,
      error: 'Relevamiento no encontrado'
    };
  }

  if (relevamiento.data.Estado !== CONFIG.ESTADOS_RELEVAMIENTO.EN_CURSO) {
    return {
      success: false,
      error: 'El relevamiento no está activo. No se pueden agregar cargas.'
    };
  }

  // Lock granular: serializa solo verify+append para el mismo relevamiento
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return { success: false, error: 'Sistema ocupado, reintente en unos segundos' };
  }

  var newId;
  try {
    // Verificar que no existe carga duplicada
    const duplicado = verificarCargaDuplicada(carga.relevamientoId, carga.alojamientoId);
    if (duplicado.existe) {
      return {
        success: false,
        error: 'Ya existe una carga para este alojamiento en el relevamiento actual',
        cargaExistente: duplicado.carga
      };
    }

    // Crear carga con snapshot
    const sheet = getSheet(CONFIG.SHEETS.CARGAS);
    newId = getNextId(CONFIG.SHEETS.CARGAS);
    const dateTime = getCurrentDateTime();

    const newRow = [];
    newRow[CONFIG.COLS.CARGAS.ID] = newId;
    newRow[CONFIG.COLS.CARGAS.RELEVAMIENTO_ID] = carga.relevamientoId;
    newRow[CONFIG.COLS.CARGAS.ALOJAMIENTO_ID] = carga.alojamientoId;
    newRow[CONFIG.COLS.CARGAS.ALOJAMIENTO_NOMBRE] = carga.nombre || '';
    newRow[CONFIG.COLS.CARGAS.TIPO] = carga.tipo || '';
    newRow[CONFIG.COLS.CARGAS.CATEGORIA] = carga.categoria || '';
    newRow[CONFIG.COLS.CARGAS.PORCENTAJE_OH] = carga.porcentajeOH;
    newRow[CONFIG.COLS.CARGAS.FECHA_CARGA] = dateTime.date;
    newRow[CONFIG.COLS.CARGAS.HORA_CARGA] = dateTime.time;
    newRow[CONFIG.COLS.CARGAS.USUARIO_CARGA] = carga.usuarioEmail;
    newRow[CONFIG.COLS.CARGAS.CAPACIDAD_HAB] = carga.capacidadHab || 0;

    sheet.appendRow(newRow);

    // Guardar fecha/hora como TEXTO ('yyyy-MM-dd' / 'HH:mm:ss') para mantener un
    // formato consistente y evitar la coerción a Date/Time de Sheets.
    var rowNumCarga = sheet.getLastRow();
    setCeldaTexto(sheet, rowNumCarga, CONFIG.COLS.CARGAS.FECHA_CARGA, dateTime.date);
    setCeldaTexto(sheet, rowNumCarga, CONFIG.COLS.CARGAS.HORA_CARGA, dateTime.time);

    // Actualizar metadatos de versión para polling adaptativo
    const props = PropertiesService.getScriptProperties();
    const countKey = 'cargas_count_' + carga.relevamientoId;
    const prevCount = Number(props.getProperty(countKey)) || 0;
    props.setProperties({
      ['cargas_lastmod_' + carga.relevamientoId]: String(Date.now()),
      [countKey]: String(prevCount + 1)
    });
  } finally {
    lock.releaseLock();
  }

  logAudit(
    carga.usuarioEmail,
    'CARGA_OH',
    'Cargó OH para ' + (carga.nombre || 'Alojamiento ' + carga.alojamientoId) +
    ': ' + carga.porcentajeOH + '% en relevamiento ' + carga.relevamientoId
  );

  return {
    success: true,
    id: newId,
    message: 'Carga de OH registrada exitosamente',
    alojamiento: carga.nombre || ('ID ' + carga.alojamientoId),
    porcentajeOH: carga.porcentajeOH
  };
}

/**
 * Obtiene todas las cargas de un relevamiento (autocontenidas, sin join)
 */
function getCargasByRelevamiento(relevamientoId) {
  if (!relevamientoId) {
    return { success: false, error: 'relevamientoId requerido' };
  }

  const sheet = getSheet(CONFIG.SHEETS.CARGAS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const result = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[CONFIG.COLS.CARGAS.ID]) continue;
    if (row[CONFIG.COLS.CARGAS.RELEVAMIENTO_ID] == relevamientoId) {
      result.push(rowToObject(headers, row));
    }
  }

  return { success: true, data: result, count: result.length };
}

/**
 * Devuelve {count, lastModified} sin leer la hoja (salvo primer warmup).
 * Usado por el frontend para saber si hay cargas nuevas antes de hacer un delta fetch.
 */
function getCargasVersion(relevamientoId) {
  if (!relevamientoId) return { success: false, error: 'relevamientoId requerido' };

  const props = PropertiesService.getScriptProperties();
  const lastmod = Number(props.getProperty('cargas_lastmod_' + relevamientoId)) || 0;
  let count = Number(props.getProperty('cargas_count_' + relevamientoId));

  if (isNaN(count) || count < 0) {
    // Warmup: contar desde la hoja y persistir
    const sheet = getSheet(CONFIG.SHEETS.CARGAS);
    const data = sheet.getDataRange().getValues();
    count = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][CONFIG.COLS.CARGAS.RELEVAMIENTO_ID] == relevamientoId) count++;
    }
    props.setProperty('cargas_count_' + relevamientoId, String(count));
  }

  return { success: true, count: count, lastModified: lastmod };
}

/**
 * Devuelve solo las cargas del relevamiento creadas después de `since` (epoch ms).
 * Permite al frontend hacer deltas en vez de bajar el listado completo.
 */
function getCargasSince(relevamientoId, since) {
  if (!relevamientoId) return { success: false, error: 'relevamientoId requerido' };

  const sinceTs = Number(since) || 0;
  const sheet = getSheet(CONFIG.SHEETS.CARGAS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const result = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[CONFIG.COLS.CARGAS.ID]) continue;
    if (row[CONFIG.COLS.CARGAS.RELEVAMIENTO_ID] != relevamientoId) continue;
    const ts = combinarFechaHora(row[CONFIG.COLS.CARGAS.FECHA_CARGA], row[CONFIG.COLS.CARGAS.HORA_CARGA]);
    if (ts > sinceTs) result.push(rowToObject(headers, row));
  }

  return { success: true, data: result, serverTime: Date.now() };
}

/**
 * Combina fecha (yyyy-MM-dd o Date) y hora (HH:mm:ss) en epoch ms UTC.
 */
function combinarFechaHora(fecha, hora) {
  if (!fecha) return 0;
  try {
    var tz = Session.getScriptTimeZone();
    var fechaStr = fecha instanceof Date
      ? Utilities.formatDate(fecha, tz, 'yyyy-MM-dd')
      : String(fecha).substring(0, 10);
    var horaStr = hora ? String(hora).substring(0, 8) : '00:00:00';
    return Utilities.parseDate(fechaStr + ' ' + horaStr, tz, 'yyyy-MM-dd HH:mm:ss').getTime();
  } catch (e) {
    return 0;
  }
}

/**
 * Verifica si ya existe una carga para un alojamiento en un relevamiento
 */
function verificarCargaDuplicada(relevamientoId, alojamientoId) {
  if (!relevamientoId || !alojamientoId) {
    return {
      existe: false,
      error: 'relevamientoId y alojamientoId son requeridos'
    };
  }

  const sheet = getSheet(CONFIG.SHEETS.CARGAS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (row[CONFIG.COLS.CARGAS.RELEVAMIENTO_ID] == relevamientoId &&
        row[CONFIG.COLS.CARGAS.ALOJAMIENTO_ID] == alojamientoId) {

      return {
        existe: true,
        carga: {
          id: row[CONFIG.COLS.CARGAS.ID],
          alojamientoNombre: row[CONFIG.COLS.CARGAS.ALOJAMIENTO_NOMBRE],
          porcentajeOH: row[CONFIG.COLS.CARGAS.PORCENTAJE_OH],
          usuarioCarga: row[CONFIG.COLS.CARGAS.USUARIO_CARGA],
          fechaCarga: row[CONFIG.COLS.CARGAS.FECHA_CARGA],
          horaCarga: row[CONFIG.COLS.CARGAS.HORA_CARGA]
        }
      };
    }
  }

  return { existe: false };
}

/**
 * Obtiene estadísticas de cargas por tipo y categoría.
 * Usa los snapshots (Tipo/Categoria) almacenados en CargasOH,
 * sin consultar Alojamientos.
 *
 * Principio "sin datos ≠ 0%": solo aparecen los grupos que tienen ≥1 carga.
 */
function getCargasStatsByTipoCategoria(relevamientoId) {
  if (!relevamientoId) {
    return { success: false, error: 'relevamientoId requerido' };
  }

  const cargasResponse = getCargasByRelevamiento(relevamientoId);
  if (!cargasResponse.success) return cargasResponse;

  const cargas = cargasResponse.data;
  const stats = {};

  // Agrupar por tipo y categoría usando snapshots en CargasOH
  for (var i = 0; i < cargas.length; i++) {
    var c = cargas[i];
    var tipo = c.Tipo || 'Sin tipo';
    var categoria = c.Categoria || 'Sin categoría';
    var key = tipo + ' - ' + categoria;
    var capacidadHab = Number(c.CapacidadHab) || 0;
    var porcentajeOH = Number(c.PorcentajeOH) || 0;

    if (!stats[key]) {
      stats[key] = {
        tipo: tipo,
        categoria: categoria,
        habOcupadas: 0,
        habRelevadas: 0,
        cantidad: 0
      };
    }

    stats[key].habOcupadas += Math.round(capacidadHab * porcentajeOH / 100);
    stats[key].habRelevadas += capacidadHab;
    stats[key].cantidad++;
  }

  // Calcular OH ponderada para cada grupo (solo los que tienen cargas)
  var result = [];
  var keys = Object.keys(stats);
  for (var k = 0; k < keys.length; k++) {
    var stat = stats[keys[k]];
    var oh = stat.habRelevadas > 0
      ? parseFloat((stat.habOcupadas / stat.habRelevadas * 100).toFixed(1))
      : 0;

    result.push({
      tipoCategoria: keys[k],
      tipo: stat.tipo,
      categoria: stat.categoria,
      oh: oh,
      cantidad: stat.cantidad
    });
  }

  return { success: true, data: result };
}
