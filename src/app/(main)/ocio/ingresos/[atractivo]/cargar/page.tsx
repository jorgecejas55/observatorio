'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import FormIngreso from '@/components/atractivos/FormIngreso'
import MisCargasHoy from '@/components/atractivos/MisCargasHoy'
import Toast from '@/components/shared/Toast'
import { esSoloCarga } from '@/lib/permisos'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'

export default function CargarIngresoPage() {
  const params = useParams()
  const atractivo = String(params.atractivo) as AtractivoConIngresos
  const { data: session } = useSession()
  const soloCarga = esSoloCarga(session?.user as never)

  const [formKey, setFormKey] = useState(0)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const handleGuardado = (modo?: 'online' | 'offline') => {
    setToast(
      modo === 'offline'
        ? { message: 'Sin conexión: el ingreso quedó guardado en el dispositivo y se sincronizará solo.', type: 'info' }
        : { message: 'Ingreso registrado correctamente', type: 'success' },
    )
    // Remonta el form para limpiarlo y dejar listo el siguiente ingreso
    setFormKey((k) => k + 1)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FormIngreso
        key={formKey}
        atractivo={atractivo}
        onGuardado={handleGuardado}
        onCancelar={() => setFormKey((k) => k + 1)}
      />
      {/* Solo para rol 'cargador': sin acceso a /registros, necesita ver acá su propio control interno del día. */}
      {soloCarga && <MisCargasHoy atractivo={atractivo} refreshKey={formKey} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}