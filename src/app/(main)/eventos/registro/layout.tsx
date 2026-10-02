import { requireAccesoPage } from '@/lib/permisos'

export default async function RegistroEventoLayout({ children }: { children: React.ReactNode }) {
  await requireAccesoPage('eventos')
  return children
}
