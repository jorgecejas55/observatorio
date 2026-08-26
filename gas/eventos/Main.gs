// ==============================================================================
// MAIN.GS — Router del módulo de Registro de Eventos Turísticos.
//
// GET  = lecturas   (getEventos, login, getDashboardEventos)
// POST = escrituras (createEvento, updateEvento, deleteEvento, createUser)
//
// IMPORTANTE: este archivo debe ser el ÚNICO en el proyecto de Apps Script que
// define doGet/doPost. Si en el editor online quedó una copia vieja de este
// código en otro archivo, borrarla — declaraciones duplicadas de doGet/doPost/
// SHEETS en el mismo proyecto rompen TODO el Web App (V8 no tolera redeclarar
// `var`/`const` de nivel superior entre archivos sin pisarse de forma
// impredecible). Un solo proyecto = un solo dueño de cada función/constante.
// ==============================================================================

function doGet(e) {
  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(10000);
  if (!gotLock) {
    return returnJSON({ success: false, message: 'El servidor está ocupado, reintentá en unos segundos.' });
  }

  try {
    const params = e.parameter || {};
    const action = params.action;

    if (action === 'getEventos') {
      return returnJSON({ success: true, data: getSheetData(SHEETS.EVENTOS) });
    }

    if (action === 'login') {
      return returnJSON(handleLogin(params.email, params.password));
    }

    if (action === 'getDashboardEventos') {
      return handleDashboardEventos(params);
    }

    return returnJSON({ success: false, message: 'Acción no reconocida' });

  } catch (error) {
    Logger.log('Error en doGet: ' + error.toString());
    return returnJSON({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(10000);
  if (!gotLock) {
    return returnJSON({ success: false, message: 'El servidor está ocupado, reintentá en unos segundos.' });
  }

  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    if (action === 'createEvento') {
      return returnJSON({ success: true, data: createRow(SHEETS.EVENTOS, params.data) });
    }

    if (action === 'updateEvento') {
      return returnJSON({ success: true, data: updateRow(SHEETS.EVENTOS, params.id, params.data) });
    }

    if (action === 'deleteEvento') {
      deleteRow(SHEETS.EVENTOS, params.id);
      return returnJSON({ success: true, message: 'Eliminado' });
    }

    if (action === 'createUser') {
      return returnJSON({ success: true, data: createRow(SHEETS.USUARIOS, params.data) });
    }

    return returnJSON({ success: false, message: 'Acción POST no reconocida' });

  } catch (error) {
    Logger.log('Error en doPost: ' + error.toString());
    return returnJSON({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}
