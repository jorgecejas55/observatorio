'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

// ─── Constantes ───────────────────────────────────────────────────────────────
// Valores en MAYÚSCULAS para coincidir exactamente con la hoja de Google Sheets.

const PROCEDENCIAS = ['INTERNACIONAL', 'NACIONAL', 'PROVINCIAL', 'RESIDENTE'] as const
type Procedencia = typeof PROCEDENCIAS[number]

const TIPOS_PARTICIPANTE = [
  'ASISTENTE AL EVENTO',
  'EXPOSITOR-ORADOR-PERSONAL STANDS',
  'ORGANIZADOR-SPONSOR',
  'OTROS',
]

// Países: mixto tal como están en la hoja
const PAISES = ['Bolivia', 'Brasil', 'Chile', 'Colombia', 'Paraguay', 'Perú', 'Uruguay', 'Otro']

// Provincias: en mayúsculas tal como las almacena la hoja (SGO DEL ESTERO es la abreviatura usada)
const PROVINCIAS_ARG = [
  'CABA', 'BUENOS AIRES', 'CÓRDOBA', 'SANTA FE', 'MENDOZA', 'TUCUMÁN',
  'ENTRE RÍOS', 'SALTA', 'MISIONES', 'CHACO', 'CORRIENTES', 'SGO DEL ESTERO',
  'SAN JUAN', 'JUJUY', 'RÍO NEGRO', 'NEUQUÉN', 'FORMOSA', 'CHUBUT',
  'SAN LUIS', 'CATAMARCA', 'LA RIOJA', 'LA PAMPA', 'SANTA CRUZ', 'TIERRA DEL FUEGO',
]

// FME = Fray Mamerto Esquiú (abreviatura usada en la hoja)
const DEPARTAMENTOS_CATAMARCA = [
  'CAPITAL', 'AMBATO', 'ANCASTI', 'ANDALGALÁ', 'ANTOFAGASTA DE LA SIERRA',
  'BELÉN', 'CAPAYÁN', 'EL ALTO', 'FME', 'LA PAZ',
  'PACLÍN', 'POMÁN', 'SANTA MARÍA', 'SANTA ROSA', 'TINOGASTA', 'VALLE VIEJO',
]

const MEDIOS_TRANSPORTE = [
  'AUTOMÓVIL PARTICULAR', 'VEHÍCULO DE ALQUILER', 'ÓMNIBUS', 'ÓMNIBUS CONTINGENTE',
  'AVIÓN', 'MOTO', 'MOTORHOME', 'OTRO',
]

const GRUPOS_VIAJE = [
  'INDIVIDUAL', 'EN PAREJA', 'AMIGAS/OS', 'FAMILIA',
  'GRUPO CORPORATIVO/TRABAJO/ESTUDIO', 'CONTINGENTE', 'OTRO',
]

const TIPOS_ALOJAMIENTO = [
  'HOTEL 4*', 'HOTEL 3*', 'HOTEL 1* o 2*', 'APART HOTEL', 'CABAÑAS',
  'RESIDENCIAL', 'HOSTERÍA', 'DEPARTAMENTO/ALQUILER TEMPORARIO', 'CAMPING',
  'CASA DE FAMILIAR/AMIGO', 'CASA DE VACACIONES/SEGUNDA RESIDENCIA',
  'NO SE ALOJA/SE ENCUENTRA DE PASO', 'EN BÚSQUEDA',
]

const FRECUENCIAS_VISITA = [
  'PRIMERA VEZ', 'ESPORÁDICAMENTE', 'UNA VEZ AL AÑO', 'VARIAS VECES AL AÑO', 'NS/NC',
]

const ACTIVIDADES_OPCIONES = [
  'MUSEOS', 'ACTIVIDADES NOCTURNAS', 'CITY TOUR O EXCURSIONES',
  'ESPECTÁCULOS FOLCLÓRICOS', 'TEATRO/CINE', 'NS/NC',
]

const FORMAS_ORGANIZACION = [
  'SERVICIOS INDIVIDUALES', 'INVITADO',
  'PAQUETE OFRECIDO POR EL ORGANIZADOR', 'PAQUETE OFRECIDO POR AGENCIA', 'OTRO',
]

