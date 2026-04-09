'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { ComboboxField } from '@/components/forms/ComboboxField'

// ─── Constantes ───────────────────────────────────────────────────────────────
// Valores en MAYÚSCULAS para coincidir con los de la hoja de Google Sheets.

const PROCEDENCIAS = ['NACIONAL', 'PROVINCIAL', 'INTERNACIONAL'] as const
type Procedencia = typeof PROCEDENCIAS[number]

// Lista completa en mayúsculas para coincidir con el formato de la hoja
const PAISES = [
  // América del Sur
  'ARGENTINA', 'BOLIVIA', 'BRASIL', 'CHILE', 'COLOMBIA', 'ECUADOR',
  'GUYANA', 'PARAGUAY', 'PERÚ', 'SURINAM', 'URUGUAY', 'VENEZUELA',
  // América Central y Caribe
  'COSTA RICA', 'CUBA', 'EL SALVADOR', 'GUATEMALA', 'HAITÍ', 'HONDURAS',
  'JAMAICA', 'MÉXICO', 'NICARAGUA', 'PANAMÁ', 'PUERTO RICO', 'REPÚBLICA DOMINICANA',
  'TRINIDAD Y TOBAGO',
  // América del Norte
  'CANADÁ', 'ESTADOS UNIDOS',
  // Europa
  'ALBANIA', 'ALEMANIA', 'ANDORRA', 'AUSTRIA', 'BÉLGICA', 'BIELORRUSIA',
  'BOSNIA Y HERZEGOVINA', 'BULGARIA', 'CHIPRE', 'CROACIA', 'DINAMARCA',
  'ESLOVAQUIA', 'ESLOVENIA', 'ESPAÑA', 'ESTONIA', 'FINLANDIA', 'FRANCIA',
  'GEORGIA', 'GRECIA', 'HUNGRÍA', 'IRLANDA', 'ISLANDIA', 'ITALIA',
  'LETONIA', 'LITUANIA', 'LUXEMBURGO', 'MALTA', 'MOLDAVIA', 'MÓNACO',
  'MONTENEGRO', 'NORUEGA', 'PAÍSES BAJOS', 'POLONIA', 'PORTUGAL',
  'REINO UNIDO', 'REPÚBLICA CHECA', 'RUMANIA', 'RUSIA', 'SERBIA',
  'SUECIA', 'SUIZA', 'UCRANIA',
  // Asia
  'ARABIA SAUDITA', 'ARMENIA', 'AZERBAIYÁN', 'BANGLADESH', 'CHINA',
  'COREA DEL SUR', 'EMIRATOS ÁRABES UNIDOS', 'FILIPINAS', 'INDIA',
  'INDONESIA', 'IRÁN', 'IRAQ', 'ISRAEL', 'JAPÓN', 'JORDANIA',
  'KAZAJISTÁN', 'KUWAIT', 'LÍBANO', 'MALASIA', 'NEPAL', 'PAKISTÁN',
  'QATAR', 'SINGAPUR', 'SRI LANKA', 'TAILANDIA', 'TAIWÁN', 'TURQUÍA',
  'UZBEKISTÁN', 'VIETNAM',
  // África
  'ARGELIA', 'EGIPTO', 'GHANA', 'KENIA', 'MARRUECOS', 'NIGERIA',
  'SENEGAL', 'SUDÁFRICA', 'TÚNEZ',
  // Oceanía
  'AUSTRALIA', 'NUEVA ZELANDA',
]

const PROVINCIAS_ARG = [
  'BUENOS AIRES', 'CABA', 'CATAMARCA', 'CHACO', 'CHUBUT', 'CÓRDOBA',
  'CORRIENTES', 'ENTRE RÍOS', 'FORMOSA', 'JUJUY', 'LA PAMPA', 'LA RIOJA',
  'MENDOZA', 'MISIONES', 'NEUQUÉN', 'RÍO NEGRO', 'SALTA', 'SAN JUAN',
  'SAN LUIS', 'SANTA CRUZ', 'SANTA FE', 'SGO DEL ESTERO', 'TIERRA DEL FUEGO', 'TUCUMÁN',
]

