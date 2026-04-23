'use client'

import { useState, useCallback } from 'react'


// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoFormulario = 'idle' | 'enviando' | 'exito' | 'error'

interface FormState {
  sector: string
  edad: string
  ciudad_turistica: string
  frecuencia_interaccion: string
  definicion: string
  representacion_turistica: string
  conocimiento_actividades: string
  canales_info: string[]
  beneficio_principal: string
  atractivo_impulsar: string
  propuesta: string
}

interface Errores {
  sector?: string
  edad?: string
  ciudad_turistica?: string
  frecuencia_interaccion?: string
  definicion?: string
  representacion_turistica?: string
  conocimiento_actividades?: string
  beneficio_principal?: string
}

const ESTADO_INICIAL: FormState = {
  sector: '',
  edad: '',
  ciudad_turistica: '',
  frecuencia_interaccion: '',
  definicion: '',
  representacion_turistica: '',
  conocimiento_actividades: '',
  canales_info: [],
  beneficio_principal: '',
  atractivo_impulsar: '',
  propuesta: '',
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function GrupoRadio({
  nombre,
  opciones,
  valor,
  onChange,
  horizontal = false,
}: {
  nombre: string
  opciones: string[]
  valor: string
  onChange: (v: string) => void
  horizontal?: boolean
}) {
  return (
    <div className={`flex ${horizontal ? 'flex-wrap gap-3' : 'flex-col gap-2'}`}>
      {opciones.map((op) => (
        <label
          key={op}
          className={`flex items-center gap-3 cursor-pointer rounded-xl border-2 px-4 py-3 transition-all duration-200 select-none
            ${valor === op
              ? 'border-primary bg-primary/5 font-semibold text-primary'
              : 'border-gray-200 bg-white text-text-primary hover:border-primary/40'
            }`}
        >
          <span
            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
              ${valor === op ? 'border-primary' : 'border-gray-300'}`}
          >
            {valor === op && (
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            )}
          </span>
          <input
            type="radio"
            name={nombre}
            value={op}
            checked={valor === op}
            onChange={() => onChange(op)}
            className="sr-only"
          />
          {op}
        </label>
      ))}
    </div>
  )
}

function GrupoCheckbox({
  nombre,
  opciones,
  seleccionados,
  onChange,
}: {
  nombre: string
  opciones: string[]
  seleccionados: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (op: string) => {
    onChange(
      seleccionados.includes(op)
        ? seleccionados.filter((x) => x !== op)
        : [...seleccionados, op]
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {opciones.map((op) => {
        const checked = seleccionados.includes(op)
        return (
          <label
            key={op}
            className={`flex items-center gap-3 cursor-pointer rounded-xl border-2 px-4 py-3 transition-all duration-200 select-none
              ${checked
                ? 'border-primary bg-primary/5 font-semibold text-primary'
                : 'border-gray-200 bg-white text-text-primary hover:border-primary/40'
              }`}
          >
            <span
              className={`w-5 h-5 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-colors
                ${checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}
            >
              {checked && <i className="fa-solid fa-check text-white text-xs" />}
            </span>
            <input
              type="checkbox"
              name={nombre}
              value={op}
              checked={checked}
              onChange={() => toggle(op)}
              className="sr-only"
            />
            {op}
          </label>
        )
      })}
    </div>
  )
}