const DIMENSIONES_EVALUACION = [
  { key: 'sede',          label: 'Sede de la Reunión' },
  { key: 'organizacion',  label: 'Organización del Evento' },
  { key: 'alojamiento',   label: 'Servicios de Alojamiento' },
  { key: 'gastronomia',   label: 'Servicios de Gastronomía' },
  { key: 'transporte',    label: 'Servicios de Transporte' },
  { key: 'hospitalidad',  label: 'Hospitalidad / Trato Recibido' },
] as const

type DimensionKey = typeof DIMENSIONES_EVALUACION[number]['key']

// Escala de evaluación: formato exacto almacenado en la hoja
// 0 = sin seleccionar (falla validación), -1 = NS/NC
const EVAL_LABEL: Record<number, string> = {
  1: '1 (MUY MALA)',
  2: '2 (MALA)',
  3: '3 (REGULAR)',
  4: '4 (BUENA)',
  5: '5 (EXCELENTE)',
  [-1]: 'NS/NC',
}
function evalLabel(n: number): string { return EVAL_LABEL[n] ?? '' }

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoForm = 'idle' | 'enviando' | 'exito' | 'error'

interface FormState {
  // Contexto operativo
  evento: string
  // Q1–Q5: Origen
  procedencia: Procedencia | ''
  tipoParticipante: string
  paisOrigen: string
  provinciaOrigen: string
  departamentoOrigen: string
  // Q6–Q8: Datos personales y viaje
  edad: string
  medioTransporte: string
  grupoViaje: string
  // Q9–Q11: Alojamiento y frecuencia
  tipoAlojamiento: string
  cantidadNoches: string
  frecuenciaVisita: string
  // Q12–Q14: Actividades
  recorrerCiudad: string
  actividades: string[]
  formaOrganizacion: string
  // Q15: Evaluación (matriz 1–5)
  evaluacion: Record<DimensionKey, number>
  // Q16–Q18: Valoración final
  volveria: string
  recomendaria: string
  comentarios: string
}

type Errores = Partial<Record<
  keyof Omit<FormState, 'evaluacion' | 'actividades' | 'comentarios'> | 'evaluacion' | 'actividades' | 'evento',
  string
>>

const EVALUACION_INICIAL: Record<DimensionKey, number> = {
  sede: 0, organizacion: 0, alojamiento: 0, gastronomia: 0, transporte: 0, hospitalidad: 0,
}

const hoy = new Date().toISOString().split('T')[0]

const ESTADO_INICIAL: FormState = {
  evento: '',
  procedencia: '',
  tipoParticipante: '',
  paisOrigen: '',
  provinciaOrigen: '',
  departamentoOrigen: '',
  edad: '',
  medioTransporte: '',
  grupoViaje: '',
  tipoAlojamiento: '',
  cantidadNoches: '',
  frecuenciaVisita: '',
  recorrerCiudad: '',
  actividades: [],
  formaOrganizacion: '',
  evaluacion: { ...EVALUACION_INICIAL },
  volveria: '',
  recomendaria: '',
  comentarios: '',
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-text-secondary -mt-0.5 mb-0.5">{hint}</p>}
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1" data-error>
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />{error}
        </p>
      )}
    </div>
  )
}

function RadioGroup({ name, options, value, onChange, cols = 1 }: {
  name: string; options: string[]; value: string
  onChange: (v: string) => void; cols?: 1 | 2 | 3
}) {
  const gridClass = cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
  return (
    <div className={`grid ${gridClass} gap-2`}>
      {options.map(op => (
        <label
          key={op}
          className={`flex items-center gap-2.5 cursor-pointer rounded-xl border-2 px-4 py-2.5 text-sm transition-all select-none
            ${value === op
              ? 'border-primary bg-primary/5 font-semibold text-primary'
              : 'border-gray-200 bg-white text-text-primary hover:border-primary/40'
            }`}
        >
          <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
            ${value === op ? 'border-primary' : 'border-gray-300'}`}>
            {value === op && <span className="w-2 h-2 rounded-full bg-primary" />}
          </span>
          <input type="radio" name={name} value={op} checked={value === op}
            onChange={() => onChange(op)} className="sr-only" />
          {op}
        </label>
      ))}
    </div>
  )
}

function CheckboxGroup({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void
}) {
  const toggle = (op: string) => {
    onChange(selected.includes(op) ? selected.filter(x => x !== op) : [...selected, op])
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map(op => {
        const checked = selected.includes(op)
        return (
          <label
            key={op}
            className={`flex items-center gap-2.5 cursor-pointer rounded-xl border-2 px-4 py-2.5 text-sm transition-all select-none
              ${checked
                ? 'border-primary bg-primary/5 font-semibold text-primary'
                : 'border-gray-200 bg-white text-text-primary hover:border-primary/40'
              }`}
          >
            <span className={`w-4 h-4 rounded-lg border-2 flex-shrink-0 flex items-center justify-center
              ${checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}>
              {checked && <i className="fa-solid fa-check text-white text-[10px]" />}
            </span>
            <input type="checkbox" value={op} checked={checked}
              onChange={() => toggle(op)} className="sr-only" />
            {op}
          </label>
        )
      })}
    </div>
  )
}

