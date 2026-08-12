// ==============================================================================
// RESUMEN.GS — KPIs del dashboard calculados en el servidor.
// El cliente NO recibe el dataset completo; recibe este objeto chico.
// CacheService TTL 300s por atractivo; invalidación explícita tras cada mutación.
// ==============================================================================

function RESUMEN_CACHE_KEY(atractivo) {
  return 'resumen_' + atractivo;
}

/** Devuelve el resumen cacheadp (o lo recalcula y cachea). */
function getResumen(atractivo) {
  var cache = CacheService.getScriptCache();
  var key = RESUMEN_CACHE_KEY(atractivo);
  var cacheado = cache.get(key);
  if (cacheado) {
    try {
      return { success: true, data: JSON.parse(cacheado) };
    } catch (e) {
      // cache corrupta → recalcular
    }
  }

  var data = calcularResumen(atractivo);
  try {
    cache.put(key, JSON.stringify(data), 300);
  } catch (e) {
    Logger.log('[resumen] no se pudo cachear: ' + e.toString());
  }
  return { success: true, data: data };
}

/** Invalida el resumen de un atractivo tras cualquier mutación. */
function invalidarResumen(atractivo) {
  try {
    CacheService.getScriptCache().remove(RESUMEN_CACHE_KEY(atractivo));
  } catch (e) {
    // ignorar: el TTL de 300s corrije solo
  }
}

// ── Total histórico: caché propia de 6 h ──────────────────────────────────────
// La hoja Histórico la escribe la migración y después no cambia nunca, pero
// pesa miles de filas (5.129 en Pueblo Perdido). Sumarla dentro del resumen
// hacía que CADA expiración del TTL de 300 s releyera toda la hoja: con la
// caché fría eso llegó a pasarse del timeout del cliente. Se cachea aparte con
// el TTL máximo que admite CacheService (6 h) y se invalida a mano desde la
// migración, que es lo único que la modifica.

var HISTORICO_CACHE_TTL = 21600; // 6 h — máximo permitido por CacheService

function HISTORICO_CACHE_KEY(atractivo) {
  return 'historico_total_' + atractivo;
}

/** Suma de `cantidad_personas` de la hoja Histórico (cacheada 6 h). */
function getTotalHistorico(atractivo) {
  var cache = CacheService.getScriptCache();
  var key = HISTORICO_CACHE_KEY(atractivo);
  var cacheado = cache.get(key);
  if (cacheado !== null && cacheado !== '') {
    var previo = Number(cacheado);
    if (!isNaN(previo)) return previo;
  }

  var total = 0;
  try {
    var sheet = getSheetDe(atractivo, SHEETS.HISTORICO);
    var ultimaFila = sheet.getLastRow();
    if (ultimaFila > 1) {
      // Solo la columna de cantidades: leer las 3 columnas de miles de filas es
      // desperdicio (el resto del Histórico no participa del cálculo).
      var col = getHeaders(sheet).indexOf('cantidad_personas');
      if (col < 0) throw new Error('cabecera no encontrada: cantidad_personas');
      var valores = sheet.getRange(2, col + 1, ultimaFila - 1, 1).getValues();
      for (var i = 0; i < valores.length; i++) {
        total += numero(valores[i][0]);
      }
    }
  } catch (e) {
    Logger.log('[resumen] hoja Histórico no disponible: ' + e.toString());
    return 0; // sin cachear: un fallo transitorio no debe fijarse por 6 h
  }

  try {
    cache.put(key, String(total), HISTORICO_CACHE_TTL);
  } catch (e) {
    Logger.log('[resumen] no se pudo cachear el histórico: ' + e.toString());
  }
  return total;
}

/** Invalida el total histórico. La llama la migración tras reescribir la hoja. */
function invalidarHistorico(atractivo) {
  try {
    CacheService.getScriptCache().remove(HISTORICO_CACHE_KEY(atractivo));
  } catch (e) {
    // ignorar: el TTL corrige solo
  }
}

function numero(valor) {
  var n = Number(valor);
  return isNaN(n) ? 0 : n;
}

