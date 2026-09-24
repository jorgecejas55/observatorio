import { requireSesion } from '@/lib/permisos'

export default async function IngresosAtractivosLayout({ children }: { children: React.ReactNode }) {
  await requireSesion()
  return children
}