function MatrizEvaluacion({ evaluacion, onChange, error }: {
  evaluacion: Record<DimensionKey, number>
  onChange: (key: DimensionKey, val: number) => void
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      {/* Header desktop */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_repeat(5,2.5rem)_3rem] gap-2 items-center px-2 mb-1">
        <span />
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} className="text-center text-xs font-bold text-text-secondary">{n}</span>
        ))}
        <span className="text-center text-xs font-bold text-text-secondary">NS/NC</span>
      </div>

      {DIMENSIONES_EVALUACION.map(({ key, label }) => {
        const val = evaluacion[key]
        return (
          <div key={key}
            className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_repeat(5,2.5rem)_3rem] items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5"
          >
            <span className="text-sm text-text-primary">{label}</span>

            {/* Mobile: select desplegable */}
            <div className="sm:hidden">
              <select
                value={val === 0 ? '' : val}
                onChange={e => onChange(key, Number(e.target.value))}
                className="input py-1.5 w-24 text-center bg-white text-sm"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                <option value={-1}>NS/NC</option>
              </select>
            </div>

            {/* Desktop: botones 1-5 */}
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(key, n)}
                className={`hidden sm:flex w-10 h-10 rounded-full items-center justify-center text-sm font-bold transition-all border-2
                  ${val === n
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:text-primary'
                  }`}
              >
                {n}
              </button>
            ))}

            {/* Botón NS/NC */}
            <button
              type="button"
              onClick={() => onChange(key, -1)}
              className={`hidden sm:flex w-12 h-10 rounded-lg items-center justify-center text-[11px] font-bold transition-all border-2
                ${val === -1
                  ? 'bg-gray-400 border-gray-400 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-text-secondary hover:border-gray-400 hover:text-gray-600'
                }`}
            >
              NS/NC
            </button>
          </div>
        )
      })}

      <div className="flex justify-between text-xs text-text-secondary px-2 mt-1">
        <span>1 = Muy mala</span>
        <span>5 = Excelente</span>
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1" data-error>
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />{error}
        </p>
      )}
    </div>
  )
}

function EventoAutocomplete({ value, onChange, error }: {
  value: string; onChange: (v: string) => void; error?: string
}) {
  const [opciones, setOpciones] = useState<string[]>([])
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/eventos')
      .then(r => r.json())
      .then(data => {
        const lista: { denominacion?: string }[] = Array.isArray(data) ? data : (data.data ?? [])
        // Deduplicar por nombre para evitar claves repetidas en el dropdown
        const nombres = [...new Set(
          lista.map(e => e.denominacion ?? '').filter(Boolean)
        )]
        setOpciones(nombres)
      })
      .catch(() => {})
  }, [])

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtradas = opciones.filter(n =>
    value.trim().length > 0 && n.toLowerCase().includes(value.toLowerCase())
  )

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setAbierto(true) }}
          onFocus={() => setAbierto(true)}
          placeholder="Escribí para buscar el evento registrado..."
          className={`input pr-8 ${error ? 'border-red-400' : ''}`}
        />
        {value && (
          <button type="button" onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        )}
      </div>

      {abierto && filtradas.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtradas.map((nombre, i) => (
            <button key={`${nombre}-${i}`} type="button"
              onMouseDown={() => { onChange(nombre); setAbierto(false) }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 hover:text-primary transition-colors">
              <i className="fa-solid fa-calendar-star text-primary/40 mr-2 text-xs" />
              {nombre}
            </button>
          ))}
        </div>
      )}

      {abierto && value.trim().length > 0 && filtradas.length === 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 text-sm text-text-secondary">
          <i className="fa-solid fa-circle-info mr-2 text-primary/40" />
          No hay eventos registrados con ese nombre.
        </div>
      )}
    </div>
  )
}

