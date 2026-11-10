/**
 * Imagen que muestran WhatsApp, Facebook y otros al compartir un link del sitio.
 * Se genera en el build con el logo del Observatorio (sin dependencias extra).
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'

export const alt = 'Observatorio de Turismo Municipal — San Fernando del Valle de Catamarca'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const AZUL_LOGO = '#1e79b8'

export default async function OpenGraphImage() {
  const logo = await readFile(path.join(process.cwd(), 'public/logos/observatorio.png'))
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#ffffff',
          borderBottom: `24px solid ${AZUL_LOGO}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo acepta <img> */}
        <img src={logoSrc} width={836} height={274} alt="" />
        <div style={{ marginTop: 48, fontSize: 36, color: '#374151', display: 'flex' }}>
          Estadísticas e informes de turismo
        </div>
        <div style={{ marginTop: 8, fontSize: 36, color: '#374151', display: 'flex' }}>
          San Fernando del Valle de Catamarca
        </div>
      </div>
    ),
    size,
  )
}
