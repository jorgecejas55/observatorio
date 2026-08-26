// ==============================================================================
// AUTH.GS — Login y verificación de usuarios contra la hoja "usuarios".
// ==============================================================================

/** Verifica credenciales y arma la respuesta de login (incluye touch de last_login). */
function handleLogin(email, password) {
  const user = verifyUser(email, password);
  if (!user) {
    return { success: false, message: 'Credenciales inválidas' };
  }

  try {
    updateRow(SHEETS.USUARIOS, user.id, { last_login: new Date().toISOString() });
  } catch (err) {
    Logger.log('No se pudo actualizar last_login: ' + err.toString());
  }

  return { success: true, user: user };
}

/** Busca el usuario por email/password y devuelve los datos sin el password. */
function verifyUser(email, password) {
  const users = getSheetData(SHEETS.USUARIOS);
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return null;

  const safeUser = {};
  Object.keys(user).forEach(key => {
    if (key !== 'password') safeUser[key] = user[key];
  });
  return safeUser;
}
