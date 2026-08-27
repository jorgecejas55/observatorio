import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { esSoloCarga } from '@/lib/permisos'
import type { SessionUser } from '@/lib/permisos'
import TablaRegistros from '@/components/atractivos/TablaRegistros'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'

interface Props {
  params: Promise<{ atractivo: string }>
}

export default async function ActividadesPage({ params }: Props) {
  const { atractivo } = await params
  const session = await auth()
  // Rol 'cargador': sin gestión de actividades, redirige a la pantalla de carga.
  if (esSoloCarga(session?.user as SessionUser)) {
    redirect(`/ocio/ingresos/${atractivo}/cargar`)
  }
  return <TablaRegistros atractivo={atractivo as AtractivoConIngresos} tipo="actividad" />
}
