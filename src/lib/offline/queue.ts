/**
 * Cola offline (IndexedDB) para altas de ingresos/actividades cargadas sin
 * conexión en Casa de la Puna / Pueblo Perdido (Fase B). Solo cubre creación
 * (POST) — las ediciones requieren conexión, las hace el responsable, no el
 * guía en el campo.
 */

export interface RegistroPendiente {
  /** = id_local del registro; también es la clave primaria del store (idempotencia). */
  id: string
  tipo: 'ingreso' | 'actividad'
  atractivo: string
  url: string
  payload: Record<string, unknown>
  creado_en: string
  intentos: number
}

const DB_NAME = 'observatorio-offline'
const STORE_NAME = 'pendientes'
const DB_VERSION = 1

export const MAX_INTENTOS_SYNC = 5

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function encolar(
  registro: Pick<RegistroPendiente, 'id' | 'tipo' | 'atractivo' | 'url' | 'payload'>,
): Promise<void> {
  const db = await abrirDB()
  const completo: RegistroPendiente = { ...registro, creado_en: new Date().toISOString(), intentos: 0 }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(completo)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function listarPendientes(): Promise<RegistroPendiente[]> {
  const db = await abrirDB()
  const registros = await new Promise<RegistroPendiente[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result as RegistroPendiente[])
    request.onerror = () => reject(request.error)
  })
  db.close()
  return registros.sort((a, b) => a.creado_en.localeCompare(b.creado_en))
}

export async function eliminarPendiente(id: string): Promise<void> {
  const db = await abrirDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function incrementarIntentos(id: string): Promise<void> {
  const db = await abrirDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)
    request.onsuccess = () => {
      const registro = request.result as RegistroPendiente | undefined
      if (registro) store.put({ ...registro, intentos: registro.intentos + 1 })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}
