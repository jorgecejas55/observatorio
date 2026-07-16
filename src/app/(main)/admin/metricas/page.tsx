import { requireAccesoPage } from '@/lib/permisos'
import MetricasClient from './_components/MetricasClient'

export default async function AdminMetricasPage() {
  await requireAccesoPage('metricas')

  return <MetricasClient />
}
