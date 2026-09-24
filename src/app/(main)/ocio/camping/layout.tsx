import { requireSesion } from '@/lib/permisos'

export default async function CampingLayout({ children }: { children: React.ReactNode }) {
  await requireSesion()
  return children
}
