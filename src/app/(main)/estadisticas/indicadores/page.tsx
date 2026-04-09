'use client'

import { useState } from 'react'

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

const ANO_ACTUAL = new Date().getFullYear()

interface FormState {
  ano: string
  mes: string
  oh: string
  estadia_prom: string
}

const EMPTY: FormState = { ano: String(ANO_ACTUAL), mes: '', oh: '', estadia_prom: '' }

export default function CargaIndicadoresPage() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  function set(campo: keyof FormState, valor: string) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setExito('')
    setErrorMsg('')
  }

  function validar(): string | null {
    const ano = parseInt(form.ano)
    if (!form.ano || isNaN(ano) || ano < 2020 || ano > ANO_ACTUAL + 1)
      return 'Ingresá un año válido (2020 – ' + (ANO_ACTUAL + 1) + ')'
    if (!form.mes) return 'Seleccioná el mes'
    const oh = parseFloat(form.oh)
    if (form.oh === '' || isNaN(oh) || oh < 0 || oh > 100)
      return 'La ocupación hotelera debe estar entre 0 y 100'
    const est = parseFloat(form.estadia_prom)
    if (form.estadia_prom === '' || isNaN(est) || est <= 0)
      return 'La estadía promedio debe ser mayor a 0'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validar()
    if (err) { setErrorMsg(err); return }

    setEnviando(true)
    setErrorMsg('')
    setExito('')

    try {
      const res = await fetch('/api/indicadores/carga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ano: parseInt(form.ano),
          mes: form.mes,
          oh: parseFloat(form.oh),
          estadia_prom: parseFloat(form.estadia_prom),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setExito(`Indicadores de ${form.mes} ${form.ano} registrados correctamente.`)
        setForm(prev => ({ ...EMPTY, ano: prev.ano }))
      } else {
        setErrorMsg(data.error ?? 'Error al guardar los datos')
      }
    } catch {
      setErrorMsg('No se pudo conectar con el servidor')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="section-title">Carga de Indicadores Mensuales</h2>
        <p className="text-text-secondary text-sm -mt-6">
          Ocupación hotelera y estadía promedio · Planilla de estadísticas del destino
        </p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">

          {exito && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
              <i className="fa-solid fa-circle-check" />
              {exito}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation" />
              {errorMsg}
            </div>
          )}

          {/* Año y Mes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Año <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.ano}
                onChange={e => set('ano', e.target.value)}
                min={2020}
                max={ANO_ACTUAL + 1}
                className="input"
                placeholder="Ej: 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Mes <span className="text-red-500">*</span>
              </label>
              <select
                value={form.mes}
                onChange={e => set('mes', e.target.value)}
                className="input bg-white"
              >
                <option value="">Seleccioná...</option>
                {MESES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ocupación Hotelera */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Ocupación Hotelera (%) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.oh}
                onChange={e => set('oh', e.target.value)}
                step="0.1"
                min="0"
                max="100"
                className="input pr-8"
                placeholder="Ej: 45.6"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">%</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Las variaciones mensual y anual se calcularán automáticamente en la planilla.
            </p>
          </div>

          {/* Estadía Promedio */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Estadía Promedio (noches) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.estadia_prom}
              onChange={e => set('estadia_prom', e.target.value)}
              step="0.01"
              min="0.01"
              className="input"
              placeholder="Ej: 2.50"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={enviando}
              className="btn-primary"
            >
              {enviando ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk" />
                  Guardar indicadores
                </>
              )}
            </button>
          </div>
        </form>

        <div className="card p-4 mt-4 border-amber-100 bg-amber-50">
          <p className="text-xs text-amber-800 flex items-start gap-2">
            <i className="fa-solid fa-circle-info mt-0.5" />
            <span>
              Para que el guardado funcione, el Apps Script de indicadores debe estar desplegado y
              su URL cargada en <code className="bg-amber-100 px-1 rounded">INDICADORES_SCRIPT_URL</code> del archivo{' '}
              <code className="bg-amber-100 px-1 rounded">.env.local</code>.
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