function CampoAutomatico({ label, value, loading = false }: {
  label: string; value: string; loading?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label flex items-center gap-1.5">
        {label}
        <span className="inline-flex items-center gap-1 text-[10px] font-normal text-text-secondary bg-gray-100 rounded-full px-1.5 py-0.5">
          <i className="fa-solid fa-lock text-[9px]" /> automático
        </span>
      </label>
      <div className={`input bg-gray-50 text-text-secondary cursor-default select-none flex items-center gap-2 ${loading ? 'animate-pulse' : ''}`}>
        {loading
          ? <span className="h-4 w-32 bg-gray-200 rounded" />
          : <span>{value || <span className="italic text-gray-400">Sin datos de sesión</span>}</span>
        }
      </div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
      <i className={`${icon} text-primary text-sm`} />
      <h3 className="text-sm font-bold uppercase tracking-wide text-text-secondary">{title}</h3>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EncuestaDemandaEventoPage() {
  const { data: session, status } = useSession()
  const cargandoSesion = status === 'loading'

  // Campos automáticos derivados de la sesión
  const encuestador = session?.user?.name ?? session?.user?.email ?? ''
  const fechaHoy = hoy

  const [form, setForm] = useState<FormState>(ESTADO_INICIAL)
  const [errores, setErrores] = useState<Errores>({})
  const [estado, setEstado] = useState<EstadoForm>('idle')
  const [mensajeError, setMensajeError] = useState('')

  const set = useCallback(<K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setErrores(prev => ({ ...prev, [campo]: undefined }))
  }, [])

  const setEval = useCallback((key: DimensionKey, val: number) => {
    setForm(prev => ({ ...prev, evaluacion: { ...prev.evaluacion, [key]: val } }))
    setErrores(prev => ({ ...prev, evaluacion: undefined }))
  }, [])

  // ── Lógica condicional de origen ───────────────────────────────────────────

  const esInternacional = form.procedencia === 'INTERNACIONAL'
  const esNacional      = form.procedencia === 'NACIONAL'
  const esProvincial    = form.procedencia === 'PROVINCIAL'
  // RESIDENTE NO despliega Q5 (departamento)

  // ── Validación ──────────────────────────────────────────────────────────────

  function validar(): boolean {
    const e: Errores = {}

    if (!form.evento.trim())   e.evento      = 'Ingresá el nombre del evento.'
    if (!form.procedencia)    e.procedencia = 'Seleccioná una opción.'
    if (!form.tipoParticipante)     e.tipoParticipante   = 'Seleccioná una opción.'
    if (esInternacional && !form.paisOrigen)          e.paisOrigen         = 'Seleccioná el país.'
    if (esNacional      && !form.provinciaOrigen)    e.provinciaOrigen    = 'Seleccioná la provincia.'
    if (esProvincial    && !form.departamentoOrigen) e.departamentoOrigen = 'Seleccioná el departamento.'

    const edadNum = Number(form.edad)
    if (!form.edad)                                    e.edad = 'Requerido.'
    else if (isNaN(edadNum) || edadNum < 1 || edadNum > 120) e.edad = 'Ingresá una edad válida.'

    if (!form.medioTransporte)  e.medioTransporte  = 'Seleccioná una opción.'
    if (!form.grupoViaje)       e.grupoViaje       = 'Seleccioná una opción.'
    if (!form.tipoAlojamiento)  e.tipoAlojamiento  = 'Seleccioná una opción.'
    if (!form.frecuenciaVisita) e.frecuenciaVisita = 'Seleccioná una opción.'
    if (!form.recorrerCiudad)   e.recorrerCiudad   = 'Seleccioná una opción.'
    if (form.actividades.length === 0) e.actividades = 'Seleccioná al menos una opción.'
    if (!form.formaOrganizacion) e.formaOrganizacion = 'Seleccioná una opción.'

    const evalIncompleta = DIMENSIONES_EVALUACION.some(({ key }) => form.evaluacion[key] === 0)
    if (evalIncompleta) e.evaluacion = 'Completá la puntuación de todas las dimensiones.'

    if (!form.volveria)      e.volveria      = 'Seleccioná una opción.'
    if (!form.recomendaria)  e.recomendaria  = 'Seleccioná una opción.'

    setErrores(e)
    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    }
    return Object.keys(e).length === 0
  }

  // ── Envío ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    setEstado('enviando')

    try {
      const payload = {
        fecha:                   fechaHoy,
        evento:                  form.evento.trim(),
        responsable_carga:       encuestador,
        procedencia:             form.procedencia,
        tipo_participante:       form.tipoParticipante,
        pais_origen:             esInternacional ? form.paisOrigen : '',
        provincia_origen:        esNacional      ? form.provinciaOrigen : '',
        departamento_origen:     esProvincial    ? form.departamentoOrigen : '',
        edad:                    Number(form.edad),
        medio_transporte:        form.medioTransporte,
        grupo_viaje:             form.grupoViaje,
        tipo_alojamiento:        form.tipoAlojamiento,
        cantidad_noches:         form.tipoAlojamiento === 'No se aloja' ? 0 : Number(form.cantidadNoches) || 0,
        frecuencia_visita:       form.frecuenciaVisita,
        recorrer_ciudad:         form.recorrerCiudad,
        actividades:             form.actividades.join(', '),
        forma_organizacion:      form.formaOrganizacion,
        sat_sede:                evalLabel(form.evaluacion.sede),
        sat_organizacion:        evalLabel(form.evaluacion.organizacion),
        sat_alojamiento:         evalLabel(form.evaluacion.alojamiento),
        sat_gastronomia:         evalLabel(form.evaluacion.gastronomia),
        sat_transporte:          evalLabel(form.evaluacion.transporte),
        sat_hospitalidad:        evalLabel(form.evaluacion.hospitalidad),
        volveria:                form.volveria,
        recomendaria:            form.recomendaria,
        comentarios:             form.comentarios.trim() || '',
        timestamp:               new Date().toISOString(),
      }

      const res = await fetch('/api/eventos/encuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`)
      setEstado('exito')
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : 'Error al enviar. Intentá nuevamente.')
      setEstado('error')
    }
  }

  function reiniciar() {
    // Preserva el evento para agilizar el trabajo en campo
    setForm(prev => ({ ...ESTADO_INICIAL, evento: prev.evento }))
    setErrores({})
    setEstado('idle')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Estado éxito ────────────────────────────────────────────────────────────

  if (estado === 'exito') {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="section-title">Encuesta de Demanda — Turismo de Eventos</h2>
        <div className="card p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-check text-green-600 text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">¡Encuesta registrada!</h3>
          <p className="text-text-secondary text-sm mb-2">Los datos fueron guardados correctamente.</p>
          <p className="text-xs text-text-secondary mb-8">
            Evento: <span className="font-semibold text-text-primary">{form.evento}</span>
          </p>
          <button onClick={reiniciar} className="btn-outline">
            <i className="fa-solid fa-rotate-left" /> Cargar otra encuesta
          </button>
        </div>
      </div>
    )
  }

  // ── Estado error ────────────────────────────────────────────────────────────

  if (estado === 'error') {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="section-title">Encuesta de Demanda — Turismo de Eventos</h2>
        <div className="card p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Error al enviar</h3>
          <p className="text-text-secondary text-sm mb-8">{mensajeError}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setEstado('idle')} className="btn-primary">
              <i className="fa-solid fa-rotate-left" /> Reintentar
            </button>
            <button onClick={reiniciar} className="btn-ghost">Empezar de nuevo</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="section-title">Encuesta de Demanda — Turismo de Eventos</h2>
        <p className="text-text-secondary text-sm -mt-6">
          Perfil del visitante / participante de evento turístico.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

        {/* ── Datos del relevamiento ─────────────────────────────────────── */}
        <div className="card p-6 space-y-4 overflow-visible">
          <SectionTitle icon="fa-solid fa-clipboard" title="Datos del relevamiento" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CampoAutomatico label="Fecha" value={fechaHoy} />
            <CampoAutomatico label="Responsable de carga" value={encuestador} loading={cargandoSesion} />
          </div>
          <Field label="Evento" required
            hint="Escribí el nombre y seleccioná de los eventos registrados."
            error={errores.evento}>
            <EventoAutocomplete
              value={form.evento}
              onChange={v => set('evento', v)}
              error={errores.evento}
            />
          </Field>
        </div>

        {/* ── Q1–Q5: Origen ─────────────────────────────────────────────── */}
        <div className="card p-6 space-y-5">
          <SectionTitle icon="fa-solid fa-earth-americas" title="Procedencia" />

          {/* Q2 pasa al primer lugar */}
          <Field label="Q1 — Tipo de participante" required error={errores.tipoParticipante}>
            <RadioGroup name="tipoParticipante" options={TIPOS_PARTICIPANTE}
              value={form.tipoParticipante} onChange={v => set('tipoParticipante', v)} />
          </Field>

          {/* Q1 pasa al segundo lugar */}
          <Field label="Q2 — Procedencia" required error={errores.procedencia}>
            <RadioGroup name="procedencia" options={[...PROCEDENCIAS]} value={form.procedencia}
              onChange={v => {
                set('procedencia', v as Procedencia)
                set('paisOrigen', '')
                set('provinciaOrigen', '')
                set('departamentoOrigen', '')
              }}
              cols={2}
            />
          </Field>

          {/* Q3 — Solo para Internacional */}
          {esInternacional && (
            <Field label="Q3 — País de origen" required error={errores.paisOrigen}>
              <RadioGroup name="paisOrigen" options={PAISES}
                value={form.paisOrigen} onChange={v => set('paisOrigen', v)} cols={2} />
            </Field>
          )}

          {/* Q4 — Solo para Nacional */}
          {esNacional && (
            <Field label="Q4 — Provincia de origen" required error={errores.provinciaOrigen}>
              <select value={form.provinciaOrigen}
                onChange={e => set('provinciaOrigen', e.target.value)}
                className={`input bg-white ${errores.provinciaOrigen ? 'border-red-400' : ''}`}>
                <option value="">— Seleccioná —</option>
                {PROVINCIAS_ARG.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          )}

          {/* Q5 — Solo para Provincial (NO para Residente) */}
          {esProvincial && (
            <Field label="Q5 — Departamento de origen" required error={errores.departamentoOrigen}>
              <select value={form.departamentoOrigen}
                onChange={e => set('departamentoOrigen', e.target.value)}
                className={`input bg-white ${errores.departamentoOrigen ? 'border-red-400' : ''}`}>
                <option value="">— Seleccioná —</option>
                {DEPARTAMENTOS_CATAMARCA.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          )}
        </div>

        {/* ── Q6–Q8: Datos personales y viaje ──────────────────────────── */}
        <div className="card p-6 space-y-5">
          <SectionTitle icon="fa-solid fa-user" title="Datos personales y viaje" />

          <Field label="Q6 — Edad" required error={errores.edad}>
            <input type="number" min={1} max={120} value={form.edad}
              onChange={e => set('edad', e.target.value)}
              placeholder="Ej: 34"
              className={`input max-w-32 ${errores.edad ? 'border-red-400' : ''}`} />
          </Field>

          <Field label="Q7 — Medio de transporte" required error={errores.medioTransporte}>
            <RadioGroup name="medioTransporte" options={MEDIOS_TRANSPORTE}
              value={form.medioTransporte} onChange={v => set('medioTransporte', v)} cols={2} />
          </Field>

          <Field label="Q8 — Grupo de viaje" required error={errores.grupoViaje}>
            <RadioGroup name="grupoViaje" options={GRUPOS_VIAJE}
              value={form.grupoViaje} onChange={v => set('grupoViaje', v)} cols={2} />
          </Field>
        </div>

        {/* ── Q9–Q11: Alojamiento y frecuencia ─────────────────────────── */}
        <div className="card p-6 space-y-5">
          <SectionTitle icon="fa-solid fa-bed" title="Alojamiento y frecuencia de visita" />

          <Field label="Q9 — Tipo de alojamiento" required error={errores.tipoAlojamiento}>
            <RadioGroup name="tipoAlojamiento" options={TIPOS_ALOJAMIENTO}
              value={form.tipoAlojamiento}
              onChange={v => {
                set('tipoAlojamiento', v)
                if (v === 'No se aloja') set('cantidadNoches', '0')
              }}
              cols={2}
            />
          </Field>

          <Field label="Q10 — Cantidad de noches"
            hint={form.tipoAlojamiento === 'No se aloja' ? 'Se registra automáticamente como 0.' : ''}
            error={errores.cantidadNoches}>
            <input type="number" min={0} max={365}
              value={form.tipoAlojamiento === 'No se aloja' ? '0' : form.cantidadNoches}
              disabled={form.tipoAlojamiento === 'No se aloja'}
              onChange={e => set('cantidadNoches', e.target.value)}
              placeholder="0"
              className={`input max-w-32 ${form.tipoAlojamiento === 'No se aloja' ? 'bg-gray-50 text-text-secondary' : ''} ${errores.cantidadNoches ? 'border-red-400' : ''}`} />
          </Field>

          <Field label="Q11 — Frecuencia de visita a la ciudad" required error={errores.frecuenciaVisita}>
            <RadioGroup name="frecuenciaVisita" options={FRECUENCIAS_VISITA}
              value={form.frecuenciaVisita} onChange={v => set('frecuenciaVisita', v)} cols={2} />
          </Field>
        </div>

        {/* ── Q12–Q14: Actividades y organización ──────────────────────── */}
        <div className="card p-6 space-y-5">
          <SectionTitle icon="fa-solid fa-map-location-dot" title="Actividades y organización del viaje" />

          <Field label="Q12 — ¿Tiene pensado recorrer la ciudad?" required error={errores.recorrerCiudad}>
            <RadioGroup name="recorrerCiudad" options={['SI', 'NO', 'TAL VEZ']}
              value={form.recorrerCiudad} onChange={v => set('recorrerCiudad', v)} cols={3} />
          </Field>

          <Field label="Q13 — ¿Qué actividades realizó?" required
            hint="Podés seleccionar más de una opción."
            error={errores.actividades}>
            <CheckboxGroup
              options={ACTIVIDADES_OPCIONES}
              selected={form.actividades}
              onChange={v => { set('actividades', v); setErrores(prev => ({ ...prev, actividades: undefined })) }}
            />
          </Field>

          <Field label="Q14 — ¿De qué forma organizó el viaje?" required error={errores.formaOrganizacion}>
            <RadioGroup name="formaOrganizacion" options={FORMAS_ORGANIZACION}
              value={form.formaOrganizacion} onChange={v => set('formaOrganizacion', v)} />
          </Field>
        </div>

        {/* ── Q15: Evaluación (escala 1–5) ─────────────────────────────── */}
        <div className="card p-6 space-y-4">
          <SectionTitle icon="fa-solid fa-chart-bar" title="Q15 — Evaluación del evento y destino" />
          <p className="text-sm text-text-secondary">
            Puntuá cada dimensión en una escala del <strong>1</strong> (muy malo) al <strong>5</strong> (excelente).
          </p>
          <MatrizEvaluacion
            evaluacion={form.evaluacion}
            onChange={setEval}
            error={errores.evaluacion}
          />
        </div>

        {/* ── Q16–Q18: Valoración final ─────────────────────────────────── */}
        <div className="card p-6 space-y-5">
          <SectionTitle icon="fa-solid fa-heart" title="Valoración final" />

          <Field label="Q16 — ¿Visitaría SFVC nuevamente?" required error={errores.volveria}>
            <RadioGroup name="volveria" options={['MUY PROBABLE', 'POCO PROBABLE', 'NADA PROBABLE']}
              value={form.volveria} onChange={v => set('volveria', v)} cols={3} />
          </Field>

          <Field label="Q17 — ¿Recomendaría visitar SFVC?" required error={errores.recomendaria}>
            <RadioGroup name="recomendaria" options={['SI', 'NO', 'TAL VEZ']}
              value={form.recomendaria} onChange={v => set('recomendaria', v)} cols={3} />
          </Field>

          <Field label="Q18 — Comentarios y/o sugerencias">
            <textarea value={form.comentarios}
              onChange={e => set('comentarios', e.target.value)}
              rows={3} placeholder="Opcional..."
              className="input resize-none" />
          </Field>
        </div>

        {/* ── Botón enviar ──────────────────────────────────────────────── */}
        <div className="flex justify-end pb-4">
          <button type="submit" disabled={estado === 'enviando'} className="btn-primary min-w-44">
            {estado === 'enviando'
              ? <><i className="fa-solid fa-spinner fa-spin" /> Enviando...</>
              : <><i className="fa-solid fa-paper-plane" /> Guardar encuesta</>
            }
          </button>
        </div>

      </form>
    </div>
  )
}
