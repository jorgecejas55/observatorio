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

// ── Total histórico (hoja Histórico, solo lectura de migración) ───────────────
// Ya no participa del resumen: tras consolidarHistoricoEnIngresos() (Migracion.gs)
// los mismos datos viven en Ingresos y entran a totalAnio/serieAnual/serie como
// cualquier otro registro. invalidarHistorico() queda como no-op por si algún
// caller viejo la sigue llamando.
function invalidarHistorico(atractivo) {}

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
  var aniosSet = {};  // año (string) → true — para el selector del frontend

  var hoyIngresos = 0;
  var hoyPersonas = 0;
  var hoyActividades = 0;
  var hoyPersonasActividades = 0;
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

    if (fecha) aniosSet[fecha.substring(0, 4)] = true;
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

    if (fechaAct) aniosSet[fechaAct.substring(0, 4)] = true;
    if (!fechaAct || fechaAct.substring(0, 4) !== String(anioActual)) continue;

    totalActividades++;
    totalPersonasActividades += totalAct;

    if (fechaAct === hoy) {
      hoyActividades++;
      hoyPersonasActividades += totalAct;
    }
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

  var aniosDisponibles = Object.keys(aniosSet).map(function (a) { return parseInt(a, 10); });
  aniosDisponibles.sort(function (a, b) { return b - a; }); // más reciente primero

  return {
    anio: anioActual,
    hoy: {
      fecha: hoy,
      ingresos: hoyIngresos,
      personas: hoyPersonas,
      actividades: hoyActividades,
      personasActividades: hoyPersonasActividades,
      personasTotal: hoyPersonas + hoyPersonasActividades
    },
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
      personasActividades: totalPersonasActividades,
      personasTotal: totalPersonas + totalPersonasActividades
    },
    aniosDisponibles: aniosDisponibles
  };
}

// ==============================================================================
// SERIE — drill-down bajo demanda para el selector de año/mes del dashboard.
// Sin año+mes: agrega por mes (1-12) de ese año. Con año+mes: agrega por día
// del mes. No confundir con serieAnual (siempre año en curso, ya viene en
// calcularResumen): esta función sirve cualquier año/mes que el usuario elija,
// incluidos los históricos consolidados en Ingresos.
// Cache 300 s por (atractivo, año, mes) — mismo criterio que el resumen.
// ==============================================================================

function SERIE_CACHE_KEY(atractivo, anio, mes) {
  return 'serie_' + atractivo + '_' + anio + '_' + (mes || '');
}

function getSerie(atractivo, anio, mes) {
  var anioNum = parseInt(anio, 10);
  if (isNaN(anioNum)) return { success: false, error: 'año inválido' };
  var mesNum = mes ? parseInt(mes, 10) : null;
  if (mesNum !== null && (isNaN(mesNum) || mesNum < 1 || mesNum > 12)) {
    return { success: false, error: 'mes inválido' };
  }

  var cache = CacheService.getScriptCache();
  var key = SERIE_CACHE_KEY(atractivo, anioNum, mesNum);
  var cacheado = cache.get(key);
  if (cacheado) {
    try {
      return { success: true, data: JSON.parse(cacheado) };
    } catch (e) {
      // cache corrupta → recalcular
    }
  }

  var data = calcularSerie(atractivo, anioNum, mesNum);
  try {
    cache.put(key, JSON.stringify(data), 300);
  } catch (e) {
    Logger.log('[serie] no se pudo cachear: ' + e.toString());
  }
  return { success: true, data: data };
}

function calcularSerie(atractivo, anioNum, mesNum) {
  var sheetIngresos = getSheetDe(atractivo, SHEETS.INGRESOS);
  var headersIngresos = getHeaders(sheetIngresos);
  var filasIngresos = listarActivos(sheetIngresos, headersIngresos, 'fecha_hora_registro', { sinLimite: true });

  var granularidad = mesNum ? 'dia' : 'mes';
  var tope = mesNum ? 31 : 12;
  var puntos = {};
  for (var p = 1; p <= tope; p++) {
    puntos[p] = { periodo: p, personas: 0, ingresos: 0 };
  }

  for (var i = 0; i < filasIngresos.length; i++) {
    var ing = filasIngresos[i];
    var fecha = String(ing.fecha_hora_registro || '').substring(0, 10);
    if (!fecha || fecha.substring(0, 4) !== String(anioNum)) continue;

    var mesFila = parseInt(fecha.substring(5, 7), 10);
    if (mesNum && mesFila !== mesNum) continue;

    var periodo = mesNum ? parseInt(fecha.substring(8, 10), 10) : mesFila;
    if (!puntos[periodo]) continue; // fecha corrupta (día fuera de rango)

    puntos[periodo].personas += numero(ing.cantidad_personas);
    puntos[periodo].ingresos += 1;
  }

  var serie = [];
  for (var k = 1; k <= tope; k++) serie.push(puntos[k]);

  return { granularidad: granularidad, anio: anioNum, mes: mesNum || null, serie: serie };
}