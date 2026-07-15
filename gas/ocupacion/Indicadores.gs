// ==============================================================================
// INDICADORES.GS — Persistencia de indicadores de ocupación hotelera (Bloque A)
// Capa fina de persistencia: Next.js calcula, GAS solo guarda/lee.
// ==============================================================================

/**
 * Guarda o actualiza indicadores de un relevamiento (upsert por RelevamientoID).
 * data debe incluir todos los campos de IndicadoresRelevamiento + usuarioEmail.
 */
function guardarIndicadores(data) {
  if (!data.relevamientoId) {
    return { success: false, error: 'RelevamientoID requerido' };
  }

  var usuarioEmail = data.usuarioEmail || 'sistema';

  // Verificar que el relevamiento exista y esté CERRADO
  var relevamientoResp = getRelevamiento(data.relevamientoId);
  if (!relevamientoResp.success) {
    return { success: false, error: 'Relevamiento no encontrado: ' + (relevamientoResp.error || '') };
  }

  var relevamiento = relevamientoResp.data;
  if (relevamiento.Estado !== CONFIG.ESTADOS_RELEVAMIENTO.CERRADO) {
    return { success: false, error: 'El relevamiento no está cerrado. Solo se pueden guardar indicadores de relevamientos CERRADOS.' };
  }

  var sheet = getSheet(CONFIG.SHEETS.INDICADORES);
  var data_ind = sheet.getDataRange().getValues();
  var headers = data_ind[0];
  var idCol = CONFIG.COLS.INDICADORES.RELEVAMIENTO_ID;

  // Buscar fila existente (upsert)
  var existingRow = -1;
  for (var i = 1; i < data_ind.length; i++) {
    if (data_ind[i][idCol] == data.relevamientoId) {
      existingRow = i + 1; // 1-based
      break;
    }
  }

  var dateTime = getCurrentDateTime();
  var fechaCalculo = data.fechaCalculo || dateTime.date;

  // Extraer valores escalares
  var global = data.global || {};
  var bajaActividad = data.bajaActividad || {};
  var cobertura = data.cobertura;

  var row = [];
  row[CONFIG.COLS.INDICADORES.RELEVAMIENTO_ID] = data.relevamientoId;
  row[CONFIG.COLS.INDICADORES.FECHA_CALCULO] = fechaCalculo;
  row[CONFIG.COLS.INDICADORES.OH_PONDERADA] = global.mediaPonderada || 0;
  row[CONFIG.COLS.INDICADORES.OH_MEDIA_SIMPLE] = global.mediaSimple || 0;
  row[CONFIG.COLS.INDICADORES.OH_MEDIANA] = global.mediana || 0;
  row[CONFIG.COLS.INDICADORES.OH_MEDIA_RECORTADA] = global.mediaRecortada || 0;
  row[CONFIG.COLS.INDICADORES.N_RECORTADOS] = global.nRecortados || 0;
  row[CONFIG.COLS.INDICADORES.OH_MIN] = global.minimo || 0;
  row[CONFIG.COLS.INDICADORES.OH_MAX] = global.maximo || 0;
  row[CONFIG.COLS.INDICADORES.OH_MODA] = global.moda || 0;
  row[CONFIG.COLS.INDICADORES.DESVIO_ESTANDAR] = global.desvioEstandar || 0;
  row[CONFIG.COLS.INDICADORES.COEF_VARIACION] = global.coeficienteVariacion || 0;
  row[CONFIG.COLS.INDICADORES.CANTIDAD_RELEVADOS] = global.n || 0;
  row[CONFIG.COLS.INDICADORES.BAJA_ACTIVIDAD_CANT] = bajaActividad.cantidad || 0;
  row[CONFIG.COLS.INDICADORES.BAJA_ACTIVIDAD_PCT] = bajaActividad.porcentaje || 0;
  row[CONFIG.COLS.INDICADORES.UMBRAL_BAJA_ACTIVIDAD] = bajaActividad.umbral || 0;
  row[CONFIG.COLS.INDICADORES.COBERTURA] = cobertura !== null && cobertura !== undefined ? cobertura : '';
  row[CONFIG.COLS.INDICADORES.HAB_RELEVADAS] = data.habitacionesRelevadas || 0;
  row[CONFIG.COLS.INDICADORES.HAB_OCUPADAS] = data.habitacionesOcupadas || 0;
  row[CONFIG.COLS.INDICADORES.DATOS_JSON] = JSON.stringify(data);

  if (existingRow > 0) {
    // Actualizar fila existente
    for (var col = 0; col < 20; col++) {
      sheet.getRange(existingRow, col + 1).setValue(row[col] !== undefined ? row[col] : '');
    }
    // Fecha como texto
    setCeldaTexto(sheet, existingRow, CONFIG.COLS.INDICADORES.FECHA_CALCULO, fechaCalculo);

    logAudit(usuarioEmail, 'UPDATE_INDICADORES',
      'Actualizó indicadores del relevamiento ID: ' + data.relevamientoId);
    return {
      success: true,
      relevamientoId: data.relevamientoId,
      message: 'Indicadores actualizados exitosamente'
    };
  } else {
    // Insertar nueva fila
    sheet.appendRow(row);
    var newRowNum = sheet.getLastRow();
    setCeldaTexto(sheet, newRowNum, CONFIG.COLS.INDICADORES.FECHA_CALCULO, fechaCalculo);

    logAudit(usuarioEmail, 'SAVE_INDICADORES',
      'Guardó indicadores del relevamiento ID: ' + data.relevamientoId);
    return {
      success: true,
      relevamientoId: data.relevamientoId,
      message: 'Indicadores guardados exitosamente'
    };
  }
}

