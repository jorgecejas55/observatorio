'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useOffline } from '@/contexts/OfflineContext'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'
import type { IngresoAtractivo, ActividadEspecialAtractivo } from '@/lib/types'

interface Props {
  atractivo: AtractivoConIngresos
  /** se incrementa tras cada alta para forzar el refetch */
  refreshKey: number
}

function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MisCargasHoy({ atractivo, refreshKey }: Props) {
  const { data: session } = useSession()
  const { pendientes } = useOffline()
  const email = session?.user?.email?.toLowerCase()

  const [ingresos, setIngresos] = useState<IngresoAtractivo[]>([])
  const [actividades, setActividades] = useState<ActividadEspecialAtractivo[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    if (!email) return
    setLoading(true)
    const hoy = hoyISO()
    try {
      const [resIngresos, resActividades] = await Promise.all([
        fetch(`/api/ocio/ingresos/atractivos/${atractivo}/ingresos?desde=${hoy}&hasta=${hoy}&limit=200`),
        fetch(`/api/ocio/ingresos/atractivos/${atractivo}/actividades?desde=${hoy}&hasta=${hoy}&limit=200`),
      ])
      const [dataIngresos, dataActividades] = await Promise.all([resIngresos.json(), resActividades.json()])

      const soloMios = <T extends { usuario_registro?: string }>(arr: T[] | undefined) =>
        (arr || []).filter((r) => r.usuario_registro?.toLowerCase() === email)

      setIngresos(dataIngresos.success ? soloMios<IngresoAtractivo>(dataIngresos.data) : [])
      setActividades(dataActividades.success ? soloMios<ActividadEspecialAtractivo>(dataActividades.data) : [])
    } catch {
      setIngresos([])
      setActividades([])
    } finally {
      setLoading(false)
    }
  }, [atractivo, email])

  useEffect(() => {
    cargar()
  }, [cargar, refreshKey])

  if (!email) return null

  const pendientesAtractivo = pendientes.filter((p) => p.atractivo === atractivo)
  const pendientesIngreso = pendientesAtractivo.filter((p) => p.tipo === 'ingreso')
  const pendientesActividad = pendientesAtractivo.filter((p) => p.tipo === 'actividad')

  const total = ingresos.length + actividades.length + pendientesAtractivo.length

  return (
    <div className="card p-6 space-y-4">
      <h3 className="text-lg font-bold text-text-primary text-center">Mis cargas de hoy</h3>

      {loading ? (
        <p className="text-sm text-text-secondary text-center">Cargando…</p>
      ) : total === 0 ? (
        <p className="text-sm text-text-secondary text-center">Todavía no cargaste nada hoy.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {pendientesIngreso.map((p) => (
            <li key={p.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <span>
                <i className="fa-solid fa-arrow-right-to-bracket text-primary mr-2" />
                {String(p.payload.tipo_visitante)} · {String(p.payload.cantidad_personas)} persona
                {p.payload.cantidad_personas === 1 ? '' : 's'} · {String(p.payload.motivo)}
              </span>
              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                Pendiente de sincronizar
              </span>
            </li>
          ))}
          {ingresos.map((r) => (
            <li key={r.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <span>
                <i className="fa-solid fa-arrow-right-to-bracket text-primary mr-2" />
                {r.tipo_visitante} · {r.cantidad_personas} persona{r.cantidad_personas === 1 ? '' : 's'} · {r.motivo}
              </span>
              <span className="text-text-secondary whitespace-nowrap">{r.fecha_hora_registro?.substring(11, 16)}</span>
            </li>
          ))}
          {pendientesActividad.map((p) => (
            <li key={p.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <span>
                <i className="fa-solid fa-star text-primary mr-2" />
                {String(p.payload.nombre_actividad)} · {String(p.payload.cantidad_total)} persona
                {p.payload.cantidad_total === 1 ? '' : 's'}
              </span>
              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                Pendiente de sincronizar
              </span>
            </li>
          ))}
          {actividades.map((a) => (
            <li key={a.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <span>
                <i className="fa-solid fa-star text-primary mr-2" />
                {a.nombre_actividad} · {a.cantidad_total} persona{a.cantidad_total === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
