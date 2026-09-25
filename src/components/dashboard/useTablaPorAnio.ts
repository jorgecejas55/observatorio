'use client'

import { useMemo, useState } from 'react'
import { aniosDisponibles, ordenarRecientePrimero, type ConPeriodo } from '@/lib/indicadores/periodos'

/**
 * Paginación por año para las tablas del dashboard: arranca en el año más
 * reciente y ordena las filas de lo más nuevo a lo más viejo.
 */
export function useTablaPorAnio<T extends ConPeriodo>(lista: T[]) {
  const anios = useMemo(() => aniosDisponibles(lista), [lista])
  const [anioElegido, setAnio] = useState<number | null>(null)

  // Si todavía no se eligió (o el año elegido desapareció), usar el más reciente
  const anio = anioElegido !== null && anios.includes(anioElegido) ? anioElegido : anios[0] ?? null

  const filas = useMemo(
    () => ordenarRecientePrimero(lista.filter(item => item.ano === anio)),
    [lista, anio],
  )

  return { anio, setAnio, anios, filas }
}