// FME = Fray Mamerto Esquiú
const DEPARTAMENTOS_CATAMARCA = [
  'AMBATO', 'ANCASTI', 'ANDALGALÁ', 'ANTOFAGASTA DE LA SIERRA',
  'BELÉN', 'CAPAYÁN', 'EL ALTO', 'FME', 'LA PAZ',
  'PACLÍN', 'POMÁN', 'SANTA MARÍA', 'SANTA ROSA', 'TINOGASTA', 'VALLE VIEJO',
]

const MEDIOS_TRANSPORTE = [
  'AUTOMÓVIL PARTICULAR', 'VEHÍCULO DE ALQUILER', 'OMNIBUS', 'OMNIBUS CONTINGENTE',
  'AVION', 'MOTO', 'MOTORHOME', 'OTRO',
]

// Nota: "GRUPO DE VIAJE " tiene espacio final en la hoja — se normaliza en el GAS
const GRUPOS_VIAJE = [
  'INDIVIDUAL', 'EN PAREJA', 'FAMILIA', 'AMIGAS/OS',
  'GRUPO CORPORATIVO/TRABAJO/ESTUDIO', 'CONTINGENTE',
]

const MOTIVOS_VISITA = [
  'VACACIONES/OCIO/RECREACIÓN', 'VISITA A FAMILIARES/AMIGOS',
  'PARTICIPACIÓN EN EVENTO', 'RELIGIOSO',
  'TRABAJO/ESTUDIO', 'SALUD/ATENCIÓN SANITARIA', 'OTRO',
]

const TIPOS_ALOJAMIENTO = [
  'HOTEL 4*', 'HOTEL 3*', 'HOTEL_OTRA CATEGORIA', 'APART HOTEL',
  'HOSTERIA', 'CABAÑAS', 'RESIDENCIAL',
  'DEPARTAMENTO/ALQUILER TEMPORARIO', 'CAMPING',
  'CASA DE FAMILIAR/AMIGO', 'CASA DE VACACIONES/SEGUNDA RESIDENCIA',
  'NO SE ALOJA/SE ENCUENTRA DE PASO', 'EN BUSCA DE ALOJAMIENTO', 'OTRA',
]

const MOVILIDADES_CIUDAD = [
  'CAMINANDO', 'AUTO PARTICULAR/FAMILIAR', 'TRANSPORTE PÚBLICO',
  'REMIS/TAXI TRADICIONAL', 'AUTO DE ALQUILER',
  'APP/PLATAFORMA DE VIAJES', 'SERVICIO DE BICICLETAS', 'OTRO',
]

const FACTORES_DECISION = [
  'ATRACTIVOS Y ACTIVIDADES PARA EL TURISTA',
  'HOSPITALIDAD DE LOS RESIDENTES',
  'PRECIOS DE ALOJAMIENTOS Y SERVICIOS',
  'VARIEDAD DE SERVICIOS PARA EL TURISTA',
  'CERCANÍA CON LA RESIDENCIA',
  'POR SU CLIMA',
  'CONEXIÓN Y ESTADO DE LA RED VIAL',
  'CONEXIÓN AÉREA',
]

const LUGARES_CAPTADO = [
  'CABINA PLAZA 25 DE MAYO',
  'CASA SFVC',
  'CAMPING MUNICIPAL',
  'ECOPARQUE EL JUMEAL',
  'ATRACTIVO GRUTA V. VALLE',
  'ATRACTIVO PUEBLO PERDIDO',
  'ATRACTIVO CASA DE LA PUNA',
  'MÓVIL/EVENTO',
]

const DIMENSIONES_VALORACION = [
  { key: 'alojamiento', label: 'Servicios de Alojamiento' },
  { key: 'gastronomia', label: 'Servicios de Gastronomía' },
  { key: 'calidad_precio', label: 'Relación Calidad/Precio del Destino' },
  { key: 'hospitalidad', label: 'Hospitalidad / Trato Recibido' },
  { key: 'seguridad', label: 'Seguridad del Destino' },
  { key: 'info_turistica', label: 'Información Turística Disponible' },
  { key: 'senaletica', label: 'Señalética y Cartelería de Acceso' },
  { key: 'oferta_cultural', 'label': 'Oferta Cultural y de Entretenimiento' },
  { key: 'estadia_general', 'label': 'Estadía General en el Destino' },
] as const

