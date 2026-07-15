// ==============================================================================
// MAIN.GS — Punto de entrada de la API OBS_Admin (permisos de usuarios)
// Protegido por apiKey (compartida con Next.js vía variable de entorno).
// ==============================================================================

/**
 * Maneja las peticiones GET
 */
function doGet(e) {
  try {
    const path = e.parameter.path || '';
    const params = e.parameter || {};

    // Validar apiKey
    try {
      validateApiKey(params.apiKey);
    } catch (err) {
      return returnJSON({ success: false, error: err.message });
    }

    // Routing para GET
    const routes = {
      'usuarios/list': function () { return getUsuarios(); },
      'usuarios/get': function () { return getUsuarioByEmail(params.email); },

      'system/health': function () { return { success: true, status: 'OK', timestamp: new Date() }; }
    };

    // Ejecutar handler
    const handler = routes[path];
    if (!handler) {
      return returnJSON({
        success: false,
        error: 'Ruta no encontrada: ' + path
      });
    }

    const result = handler();
    return returnJSON(result);

  } catch (error) {
    Logger.log('ERROR en GET: ' + error.toString());
    return returnJSON({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Maneja las peticiones POST
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const path = body.path || '';
    const data = body.data || {};

    // Validar apiKey
    try {
      validateApiKey(body.apiKey);
    } catch (err) {
      return returnJSON({ success: false, error: err.message });
    }

    // Routing para POST
    const routes = {
      'usuarios/upsert': function () { return upsertUsuario(data); },
      'usuarios/delete': function () { return desactivarUsuario(data.email, data.actorEmail); }
    };

    // Ejecutar handler
    const handler = routes[path];
    if (!handler) {
      return returnJSON({
        success: false,
        error: 'Ruta POST no encontrada: ' + path
      });
    }

    const result = handler();
    return returnJSON(result);

  } catch (error) {
    Logger.log('ERROR en POST: ' + error.toString());
    return returnJSON({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Retorna respuesta JSON con headers apropiados
 */
function returnJSON(data) {
  // Asegurar que siempre haya un campo success
  if (typeof data.success === 'undefined') {
    data.success = true;
  }

  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