function calcularResumen(atractivo) {
  var ahora = new Date();
  var tz = Session.getScriptTimeZone();
  var anioActual = parseInt(Utilities.formatDate(ahora, tz, 'yyyy'), 10);
  var mesActual = parseInt(Utilities.formatDate(ahora, tz, 'M'), 10); // 1-12
  var mesActualKey = anioActual + '-' + (mesActual < 10 ? '0' + mesActual : mesActual);
  var hoy = Utilities.formatDate(ahora, tz, 'yyyy-MM-dd');

  // Serie: índice 0 = enero
  var serie = [];
  for (var m = 1; m <= 12; m++) {
    serie.push({
      anio: anioActual,
      mes: m,
      ingresos: 0,
      personas: 0,
      actividades: 0,
      personasActividades: 0
    });
  }

  var porTipo = {};   // tipo_visitante → personas
  var porMotivo = {}; // motivo → personas

  var hoyIngresos = 0;
  var hoyPersonas = 0;
  var mesIngresos = 0;
  var mesPersonas = 0;
  var mesActividades = 0;
  var mesPersonasActividades = 0;
  var totalIngresos = 0;
  var totalPersonas = 0;
  var totalActividades = 0;
  var totalPersonasActividades = 0;

  // ── Ingresos ────────────────────────────────────────────────────────────────
  var sheetIngresos = getSheetDe(atractivo, SHEETS.INGRESOS);
  var headersIngresos = getHeaders(sheetIngresos);
  var filasIngresos = listarActivos(sheetIngresos, headersIngresos, 'fecha_hora_registro', { sinLimite: true });

  for (var i = 0; i < filasIngresos.length; i++) {
    var ing = filasIngresos[i];
    var fecha = String(ing.fecha_hora_registro || '').substring(0, 10);
    var mesKey = fecha.substring(0, 7);
    var personas = numero(ing.cantidad_personas);

    if (!fecha || fecha.substring(0, 4) !== String(anioActual)) continue;

    totalIngresos++;
    totalPersonas += personas;

    if (fecha === hoy) {
      hoyIngresos++;
      hoyPersonas += personas;
    }
    if (mesKey === mesActualKey) {
      mesIngresos++;
      mesPersonas += personas;
    }
    var mesNum = parseInt(fecha.substring(5, 7), 10);
    if (mesNum >= 1 && mesNum <= 12) {
      serie[mesNum - 1].ingresos++;
      serie[mesNum - 1].personas += personas;
    }
    var tipo = String(ing.tipo_visitante || '').trim() || 'Sin tipo';
    porTipo[tipo] = (porTipo[tipo] || 0) + personas;
    var motivo = String(ing.motivo || '').trim() || 'Sin motivo';
    porMotivo[motivo] = (porMotivo[motivo] || 0) + personas;
  }

  // ── Actividades especiales ───────────────────────────────────────────────────
  var sheetActividades = getSheetDe(atractivo, SHEETS.ACTIVIDADES);
  var headersActividades = getHeaders(sheetActividades);
  var filasActividades = listarActivos(sheetActividades, headersActividades, 'fecha_actividad', { sinLimite: true });

  for (var a = 0; a < filasActividades.length; a++) {
    var act = filasActividades[a];
    var fechaAct = String(act.fecha_actividad || '').substring(0, 10);
    var mesKeyAct = fechaAct.substring(0, 7);
    var totalAct = numero(act.cantidad_total);

    if (!fechaAct || fechaAct.substring(0, 4) !== String(anioActual)) continue;

    totalActividades++;
    totalPersonasActividades += totalAct;

    if (mesKeyAct === mesActualKey) {
      mesActividades++;
      mesPersonasActividades += totalAct;
    }
    var mesNumAct = parseInt(fechaAct.substring(5, 7), 10);
    if (mesNumAct >= 1 && mesNumAct <= 12) {
      serie[mesNumAct - 1].actividades++;
      serie[mesNumAct - 1].personasActividades += totalAct;
    }
  }

  // ── Histórico (solo lectura, poblado por la migración; caché propia de 6 h) ──
  var totalHistorico = getTotalHistorico(atractivo);

  return {
    anio: anioActual,
    hoy: { fecha: hoy, ingresos: hoyIngresos, personas: hoyPersonas },
    mesEnCurso: {
      anio: anioActual,
      mes: mesActual,
      ingresos: mesIngresos,
      personas: mesPersonas,
      actividades: mesActividades,
      personasActividades: mesPersonasActividades
    },
    serieAnual: serie,
    porTipoVisitante: Object.keys(porTipo).map(function (k) {
      return { tipo_visitante: k, personas: porTipo[k] };
    }),
    porMotivo: Object.keys(porMotivo).map(function (k) {
      return { motivo: k, personas: porMotivo[k] };
    }),
    totalAnio: {
      ingresos: totalIngresos,
      personas: totalPersonas,
      actividades: totalActividades,
      personasActividades: totalPersonasActividades
    },
    historico: { personas: totalHistorico }
  };
}