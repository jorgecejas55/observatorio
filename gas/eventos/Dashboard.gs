// ==============================================================================
// DASHBOARD.GS — Estadísticas agregadas para el dashboard de eventos.
// Resultado cacheado 5 minutos (CacheService) por combinación de filtros.
// ==============================================================================

/** Maneja la acción getDashboardEventos: cache-aside sobre calcularDashboardEventos. */
function handleDashboardEventos(params) {
  const fechaDesde = params.fechaDesde || '';
  const fechaHasta = params.fechaHasta || '';
  const tipo = params.tipo || '';
  const origen = params.origen || '';

  const cacheKey = 'dash-eventos|' + fechaDesde + '|' + fechaHasta + '|' + tipo + '|' + origen;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);

  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }

  const stats = calcularDashboardEventos(fechaDesde, fechaHasta, tipo, origen);
  const output = JSON.stringify(stats);
  cache.put(cacheKey, output, 300);

  return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
}

/** Calcula todas las estadísticas para el dashboard de eventos. */
function calcularDashboardEventos(fechaDesde, fechaHasta, tipo, origen) {
  const todosLosEventos = getSheetData(SHEETS.EVENTOS);
  const eventosFiltrados = filtrarEventos(todosLosEventos, fechaDesde, fechaHasta, tipo, origen);

  return {
    success: true,
    total: eventosFiltrados.length,
    totalAsistentes: calcularTotalAsistentes(eventosFiltrados),
    duracionMedia: calcularDuracionMedia(eventosFiltrados),
    eventosPorMes: contarEventosPorMes(eventosFiltrados),
    asistentesPorMes: contarAsistentesPorMes(eventosFiltrados),
    porcentajesPorOrigen: calcularPorcentajes(eventosFiltrados, 'origen'),
    porcentajesPorTipo: calcularPorcentajes(eventosFiltrados, 'tipo'),
    duracionPorTipo: calcularDuracionPromedioPorCategoria(eventosFiltrados, 'tipo'),
    duracionPorOrigen: calcularDuracionPromedioPorCategoria(eventosFiltrados, 'origen'),
    asistentesPorOrigen: calcularAsistentesPorCategoria(eventosFiltrados, 'origen'),
    asistentesPorTipo: calcularAsistentesPorCategoria(eventosFiltrados, 'tipo')
  };
}

/** Filtra eventos según parámetros de fecha, tipo y origen. */
function filtrarEventos(eventos, fechaDesde, fechaHasta, tipo, origen) {
  return eventos.filter(function (evento) {
    if (fechaDesde && evento.fecha_inicio && evento.fecha_inicio < fechaDesde) return false;
    if (fechaHasta && evento.fecha_inicio && evento.fecha_inicio > fechaHasta) return false;
    if (tipo && evento.tipo !== tipo) return false;
    if (origen && evento.origen !== origen) return false;
    return true;
  });
}

/** Suma total_asistentes de todos los eventos. */
function calcularTotalAsistentes(eventos) {
  return eventos.reduce(function (sum, evento) {
    return sum + (parseInt(evento.total_asistentes) || 0);
  }, 0);
}

/** Duración media de los eventos en días (1 decimal). */
function calcularDuracionMedia(eventos) {
  if (eventos.length === 0) return 0;
  const totalDias = eventos.reduce(function (sum, evento) {
    return sum + (parseFloat(evento.duracion) || 0);
  }, 0);
  return Math.round((totalDias / eventos.length) * 10) / 10;
}

/** Cuenta eventos por mes: [{mes: 'YYYY-MM', cantidad: N}, ...] ordenado por fecha. */
function contarEventosPorMes(eventos) {
  const conteo = {};
  eventos.forEach(function (evento) {
    if (!evento.fecha_inicio) return;
    const mes = evento.fecha_inicio.substring(0, 7);
    conteo[mes] = (conteo[mes] || 0) + 1;
  });
  return Object.keys(conteo)
    .map(function (mes) { return { mes: mes, cantidad: conteo[mes] }; })
    .sort(function (a, b) { return a.mes.localeCompare(b.mes); });
}

/** Suma asistentes por mes: [{mes: 'YYYY-MM', asistentes: N}, ...] ordenado por fecha. */
function contarAsistentesPorMes(eventos) {
  const conteo = {};
  eventos.forEach(function (evento) {
    if (!evento.fecha_inicio) return;
    const mes = evento.fecha_inicio.substring(0, 7);
    conteo[mes] = (conteo[mes] || 0) + (parseInt(evento.total_asistentes) || 0);
  });
  return Object.keys(conteo)
    .map(function (mes) { return { mes: mes, asistentes: conteo[mes] }; })
    .sort(function (a, b) { return a.mes.localeCompare(b.mes); });
}

/** Porcentajes de eventos por categoría (tipo u origen), ordenado descendente. */
function calcularPorcentajes(eventos, campo) {
  if (eventos.length === 0) return [];
  const conteo = {};
  eventos.forEach(function (evento) {
    const valor = evento[campo] || 'Sin especificar';
    conteo[valor] = (conteo[valor] || 0) + 1;
  });
  const total = eventos.length;
  return Object.keys(conteo)
    .map(function (nombre) {
      const cantidad = conteo[nombre];
      return { nombre: nombre, cantidad: cantidad, porcentaje: Math.round((cantidad / total) * 100 * 10) / 10 };
    })
    .sort(function (a, b) { return b.cantidad - a.cantidad; });
}

/** Duración promedio por categoría (tipo u origen), ordenado descendente. */
function calcularDuracionPromedioPorCategoria(eventos, campo) {
  const sumas = {};
  const conteos = {};
  eventos.forEach(function (evento) {
    const nombre = evento[campo] || 'Sin especificar';
    sumas[nombre] = (sumas[nombre] || 0) + (parseFloat(evento.duracion) || 0);
    conteos[nombre] = (conteos[nombre] || 0) + 1;
  });
  return Object.keys(sumas)
    .map(function (nombre) {
      const promedio = conteos[nombre] > 0 ? Math.round((sumas[nombre] / conteos[nombre]) * 10) / 10 : 0;
      return { nombre: nombre, duracion: promedio };
    })
    .sort(function (a, b) { return b.duracion - a.duracion; });
}

/** Suma de asistentes por categoría (tipo u origen), ordenado descendente. */
function calcularAsistentesPorCategoria(eventos, campo) {
  const sumas = {};
  eventos.forEach(function (evento) {
    const nombre = evento[campo] || 'Sin especificar';
    sumas[nombre] = (sumas[nombre] || 0) + (parseInt(evento.total_asistentes) || 0);
  });
  return Object.keys(sumas)
    .map(function (nombre) { return { nombre: nombre, asistentes: sumas[nombre] }; })
    .sort(function (a, b) { return b.asistentes - a.asistentes; });
}
