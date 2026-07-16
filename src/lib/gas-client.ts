/**
 * Cliente GAS reutilizable — extraído del patrón de ocupacion-service.ts.
 *
 * Uso:
 *   const obsAdmin = createGasClient(process.env.OBS_ADMIN_GAS_URL!, process.env.OBS_ADMIN_GAS_API_KEY!)
 *   const data = await obsAdmin.get('usuarios/get', { email: 'x@y.com' })
 *   const result = await obsAdmin.post('usuarios/upsert', { email, nombre, rol, modulos, activo, actorEmail })
 */

/**
 * Parsea la respuesta del GAS como JSON. Si recibe HTML (página de login/error de
 * Apps Script, que viene con status 200), lanza error legible en vez de "Unexpected token '<'".
 */
async function parseGasResponse(res: Response, ctx: string) {
  const body = await res.text()
  const looksHtml =
    body.trimStart().startsWith('<') ||
    (res.headers.get('content-type') || '').includes('text/html')

  if (looksHtml) {
    const snippet = body.replace(/\s+/g, ' ').trim().slice(0, 200)
    throw new Error(
      `GAS ${ctx}: el backend devolvió HTML en lugar de JSON (status ${res.status}). ` +
        `Causa típica: la URL es /dev en vez de /exec, o el deployment no es accesible como ` +
        `"Cualquiera" (Ejecutar como: Yo / Quién tiene acceso: Cualquiera), o no se volvió a ` +
        `desplegar tras cambiar el código. Inicio de la respuesta: "${snippet}"`,
    )
  }

  if (!res.ok) {
    throw new Error(`GAS ${ctx}: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`)
  }

  try {
    return JSON.parse(body)
  } catch {
    throw new Error(`GAS ${ctx}: respuesta no es JSON válido — "${body.slice(0, 200)}"`)
  }
}

export interface GasClient {
  get(path: string, params?: Record<string, string>): Promise<any>
  post(path: string, data: Record<string, unknown>): Promise<any>
}

export function createGasClient(baseUrl: string, apiKey: string): GasClient {
  if (!baseUrl || baseUrl.includes('PENDIENTE')) {
    throw new Error('GAS URL no configurada')
  }

  async function gasGet(path: string, params: Record<string, string> = {}) {
    const url = new URL(baseUrl)
    url.searchParams.set('path', path)
    url.searchParams.set('apiKey', apiKey)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    try {
      const res = await fetch(url.toString(), {
        redirect: 'follow',
        signal: controller.signal,
      })
      return parseGasResponse(res, `GET ${path}`)
    } finally {
      clearTimeout(timeout)
    }
  }

  async function gasPost(path: string, data: Record<string, unknown>) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, path, data }),
        redirect: 'follow',
        signal: controller.signal,
      })
      return parseGasResponse(res, `POST ${path}`)
    } finally {
      clearTimeout(timeout)
    }
  }

  return { get: gasGet, post: gasPost }
}