type DimKey = typeof DIMENSIONES_VALORACION[number]['key']

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoForm = 'idle' | 'enviando' | 'exito' | 'error'

interface FormState {
  // Origen
  procedencia: Procedencia | ''
  paisOrigen: string
  provinciaOrigen: string
  departamentoOrigen: string
  // Datos del viaje
  medioTransporte: string
  grupoViaje: string
  cantidadPersonas: string
  motivoVisita: string
  tipoAlojamiento: string
  cantidadNoches: string
  // Datos del turista
  edad: string
  movilidadCiudad: string
  primeraVez: string
  // Decisión de visita
  otrosDestinos: string
  factoresDecision: string[]
  // Valoraciones (0 = sin seleccionar, -1 = NS/NC)
  valoraciones: Record<DimKey, number>
  // Satisfacción
  volveria: string
  recomendaria: string
  comentarios: string
  // Operativo
  lugarCaptado: string
  responsableCarga: string
}

type Errores = Partial<Record<
  keyof Omit<FormState, 'valoraciones' | 'factoresDecision' | 'comentarios'>
  | 'valoraciones' | 'factoresDecision',
  string
>>

const VALORACIONES_INICIAL: Record<DimKey, number> = {
  alojamiento: 0, gastronomia: 0, calidad_precio: 0, hospitalidad: 0,
  seguridad: 0, info_turistica: 0, senaletica: 0, oferta_cultural: 0, estadia_general: 0,
}

