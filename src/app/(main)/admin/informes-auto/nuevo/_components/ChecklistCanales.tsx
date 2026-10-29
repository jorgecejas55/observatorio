'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { describirFaltante } from '@/lib/informes-auto/canales-digitales-calculo'
import { ItemFuente } from './ChecklistFuentes'

interface EstadoCanales {
  faltantes: string[]
  catuUltimaSync: string | null
}

function formatearSync(iso: string | null): string {
  if (!iso) return 'sin dato de sincronización'
  return `última sincronización ${new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Catamarca',
  })}`
}

/** Ítems del checklist para informes MENSUAL: canales digitales cargados del mes. */
export default function ChecklistCanales({ fechaInicio }: { fechaInicio: string }) {
  const [estado, setEstado] = useState<EstadoCanales | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setEstado(null)
    setError(false)
    const anio = fechaInicio.slice(0, 4)
    const mes = Number(fechaInicio.slice(5, 7))
    fetch(`/api/informes-auto/fuentes-digitales?anio=${anio}&mes=${mes}`)
      .then(async res => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.success) throw new Error(json.error ?? `Error ${res.status}`)
        setEstado(json.data)
      })
      .catch(err => {
        console.error('[checklist canales]', err)
        setError(true)
      })
  }, [fechaInicio])

  if (error) return <ItemFuente estado="aviso" texto="Canales digitales: no se pudieron consultar" />
  if (!estado) return <ItemFuente estado="cargando" texto="Canales digitales del mes: consultando…" />

  return (
    <>
      {estado.faltantes.length === 0 ? (
        <ItemFuente estado="ok" texto="Canales digitales: web, Instagram, Facebook y Catu con datos del mes" />
      ) : (
        estado.faltantes.map(f => (
          <ItemFuente key={f} estado="falta" texto={describirFaltante(f)}>
            {!f.startsWith('catu') && (
              <Link href="/admin/metricas" target="_blank" className="ml-1 text-primary hover:underline">
                cargar en Métricas
              </Link>
            )}
          </ItemFuente>
        ))
      )}
      <ItemFuente estado="info" texto={`Catu: ${formatearSync(estado.catuUltimaSync)}`} />
    </>
  )
}
