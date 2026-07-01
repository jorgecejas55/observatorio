// ==============================================================================
// RELEVAMIENTOS.GS — Gestión de relevamientos de ocupación hotelera
// Versión simplificada: sin caché persistente (CacheService), sin ramas por
// estado de registro. Solo OH total + min/max/moda + cantidad.
// ==============================================================================

/**
 * Obtiene todos los relevamientos con filtros opcionales
 */
function getRelevamientos(params) {
  const sheet = getSheet(CONFIG.SHEETS.RELEVAMIENTOS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const result = [];

  const idx = {
    id: CONFIG.COLS.RELEVAMIENTOS.ID,
    tipo: CONFIG.COLS.RELEVAMIENTOS.TIPO,
    estado: CONFIG.COLS.RELEVAMIENTOS.ESTADO,
    fechaInicio: CONFIG.COLS.RELEVAMIENTOS.FECHA_INICIO
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (!row[idx.id]) continue;

    if (params.tipo && row[idx.tipo] !== params.tipo) continue;
    if (params.estado && row[idx.estado] !== params.estado) continue;
    if (params.year) {
      const fechaInicio = new Date(row[idx.fechaInicio]);
      if (isNaN(fechaInicio.getTime()) || fechaInicio.getFullYear() != params.year) continue;
    }
    if (params.id && row[idx.id] != params.id) continue;

    result.push(rowToObject(headers, row));
  }

  return {
    success: true,
    data: result,
    count: result.length
  };
}

/**
 * Obtiene un relevamiento por ID
 */
function getRelevamiento(id) {
  if (!id) {
    return { success: false, error: 'ID requerido' };
  }

  const sheet = getSheet(CONFIG.SHEETS.RELEVAMIENTOS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = CONFIG.COLS.RELEVAMIENTOS.ID;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[idIdx] == id) {
      return {
        success: true,
        data: rowToObject(headers, row)
      };
    }
  }

  return {
    success: false,
    error: 'Relevamiento no encontrado'
  };
}

/**
 * Obtiene el relevamiento activo actual
 */
function getRelevamientoActivo() {
  const relevamientos = getRelevamientos({ estado: CONFIG.ESTADOS_RELEVAMIENTO.EN_CURSO });

  if (relevamientos.data.length === 0) {
    return {
      success: false,
      error: 'No hay relevamientos activos'
    };
  }

  // Devolver el más reciente
  const activo = relevamientos.data[relevamientos.data.length - 1];

  return {
    success: true,
    data: activo
  };
}

/**
 * Crea un nuevo relevamiento.
 * usuarioEmail viene del proxy Next.js (sesión NextAuth).
 */
