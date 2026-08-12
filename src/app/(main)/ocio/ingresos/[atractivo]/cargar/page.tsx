'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import FormIngreso from '@/components/atractivos/FormIngreso'
import Toast from '@/components/shared/Toast'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'

export default function CargarIngresoPage() {
  const params = useParams()
  const atractivo = String(params.atractivo) as AtractivoConIngresos

  const [formKey, setFormKey] = useState(0)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const handleGuardado = () => {
    setToast({ message: 'Ingreso registrado correctamente', type: 'success' })
    // Remonta el form para limpiarlo y dejar listo el siguiente ingreso
    setFormKey((k) => k + 1)
  }

  return (
    <div className="max-w-2xl">
      <FormIngreso
        key={formKey}
        atractivo={atractivo}
        onGuardado={handleGuardado}
        onCancelar={() => setFormKey((k) => k + 1)}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}