function PreguntaWrapper({
  numero,
  titulo,
  error,
  children,
}: {
  numero: number
  titulo: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="card p-6 pb-7">
      <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
        Pregunta {numero}
      </p>
      <p className="text-base font-semibold text-text-primary mb-4">{titulo}</p>
      {children}
      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5">
          <i className="fa-solid fa-triangle-exclamation text-xs" />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Formulario principal ─────────────────────────────────────────────────────

export default function PercepcionSocialForm() {
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL)
  const [errores, setErrores] = useState<Errores>({})
  const [estado, setEstado] = useState<EstadoFormulario>('idle')
  const [mensajeError, setMensajeError] = useState('')

  const set = useCallback(
    <K extends keyof FormState>(campo: K, valor: FormState[K]) =>
      setForm((prev) => ({ ...prev, [campo]: valor })),
    []
  )

  // ── Validación ──────────────────────────────────────────────────────────────

  function validar(): boolean {
    const e: Errores = {}

    if (!form.sector) e.sector = 'Seleccioná un sector.'
    if (!form.edad) {
      e.edad = 'Ingresá tu edad.'
    } else {
      const n = parseInt(form.edad)
      if (isNaN(n) || n < 18 || n > 120)
        e.edad = 'Ingresá una edad válida entre 18 y 120 años.'
    }
    if (!form.ciudad_turistica) e.ciudad_turistica = 'Seleccioná una opción.'
    if (!form.frecuencia_interaccion) e.frecuencia_interaccion = 'Seleccioná una opción.'
    if (!form.definicion) {
      e.definicion = 'Ingresá una palabra.'
    } else if (form.definicion.trim().split(/\s+/).length > 1) {
      e.definicion = 'Ingresá solo una palabra.'
    }
    if (!form.representacion_turistica)
      e.representacion_turistica = 'Completá este campo.'
    if (!form.conocimiento_actividades) e.conocimiento_actividades = 'Seleccioná una opción.'
    if (!form.beneficio_principal) e.beneficio_principal = 'Seleccioná una opción.'

    setErrores(e)
    return Object.keys(e).length === 0
  }

  // ── Envío ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) {
      // Scroll al primer error
      document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setEstado('enviando')

    try {
      const payload = {
        sector: form.sector,
        edad: form.edad,
        ciudad_turistica: form.ciudad_turistica,
        frecuencia_interaccion: form.frecuencia_interaccion,
        definicion: form.definicion.trim(),
        representacion_turistica: form.representacion_turistica,
        conocimiento_actividades: form.conocimiento_actividades,
        canales_info: form.canales_info.join(', '),
        beneficio_principal: form.beneficio_principal,
        atractivo_impulsar: form.atractivo_impulsar,
        propuesta: form.propuesta,
        timestamp: new Date().toISOString(),
      }

      const res = await fetch('/api/calidad/percepcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.status === 'success') {
        setEstado('exito')
      } else {
        throw new Error(data.message || 'Error al enviar los datos')
      }
    } catch (err) {
      setMensajeError(
        err instanceof Error
          ? err.message
          : 'Hubo un problema al enviar la respuesta. Intentá nuevamente.'
      )
      setEstado('error')
    }
  }

  function reiniciar() {
    setForm(ESTADO_INICIAL)
    setErrores({})
    setEstado('idle')
    setMensajeError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Estados de éxito / error ─────────────────────────────────────────────────

  if (estado === 'exito') {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <i className="fa-solid fa-check text-green-600 text-3xl" />
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">¡Gracias por participar!</h3>
        <p className="text-text-secondary text-sm mb-8">
          Tu respuesta fue registrada correctamente. Los datos ayudan a mejorar
          el turismo en nuestra ciudad.
        </p>
        <button onClick={reiniciar} className="btn-outline">
          <i className="fa-solid fa-rotate-left" />
          Cargar otra respuesta
        </button>
      </div>
    )
  }

  if (estado === 'error') {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl" />
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">Error al enviar</h3>
        <p className="text-text-secondary text-sm mb-8">{mensajeError}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setEstado('idle')} className="btn-primary">
            <i className="fa-solid fa-rotate-left" />
            Reintentar
          </button>
          <button onClick={reiniciar} className="btn-ghost">
            Empezar de nuevo
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────────

  const mostrarCanales =
    form.conocimiento_actividades === 'Poco' || form.conocimiento_actividades === 'Mucho'

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

      {/* P1 — Sector */}
      <PreguntaWrapper numero={1} titulo="¿En qué sector de la ciudad vivís?" error={errores.sector}>
        {errores.sector && <span data-error />}
        <GrupoRadio
          nombre="sector"
          opciones={['Norte', 'Sur', 'Este', 'Oeste', 'Centro']}
          valor={form.sector}
          onChange={(v) => { set('sector', v); setErrores((e) => ({ ...e, sector: undefined })) }}
          horizontal
        />
      </PreguntaWrapper>

      {/* P2 — Edad */}
      <PreguntaWrapper numero={2} titulo="¿Cuál es tu edad?" error={errores.edad}>
        {errores.edad && <span data-error />}
        <input
          type="number"
          min={18}
          max={120}
          placeholder="Ej: 34"
          value={form.edad}
          onChange={(e) => { set('edad', e.target.value); setErrores((err) => ({ ...err, edad: undefined })) }}
          className={`input max-w-32 ${errores.edad ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
        />
      </PreguntaWrapper>

      {/* P3 — Ciudad turística */}
      <PreguntaWrapper
        numero={3}
        titulo="¿Considerás que San Fernando del Valle de Catamarca es una ciudad turística?"
        error={errores.ciudad_turistica}
      >
        {errores.ciudad_turistica && <span data-error />}
        <GrupoRadio
          nombre="ciudad_turistica"
          opciones={['Sí', 'No', 'Tal vez']}
          valor={form.ciudad_turistica}
          onChange={(v) => { set('ciudad_turistica', v); setErrores((e) => ({ ...e, ciudad_turistica: undefined })) }}
          horizontal
        />
      </PreguntaWrapper>

      {/* P4 — Frecuencia de interacción */}
      <PreguntaWrapper
        numero={4}
        titulo="¿Con qué frecuencia interactuás con turistas en tu vida cotidiana?"
        error={errores.frecuencia_interaccion}
      >
        {errores.frecuencia_interaccion && <span data-error />}
        <GrupoRadio
          nombre="frecuencia_interaccion"
          opciones={['Frecuentemente', 'Ocasionalmente', 'Nunca']}
          valor={form.frecuencia_interaccion}
          onChange={(v) => { set('frecuencia_interaccion', v); setErrores((e) => ({ ...e, frecuencia_interaccion: undefined })) }}
          horizontal
        />
      </PreguntaWrapper>

      {/* P5 — Definición en una palabra */}
      <PreguntaWrapper
        numero={5}
        titulo="En una sola palabra, ¿cómo definirías a la ciudad desde el punto de vista turístico?"
        error={errores.definicion}
      >
        {errores.definicion && <span data-error />}
        <input
          type="text"
          placeholder="Una sola palabra..."
          value={form.definicion}
          onChange={(e) => {
            set('definicion', e.target.value)
            const palabras = e.target.value.trim().split(/\s+/)
            if (palabras.length > 1 && e.target.value.trim() !== '') {
              setErrores((err) => ({ ...err, definicion: 'Ingresá solo una palabra.' }))
            } else {
              setErrores((err) => ({ ...err, definicion: undefined }))
            }
          }}
          className={`input max-w-xs ${errores.definicion ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
        />
        <p className="mt-1.5 text-xs text-text-secondary">
          La palabra que mejor represente a la ciudad turísticamente.
        </p>
      </PreguntaWrapper>

      {/* P6 — Representación turística */}
      <PreguntaWrapper
        numero={6}
        titulo="¿Qué es lo que mejor representa a la ciudad desde el turismo?"
        error={errores.representacion_turistica}
      >
        {errores.representacion_turistica && <span data-error />}
        <input
          type="text"
          placeholder="Ej: La Virgen del Valle, la gastronomía, el paisaje..."
          value={form.representacion_turistica}
          onChange={(e) => { set('representacion_turistica', e.target.value); setErrores((err) => ({ ...err, representacion_turistica: undefined })) }}
          className={`input ${errores.representacion_turistica ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
        />
      </PreguntaWrapper>

      {/* P7 — Conocimiento de actividades + condicional canales */}
      <PreguntaWrapper
        numero={7}
        titulo="¿Qué nivel de conocimiento tenés sobre las actividades turísticas de la ciudad?"
        error={errores.conocimiento_actividades}
      >
        {errores.conocimiento_actividades && <span data-error />}
        <GrupoRadio
          nombre="conocimiento_actividades"
          opciones={['Nada', 'Poco', 'Mucho']}
          valor={form.conocimiento_actividades}
          onChange={(v) => {
            set('conocimiento_actividades', v)
            setErrores((e) => ({ ...e, conocimiento_actividades: undefined }))
            // Si cambia a Nada, limpia canales
            if (v === 'Nada') set('canales_info', [])
          }}
          horizontal
        />

        {/* Sub-pregunta condicional */}
        {mostrarCanales && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-sm font-semibold text-text-primary mb-3">
              ¿Por qué medios te informás sobre la oferta turística de la ciudad?{' '}
              <span className="text-text-secondary font-normal">(Podés elegir más de uno)</span>
            </p>
            <GrupoCheckbox
              nombre="canales_info"
              opciones={[
                'Diario impreso',
                'Radio',
                'Diarios o plataformas digitales',
                'Televisión',
                'Redes sociales',
                'Web de turismo',
                'Bot turístico',
              ]}
              seleccionados={form.canales_info}
              onChange={(v) => set('canales_info', v)}
            />
          </div>
        )}
      </PreguntaWrapper>

      {/* P8 — Beneficio principal */}
      <PreguntaWrapper
        numero={8}
        titulo="¿Cuál creés que es el principal beneficio que el turismo genera en la ciudad?"
        error={errores.beneficio_principal}
      >
        {errores.beneficio_principal && <span data-error />}
        <GrupoRadio
          nombre="beneficio_principal"
          opciones={[
            'Fortalece la imagen, el prestigio y la identidad de la ciudad',
            'Genera empleo y desarrollo económico',
            'Impulsa mejoras en infraestructura y espacios públicos',
            'Incrementa la oferta cultural y de entretenimiento',
          ]}
          valor={form.beneficio_principal}
          onChange={(v) => { set('beneficio_principal', v); setErrores((e) => ({ ...e, beneficio_principal: undefined })) }}
        />
      </PreguntaWrapper>

      {/* P9 — Atractivo a impulsar (opcional) */}
      <PreguntaWrapper
        numero={9}
        titulo="¿Qué atractivo o evento te gustaría que se potencie más? (Opcional)"
      >
        <textarea
          placeholder="Describí brevemente..."
          rows={3}
          value={form.atractivo_impulsar}
          onChange={(e) => set('atractivo_impulsar', e.target.value)}
          className="input resize-none"
        />
      </PreguntaWrapper>

      {/* P10 — Propuesta (opcional) */}
      <PreguntaWrapper
        numero={10}
        titulo="¿Tenés alguna propuesta o sugerencia para mejorar el turismo en la ciudad? (Opcional)"
      >
        <textarea
          placeholder="Tu propuesta o sugerencia..."
          rows={4}
          value={form.propuesta}
          onChange={(e) => set('propuesta', e.target.value)}
          className="input resize-none"
        />
      </PreguntaWrapper>

      {/* Botón de envío */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={estado === 'enviando'}
          className="btn-primary min-w-44"
        >
          {estado === 'enviando' ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" />
              Enviando...
            </>
          ) : (
            <>
              <i className="fa-solid fa-paper-plane" />
              Enviar respuesta
            </>
          )}
        </button>
      </div>
    </form>
  )
}
