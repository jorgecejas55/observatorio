import { requireSesion } from '@/lib/permisos'

export default async function EncuestaDemandaLayout({ children }: { children: React.ReactNode }) {
  await requireSesion()
  return children
}
