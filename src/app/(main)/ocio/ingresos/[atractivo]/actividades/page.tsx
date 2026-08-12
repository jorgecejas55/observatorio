'use client'

import { useParams } from 'next/navigation'
import TablaRegistros from '@/components/atractivos/TablaRegistros'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'

export default function ActividadesPage() {
  const params = useParams()
  const atractivo = String(params.atractivo) as AtractivoConIngresos
  return <TablaRegistros atractivo={atractivo} tipo="actividad" />
}