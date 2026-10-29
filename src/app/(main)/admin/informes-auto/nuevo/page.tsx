import { Suspense } from 'react'
import FormularioNuevoInforme from './_components/FormularioNuevoInforme'

// useSearchParams (preselección ?relevamiento=ID) exige un límite de Suspense
export default function NuevoInformePage() {
  return (
    <Suspense fallback={<div className="h-96 bg-gray-100 rounded-xl animate-pulse" />}>
      <FormularioNuevoInforme />
    </Suspense>
  )
}
