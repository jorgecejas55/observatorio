'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useMemo, useState } from 'react'
import { tieneAcceso } from '@/lib/permisos'
import {
  anioDe,
  filtrarInformes,
  relevamientosSinInforme,
  type FiltrosListado,
} from '@/lib/informes-auto/listado'
import type { EstadoInforme, TipoInforme } from '@/lib/informes-auto/types'
import ListosParaGenerar from './_components/ListosParaGenerar'
import TablaInformes, { ETIQUETAS_TIPO } from './_components/TablaInformes'
import { useListadoInformes } from './_components/useListadoInformes'

const ESTADOS: { valor: EstadoInforme; etiqueta: string }[] = [
  { valor: 'borrador', etiqueta: 'Borrador' },
  { valor: 'publicado', etiqueta: 'Publicado' },
  { valor: 'cambios-sin-publicar', etiqueta: 'Cambios sin publicar' },
]

/** Listado de informes generados. Crear un informe va a /admin/informes-auto/nuevo. */
export default function InformesAutoListadoPage() {
  const { data: session, status } = useSession()
  const habilitado = status === 'authenticated'
  const { informes, relevamientos, cargando, error } = useListadoInformes(habilitado)
  const [filtros, setFiltros] = useState<FiltrosListado>({ tipo: '', anio: null, estado: '' })

  const anios = useMemo(() => [...new Set(informes.map(anioDe))].sort((a, b) => b - a), [informes])
  const visibles = useMemo(() => filtrarInformes(informes, filtros), [informes, filtros])
  const pendientes = useMemo(
    () => (cargando ? [] : relevamientosSinInforme(relevamientos, informes)),
    [cargando, relevamientos, informes],
  )

  if (status === 'loading') {
    return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
  }
  if (!session?.user) redirect('/login')
  if (!tieneAcceso(session.user, 'informes-auto')) redirect('/sin-acceso')

  const cambiarFiltro = (cambio: Partial<FiltrosListado>) => setFiltros(prev => ({ ...prev, ...cambio }))

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="section-title mb-1">
            <i className="fa-solid fa-robot text-primary mr-2" />
            Agente de Informes — Ocupación Hotelera
          </h2>
          <p className="text-text-secondary text-sm">
            Informes estadísticos generados a partir de los relevamientos de ocupación hotelera.
          </p>
        </div>
        <Link href="/admin/informes-auto/nuevo" className="btn-primary text-sm whitespace-nowrap">
          <i className="fa-solid fa-plus mr-1.5" aria-hidden="true" />
          Crear informe
        </Link>
      </div>

      <ListosParaGenerar relevamientos={pendientes} />

      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h3 className="font-bold text-text-primary mr-auto flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-text-secondary" />
            Informes generados
          </h3>
          <select
            className="input text-xs py-1.5 w-auto"
            value={filtros.tipo}
            onChange={e => cambiarFiltro({ tipo: e.target.value as TipoInforme | '' })}
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos los tipos</option>
            {(Object.keys(ETIQUETAS_TIPO) as TipoInforme[]).map(t => (
              <option key={t} value={t}>{ETIQUETAS_TIPO[t]}</option>
            ))}
          </select>
          <select
            className="input text-xs py-1.5 w-auto"
            value={filtros.anio ?? ''}
            onChange={e => cambiarFiltro({ anio: e.target.value ? Number(e.target.value) : null })}
            aria-label="Filtrar por año"
          >
            <option value="">Todos los años</option>
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            className="input text-xs py-1.5 w-auto"
            value={filtros.estado}
            onChange={e => cambiarFiltro({ estado: e.target.value as EstadoInforme | '' })}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
          </select>
        </div>

        {cargando ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
            <i className="fa-solid fa-spinner fa-spin text-primary" />
            Cargando informes guardados...
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 py-4">
            <i className="fa-solid fa-circle-exclamation mr-1.5" />
            {error}
          </p>
        ) : (
          <TablaInformes informes={visibles} />
        )}
      </div>
    </div>
  )
}