function createRelevamiento(relevamiento, usuarioEmail) {
  // Validaciones
  if (!relevamiento.tipo || !relevamiento.nombre || !relevamiento.fechaInicio || !relevamiento.fechaFin) {
    return {
      success: false,
      error: 'Faltan datos requeridos (tipo, nombre, fechaInicio, fechaFin)'
    };
  }

  if (!usuarioEmail) {
    return {
      success: false,
      error: 'Email de usuario requerido'
    };
  }

  // Verificar que no haya otro relevamiento activo
  const activoCheck = getRelevamientoActivo();
  if (activoCheck.success) {
    return {
      success: false,
      error: 'Ya existe un relevamiento activo. Ciérrelo antes de crear uno nuevo.'
    };
  }

  const sheet = getSheet(CONFIG.SHEETS.RELEVAMIENTOS);
  const newId = getNextId(CONFIG.SHEETS.RELEVAMIENTOS);
  const dateTime = getCurrentDateTime();

  const newRow = [];
  newRow[CONFIG.COLS.RELEVAMIENTOS.ID] = newId;
  newRow[CONFIG.COLS.RELEVAMIENTOS.TIPO] = relevamiento.tipo;
  newRow[CONFIG.COLS.RELEVAMIENTOS.NOMBRE] = relevamiento.nombre;
  newRow[CONFIG.COLS.RELEVAMIENTOS.FECHA_INICIO] = relevamiento.fechaInicio;
  newRow[CONFIG.COLS.RELEVAMIENTOS.FECHA_FIN] = relevamiento.fechaFin;
  newRow[CONFIG.COLS.RELEVAMIENTOS.ESTADO] = CONFIG.ESTADOS_RELEVAMIENTO.EN_CURSO;
  newRow[CONFIG.COLS.RELEVAMIENTOS.OH_TOTAL] = 0;
  newRow[CONFIG.COLS.RELEVAMIENTOS.OH_MIN] = 0;
  newRow[CONFIG.COLS.RELEVAMIENTOS.OH_MAX] = 0;
  newRow[CONFIG.COLS.RELEVAMIENTOS.OH_MODA] = 0;
  newRow[CONFIG.COLS.RELEVAMIENTOS.CANTIDAD_RELEVADOS] = 0;
  newRow[CONFIG.COLS.RELEVAMIENTOS.FECHA_CREACION] = dateTime.date;
  newRow[CONFIG.COLS.RELEVAMIENTOS.USUARIO_CREADOR] = usuarioEmail;
  newRow[CONFIG.COLS.RELEVAMIENTOS.FECHA_CIERRE] = '';
  newRow[CONFIG.COLS.RELEVAMIENTOS.USUARIO_CIERRE] = '';

  sheet.appendRow(newRow);

  // Guardar las fechas como TEXTO 'yyyy-MM-dd' (evita que Sheets las convierta a
  // serial/Date y que al leerlas vuelvan como ISO con timezone).
  var rowNum = sheet.getLastRow();
  setCeldaTexto(sheet, rowNum, CONFIG.COLS.RELEVAMIENTOS.FECHA_INICIO, relevamiento.fechaInicio);
  setCeldaTexto(sheet, rowNum, CONFIG.COLS.RELEVAMIENTOS.FECHA_FIN, relevamiento.fechaFin);
  setCeldaTexto(sheet, rowNum, CONFIG.COLS.RELEVAMIENTOS.FECHA_CREACION, dateTime.date);

  logAudit(usuarioEmail, 'CREATE_RELEVAMIENTO', 'Creó relevamiento: ' + relevamiento.nombre + ' (ID: ' + newId + ')');

  return {
    success: true,
    id: newId,
    message: 'Relevamiento creado exitosamente'
  };
}

/**
 * Cierra un relevamiento y calcula OH final.
 * Solo opera sobre CargasOH (snapshots), sin JOIN con Alojamientos.
 * Solo calcula OH total (sin apertura por estado de registro).
 */
function closeRelevamiento(id, usuarioEmail) {
  if (!id) {
    return { success: false, error: 'ID requerido' };
  }

  if (!usuarioEmail) {
    return { success: false, error: 'Email de usuario requerido' };
  }

  // Obtener relevamiento
  const relevamientoResponse = getRelevamiento(id);
  if (!relevamientoResponse.success) {
    return relevamientoResponse;
  }

  const relevamiento = relevamientoResponse.data;

  if (relevamiento.Estado !== CONFIG.ESTADOS_RELEVAMIENTO.EN_CURSO) {
    return {
      success: false,
      error: 'El relevamiento ya está cerrado'
    };
  }

  // Calcular OH final
  const ohData = calcularOHFinal(id);

  if (!ohData.success) {
    return ohData;
  }

  // Actualizar relevamiento
  const sheet = getSheet(CONFIG.SHEETS.RELEVAMIENTOS);
  const data = sheet.getDataRange().getValues();
  const dateTime = getCurrentDateTime();

  for (let i = 1; i < data.length; i++) {
    if (data[i][CONFIG.COLS.RELEVAMIENTOS.ID] == id) {
      const rowNum = i + 1;

      sheet.getRange(rowNum, CONFIG.COLS.RELEVAMIENTOS.ESTADO + 1).setValue(CONFIG.ESTADOS_RELEVAMIENTO.CERRADO);
      sheet.getRange(rowNum, CONFIG.COLS.RELEVAMIENTOS.OH_TOTAL + 1).setValue(ohData.data.ohTotal);
      sheet.getRange(rowNum, CONFIG.COLS.RELEVAMIENTOS.OH_MIN + 1).setValue(ohData.data.ohMin);
      sheet.getRange(rowNum, CONFIG.COLS.RELEVAMIENTOS.OH_MAX + 1).setValue(ohData.data.ohMax);
      sheet.getRange(rowNum, CONFIG.COLS.RELEVAMIENTOS.OH_MODA + 1).setValue(ohData.data.ohModa);
      sheet.getRange(rowNum, CONFIG.COLS.RELEVAMIENTOS.CANTIDAD_RELEVADOS + 1).setValue(ohData.data.cantidadRelevados);
      setCeldaTexto(sheet, rowNum, CONFIG.COLS.RELEVAMIENTOS.FECHA_CIERRE, dateTime.date);
      sheet.getRange(rowNum, CONFIG.COLS.RELEVAMIENTOS.USUARIO_CIERRE + 1).setValue(usuarioEmail);

      // Limpiar metadatos de polling del relevamiento cerrado
      PropertiesService.getScriptProperties().deleteProperty('cargas_lastmod_' + id);
      PropertiesService.getScriptProperties().deleteProperty('cargas_count_' + id);

      logAudit(usuarioEmail, 'CLOSE_RELEVAMIENTO', 'Cerró relevamiento ID: ' + id + ', OH Total: ' + ohData.data.ohTotal + '%');

      return {
        success: true,
        message: 'Relevamiento cerrado exitosamente',
        data: ohData.data
      };
    }
  }

  return {
    success: false,
    error: 'Error al actualizar relevamiento'
  };
}

