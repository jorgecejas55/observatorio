import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import MetricasClient from './_components/MetricasClient'

export default async function AdminMetricasPage() {
  const session = await auth()

  if (!session) redirect('/login')

  return <MetricasClient />
}
