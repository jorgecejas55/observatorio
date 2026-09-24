import { requireSesion } from '@/lib/permisos'

export default async function CalidadLayout({ children }: { children: React.ReactNode }) {
  await requireSesion()
  return children
}