/**
 * Calcula OH final usando los snapshots en CargasOH.
 * Opera solo sobre las cargas del relevamiento, sin JOIN con Alojamientos.
 *
 * Principio "sin datos ≠ 0%": solo los alojamientos con carga explícita
 * participan en el cálculo. La ausencia de carga = sin datos, nunca 0%.
 *
 * Retorna: ohTotal, ohMin, ohMax, ohModa, cantidadRelevados
 */
function calcularOHFinal(relevamientoId) {
  const cargasSheet = getSheet(CONFIG.SHEETS.CARGAS);
  const cargasData = cargasSheet.getDataRange().getValues();

  let totalHabRelevadas = 0;
  let totalHabOcupadas = 0;
  let cantidadRelevados = 0;
  const porcentajes = [];

  for (let i = 1; i < cargasData.length; i++) {
    const carga = cargasData[i];
    if (!carga[CONFIG.COLS.CARGAS.ID]) continue;
    if (carga[CONFIG.COLS.CARGAS.RELEVAMIENTO_ID] != relevamientoId) continue;

    const porcentajeOH = Number(carga[CONFIG.COLS.CARGAS.PORCENTAJE_OH]) || 0;
    const capacidadHab = Number(carga[CONFIG.COLS.CARGAS.CAPACIDAD_HAB]) || 0;
    const habOcupadas = Math.round(capacidadHab * porcentajeOH / 100);

    totalHabRelevadas += capacidadHab;
    totalHabOcupadas += habOcupadas;
    cantidadRelevados++;
    porcentajes.push(porcentajeOH);
  }

  let min = 0, max = 0, moda = 0;
  if (porcentajes.length > 0) {
    min = Math.min.apply(null, porcentajes);
    max = Math.max.apply(null, porcentajes);
    const frecuencias = {};
    let maxFrecuencia = 0;
    for (let k = 0; k < porcentajes.length; k++) {
      const p = porcentajes[k];
      frecuencias[p] = (frecuencias[p] || 0) + 1;
      if (frecuencias[p] > maxFrecuencia) {
        maxFrecuencia = frecuencias[p];
        moda = p;
      }
    }
  }

  const ohTotal = totalHabRelevadas > 0
    ? Number((totalHabOcupadas / totalHabRelevadas * 100).toFixed(1))
    : 0;

  return {
    success: true,
    data: {
      ohTotal: ohTotal,
      ohMin: min,
      ohMax: max,
      ohModa: moda,
      cantidadRelevados: cantidadRelevados
    }
  };
}

/**
 * Obtiene relevamientos mensuales de un año específico
 */
function getRelevamientosMensuales(year) {
  const result = getRelevamientos({ year: year, tipo: 'Mensual' });
  if (!result.success) return result;
  result.data.sort(function (a, b) { return new Date(a.FechaInicio) - new Date(b.FechaInicio); });
  return result;
}

/**
 * Obtiene relevamientos especiales de un año específico
 */
function getRelevamientosEspeciales(year) {
  const result = getRelevamientos({ year: year, tipo: 'Especial' });
  if (!result.success) return result;
  result.data.sort(function (a, b) { return new Date(a.FechaInicio) - new Date(b.FechaInicio); });
  return result;
}
