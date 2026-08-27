import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { esSoloCarga } from '@/lib/permisos'
import type { SessionUser } from '@/lib/permisos'
import RegistrosClient from '@/components/atractivos/RegistrosClient'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'

interface Props {
  params: Promise<{ atractivo: string }>
}

export default async function RegistrosPage({ params }: Props) {
  const { atractivo } = await params
  const session = await auth()
  // Rol 'cargador': sin gestión de registros, redirige a la pantalla de carga.
  if (esSoloCarga(session?.user as SessionUser)) {
    redirect(`/ocio/ingresos/${atractivo}/cargar`)
  }
  return <RegistrosClient atractivo={atractivo as AtractivoConIngresos} />
}
