import { requireSesion } from '@/lib/permisos'

export default async function CargaIndicadoresLayout({ children }: { children: React.ReactNode }) {
  await requireSesion()
  return children
}
