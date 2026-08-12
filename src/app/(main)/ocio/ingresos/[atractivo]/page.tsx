'use client'

import { useParams } from 'next/navigation'
import DashboardAtractivo from '@/components/atractivos/DashboardAtractivo'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'

export default function AtractivoDashboardPage() {
  const params = useParams()
  const atractivo = String(params.atractivo) as AtractivoConIngresos
  return <DashboardAtractivo atractivo={atractivo} />
}