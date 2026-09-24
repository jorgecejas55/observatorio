import { requireSesion } from '@/lib/permisos'

export default async function EncuestaCasaCatamarcaLayout({ children }: { children: React.ReactNode }) {
  await requireSesion()
  return children
}
