'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// v4 (10/2026): se eliminaron las preguntas de circuito, sistema de audio y guía
// turístico; se agregó la sección de audioguías digitales (QR)

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Form {
  dia_viaje: string
  puntualidad: number
  limpieza: number
  comodidad: number
  audioguia_acceso: number
  audioguia_audio: number
  audioguia_contenidos: number
  expectativas: string
  duracion: string
  calificacion_general: number
  que_gusto: string
  que_mejorar: string
  recomendaria: string
}

const FORM_INICIAL: Form = {
  dia_viaje: '',
  puntualidad: 0, limpieza: 0, comodidad: 0,
  audioguia_acceso: 0, audioguia_audio: 0, audioguia_contenidos: 0,
  expectativas: '', duracion: '', calificacion_general: 0,
  que_gusto: '', que_mejorar: '', recomendaria: '',
}

// ─── Fingerprint del dispositivo ─────────────────────────────────────────────

async function generarFingerprint(): Promise<string> {
  try {
    const str = JSON.stringify({
      ua: navigator.userAgent,
      lang: navigator.language,
      res: `${screen.width}x${screen.height}`,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      tzOff: new Date().getTimezoneOffset(),
      mem: (navigator as any).deviceMemory ?? 0,
      cpu: (navigator as any).hardwareConcurrency ?? 0,
    })
    if (crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    // Fallback si crypto.subtle no está disponible
    let h = 0
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
    return 'simple_' + Math.abs(h).toString(36)
  } catch {
    return 'fallback_' + Date.now()
  }
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Estrellas({
  valor,
  onChange,
  grande = false,
  etiquetas,
}: {
  valor: number
  onChange: (v: number) => void
  grande?: boolean
  etiquetas?: { min: string; max: string } // textos de los extremos de la escala
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="inline-block">
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${n} estrella${n !== 1 ? 's' : ''}`}
          className={`leading-none focus:outline-none transition-colors ${grande ? 'text-5xl' : 'text-3xl'} ${
            n <= (hover || valor) ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'
          }`}
        >
          {n <= (hover || valor) ? '★' : '☆'}
        </button>
      ))}
    </div>
    {etiquetas && (
      <div className="flex justify-between gap-4 text-xs text-text-secondary mt-1">
        <span>1 = {etiquetas.min}</span>
        <span>5 = {etiquetas.max}</span>
      </div>
    )}
    </div>
  )
}

function RadioOpciones({
  nombre,
  opciones,
  valor,
  onChange,
}: {
  nombre: string
  opciones: string[]
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2 mt-2">
      {opciones.map(op => (
        <label
          key={op}
          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
            valor === op
              ? 'border-primary bg-primary/5 font-medium'
              : 'border-gray-200 hover:border-primary/40'
          }`}
        >
          <input
            type="radio"
            name={nombre}
            value={op}
            checked={valor === op}
            onChange={() => onChange(op)}
            className="accent-primary"
          />
          <span className="text-sm">{op}</span>
        </label>
      ))}
    </div>
  )
}

// Secciones que se muestran en la pantalla de bienvenida
const SECCIONES_ENCUESTA = [
  { icono: 'fa-bus-simple', titulo: 'Servicio', detalle: 'Puntualidad, limpieza y comodidad' },
  { icono: 'fa-headphones', titulo: 'Audioguías', detalle: 'Acceso por QR, audio y contenidos' },
  { icono: 'fa-star', titulo: 'Experiencia', detalle: 'Valoración general y sugerencias' },
]

// Pie institucional compartido por las pantallas de inicio y cierre
function PieInstitucional() {
  return (
    <p className="mt-8 pt-5 border-t border-gray-100 text-xs text-text-secondary">
      Observatorio de Turismo Municipal · Secretaría de Turismo y Desarrollo Económico
    </p>
  )
}

// Encabezado de las pantallas de estado (agradecimiento, ya respondió, error)
function PantallaEstado({
  icono,
  tono,
  titulo,
  children,
}: {
  icono: string
  tono: 'exito' | 'info' | 'alerta'
  titulo: string
  children: React.ReactNode
}) {
  const colores = {
    exito: 'bg-green-50 text-green-600 ring-green-100',
    info: 'bg-primary/10 text-primary ring-primary/5',
    alerta: 'bg-amber-50 text-amber-600 ring-amber-100',
  }[tono]
  return (
    <div className="text-center py-8">
      <div className={`w-16 h-16 rounded-full ring-8 flex items-center justify-center mx-auto mb-5 ${colores}`}>
        <i className={`fa-solid ${icono} text-2xl`} aria-hidden="true" />
      </div>
      <h3 className="text-2xl font-bold text-text-primary mb-2">{titulo}</h3>
      {children}
      <PieInstitucional />
    </div>
  )
}