/**
 * Obtiene los indicadores de un relevamiento específico.
 * Devuelve columnas escalares + datosJSON parseado.
 */
function getIndicadores(relevamientoId) {
  if (!relevamientoId) {
    return { success: false, error: 'RelevamientoID requerido' };
  }

  var sheet = getSheet(CONFIG.SHEETS.INDICADORES);
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: false, error: 'No hay indicadores guardados' };
  }

  var headers = data[0];
  var idCol = CONFIG.COLS.INDICADORES.RELEVAMIENTO_ID;

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == relevamientoId) {
      var obj = rowToObject(headers, data[i]);

      // Parsear DatosJSON
      if (obj.DatosJSON && typeof obj.DatosJSON === 'string') {
        try {
          obj.datosJSON = JSON.parse(obj.DatosJSON);
        } catch (e) {
          obj.datosJSON = null;
        }
      }

      // Normalizar cobertura (vacío → null)
      if (obj.Cobertura === '' || obj.Cobertura === undefined || obj.Cobertura === null) {
        obj.cobertura = null;
      } else {
        obj.cobertura = Number(obj.Cobertura);
      }

      return {
        success: true,
        data: obj
      };
    }
  }

  return {
    success: false,
    error: 'Indicadores no encontrados para el relevamiento: ' + relevamientoId
  };
}

/**
 * Lista indicadores con filtros opcionales.
 * Solo devuelve columnas escalares (sin DatosJSON) — más liviano para series temporales.
 * params.year: filtra por año de FechaCalculo (substring, nunca new Date()).
 */
function listIndicadores(params) {
  var sheet = getSheet(CONFIG.SHEETS.INDICADORES);
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [], count: 0 };
  }

  var headers = data[0];
  var result = [];
  var yearFilter = params.year ? String(params.year) : null;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[CONFIG.COLS.INDICADORES.RELEVAMIENTO_ID]) continue;

    // Filtro por año sobre FechaCalculo (texto yyyy-MM-dd)
    if (yearFilter) {
      var fecha = row[CONFIG.COLS.INDICADORES.FECHA_CALCULO];
      if (!fecha || String(fecha).slice(0, 4) !== yearFilter) continue;
    }

    var obj = rowToObject(headers, row);
    // No incluir DatosJSON en listados (muy pesado)
    delete obj.DatosJSON;

    // Normalizar cobertura
    if (obj.Cobertura === '' || obj.Cobertura === undefined || obj.Cobertura === null) {
      obj.cobertura = null;
    } else {
      obj.cobertura = Number(obj.Cobertura);
    }

    result.push(obj);
  }

  // Ordenar por FechaCalculo descendente
  result.sort(function (a, b) {
    var fa = a.FechaCalculo || '';
    var fb = b.FechaCalculo || '';
    return fb.localeCompare(fa);
  });

  return {
    success: true,
    data: result,
    count: result.length
  };
}
