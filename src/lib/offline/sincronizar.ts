import { listarPendientes, eliminarPendiente, incrementarIntentos, MAX_INTENTOS_SYNC } from './queue'

export interface ResultadoSync {
  sincronizados: number
  /** Registros que respondieron con error de servidor/validación (no de red) tras agotar reintentos. */
  descartados: number
}

/**
 * Recorre la cola y reintenta cada POST contra el mismo endpoint del form online.
 * Corta apenas un intento falla por falta de red (no tiene sentido seguir
 * probando el resto en la misma pasada); un error de servidor sí sigue con
 * el próximo pendiente. El id_local viaja en el payload — el anti-duplicado
 * bajo LockService del lado GAS hace seguro reintentar el mismo registro.
 */
export async function sincronizarPendientes(): Promise<ResultadoSync> {
  const pendientes = await listarPendientes()
  let sincronizados = 0
  let descartados = 0

  for (const registro of pendientes) {
    try {
      const res = await fetch(registro.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro.payload),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        await eliminarPendiente(registro.id)
        sincronizados++
        continue
      }
      // Error de servidor/validación: no es de red, no lo vuelve a bloquear todo.
      if (registro.intentos + 1 >= MAX_INTENTOS_SYNC) {
        await eliminarPendiente(registro.id)
        descartados++
      } else {
        await incrementarIntentos(registro.id)
      }
    } catch {
      // Sigue sin red: dejamos este y el resto de la cola para el próximo intento.
      break
    }
  }

  return { sincronizados, descartados }
}
