import type { Informe } from './types'

/**
 * Obtiene todos los informes desde Google Apps Script.
 * Se cachea en el servidor de Next.js y se revalida cada hora.
 * Solo usar en Server Components — no en 'use client'.
 */
export async function getInformes(): Promise<Informe[]> {
  const SCRIPT_URL = process.env.INFORMES_SCRIPT_URL

  if (!SCRIPT_URL) {
    console.error('[getInformes] INFORMES_SCRIPT_URL no definida')
    return []
  }

  try {
    const res = await fetch(`${SCRIPT_URL}?action=listar`, {
      next: { revalidate: 3600 }, // revalida cada 1 hora
    })

    if (!res.ok) {
      console.error('[getInformes] respuesta no OK:', res.status)
      return []
    }

    const json = await res.json()
    return json.data ?? []
  } catch (err) {
    console.error('[getInformes] error:', err)
    return []
  }
}
