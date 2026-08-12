// ==============================================================================
// MAIN.GS — Router del módulo de Ingresos a Atractivos.
// Un solo proyecto GAS multi-atractivo; el aislamiento lo da el RBAC de Next.js
// y la validación de `atractivo` contra la allowlist de Config.gs.
// Protegido por apiKey (PropertiesService) — nunca hardcodeada.
//
// NUNCA se devuelve error.toString() al cliente: se loguea y se responde
// con un mensaje genérico.
// ==============================================================================

function doGet(e) {
  try {
    var params = e.parameter || {};
    var path = params.path || '';

    try {
      validateApiKey(params.apiKey);
    } catch (err) {
      Logger.log('ERROR en GET (api key): ' + err.toString());
      return returnJSON({ success: false, error: 'Error procesando la solicitud' });
    }

    var atractivo = params.atractivo || '';
    if (!atractivoValido(atractivo)) {
      return returnJSON({ success: false, error: 'atractivo_invalido' });
    }

    var routes = {
      'ingresos/list': function () { return getIngresos(atractivo, params); },
      'actividades/list': function () { return getActividades(atractivo, params); },
      'resumen': function () { return getResumen(atractivo); }
    };

    var handler = routes[path];
    if (!handler) {
      return returnJSON({ success: false, error: 'Ruta no encontrada: ' + path });
    }

    return returnJSON(handler());
  } catch (error) {
    Logger.log('ERROR en GET: ' + error.toString());
    return returnJSON({ success: false, error: 'Error procesando la solicitud' });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var path = body.path || '';
    var data = body.data || {};

    try {
      validateApiKey(body.apiKey);
    } catch (err) {
      Logger.log('ERROR en POST (api key): ' + err.toString());
      return returnJSON({ success: false, error: 'Error procesando la solicitud' });
    }

    var atractivo = data.atractivo || '';
    if (!atractivoValido(atractivo)) {
      return returnJSON({ success: false, error: 'atractivo_invalido' });
    }

    var routes = {
      'ingresos/create': function () { return crearIngreso(atractivo, data); },
      'ingresos/update': function () { return actualizarIngreso(atractivo, data); },
      'ingresos/delete': function () { return eliminarIngreso(atractivo, data); },
      'actividades/create': function () { return crearActividad(atractivo, data); },
      'actividades/update': function () { return actualizarActividad(atractivo, data); },
      'actividades/delete': function () { return eliminarActividad(atractivo, data); }
    };

    var handler = routes[path];
    if (!handler) {
      return returnJSON({ success: false, error: 'Ruta POST no encontrada: ' + path });
    }

    return returnJSON(handler());
  } catch (error) {
    Logger.log('ERROR en POST: ' + error.toString());
    return returnJSON({ success: false, error: 'Error procesando la solicitud' });
  }
}

/** Respuesta JSON uniforme. */
function returnJSON(data) {
  if (typeof data.success === 'undefined') {
    data.success = true;
  }
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/** Valida la API key contra PropertiesService del script. */
function validateApiKey(apiKey) {
  var key = getApiKey();
  if (!key) throw new Error('api_key_no_configurada');
  if (!apiKey || apiKey !== key) throw new Error('api_key_invalida');
}