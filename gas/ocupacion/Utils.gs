// ==============================================================================
// UTILS.GS — Dashboard, Auditoría y utilidades compartidas
// Versión simplificada: sin Usuarios, Categorías, Municipios, Configuración.
// ==============================================================================

// ── Auditoría ──────────────────────────────────────────────────────────────────

/**
 * Registra una acción en la hoja de auditoría.
 * Columnas: Timestamp, Email, Accion, Detalle
 */
function logAudit(email, accion, detalle) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.AUDITORIA);
    const dateTime = getCurrentDateTime();

    sheet.appendRow([
      dateTime.datetime,
      email,
      accion,
      detalle || ''
    ]);
  } catch (e) {
    Logger.log('Error al registrar auditoría: ' + e.message);
  }
}

/**
 * Consulta registros de auditoría (más recientes primero)
 */
function getAuditoria(params) {
  const sheet = getSheet(CONFIG.SHEETS.AUDITORIA);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const result = [];

  const limit = parseInt(params.limit) || 100;
  let count = 0;

  // Obtener desde el final (más recientes primero)
  for (let i = data.length - 1; i >= 1 && count < limit; i--) {
    const row = data[i];
    if (!row[CONFIG.COLS.AUDITORIA.TIMESTAMP]) continue;

    // Aplicar filtros
    if (params.email && row[CONFIG.COLS.AUDITORIA.EMAIL] !== params.email) continue;
    if (params.accion && row[CONFIG.COLS.AUDITORIA.ACCION] !== params.accion) continue;

    result.push(rowToObject(headers, row));
    count++;
  }

  return { success: true, data: result, count: result.length };
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

/**
 * Obtiene estadísticas del dashboard para un año.
 * Solo relevamientos CERRADOS.
 */
function getDashboardStats(params) {
  const year = params.year || new Date().getFullYear();

  // Obtener solo relevamientos CERRADOS para el dashboard
  const allCerrados = getRelevamientos({
    year: year,
    estado: CONFIG.ESTADOS_RELEVAMIENTO.CERRADO
  });

  if (!allCerrados.success) return allCerrados;

  // Separar por tipo
  const mensualesRaw = allCerrados.data.filter(function (r) { return r.Tipo === 'Mensual'; });
  const especialesRaw = allCerrados.data.filter(function (r) { return r.Tipo === 'Especial'; });

  // Ordenar por fecha
  mensualesRaw.sort(function (a, b) { return new Date(a.FechaInicio) - new Date(b.FechaInicio); });
  especialesRaw.sort(function (a, b) { return new Date(a.FechaInicio) - new Date(b.FechaInicio); });

  // Mapear datos para el frontend
  function mapRelData(r) {
    return {
      id: r.ID || '',
      nombre: r.Nombre || '',
      fechaInicio: r.FechaInicio || '',
      fechaFin: r.FechaFin || '',
      mes: r.FechaInicio ? new Date(r.FechaInicio).getMonth() + 1 : 0,
      ohTotal: Number(r.OHTotal) || 0,
      ohMin: Number(r.OHMin) || 0,
      ohMax: Number(r.OHMax) || 0,
      ohModa: Number(r.OHModa) || 0,
      cantidadRelevados: Number(r.CantidadRelevados) || 0
    };
  }

  const dataMensual = mensualesRaw.map(mapRelData);
  const dataEspecial = especialesRaw.map(mapRelData);

  // Calcular promedios anuales
  const allOH = dataMensual.concat(dataEspecial).map(function (r) { return r.ohTotal; }).filter(function (v) { return v > 0; });
  const avgOHTotal = allOH.length > 0
    ? allOH.reduce(function (sum, v) { return sum + v; }, 0) / allOH.length
    : 0;

  return {
    success: true,
    year: year,
    mensuales: dataMensual,
    especiales: dataEspecial,
    resumen: {
      cantidadMensuales: dataMensual.length,
      cantidadEspeciales: dataEspecial.length,
      promedioOHAnual: parseFloat(avgOHTotal.toFixed(1))
    }
  };
}
