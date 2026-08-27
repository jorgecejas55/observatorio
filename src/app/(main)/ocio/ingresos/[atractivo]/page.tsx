import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { esSoloCarga } from '@/lib/permisos'
import type { SessionUser } from '@/lib/permisos'
import DashboardAtractivo from '@/components/atractivos/DashboardAtractivo'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'

interface Props {
  params: Promise<{ atractivo: string }>
}

export default async function AtractivoDashboardPage({ params }: Props) {
  const { atractivo } = await params
  const session = await auth()
  // Rol 'cargador': sin dashboard, redirige directo a la pantalla de carga.
  if (esSoloCarga(session?.user as SessionUser)) {
    redirect(`/ocio/ingresos/${atractivo}/cargar`)
  }
  return <DashboardAtractivo atractivo={atractivo as AtractivoConIngresos} />
}