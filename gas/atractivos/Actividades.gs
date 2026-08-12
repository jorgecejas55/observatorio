// ==============================================================================
// ACTIVIDADES.GS — Actividades especiales (evento por evento).
// Envoltorio fino sobre Datos.gs con la lista de campos y validaciones.
// ==============================================================================

/** Devuelve lista de errores (vacía = válido). */
function validarActividadData(atractivo, data) {
  var errores = [];

  if (!atractivoValido(atractivo)) errores.push('atractivo_invalido');
  if (!data) errores.push('datos_vacios');
  if (!data.fecha_actividad || !/^\d{4}-\d{2}-\d{2}$/.test(String(data.fecha_actividad))) {
    errores.push('fecha_actividad inválida (YYYY-MM-DD)');
  }
  if (!data.nombre_actividad || String(data.nombre_actividad).length > 200) {
    errores.push('nombre_actividad inválido');
  }
  var total = parseInt(data.cantidad_total, 10);
  var turistas = parseInt(data.cantidad_turistas, 10) || 0;
  var residentes = parseInt(data.cantidad_residentes, 10) || 0;
  if (isNaN(total) || total < 1 || total > MAX_PERSONAS) errores.push('cantidad_total inválida');
  if (turistas < 0 || residentes < 0) errores.push('cantidades no pueden ser negativas');
  if (!isNaN(total) && total < turistas + residentes) errores.push('cantidad_total debe ser >= turistas + residentes');

  return errores;
}

function getActividades(atractivo, params) {
  var sheet = getSheetDe(atractivo, SHEETS.ACTIVIDADES);
  var headers = getHeaders(sheet);
  var filtros = {
    desde: params.desde || '',
    hasta: params.hasta || '',
    limit: params.limit || ''
  };
  return { success: true, data: listarActivos(sheet, headers, 'fecha_actividad', filtros) };
}

function crearActividad(atractivo, data) {
  var errores = validarActividadData(atractivo, data);
  if (errores.length) return { success: false, error: 'Datos inválidos: ' + errores.join(', ') };

  return conLock(function () {
    var sheet = getSheetDe(atractivo, SHEETS.ACTIVIDADES);
    var headers = getHeaders(sheet);

    // Idempotencia por id_local (igual criterio que ingresos).
    var existente = buscarFilaPorIdLocal(sheet, headers, data.id_local);
    if (existente > 0) {
      var reg = leerFila(sheet, headers, existente);
      return { success: true, data: { id: String(reg.id), duplicado: true } };
    }

    var payload = {
      id: Utilities.getUuid(),
      fecha_actividad: String(data.fecha_actividad),
      nombre_actividad: String(data.nombre_actividad),
      cantidad_total: parseInt(data.cantidad_total, 10),
      cantidad_turistas: parseInt(data.cantidad_turistas, 10) || 0,
      cantidad_residentes: parseInt(data.cantidad_residentes, 10) || 0,
      observaciones: data.observaciones || '',
      usuario_registro: data.usuario_registro || '',
      fecha_hora_registro: data.fecha_hora_registro || '',
      id_local: data.id_local || ''
    };

    var ahora = getCurrentDateTime();
    var filaNueva = crearFila(sheet, headers, payload, ahora);
    var creado = leerFila(sheet, headers, filaNueva);

    invalidarResumen(atractivo);
    return { success: true, data: { id: String(creado.id), duplicado: false } };
  });
}

function actualizarActividad(atractivo, data) {
  var errores = validarActividadData(atractivo, data);
  if (errores.length) return { success: false, error: 'Datos inválidos: ' + errores.join(', ') };
  if (!data.id) return { success: false, error: 'falta id' };

  return conLock(function () {
    var sheet = getSheetDe(atractivo, SHEETS.ACTIVIDADES);
    var headers = getHeaders(sheet);
    var ahora = getCurrentDateTime();

    actualizarFila(sheet, headers, String(data.id), {
      fecha_actividad: String(data.fecha_actividad),
      nombre_actividad: String(data.nombre_actividad),
      cantidad_total: parseInt(data.cantidad_total, 10),
      cantidad_turistas: parseInt(data.cantidad_turistas, 10) || 0,
      cantidad_residentes: parseInt(data.cantidad_residentes, 10) || 0,
      observaciones: data.observaciones || '',
      usuario_modificacion: data.usuario_modificacion || ''
    }, ahora);

    invalidarResumen(atractivo);
    return { success: true, data: { id: String(data.id) } };
  });
}

function eliminarActividad(atractivo, data) {
  if (!data.id) return { success: false, error: 'falta id' };

  return conLock(function () {
    var sheet = getSheetDe(atractivo, SHEETS.ACTIVIDADES);
    var headers = getHeaders(sheet);
    var resultado = bajaLogica(sheet, headers, String(data.id), data.usuario_modificacion || '');
    if (resultado.success) invalidarResumen(atractivo);
    return resultado;
  });
}