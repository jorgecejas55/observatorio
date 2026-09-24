import { requireSesion } from '@/lib/permisos'

export default async function EncuestaTuristaLayout({ children }: { children: React.ReactNode }) {
  await requireSesion()
  return children
}