function BarraProgreso({ porcentaje }: { porcentaje: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
      <div
        className="bg-primary h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalidadBus() {
  const [pantalla, setPantalla] = useState(0) // 0 = cargando
  const [form, setForm] = useState<Form>(FORM_INICIAL)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const fingerprintRef = useRef('')

  // Al montar: generar fingerprint y verificar si ya respondió
  useEffect(() => {
    async function init() {
      const fp = await generarFingerprint()
      fingerprintRef.current = fp

      try {
        const res = await fetch('/api/calidad/bus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_duplicate', fingerprint_hash: fp }),
        })
        const data = await res.json()
        // El GAS devuelve { code: 'DUPLICATE_RESPONSE' } si ya respondió
        if (data.code === 'DUPLICATE_RESPONSE') {
          setPantalla(8)
          return
        }
      } catch {
        // Si falla la verificación, permitir continuar (no bloquear al usuario)
      }
      setPantalla(1)
    }
    init()
  }, [])

  // Helper: actualizar un campo del formulario
  function set<K extends keyof Form>(campo: K, valor: Form[K]) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setErrores(prev => ({ ...prev, [campo]: '' }))
  }

  function ir(num: number) {
    setErrores({})
    setPantalla(num)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validar(num: number): boolean {
    const e: Record<string, string> = {}

    if (num === 2) {
      if (!form.dia_viaje) e.dia_viaje = 'Seleccioná el día del recorrido'
    }
    if (num === 3) {
      if (!form.puntualidad) e.puntualidad = 'Calificá este aspecto'
      if (!form.limpieza) e.limpieza = 'Calificá este aspecto'
      if (!form.comodidad) e.comodidad = 'Calificá este aspecto'
    }
    if (num === 4) {
      if (!form.audioguia_acceso) e.audioguia_acceso = 'Calificá este aspecto'
      if (!form.audioguia_audio) e.audioguia_audio = 'Calificá este aspecto'
      if (!form.audioguia_contenidos) e.audioguia_contenidos = 'Calificá este aspecto'
    }
    if (num === 5) {
      if (!form.expectativas) e.expectativas = 'Seleccioná una opción'
      if (!form.duracion) e.duracion = 'Seleccioná una opción'
      if (!form.calificacion_general) e.calificacion_general = 'Calificá el servicio'
    }
    if (num === 6) {
      if (!form.recomendaria) e.recomendaria = 'Seleccioná una opción'
    }

    if (Object.keys(e).length > 0) {
      setErrores(e)
      return false
    }
    return true
  }

  function siguienteValidado(actual: number, siguiente: number) {
    if (validar(actual)) ir(siguiente)
  }

  async function enviar() {
    if (!validar(6)) return
    setEnviando(true)
    try {
      const payload = {
        ...form,
        fingerprint_hash: fingerprintRef.current,
      }

      const res = await fetch('/api/calidad/bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.status === 'success') {
        ir(7)
      } else {
        setErrorEnvio(data.message ?? data.error ?? 'Error al enviar la encuesta.')
        ir(9)
      }
    } catch (err) {
      setErrorEnvio(String(err))
      ir(9)
    } finally {
      setEnviando(false)
    }
  }

  // ─── Renderizado ──────────────────────────────────────────────────────────────

  // Pantalla 0: cargando (verificando fingerprint)
  if (pantalla === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Cargando encuesta...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 md:p-8">

          {/* ── Pantalla 1: Bienvenida ──────────────────────────────────── */}
          {pantalla === 1 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
                <i className="fa-solid fa-bus-simple text-3xl" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                Encuesta de satisfacción
              </p>
              <h3 className="text-2xl font-bold text-text-primary mb-1">Bus Turístico SFVC</h3>
              <p className="text-sm text-text-secondary mb-6">
                San Fernando del Valle de Catamarca
              </p>
              <p className="text-text-secondary max-w-md mx-auto mb-6">
                Tu opinión nos ayuda a mejorar el servicio. Contanos cómo fue tu recorrido.
              </p>

              {/* Datos rápidos */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-text-secondary mb-8">
                <span className="flex items-center gap-1.5">
                  <i className="fa-regular fa-clock text-primary" aria-hidden="true" /> 3 minutos
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-list-check text-primary" aria-hidden="true" /> 13 preguntas
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-user-shield text-primary" aria-hidden="true" /> Sin datos personales
                </span>
              </div>

              {/* Qué se evalúa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
                {SECCIONES_ENCUESTA.map(s => (
                  <div
                    key={s.titulo}
                    className="flex sm:flex-col items-start gap-3 sm:gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-4"
                  >
                    <span className="w-9 h-9 flex-shrink-0 rounded-lg bg-white border border-gray-100 text-primary flex items-center justify-center">
                      <i className={`fa-solid ${s.icono}`} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-text-primary">{s.titulo}</span>
                      <span className="block text-xs text-text-secondary mt-0.5">{s.detalle}</span>
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => ir(2)}
                className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2"
              >
                Comenzar encuesta
                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </button>

              <PieInstitucional />
            </div>
          )}

          {/* ── Pantalla 2: Datos del viaje ─────────────────────────────── */}
          {pantalla === 2 && (
            <div>
              <BarraProgreso porcentaje={14} />
              <h3 className="text-lg font-bold mb-5">Datos del viaje</h3>

              {/* Pregunta 1 — Día */}
              <div className="mb-6">
                <p className="label">
                  1. ¿Qué día realizaste el recorrido?{' '}
                  <span className="text-red-500">*</span>
                </p>
                <RadioOpciones
                  nombre="dia_viaje"
                  opciones={DIAS}
                  valor={form.dia_viaje}
                  onChange={v => set('dia_viaje', v)}
                />
                {errores.dia_viaje && (
                  <p className="text-red-500 text-xs mt-1">{errores.dia_viaje}</p>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button type="button" onClick={() => ir(1)} className="btn-secondary">
                  ← Anterior
                </button>
                <button type="button" onClick={() => siguienteValidado(2, 3)} className="btn-primary">
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* ── Pantalla 3: Evaluación del servicio ────────────────────── */}
          {pantalla === 3 && (
            <div>
              <BarraProgreso porcentaje={28} />
              <h3 className="text-lg font-bold mb-1">Evaluación del Servicio</h3>
              <p className="text-sm text-text-secondary mb-6">
                Calificá los siguientes aspectos del servicio (1 = muy malo · 5 = excelente)
              </p>

              {/* Pregunta 2 — Puntualidad */}
              <div className="mb-6">
                <p className="label">
                  2. Puntualidad del servicio <span className="text-red-500">*</span>
                </p>
                <Estrellas valor={form.puntualidad} onChange={v => set('puntualidad', v)} />
                {errores.puntualidad && (
                  <p className="text-red-500 text-xs mt-1">{errores.puntualidad}</p>
                )}
              </div>

              {/* Pregunta 3 — Limpieza */}
              <div className="mb-6">
                <p className="label">
                  3. Estado y limpieza del bus <span className="text-red-500">*</span>
                </p>
                <Estrellas valor={form.limpieza} onChange={v => set('limpieza', v)} />
                {errores.limpieza && (
                  <p className="text-red-500 text-xs mt-1">{errores.limpieza}</p>
                )}
              </div>

              {/* Pregunta 4 — Comodidad */}
              <div className="mb-6">
                <p className="label">
                  4. Comodidad durante el viaje <span className="text-red-500">*</span>
                </p>
                <Estrellas valor={form.comodidad} onChange={v => set('comodidad', v)} />
                {errores.comodidad && (
                  <p className="text-red-500 text-xs mt-1">{errores.comodidad}</p>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button type="button" onClick={() => ir(2)} className="btn-secondary">
                  ← Anterior
                </button>
                <button type="button" onClick={() => siguienteValidado(3, 4)} className="btn-primary">
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* ── Pantalla 4: Evaluación de audioguías ───────────────────── */}
          {pantalla === 4 && (
            <div>
              <BarraProgreso porcentaje={42} />
              <h3 className="text-lg font-bold mb-1">Evaluación de Audioguías</h3>
              <p className="text-sm text-text-secondary mb-6">
                Calificá las audioguías digitales del recorrido (escala de 1 a 5)
              </p>

              {/* Pregunta 5 — Facilidad de acceso */}
              <div className="mb-6">
                <p className="label">
                  5. ¿Qué tan fácil te resultó acceder a las audioguías digitales mediante el código QR?{' '}
                  <span className="text-red-500">*</span>
                </p>
                <Estrellas
                  valor={form.audioguia_acceso}
                  onChange={v => set('audioguia_acceso', v)}
                  etiquetas={{ min: 'Muy difícil', max: 'Muy fácil' }}
                />
                {errores.audioguia_acceso && (
                  <p className="text-red-500 text-xs mt-1">{errores.audioguia_acceso}</p>
                )}
              </div>

              {/* Pregunta 6 — Calidad y claridad del audio */}
              <div className="mb-6">
                <p className="label">
                  6. ¿Cómo calificarías la calidad y claridad del audio de las audioguías digitales?{' '}
                  <span className="text-red-500">*</span>
                </p>
                <Estrellas
                  valor={form.audioguia_audio}
                  onChange={v => set('audioguia_audio', v)}
                  etiquetas={{ min: 'Muy mala', max: 'Excelente' }}
                />
                {errores.audioguia_audio && (
                  <p className="text-red-500 text-xs mt-1">{errores.audioguia_audio}</p>
                )}
              </div>

              {/* Pregunta 7 — Contenidos */}
              <div className="mb-6">
                <p className="label">
                  7. ¿Cómo calificarías los contenidos de las audioguías en cuanto a su utilidad e interés para conocer los atractivos turísticos?{' '}
                  <span className="text-red-500">*</span>
                </p>
                <Estrellas
                  valor={form.audioguia_contenidos}
                  onChange={v => set('audioguia_contenidos', v)}
                  etiquetas={{ min: 'Nada útiles', max: 'Muy útiles' }}
                />
                {errores.audioguia_contenidos && (
                  <p className="text-red-500 text-xs mt-1">{errores.audioguia_contenidos}</p>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button type="button" onClick={() => ir(3)} className="btn-secondary">
                  ← Anterior
                </button>
                <button type="button" onClick={() => siguienteValidado(4, 5)} className="btn-primary">
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* ── Pantalla 5: Experiencia general ────────────────────────── */}
          {pantalla === 5 && (
            <div>
              <BarraProgreso porcentaje={56} />
              <h3 className="text-lg font-bold mb-5">Experiencia General</h3>

              {/* Pregunta 8 — Expectativas */}
              <div className="mb-6">
                <p className="label">
                  8. ¿Los atractivos visitados cumplieron tus expectativas?{' '}
                  <span className="text-red-500">*</span>
                </p>
                <RadioOpciones
                  nombre="expectativas"
                  opciones={[
                    'Superaron mis expectativas',
                    'Cumplieron mis expectativas',
                    'Estuvieron por debajo de mis expectativas',
                  ]}
                  valor={form.expectativas}
                  onChange={v => set('expectativas', v)}
                />
                {errores.expectativas && (
                  <p className="text-red-500 text-xs mt-1">{errores.expectativas}</p>
                )}
              </div>

              {/* Pregunta 9 — Duración */}
              <div className="mb-6">
                <p className="label">
                  9. ¿La duración del recorrido fue adecuada?{' '}
                  <span className="text-red-500">*</span>
                </p>
                <RadioOpciones
                  nombre="duracion"
                  opciones={['Muy corto', 'Adecuado', 'Muy largo']}
                  valor={form.duracion}
                  onChange={v => set('duracion', v)}
                />
                {errores.duracion && (
                  <p className="text-red-500 text-xs mt-1">{errores.duracion}</p>
                )}
              </div>

              {/* Pregunta 10 — Calificación general */}
              <div className="mb-6">
                <p className="label">
                  10. Calificación general del servicio{' '}
                  <span className="text-red-500">*</span>
                </p>
                <Estrellas
                  valor={form.calificacion_general}
                  onChange={v => set('calificacion_general', v)}
                  grande
                />
                {errores.calificacion_general && (
                  <p className="text-red-500 text-xs mt-1">{errores.calificacion_general}</p>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button type="button" onClick={() => ir(4)} className="btn-secondary">
                  ← Anterior
                </button>
                <button type="button" onClick={() => siguienteValidado(5, 6)} className="btn-primary">
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* ── Pantalla 6: Comentarios ─────────────────────────────────── */}
          {pantalla === 6 && (
            <div>
              <BarraProgreso porcentaje={70} />
              <h3 className="text-lg font-bold mb-1">Sus Comentarios</h3>
              <p className="text-sm text-text-secondary mb-5">
                Ayudanos a mejorar con tu opinión (campos opcionales)
              </p>

              {/* Pregunta 11 — ¿Qué le gustó? */}
              <div className="mb-6">
                <p className="label">11. ¿Qué fue lo que más te gustó?</p>
                <textarea
                  value={form.que_gusto}
                  onChange={e => set('que_gusto', e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="Compartí tu experiencia positiva..."
                  className="input resize-none"
                />
                <p className="text-xs text-text-secondary text-right mt-1">
                  {form.que_gusto.length}/200
                </p>
              </div>

              {/* Pregunta 12 — ¿Qué mejoraría? */}
              <div className="mb-6">
                <p className="label">12. ¿Qué mejorarías del servicio?</p>
                <textarea
                  value={form.que_mejorar}
                  onChange={e => set('que_mejorar', e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="Tus sugerencias son muy valiosas..."
                  className="input resize-none"
                />
                <p className="text-xs text-text-secondary text-right mt-1">
                  {form.que_mejorar.length}/200
                </p>
              </div>

              {/* Pregunta 13 — ¿Recomendaría? */}
              <div className="mb-6">
                <p className="label">
                  13. ¿Recomendarías este servicio?{' '}
                  <span className="text-red-500">*</span>
                </p>
                <RadioOpciones
                  nombre="recomendaria"
                  opciones={[
                    'Sí, definitivamente',
                    'Probablemente sí',
                    'No estoy seguro/a',
                    'Probablemente no',
                    'Definitivamente no',
                  ]}
                  valor={form.recomendaria}
                  onChange={v => set('recomendaria', v)}
                />
                {errores.recomendaria && (
                  <p className="text-red-500 text-xs mt-1">{errores.recomendaria}</p>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button type="button" onClick={() => ir(5)} className="btn-secondary">
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={enviar}
                  disabled={enviando}
                  className="btn-primary disabled:opacity-50"
                >
                  {enviando ? 'Enviando...' : 'Enviar Encuesta →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Pantalla 7: Agradecimiento ──────────────────────────────── */}
          {pantalla === 7 && (
            <PantallaEstado icono="fa-check" tono="exito" titulo="¡Muchas gracias por tu opinión!">
              <p className="text-text-secondary mb-1">Tu respuesta fue registrada correctamente.</p>
              <p className="text-sm text-text-secondary max-w-md mx-auto">
                Con tus aportes trabajamos para mejorar la experiencia del Bus Turístico.
                Ya podés cerrar esta ventana.
              </p>
            </PantallaEstado>
          )}

          {/* ── Pantalla 8: Ya respondió ────────────────────────────────── */}
          {pantalla === 8 && (
            <PantallaEstado icono="fa-clipboard-check" tono="info" titulo="Encuesta ya completada">
              <p className="text-text-secondary mb-1">
                Ya respondiste esta encuesta desde este dispositivo en las últimas 48 horas.
              </p>
              <p className="text-sm text-text-secondary">¡Gracias por tu participación!</p>
            </PantallaEstado>
          )}

          {/* ── Pantalla 9: Error ───────────────────────────────────────── */}
          {pantalla === 9 && (
            <PantallaEstado icono="fa-triangle-exclamation" tono="alerta" titulo="No pudimos enviar tu encuesta">
              <p className="text-text-secondary mb-6 max-w-md mx-auto">
                {errorEnvio || 'Ocurrió un error al procesar tu encuesta. Intentá de nuevo.'}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={enviar}
                  disabled={enviando}
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <i
                    className={`fa-solid ${enviando ? 'fa-circle-notch fa-spin' : 'fa-rotate-right'}`}
                    aria-hidden="true"
                  />
                  {enviando ? 'Enviando…' : 'Reintentar'}
                </button>
                <button
                  type="button"
                  onClick={() => ir(1)}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <i className="fa-solid fa-house" aria-hidden="true" />
                  Volver al inicio
                </button>
              </div>
            </PantallaEstado>
          )}

        </div>
      </div>
    </div>
  )
}
