'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const CIRCUITOS = [
  'Fábrica de Alfombras / Gruta Virgen del Valle',
  'Bodega Michango / Esc. Provincial de Artesanías San Juan Bautista',
  'Iglesia de Choya / Pueblo Perdido de la Quebrada',
  'Gruta Virgen del Valle / Casa de la Puna',
  'Pueblo Perdido de la Quebrada / Dique el Jumeal',
  'Otro circuito',
]

// Mapeo día → circuito preseleccionado (según la programación semanal del bus)
const MAPEO_DIA_CIRCUITO: Record<string, string> = {
  'Martes':  'Fábrica de Alfombras / Gruta Virgen del Valle',
  'Viernes': 'Bodega Michango / Esc. Provincial de Artesanías San Juan Bautista',
  'Sábado':  'Gruta Virgen del Valle / Casa de la Puna',
  'Domingo': 'Pueblo Perdido de la Quebrada / Dique el Jumeal',
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Form {
  dia_viaje: string
  circuito: string
  circuito_custom: string
  puntualidad: number
  limpieza: number
  comodidad: number
  audio: number
  guia_claridad: number
  guia_conocimiento: number
  guia_amabilidad: number
  guia_consultas: number
  expectativas: string
  duracion: string
  calificacion_general: number
  que_gusto: string
  que_mejorar: string
  recomendaria: string
}

const FORM_INICIAL: Form = {
  dia_viaje: '', circuito: '', circuito_custom: '',
  puntualidad: 0, limpieza: 0, comodidad: 0, audio: 0,
  guia_claridad: 0, guia_conocimiento: 0, guia_amabilidad: 0, guia_consultas: 0,
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
      mem: (navigator as Record<string, unknown>).deviceMemory ?? 0,
      cpu: (navigator as Record<string, unknown>).hardwareConcurrency ?? 0,
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
}: {
  valor: number
  onChange: (v: number) => void
  grande?: boolean
}) {
  const [hover, setHover] = useState(0)
  return (
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

  // Al cambiar el día, preseleccionar el circuito según la programación
  function handleDiaChange(dia: string) {
    const circuito = MAPEO_DIA_CIRCUITO[dia] ?? ''
    setForm(prev => ({
      ...prev,
      dia_viaje: dia,
      circuito: circuito,
      circuito_custom: '',
    }))
    setErrores(prev => ({ ...prev, dia_viaje: '', circuito: '' }))
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
      if (!form.circuito) e.circuito = 'Seleccioná el circuito'
      if (form.circuito === 'Otro circuito' && !form.circuito_custom.trim())
        e.circuito_custom = 'Especificá el circuito realizado'
    }
    if (num === 3) {
      if (!form.puntualidad) e.puntualidad = 'Calificá este aspecto'
      if (!form.limpieza) e.limpieza = 'Calificá este aspecto'
      if (!form.comodidad) e.comodidad = 'Calificá este aspecto'
      if (!form.audio) e.audio = 'Calificá este aspecto'
    }
    if (num === 4) {
      if (!form.guia_claridad) e.guia_claridad = 'Calificá este aspecto'
      if (!form.guia_conocimiento) e.guia_conocimiento = 'Calificá este aspecto'
      if (!form.guia_amabilidad) e.guia_amabilidad = 'Calificá este aspecto'
      if (!form.guia_consultas) e.guia_consultas = 'Calificá este aspecto'
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
      const circuitoFinal =
        form.circuito === 'Otro circuito' ? form.circuito_custom : form.circuito

      const payload = {
        ...form,
        circuito: circuitoFinal,
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
      <div>
        <h2 className="section-title">Encuesta de Calidad — Bus Turístico</h2>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Cargando encuesta...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="section-title">Encuesta de Calidad — Bus Turístico</h2>

      <div className="max-w-2xl">
        <div className="card p-6 md:p-8">

          {/* ── Pantalla 1: Bienvenida ──────────────────────────────────── */}
          {pantalla === 1 && (
            <div className="text-center py-6">
              <div className="text-7xl mb-4">🚌</div>
              <h3 className="text-2xl font-bold text-text-primary mb-2">Encuesta de Calidad</h3>
              <p className="text-text-secondary mb-1">
                Bus Turístico · San Fernando del Valle de Catamarca
              </p>
              <p className="text-sm text-text-secondary mb-8">
                Su opinión es muy importante para mejorar nuestro servicio.
                <br />Esta encuesta toma solo 3 minutos.
              </p>
              <button
                type="button"
                onClick={() => ir(2)}
                className="btn-primary text-base px-8 py-3"
              >
                Comenzar encuesta
              </button>
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
                  onChange={handleDiaChange}
                />
                {errores.dia_viaje && (
                  <p className="text-red-500 text-xs mt-1">{errores.dia_viaje}</p>
                )}
              </div>

              {/* Pregunta 2 — Circuito */}
              <div className="mb-6">
                <p className="label">
                  2. Seleccioná el circuito que realizaste:{' '}
                  <span className="text-red-500">*</span>
                </p>
                <RadioOpciones
                  nombre="circuito"
                  opciones={CIRCUITOS}
                  valor={form.circuito}
                  onChange={v => {
                    set('circuito', v)
                    if (v !== 'Otro circuito') set('circuito_custom', '')
                  }}
                />
                {errores.circuito && (
                  <p className="text-red-500 text-xs mt-1">{errores.circuito}</p>
                )}

                {form.circuito === 'Otro circuito' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Especificá el circuito realizado"
                      value={form.circuito_custom}
                      onChange={e => set('circuito_custom', e.target.value)}
                      className="input"
                    />
                    {errores.circuito_custom && (
                      <p className="text-red-500 text-xs mt-1">{errores.circuito_custom}</p>
                    )}
                  </div>
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

              {/* Pregunta 3 — Puntualidad */}
              <div className="mb-6">
                <p className="label">
                  3. Puntualidad del servicio <span className="text-red-500">*</span>
                </p>
                <Estrellas valor={form.puntualidad} onChange={v => set('puntualidad', v)} />
                {errores.puntualidad && (
                  <p className="text-red-500 text-xs mt-1">{errores.puntualidad}</p>
                )}
              </div>

              {/* Pregunta 4 — Limpieza */}
              <div className="mb-6">
                <p className="label">
                  4. Estado y limpieza del bus <span className="text-red-500">*</span>
                </p>
                <Estrellas valor={form.limpieza} onChange={v => set('limpieza', v)} />
                {errores.limpieza && (
                  <p className="text-red-500 text-xs mt-1">{errores.limpieza}</p>
                )}
              </div>

              {/* Pregunta 5 — Comodidad */}
              <div className="mb-6">
                <p className="label">
                  5. Comodidad durante el viaje <span className="text-red-500">*</span>
                </p>
                <Estrellas valor={form.comodidad} onChange={v => set('comodidad', v)} />
                {errores.comodidad && (
                  <p className="text-red-500 text-xs mt-1">{errores.comodidad}</p>
                )}
              </div>

              {/* Pregunta 6 — Audio */}
              <div className="mb-6">
                <p className="label">
                  6. Sistema de audio (claridad del sonido) <span className="text-red-500">*</span>
                </p>
                <Estrellas valor={form.audio} onChange={v => set('audio', v)} />
                {errores.audio && (
                  <p className="text-red-500 text-xs mt-1">{errores.audio}</p>
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

          {/* ── Pantalla 4: Evaluación del guía ────────────────────────── */}
          {pantalla === 4 && (
            <div>
              <BarraProgreso porcentaje={42} />
              <h3 className="text-lg font-bold mb-1">Evaluación del Guía Turístico</h3>
              <p className="text-sm text-text-secondary mb-6">
                Calificá al guía turístico del recorrido (1 = muy malo · 5 = excelente)
              </p>

              {/* Pregunta 7 — Claridad */}
              <div className="mb-6">
                <p className="label">
                  7. Claridad de las explicaciones <span className="text-red-500">*</span>
                </p>
                <Estrellas valor={form.guia_claridad} onChange={v => set('guia_claridad', v)} />
                {errores.guia_claridad && (
                  <p className="text-red-500 text-xs mt-1">{errores.guia_claridad}</p>
                )}
              </div>

              {/* Pregunta 8 — Conocimiento */}
              <div className="mb-6">
                <p className="label">
                  8. Conocimiento sobre los atractivos <span className="text-red-500">*</span>
                </p>
                <Estrellas
                  valor={form.guia_conocimiento}
                  onChange={v => set('guia_conocimiento', v)}
                />
                {errores.guia_conocimiento && (
                  <p className="text-red-500 text-xs mt-1">{errores.guia_conocimiento}</p>
                )}
              </div>

              {/* Pregunta 9 — Amabilidad */}
              <div className="mb-6">
                <p className="label">
                  9. Amabilidad y trato <span className="text-red-500">*</span>
                </p>
                <Estrellas
                  valor={form.guia_amabilidad}
                  onChange={v => set('guia_amabilidad', v)}
                />
                {errores.guia_amabilidad && (
                  <p className="text-red-500 text-xs mt-1">{errores.guia_amabilidad}</p>
                )}
              </div>

              {/* Pregunta 10 — Consultas */}
              <div className="mb-6">
                <p className="label">
                  10. Capacidad para responder consultas <span className="text-red-500">*</span>
                </p>
                <Estrellas
                  valor={form.guia_consultas}
                  onChange={v => set('guia_consultas', v)}
                />
                {errores.guia_consultas && (
                  <p className="text-red-500 text-xs mt-1">{errores.guia_consultas}</p>
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

              {/* Pregunta 11 — Expectativas */}
              <div className="mb-6">
                <p className="label">
                  11. ¿Los atractivos visitados cumplieron tus expectativas?{' '}
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

              {/* Pregunta 12 — Duración */}
              <div className="mb-6">
                <p className="label">
                  12. ¿La duración del recorrido fue adecuada?{' '}
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

              {/* Pregunta 13 — Calificación general */}
              <div className="mb-6">
                <p className="label">
                  13. Calificación general del servicio{' '}
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

              {/* Pregunta 14 — ¿Qué le gustó? */}
              <div className="mb-6">
                <p className="label">14. ¿Qué fue lo que más te gustó?</p>
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

              {/* Pregunta 15 — ¿Qué mejoraría? */}
              <div className="mb-6">
                <p className="label">15. ¿Qué mejorarías del servicio?</p>
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

              {/* Pregunta 16 — ¿Recomendaría? */}
              <div className="mb-6">
                <p className="label">
                  16. ¿Recomendarías este servicio?{' '}
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
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-500 text-3xl">✓</span>
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-2">
                ¡Muchas gracias por su opinión!
              </h3>
              <p className="text-text-secondary mb-1">Tu respuesta fue registrada exitosamente.</p>
              <p className="text-sm text-text-secondary">
                Trabajamos constantemente para mejorar la experiencia del Bus Turístico.
              </p>
              <div className="text-6xl mt-8">🚌</div>
            </div>
          )}

          {/* ── Pantalla 8: Ya respondió ────────────────────────────────── */}
          {pantalla === 8 && (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">ℹ️</span>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Encuesta ya completada</h3>
              <p className="text-text-secondary mb-1">
                Ya completaste esta encuesta recientemente.
              </p>
              <p className="text-sm text-text-secondary">¡Gracias por tu participación!</p>
              <div className="text-6xl mt-8">🚌</div>
            </div>
          )}

          {/* ── Pantalla 9: Error ───────────────────────────────────────── */}
          {pantalla === 9 && (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Error al enviar</h3>
              <p className="text-text-secondary mb-6">
                {errorEnvio || 'Ha ocurrido un error al procesar tu encuesta. Intentá de nuevo.'}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={enviar}
                  disabled={enviando}
                  className="btn-primary disabled:opacity-50"
                >
                  {enviando ? 'Enviando...' : 'Reintentar'}
                </button>
                <button type="button" onClick={() => ir(1)} className="btn-secondary">
                  Volver al inicio
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