const ESTADO_INICIAL: FormState = {
  procedencia: '',
  paisOrigen: '',
  provinciaOrigen: '',
  departamentoOrigen: '',
  medioTransporte: '',
  grupoViaje: '',
  cantidadPersonas: '',
  motivoVisita: '',
  tipoAlojamiento: '',
  cantidadNoches: '',
  edad: '',
  movilidadCiudad: '',
  primeraVez: '',
  otrosDestinos: '',
  factoresDecision: [],
  valoraciones: { ...VALORACIONES_INICIAL },
  volveria: '',
  recomendaria: '',
  comentarios: '',
  lugarCaptado: '',
  responsableCarga: '',
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
  const gridClass = cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
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

function MatrizValoracion({ valoraciones, onChange, error }: {
  valoraciones: Record<DimKey, number>
  onChange: (key: DimKey, val: number) => void
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      {/* Encabezado desktop */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_repeat(5,2.5rem)_3rem] gap-2 items-center px-2 mb-1">
        <span />
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} className="text-center text-xs font-bold text-text-secondary">{n}</span>
        ))}
        <span className="text-center text-xs font-bold text-text-secondary">S/D</span>
      </div>

      {DIMENSIONES_VALORACION.map(({ key, label }) => {
        const val = valoraciones[key]
        return (
          <div key={key}
            className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_repeat(5,2.5rem)_3rem] items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5"
          >
            <span className="text-sm text-text-primary">{label}</span>

            {/* Mobile: select */}
            <div className="sm:hidden">
              <select
                value={val === 0 ? '' : val}
                onChange={e => onChange(key, Number(e.target.value))}
                className="input py-1.5 w-24 text-center bg-white text-sm"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                <option value={-1}>S/D</option>
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

            {/* Botón S/D (Sin Dato / No aplica) */}
            <button
              type="button"
              onClick={() => onChange(key, -1)}
              className={`hidden sm:flex w-12 h-10 rounded-lg items-center justify-center text-[11px] font-bold transition-all border-2
                ${val === -1
                  ? 'bg-gray-400 border-gray-400 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-text-secondary hover:border-gray-400 hover:text-gray-500'
                }`}
            >
              S/D
            </button>
          </div>
        )
      })}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1" data-error>
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />{error}
        </p>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EncuestaPerfilTuristaPage() {
  const { data: session } = useSession()
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL)
  const [errores, setErrores] = useState<Errores>({})
  const [estado, setEstado] = useState<EstadoForm>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const firstErrorRef = useRef<HTMLDivElement>(null)

  // Prellenar responsable desde la sesión
  useEffect(() => {
    if (session?.user?.name && !form.responsableCarga) {
      setForm(f => ({ ...f, responsableCarga: session.user!.name! }))
    }
  }, [session])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const set = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrores(e => ({ ...e, [key]: undefined }))
  }, [])

  const setValoracion = useCallback((key: DimKey, val: number) => {
    setForm(f => ({ ...f, valoraciones: { ...f.valoraciones, [key]: val } }))
    setErrores(e => ({ ...e, valoraciones: undefined }))
  }, [])

  // Limpiar movilidad si se cambia a transporte con vehículo propio
  const setMedioTransporte = useCallback((v: string) => {
    const necesita = v === 'OMNIBUS' || v === 'AVION'
    setForm(f => ({ ...f, medioTransporte: v, movilidadCiudad: necesita ? f.movilidadCiudad : '' }))
    setErrores(e => ({ ...e, medioTransporte: undefined, movilidadCiudad: undefined }))
  }, [])

  // Limpiar campos de origen al cambiar procedencia
  const setProcedencia = useCallback((v: Procedencia | '') => {
    setForm(f => ({
      ...f,
      procedencia: v,
      paisOrigen: '',
      provinciaOrigen: '',
      departamentoOrigen: '',
    }))
    setErrores(e => ({ ...e, procedencia: undefined, paisOrigen: undefined, provinciaOrigen: undefined, departamentoOrigen: undefined }))
  }, [])

  // ─── Validación ───────────────────────────────────────────────────────────

  function validar(): boolean {
    const e: Errores = {}

    if (!form.procedencia) e.procedencia = 'Requerido'
    if (form.procedencia === 'INTERNACIONAL' && !form.paisOrigen) e.paisOrigen = 'Indicá el país'
    if (form.procedencia === 'NACIONAL' && !form.provinciaOrigen) e.provinciaOrigen = 'Seleccioná una provincia'
    if (form.procedencia === 'PROVINCIAL' && !form.departamentoOrigen) e.departamentoOrigen = 'Seleccioná un departamento'

    if (!form.medioTransporte) e.medioTransporte = 'Requerido'
    if (!form.grupoViaje) e.grupoViaje = 'Requerido'
    if (!form.cantidadPersonas || Number(form.cantidadPersonas) < 1) e.cantidadPersonas = 'Ingresá la cantidad de personas'
    if (!form.motivoVisita) e.motivoVisita = 'Requerido'
    if (!form.tipoAlojamiento) e.tipoAlojamiento = 'Requerido'
    if (!form.cantidadNoches && form.tipoAlojamiento !== 'NO SE ALOJA/SE ENCUENTRA DE PASO') {
      e.cantidadNoches = 'Ingresá la cantidad de noches'
    }

    if (!form.edad || Number(form.edad) < 1) e.edad = 'Ingresá la edad'
    if (!form.primeraVez) e.primeraVez = 'Requerido'
    const necesitaMovilidad = form.medioTransporte === 'OMNIBUS' || form.medioTransporte === 'AVION'
    if (necesitaMovilidad && !form.movilidadCiudad) e.movilidadCiudad = 'Requerido'

    if (!form.otrosDestinos) e.otrosDestinos = 'Requerido'
    if (form.factoresDecision.length === 0) e.factoresDecision = 'Seleccioná al menos un factor'

    const sinValoracion = DIMENSIONES_VALORACION.some(d => form.valoraciones[d.key] === 0)
    if (sinValoracion) e.valoraciones = 'Completá todas las valoraciones (o marcá S/D si no aplica)'

    if (!form.volveria) e.volveria = 'Requerido'
    if (!form.recomendaria) e.recomendaria = 'Requerido'

    if (!form.lugarCaptado) e.lugarCaptado = 'Requerido'
    if (!form.responsableCarga.trim()) e.responsableCarga = 'Ingresá el responsable'

    setErrores(e)

    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        const el = document.querySelector('[data-error]')
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return false
    }
    return true
  }

  // ─── Envío ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return

    setEstado('enviando')

    // Construir payload con las claves exactas que espera el GAS
    const payload = {
      timestamp: new Date().toISOString(),
      procedencia: form.procedencia,
      pais_origen: form.procedencia === 'INTERNACIONAL' ? form.paisOrigen : '',
      provincia_origen: form.procedencia === 'NACIONAL' ? form.provinciaOrigen : '',
      departamento_origen: form.procedencia === 'PROVINCIAL' ? form.departamentoOrigen : '',
      medio_transporte: form.medioTransporte,
      grupo_viaje: form.grupoViaje,
      cantidad_personas: Number(form.cantidadPersonas),
      motivo_visita: form.motivoVisita,
      tipo_alojamiento: form.tipoAlojamiento,
      cantidad_noches: form.tipoAlojamiento === 'NO SE ALOJA/SE ENCUENTRA DE PASO' ? 0 : Number(form.cantidadNoches),
      lugar_captado: form.lugarCaptado,
      edad: Number(form.edad),
      comentarios: form.comentarios,
      movilidad_ciudad: necesitaMovilidad ? form.movilidadCiudad : '',
      primera_vez: form.primeraVez,
      otros_destinos: form.otrosDestinos,
      factores_decision: form.factoresDecision.join(', '),
      sat_alojamiento: form.valoraciones.alojamiento === -1 ? '' : form.valoraciones.alojamiento,
      sat_gastronomia: form.valoraciones.gastronomia === -1 ? '' : form.valoraciones.gastronomia,
      sat_calidad_precio: form.valoraciones.calidad_precio === -1 ? '' : form.valoraciones.calidad_precio,
      sat_hospitalidad: form.valoraciones.hospitalidad === -1 ? '' : form.valoraciones.hospitalidad,
      sat_seguridad: form.valoraciones.seguridad === -1 ? '' : form.valoraciones.seguridad,
      sat_info_turistica: form.valoraciones.info_turistica === -1 ? '' : form.valoraciones.info_turistica,
      sat_senaletica: form.valoraciones.senaletica === -1 ? '' : form.valoraciones.senaletica,
      sat_oferta_cultural: form.valoraciones.oferta_cultural === -1 ? '' : form.valoraciones.oferta_cultural,
      sat_estadia_general: form.valoraciones.estadia_general === -1 ? '' : form.valoraciones.estadia_general,
      volveria: form.volveria,
      recomendaria: form.recomendaria,
      responsable_carga: form.responsableCarga,
    }

    try {
      const res = await fetch('/api/ocio/encuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      if (!res.ok || result.error) {
        throw new Error(result.error ?? `Error ${res.status}`)
      }

      setEstado('exito')
      setForm({ ...ESTADO_INICIAL, responsableCarga: form.responsableCarga, lugarCaptado: form.lugarCaptado })
      setErrores({})

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setEstado('error')
      setErrorMsg(String(err))
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const noAloja = form.tipoAlojamiento === 'NO SE ALOJA/SE ENCUENTRA DE PASO'
  const necesitaMovilidad = form.medioTransporte === 'OMNIBUS' || form.medioTransporte === 'AVION'

  return (
    <div>
      <h2 className="section-title">Encuesta Perfil del Turista</h2>
      <p className="text-sm text-text-secondary -mt-6 mb-8">
        Encuesta permanente · San Fernando del Valle de Catamarca
      </p>

      {/* Banner éxito */}
      {estado === 'exito' && (
        <div className="mb-6 rounded-2xl bg-green-50 border border-green-200 px-6 py-4 flex items-start gap-3">
          <i className="fa-solid fa-circle-check text-green-500 text-xl mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">¡Encuesta registrada con éxito!</p>
            <p className="text-sm text-green-700 mt-0.5">El formulario fue reiniciado. Podés cargar otra encuesta.</p>
          </div>
        </div>
      )}

      {/* Banner error */}
      {estado === 'error' && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-6 py-4 flex items-start gap-3">
          <i className="fa-solid fa-circle-xmark text-red-400 text-xl mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Error al enviar</p>
            <p className="text-sm text-red-700 mt-0.5">{errorMsg}</p>
            <button onClick={() => setEstado('idle')} className="text-sm text-red-600 underline mt-1">Reintentar</button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">

        {/* ── Sección 1: Origen ─────────────────────────────────────────── */}
        <div className="card p-6 overflow-visible">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
            Origen
          </h3>

          <div className="flex flex-col gap-5">
            <Field label="Procedencia" required error={errores.procedencia}>
              <RadioGroup
                name="procedencia"
                options={[...PROCEDENCIAS]}
                value={form.procedencia}
                onChange={v => setProcedencia(v as Procedencia)}
                cols={3}
              />
            </Field>

            {form.procedencia === 'INTERNACIONAL' && (
              <ComboboxField
                label="País de Origen"
                options={PAISES}
                value={form.paisOrigen}
                onChange={v => { set('paisOrigen', v); setErrores(e => ({ ...e, paisOrigen: undefined })) }}
                placeholder="Escribí el país…"
                required
                error={errores.paisOrigen}
              />
            )}

            {form.procedencia === 'NACIONAL' && (
              <Field label="Provincia de Origen" required error={errores.provinciaOrigen}>
                <select
                  value={form.provinciaOrigen}
                  onChange={e => set('provinciaOrigen', e.target.value)}
                  className={`input bg-white ${errores.provinciaOrigen ? 'border-red-400' : ''}`}
                >
                  <option value="">— Seleccioná una provincia —</option>
                  {PROVINCIAS_ARG.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            )}

            {form.procedencia === 'PROVINCIAL' && (
              <Field label="Departamento de Origen" required error={errores.departamentoOrigen}>
                <select
                  value={form.departamentoOrigen}
                  onChange={e => set('departamentoOrigen', e.target.value)}
                  className={`input bg-white ${errores.departamentoOrigen ? 'border-red-400' : ''}`}
                >
                  <option value="">— Seleccioná un departamento —</option>
                  {DEPARTAMENTOS_CATAMARCA.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            )}
          </div>
        </div>

        {/* ── Sección 2: Datos del viaje ────────────────────────────────── */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
            Datos del Viaje
          </h3>

          <div className="flex flex-col gap-5">
            <Field label="Medio de transporte utilizado para llegar a la ciudad" required error={errores.medioTransporte}>
              <RadioGroup
                name="medioTransporte"
                options={MEDIOS_TRANSPORTE}
                value={form.medioTransporte}
                onChange={setMedioTransporte}
                cols={2}
              />
            </Field>

            {necesitaMovilidad && (
              <Field label="Principal Medio de Movilidad en la Ciudad" required error={errores.movilidadCiudad}>
                <RadioGroup
                  name="movilidadCiudad"
                  options={MOVILIDADES_CIUDAD}
                  value={form.movilidadCiudad}
                  onChange={v => set('movilidadCiudad', v)}
                  cols={2}
                />
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Grupo de Viaje" required error={errores.grupoViaje}>
                <select
                  value={form.grupoViaje}
                  onChange={e => set('grupoViaje', e.target.value)}
                  className={`input bg-white ${errores.grupoViaje ? 'border-red-400' : ''}`}
                >
                  <option value="">— Seleccioná —</option>
                  {GRUPOS_VIAJE.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>

              <Field label="Personas en el grupo (incluido el encuestado)" required error={errores.cantidadPersonas}>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={form.cantidadPersonas}
                  onChange={e => set('cantidadPersonas', e.target.value)}
                  className={`input ${errores.cantidadPersonas ? 'border-red-400' : ''}`}
                  placeholder="ej: 3"
                />
              </Field>
            </div>

            <Field label="Principal Motivo de la Visita" required error={errores.motivoVisita}>
              <RadioGroup
                name="motivoVisita"
                options={MOTIVOS_VISITA}
                value={form.motivoVisita}
                onChange={v => set('motivoVisita', v)}
                cols={2}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Tipo de Alojamiento elegido" required error={errores.tipoAlojamiento}>
                <select
                  value={form.tipoAlojamiento}
                  onChange={e => set('tipoAlojamiento', e.target.value)}
                  className={`input bg-white ${errores.tipoAlojamiento ? 'border-red-400' : ''}`}
                >
                  <option value="">— Seleccioná —</option>
                  {TIPOS_ALOJAMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field
                label={noAloja ? 'Cantidad de Noches' : 'Cantidad de Noches que se aloja en la ciudad'}
                required={!noAloja}
                error={errores.cantidadNoches}
              >
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={noAloja ? '' : form.cantidadNoches}
                  onChange={e => set('cantidadNoches', e.target.value)}
                  disabled={noAloja}
                  className={`input ${noAloja ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''} ${errores.cantidadNoches ? 'border-red-400' : ''}`}
                  placeholder={noAloja ? 'No aplica' : 'ej: 2'}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Sección 3: Datos del turista ──────────────────────────────── */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">3</span>
            Datos del Turista
          </h3>

          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field label="Edad" required error={errores.edad}>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.edad}
                  onChange={e => set('edad', e.target.value)}
                  className={`input ${errores.edad ? 'border-red-400' : ''}`}
                  placeholder="ej: 35"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="¿Visita la ciudad por primera vez?" required error={errores.primeraVez}>
                  <RadioGroup
                    name="primeraVez"
                    options={['SÍ', 'NO']}
                    value={form.primeraVez}
                    onChange={v => set('primeraVez', v)}
                    cols={2}
                  />
                </Field>
              </div>
            </div>

          </div>
        </div>

        {/* ── Sección 4: Decisión de visita ─────────────────────────────── */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">4</span>
            Decisión de Visita
          </h3>

          <div className="flex flex-col gap-5">
            <Field label="¿Pensó en otros destinos antes que en SFVC?" required error={errores.otrosDestinos}>
              <RadioGroup
                name="otrosDestinos"
                options={['SÍ', 'NO']}
                value={form.otrosDestinos}
                onChange={v => set('otrosDestinos', v)}
                cols={2}
              />
            </Field>

            <Field
              label="¿Qué lo ayudó a decidir por SFVC?"
              required
              hint="Podés seleccionar más de una opción"
              error={errores.factoresDecision}
            >
              <CheckboxGroup
                options={FACTORES_DECISION}
                selected={form.factoresDecision}
                onChange={v => {
                  setForm(f => ({ ...f, factoresDecision: v }))
                  setErrores(e => ({ ...e, factoresDecision: undefined }))
                }}
              />
            </Field>
          </div>
        </div>

        {/* ── Sección 5: Valoraciones ───────────────────────────────────── */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">5</span>
            Valoraciones del Destino
          </h3>
          <p className="text-xs text-text-secondary mb-5">
            Escala del 1 al 5 · 1 = Muy mala · 5 = Excelente · S/D = Sin dato / No aplica
          </p>

          <MatrizValoracion
            valoraciones={form.valoraciones}
            onChange={setValoracion}
            error={errores.valoraciones}
          />
        </div>

        {/* ── Sección 6: Satisfacción final ─────────────────────────────── */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">6</span>
            Satisfacción General
          </h3>

          <div className="flex flex-col gap-5">
            <Field label="¿Visitaría SFVC nuevamente?" required error={errores.volveria}>
              <RadioGroup
                name="volveria"
                options={['MUY PROBABLE', 'POCO PROBABLE', 'NADA PROBABLE']}
                value={form.volveria}
                onChange={v => set('volveria', v)}
                cols={3}
              />
            </Field>

            <Field label="¿Recomendaría visitar SFVC?" required error={errores.recomendaria}>
              <RadioGroup
                name="recomendaria"
                options={['SI', 'TAL VEZ', 'NO']}
                value={form.recomendaria}
                onChange={v => set('recomendaria', v)}
                cols={3}
              />
            </Field>

            <Field label="Comentarios y/o Sugerencias">
              <textarea
                value={form.comentarios}
                onChange={e => set('comentarios', e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="Comentarios del turista (opcional)"
              />
            </Field>
          </div>
        </div>

        {/* ── Sección 7: Datos operativos ───────────────────────────────── */}
        <div className="card p-6 border-dashed border-2 border-gray-200 bg-gray-50/50">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center font-bold">7</span>
            Datos Operativos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Lugar donde fue captado el dato" required error={errores.lugarCaptado}>
              <select
                value={form.lugarCaptado}
                onChange={e => set('lugarCaptado', e.target.value)}
                className={`input bg-white ${errores.lugarCaptado ? 'border-red-400' : ''}`}
              >
                <option value="">— Seleccioná un lugar —</option>
                {LUGARES_CAPTADO.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>

            <Field label="Responsable de carga" required error={errores.responsableCarga}>
              <input
                type="text"
                value={form.responsableCarga}
                onChange={e => set('responsableCarga', e.target.value)}
                className={`input ${errores.responsableCarga ? 'border-red-400' : ''}`}
                placeholder="Nombre del encuestador"
              />
            </Field>
          </div>
        </div>

        {/* ── Botón enviar ──────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={estado === 'enviando'}
            className="btn-primary px-10 py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {estado === 'enviando' ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin" />
                Enviando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane" />
                Registrar Encuesta
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  )
}
