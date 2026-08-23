// ==============================================================================
// INGRESOS.GS — Visitas guiadas / ingresos de personas a los atractivos.
// Envoltorio fino sobre Datos.gs con la lista de campos y validaciones.
// ==============================================================================

// 'Sin especificar' cubre los registros consolidados desde Histórico: el Form
// legacy no capturaba tipo de visitante. Ver Migracion.gs → consolidarHistoricoEnIngresos.
var TIPOS_VISITANTE = ['Residente', 'Turista', 'Institución', 'Sin especificar'];
var PROCEDENCIAS_INGRESO = ['Internacional', 'Nacional', 'Provincial'];
var MAX_PERSONAS = 10000;

// Motivos por atractivo. También viven en src/lib/atractivos-config.ts
// (source of truth en Next); acá se validan como defensa en profundidad.
// 'Histórico' es el motivo que asigna la consolidación (Migracion.gs).
var MOTIVOS_VALIDOS = {
  'casa-la-puna': ['Visita guiada', 'Peña', 'Feria', 'Histórico'],
  'pueblo-perdido': ['Visita guiada', 'Actividad especial', 'Histórico']
};

/** Devuelve lista de errores (vacía = válido). */
function validarIngresoData(atractivo, data) {
  var errores = [];

  if (!atractivoValido(atractivo)) errores.push('atractivo_invalido');
  if (!data || !data.fecha_hora_registro) errores.push('falta fecha_hora_registro');
  if (TIPOS_VISITANTE.indexOf(data.tipo_visitante) < 0) errores.push('tipo_visitante inválido');
  if (data.tipo_visitante === 'Turista' && PROCEDENCIAS_INGRESO.indexOf(data.procedencia) < 0) {
    errores.push('procedencia requerida para turista');
  }
  var cantidad = parseInt(data.cantidad_personas, 10);
  if (isNaN(cantidad) || cantidad < 1 || cantidad > MAX_PERSONAS) errores.push('cantidad_personas inválida');
  var motivos = MOTIVOS_VALIDOS[atractivo] || [];
  if (!data.motivo || motivos.indexOf(data.motivo) < 0) errores.push('motivo inválido');

  return errores;
}

function getIngresos(atractivo, params) {
  var sheet = getSheetDe(atractivo, SHEETS.INGRESOS);
  var headers = getHeaders(sheet);
  var filtros = {
    desde: params.desde || '',
    hasta: params.hasta || '',
    limit: params.limit || ''
  };
  return { success: true, data: listarActivos(sheet, headers, 'fecha_hora_registro', filtros) };
}

function crearIngreso(atractivo, data) {
  var errores = validarIngresoData(atractivo, data);
  if (errores.length) return { success: false, error: 'Datos inválidos: ' + errores.join(', ') };

  return conLock(function () {
    var sheet = getSheetDe(atractivo, SHEETS.INGRESOS);
    var headers = getHeaders(sheet);

    // Idempotencia: si el id_local ya existe, la tablet reintentó un POST
    // ambiguo → se devuelve el id ya creado (success) sin duplicar fila.
    var existente = buscarFilaPorIdLocal(sheet, headers, data.id_local);
    if (existente > 0) {
      var reg = leerFila(sheet, headers, existente);
      return { success: true, data: { id: String(reg.id), duplicado: true } };
    }

    var payload = {
      id: Utilities.getUuid(),
      fecha_hora_registro: data.fecha_hora_registro || '',
      tipo_visitante: data.tipo_visitante,
      procedencia: data.tipo_visitante === 'Turista' ? data.procedencia : '',
      cantidad_personas: parseInt(data.cantidad_personas, 10),
      motivo: data.motivo,
      usuario_registro: data.usuario_registro || '',
      id_local: data.id_local || ''
    };

    var ahora = getCurrentDateTime();
    var filaNueva = crearFila(sheet, headers, payload, ahora);
    var creado = leerFila(sheet, headers, filaNueva);

    invalidarResumen(atractivo);
    return { success: true, data: { id: String(creado.id), duplicado: false } };
  });
}

function actualizarIngreso(atractivo, data) {
  var errores = validarIngresoData(atractivo, data);
  if (errores.length) return { success: false, error: 'Datos inválidos: ' + errores.join(', ') };
  if (!data.id) return { success: false, error: 'falta id' };

  return conLock(function () {
    var sheet = getSheetDe(atractivo, SHEETS.INGRESOS);
    var headers = getHeaders(sheet);
    var ahora = getCurrentDateTime();

    // fecha_hora_registro: el Next filtra este campo salvo que quien edita sea
    // admin (ver gateAtractivo/route.ts) — acá solo se aplica SI vino en el
    // payload; si no vino, actualizarFila no la toca y se conserva la original.
    var payload = {
      tipo_visitante: data.tipo_visitante,
      procedencia: data.tipo_visitante === 'Turista' ? data.procedencia : '',
      cantidad_personas: parseInt(data.cantidad_personas, 10),
      motivo: data.motivo,
      usuario_modificacion: data.usuario_modificacion || ''
    };
    if (data.fecha_hora_registro) payload.fecha_hora_registro = data.fecha_hora_registro;

    actualizarFila(sheet, headers, String(data.id), payload, ahora);

    invalidarResumen(atractivo);
    return { success: true, data: { id: String(data.id) } };
  });
}

function eliminarIngreso(atractivo, data) {
  if (!data.id) return { success: false, error: 'falta id' };

  return conLock(function () {
    var sheet = getSheetDe(atractivo, SHEETS.INGRESOS);
    var headers = getHeaders(sheet);
    var resultado = bajaLogica(sheet, headers, String(data.id), data.usuario_modificacion || '');
    if (resultado.success) invalidarResumen(atractivo);
    return resultado;
  });
}