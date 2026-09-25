'use client'

import { useEffect, useState } from 'react'
import type { RegistroMaestro, ValoresMaestra } from '@/lib/informes-auto/types'

interface PreviaPublicacion {
  nuevos: ValoresMaestra
  actual: RegistroMaestro | null
  posiblesDuplicados: RegistroMaestro[]
  maestraDisponible: boolean
}

interface Props {
  informeId: string
  publicando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

type Fila = { etiqueta: string; actual: number | null; nuevo: number; formato: (n: number) => string }

const formatoPorcentaje = (n: number) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`
const formatoDias = (n: number) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })} días`
const formatoEntero = (n: number) => Math.round(n).toLocaleString('es-AR')
const formatoPesos = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`

function filasComparacion(previa: PreviaPublicacion): Fila[] {
  const { nuevos, actual } = previa
  return [
    { etiqueta: 'Ocupación hotelera', actual: actual?.oh ?? null, nuevo: nuevos.oh, formato: formatoPorcentaje },
    { etiqueta: 'Estadía promedio', actual: actual?.estadiaProm ?? null, nuevo: nuevos.estadiaProm, formato: formatoDias },
    { etiqueta: 'Visitantes', actual: actual?.visitantes ?? null, nuevo: nuevos.visitantes, formato: formatoEntero },
    { etiqueta: 'Impacto económico', actual: actual?.impacto ?? null, nuevo: nuevos.impacto, formato: formatoPesos },
  ]
}

function TablaComparacion({ previa }: { previa: PreviaPublicacion }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-secondary border-b border-gray-200">
          <th className="py-2 font-medium">Indicador</th>
          <th className="py-2 font-medium">Hoy en el dashboard</th>
          <th className="py-2 font-medium">Quedaría</th>
        </tr>
      </thead>
      <tbody>
        {filasComparacion(previa).map(f => {
          const cambia = f.actual === null || f.formato(f.actual) !== f.formato(f.nuevo)
          return (
            <tr key={f.etiqueta} className="border-b border-gray-100">
              <td className="py-2">{f.etiqueta}</td>
              <td className="py-2 text-text-secondary">{f.actual === null ? '—' : f.formato(f.actual)}</td>
              <td className={`py-2 ${cambia ? 'font-semibold text-primary' : ''}`}>{f.formato(f.nuevo)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function AvisoDuplicados({ duplicados }: { duplicados: RegistroMaestro[] }) {
  if (duplicados.length === 0) return null
  return (
    <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
      <p className="font-medium mb-1">
        <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
        En el dashboard ya hay registros con nombre parecido este año:
      </p>
      <ul className="list-disc ml-6">
        {duplicados.map(d => <li key={d.id}>{d.nombre} ({d.mes.toLowerCase()})</li>)}
      </ul>
      <p className="mt-1">Si es el mismo evento con otro nombre, al publicar va a quedar duplicado. Conviene usar el mismo nombre.</p>
    </div>
  )
}

/** Confirmación de publicación: muestra qué cambia en el dashboard antes de publicar. */
export default function ModalPublicacion({ informeId, publicando, onConfirmar, onCancelar }: Props) {
  const [previa, setPrevia] = useState<PreviaPublicacion | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/informes-auto/${informeId}/previa-publicacion`)
      .then(res => res.json())
      .then(json => json.success ? setPrevia(json.data) : setError(json.error ?? 'No se pudo armar la vista previa'))
      .catch(() => setError('Error de conexión al armar la vista previa'))
  }, [informeId])

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-publicar">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 md:p-6 max-h-[90vh] overflow-y-auto">
        <h2 id="titulo-publicar" className="text-lg font-bold text-text-primary mb-1">Publicar informe</h2>
        <p className="text-sm text-text-secondary mb-4">
          Al publicar, estos valores pasan al dashboard público.
        </p>

        {!previa && !error && (
          <p className="text-sm text-text-secondary py-6 text-center">
            <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true" />Consultando el dashboard…
          </p>
        )}
        {error && <p className="text-sm text-red-700 py-2">{error}</p>}
        {previa && (
          <>
            {!previa.actual && (
              <p className="text-sm text-text-secondary mb-2">
                {previa.maestraDisponible ? 'Es un registro nuevo en el dashboard.' : 'No se pudo leer el dashboard; se muestran solo los valores nuevos.'}
              </p>
            )}
            <TablaComparacion previa={previa} />
            <AvisoDuplicados duplicados={previa.posiblesDuplicados} />
          </>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancelar} disabled={publicando} className="btn-outline text-sm">Cancelar</button>
          <button
            onClick={onConfirmar}
            disabled={publicando || (!previa && !error)}
            className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className={`fa-solid ${publicando ? 'fa-spinner fa-spin' : 'fa-upload'}`} aria-hidden="true" />
            {publicando ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
