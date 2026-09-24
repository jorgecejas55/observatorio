import { requireSesion } from '@/lib/permisos'

export default async function RegistroEventoLayout({ children }: { children: React.ReactNode }) {
  await requireSesion()
  return children
}
