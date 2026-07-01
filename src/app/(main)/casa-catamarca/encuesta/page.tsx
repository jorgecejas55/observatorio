'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Field } from '@/components/forms/Field'
import { RadioGroup } from '@/components/forms/RadioGroup'
import { CheckboxGroup } from '@/components/forms/CheckboxGroup'
import { ProcedenciaFields } from '@/components/forms/ProcedenciaFields'
import {
  RANGOS_EDAD,
  VIAJE_CON_OPCIONES,
  DURACION_VIAJE,
  ETAPA_VIAJE,
  CONOCIA_CATAMARCA,
  INTERESES_OPCIONES,
  COMO_SE_ENTERO_OPCIONES,
  DONDE_BUSCA_INFO_OPCIONES,
  REDES_SOCIALES_OPCIONES,
  INTERES_CAPITAL_OPCIONES,
  ACTIVIDADES_CAPITAL_OPCIONES,
  DIAS_EN_CAPITAL,
  ESTADO_INICIAL,
} from '@/lib/casa-catamarca-types'
import type { FormState, Errores } from '@/lib/casa-catamarca-types'
import type { Procedencia } from '@/lib/geografia'

// ─── Escala lineal (1..10) ──────────────────────────────────────────────────

function EscalaLineal({ valor, onChange, error }: {
  valor: string
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="hidden sm:flex flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, i) => {
          const n = String(i + 1)
          const selected = valor === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                ${selected
                  ? 'bg-primary border-primary text-white shadow-sm'
                  : 'bg-white border-gray-200 text-text-secondary hover:border-primary/50 hover:text-primary'
                }`}
            >
              {n}
            </button>
          )
        })}
      </div>
      {/* Mobile fallback: select */}
      <select
        value={valor}
        onChange={e => onChange(e.target.value)}
        className="input sm:hidden"
      >
        <option value="">— Seleccioná (1-10) —</option>
        {Array.from({ length: 10 }, (_, i) => (
          <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
        ))}
      </select>
      <div className="flex justify-between text-xs text-text-secondary px-1">
        <span>1 = Nada probable</span>
        <span>10 = Muy probable</span>
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1" data-error>
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />{error}
        </p>
      )}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

type EstadoForm = 'idle' | 'enviando' | 'exito' | 'error'

export default function CasaCatamarcaEncuestaPage() {
  const { data: session } = useSession()
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL)
  const [errores, setErrores] = useState<Errores>({})
  const [estado, setEstado] = useState<EstadoForm>('idle')
  const [errorMsg, setErrorMsg] = useState('')

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

  const setArray = useCallback((key: keyof FormState, val: string[]) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrores(e => ({ ...e, [key]: undefined }))
  }, [])

  // Limpiar "Otro" texto cuando se deselecciona la opción "OTRO"
  const setViajeCon = useCallback((v: string) => {
    setForm(f => ({ ...f, viajeCon: v, viajeConOtroTexto: v === 'OTRO' ? f.viajeConOtroTexto : '' }))
    setErrores(e => ({ ...e, viajeCon: undefined }))
  }, [])

  // ─── Validación ───────────────────────────────────────────────────────────

  function validar(): boolean {
    const e: Errores = {}

    // P1 — Procedencia
    if (!form.procedencia) e.procedencia = 'Requerido'
    if (form.procedencia === 'INTERNACIONAL' && !form.paisOrigen) e.paisOrigen = 'Indicá el país'
    if (form.procedencia === 'NACIONAL' && !form.provinciaOrigen) e.provinciaOrigen = 'Seleccioná una provincia'
    if (form.procedencia === 'NACIONAL' && form.provinciaOrigen === 'BUENOS AIRES' && !form.localidadOrigen)
      e.localidadOrigen = 'Seleccioná un partido'
    if (form.procedencia === 'NACIONAL' && form.provinciaOrigen === 'CABA' && !form.localidadOrigen)
      e.localidadOrigen = 'Seleccioná un barrio'

    // P2
    if (!form.rangoEdad) e.rangoEdad = 'Requerido'

    // P3
    if (!form.viajeCon) e.viajeCon = 'Requerido'
    if (form.viajeCon === 'OTRO' && !form.viajeConOtroTexto.trim()) e.viajeConOtroTexto = 'Especificá con quién'

    // P4
    if (!form.duracionViaje) e.duracionViaje = 'Requerido'

    // P5
    if (!form.etapaViaje) e.etapaViaje = 'Requerido'

    // P6
    if (!form.conociaCatamarca) e.conociaCatamarca = 'Requerido'

    // P7 — checkbox: al menos 1
    if (form.intereses.length === 0) e.intereses = 'Seleccioná al menos un interés'
    if (form.intereses.includes('OTRO') && !form.interesesOtroTexto.trim()) e.interesesOtroTexto = 'Especificá'

    // P9
    if (!form.comoSeEntero) e.comoSeEntero = 'Requerido'
    if (form.comoSeEntero === 'OTRO' && !form.comoSeEnteroOtroTexto.trim()) e.comoSeEnteroOtroTexto = 'Especificá'

    // P10 — checkbox: al menos 1
    if (form.dondeBuscaInfo.length === 0) e.dondeBuscaInfo = 'Seleccioná al menos una opción'
    if (form.dondeBuscaInfo.includes('OTRO') && !form.dondeBuscaInfoOtroTexto.trim()) e.dondeBuscaInfoOtroTexto = 'Especificá'

    // P11
    if (!form.redSocialInspiracion) e.redSocialInspiracion = 'Requerido'
    if (form.redSocialInspiracion === 'OTRA' && !form.redSocialOtraTexto.trim()) e.redSocialOtraTexto = 'Especificá'

    // P13
    if (!form.probabilidadViaje) e.probabilidadViaje = 'Requerido'

    // P16
    if (!form.interesCapital) e.interesCapital = 'Requerido'

    // P17-19 solo si P16 != "NO"
    if (form.interesCapital !== 'NO') {
      if (form.actividadesCapital.length === 0) e.actividadesCapital = 'Seleccioná al menos una actividad'
      if (form.actividadesCapital.includes('OTRO') && !form.actividadesCapitalOtroTexto.trim()) e.actividadesCapitalOtroTexto = 'Especificá'
      if (!form.diasEnCapital) e.diasEnCapital = 'Requerido'
      if (!form.expectativasCapital.trim()) e.expectativasCapital = 'Requerido'
    }

    // Cierre
    if (!form.aceptaInfo) e.aceptaInfo = 'Requerido'
    if (form.aceptaInfo === 'SÍ' && !form.emailContacto.trim()) {
      e.emailContacto = 'Ingresá tu email'
    } else if (form.aceptaInfo === 'SÍ' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailContacto)) {
      e.emailContacto = 'Formato de email inválido'
    }

    // Operativo: responsable requerido solo si hay sesión (operativo logueado)
    if (session?.user?.email && !form.responsableCarga.trim()) {
      e.responsableCarga = 'Ingresá el responsable'
    }

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

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validar()) return

    setEstado('enviando')

    const interesCapitalNo = form.interesCapital === 'NO'

    const payload = {
      timestamp: new Date().toISOString(),
      procedencia: form.procedencia,
      pais_origen: form.procedencia === 'INTERNACIONAL' ? form.paisOrigen : '',
      provincia_origen: form.procedencia === 'NACIONAL' ? form.provinciaOrigen : '',
      departamento_origen: '',
      localidad_origen: (form.procedencia === 'NACIONAL' && (form.provinciaOrigen === 'BUENOS AIRES' || form.provinciaOrigen === 'CABA'))
        ? form.localidadOrigen : '',
      rango_edad: form.rangoEdad,
      viaje_con: form.viajeCon,
      viaje_con_otro_texto: form.viajeCon === 'OTRO' ? form.viajeConOtroTexto : '',
      duracion_viaje: form.duracionViaje,
      etapa_viaje: form.etapaViaje,
      conocia_catamarca: form.conociaCatamarca,
      intereses: form.intereses.join(', '),
      intereses_otro_texto: form.intereses.includes('OTRO') ? form.interesesOtroTexto : '',
      lugar_imperdible: form.lugarImperdible,
      como_se_entero: form.comoSeEntero,
      como_se_entero_otro_texto: form.comoSeEntero === 'OTRO' ? form.comoSeEnteroOtroTexto : '',
      donde_busca_info: form.dondeBuscaInfo.join(', '),
      donde_busca_info_otro_texto: form.dondeBuscaInfo.includes('OTRO') ? form.dondeBuscaInfoOtroTexto : '',
      red_social_inspiracion: form.redSocialInspiracion,
      red_social_otra_texto: form.redSocialInspiracion === 'OTRA' ? form.redSocialOtraTexto : '',
      dudas_dificultades: form.dudasDificultades,
      probabilidad_viaje: Number(form.probabilidadViaje),
      interes_capital: form.interesCapital,
      actividades_capital: interesCapitalNo ? '' : form.actividadesCapital.join(', '),
      actividades_capital_otro_texto: (!interesCapitalNo && form.actividadesCapital.includes('OTRO')) ? form.actividadesCapitalOtroTexto : '',
      dias_en_capital: interesCapitalNo ? '' : form.diasEnCapital,
      expectativas_capital: interesCapitalNo ? '' : form.expectativasCapital,
      falta_info: form.faltaInfo,
      motivador_decision: form.motivadorDecision,
      experiencias_deseadas: form.experienciasDeseadas,
      acepta_info: form.aceptaInfo,
      email_contacto: form.aceptaInfo === 'SÍ' ? form.emailContacto : '',
      responsable_carga: form.responsableCarga,
      canal_carga: 'CASA_CATAMARCA_BSAS',
    }

    try {
      const res = await fetch('/api/casa-catamarca/encuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      if (!res.ok || result.error) {
        throw new Error(result.error ?? `Error ${res.status}`)
      }

      setEstado('exito')
      // Reiniciar form manteniendo responsable
      setForm({ ...ESTADO_INICIAL, responsableCarga: form.responsableCarga })
      setErrores({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setEstado('error')
      setErrorMsg(String(err))
    }
  }

  // ─── Datos derivados ──────────────────────────────────────────────────────

  const ocultarSeccion5 = form.interesCapital === 'NO'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <h2 className="section-title">Casa de Catamarca — Encuesta</h2>
      <p className="text-sm text-text-secondary -mt-6 mb-8">
        Casa de Catamarca en Buenos Aires · Encuesta al potencial visitante
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

        {/* ─── Sección 1: Sobre vos ───────────────────────────────────────── */}
        <div className="card p-6 overflow-visible">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
            Sobre vos
          </h3>

          <div className="flex flex-col gap-5">
            {/* P1 — Procedencia (cascada completa con localidad) */}
            <ProcedenciaFields
              values={{
                procedencia: form.procedencia as Procedencia | '',
                paisOrigen: form.paisOrigen,
                provinciaOrigen: form.provinciaOrigen,
                departamentoOrigen: form.departamentoOrigen,
                localidadOrigen: form.localidadOrigen,
              }}
              onProcedenciaChange={v => set('procedencia', v as FormState['procedencia'])}
              onPaisOrigenChange={v => set('paisOrigen', v)}
              onProvinciaOrigenChange={v => set('provinciaOrigen', v)}
              onDepartamentoOrigenChange={v => set('departamentoOrigen', v)}
              onLocalidadOrigenChange={v => set('localidadOrigen', v)}
              errores={{
                procedencia: errores.procedencia,
                paisOrigen: errores.paisOrigen,
                provinciaOrigen: errores.provinciaOrigen,
                departamentoOrigen: errores.departamentoOrigen,
                localidadOrigen: errores.localidadOrigen,
              }}
              mostrarLocalidad
              mostrarProcedencias={['NACIONAL', 'INTERNACIONAL']}
            />

            {/* P2 — Rango de edad */}
            <Field label="Rango de edad" required error={errores.rangoEdad}>
              <RadioGroup
                name="rangoEdad"
                options={[...RANGOS_EDAD]}
                value={form.rangoEdad}
                onChange={v => set('rangoEdad', v)}
                cols={3}
              />
            </Field>

            {/* P3 — Con quién viajaría */}
            <Field label="¿Con quién viajarías?" required error={errores.viajeCon}>
              <RadioGroup
                name="viajeCon"
                options={[...VIAJE_CON_OPCIONES]}
                value={form.viajeCon}
                onChange={setViajeCon}
                cols={2}
              />
            </Field>
            {form.viajeCon === 'OTRO' && (
              <Field label="Especificá con quién" required error={errores.viajeConOtroTexto}>
                <input
                  type="text"
                  value={form.viajeConOtroTexto}
                  onChange={e => set('viajeConOtroTexto', e.target.value)}
                  className={`input ${errores.viajeConOtroTexto ? 'border-red-400' : ''}`}
                  placeholder="Ej: con mi mascota, con un grupo de estudio…"
                />
              </Field>
            )}

            {/* P4 — Duración del viaje */}
            <Field label="¿Cuántos días suelen durar tus viajes?" required error={errores.duracionViaje}>
              <RadioGroup
                name="duracionViaje"
                options={[...DURACION_VIAJE]}
                value={form.duracionViaje}
                onChange={v => set('duracionViaje', v)}
                cols={3}
              />
            </Field>
          </div>
        </div>

        {/* ─── Sección 2: Tu viaje a Catamarca ────────────────────────────── */}
        <div className="card p-6 overflow-visible">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
            Tu viaje a Catamarca
          </h3>

          <div className="flex flex-col gap-5">
            {/* P5 — Etapa */}
            <Field label="¿En qué etapa estás respecto al viaje?" required error={errores.etapaViaje}>
              <RadioGroup
                name="etapaViaje"
                options={[...ETAPA_VIAJE]}
                value={form.etapaViaje}
                onChange={v => set('etapaViaje', v)}
                cols={1}
              />
            </Field>

            {/* P6 — Conocía Catamarca */}
            <Field label="¿Ya conocías Catamarca?" required error={errores.conociaCatamarca}>
              <RadioGroup
                name="conociaCatamarca"
                options={[...CONOCIA_CATAMARCA]}
                value={form.conociaCatamarca}
                onChange={v => set('conociaCatamarca', v)}
                cols={1}
              />
            </Field>

            {/* P7 — Intereses (checkbox) */}
            <Field
              label="¿Qué te interesa hacer en Catamarca?"
              required
              hint="Podés seleccionar más de una opción"
              error={errores.intereses}
            >
              <CheckboxGroup
                options={[...INTERESES_OPCIONES]}
                selected={form.intereses}
                onChange={v => setArray('intereses', v)}
              />
            </Field>
            {form.intereses.includes('OTRO') && (
              <Field label="Especificá" required error={errores.interesesOtroTexto}>
                <input
                  type="text"
                  value={form.interesesOtroTexto}
                  onChange={e => set('interesesOtroTexto', e.target.value)}
                  className={`input ${errores.interesesOtroTexto ? 'border-red-400' : ''}`}
                  placeholder="¿Qué otra cosa te interesaría hacer?"
                />
              </Field>
            )}

            {/* P8 — Lugar imperdible */}
            <Field label="¿Qué lugar te gustaría conocer sí o sí?" error={errores.lugarImperdible}>
              <input
                type="text"
                value={form.lugarImperdible}
                onChange={e => set('lugarImperdible', e.target.value)}
                className={`input ${errores.lugarImperdible ? 'border-red-400' : ''}`}
                placeholder="Ej: Cuesta del Portezuelo, Campo de Piedra Pómez…"
              />
            </Field>
          </div>
        </div>

        {/* ─── Sección 3: Información y decisión ───────────────────────────── */}
        <div className="card p-6 overflow-visible">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">3</span>
            Información y decisión
          </h3>

          <div className="flex flex-col gap-5">
            {/* P9 — Cómo se enteró */}
            <Field label="¿Cómo te enteraste de Catamarca?" required error={errores.comoSeEntero}>
              <RadioGroup
                name="comoSeEntero"
                options={[...COMO_SE_ENTERO_OPCIONES]}
                value={form.comoSeEntero}
                onChange={v => {
                  set('comoSeEntero', v)
                  if (v !== 'OTRO') set('comoSeEnteroOtroTexto', '')
                }}
                cols={1}
              />
            </Field>
            {form.comoSeEntero === 'OTRO' && (
              <Field label="Especificá" required error={errores.comoSeEnteroOtroTexto}>
                <input
                  type="text"
                  value={form.comoSeEnteroOtroTexto}
                  onChange={e => set('comoSeEnteroOtroTexto', e.target.value)}
                  className={`input ${errores.comoSeEnteroOtroTexto ? 'border-red-400' : ''}`}
                />
              </Field>
            )}

            {/* P10 — Dónde busca info (checkbox) */}
            <Field
              label="¿Dónde buscás información cuando planeás un viaje?"
              required
              hint="Podés seleccionar más de una opción"
              error={errores.dondeBuscaInfo}
            >
              <CheckboxGroup
                options={[...DONDE_BUSCA_INFO_OPCIONES]}
                selected={form.dondeBuscaInfo}
                onChange={v => setArray('dondeBuscaInfo', v)}
              />
            </Field>
            {form.dondeBuscaInfo.includes('OTRO') && (
              <Field label="Especificá" required error={errores.dondeBuscaInfoOtroTexto}>
                <input
                  type="text"
                  value={form.dondeBuscaInfoOtroTexto}
                  onChange={e => set('dondeBuscaInfoOtroTexto', e.target.value)}
                  className={`input ${errores.dondeBuscaInfoOtroTexto ? 'border-red-400' : ''}`}
                  placeholder="¿Dónde más buscás información?"
                />
              </Field>
            )}

            {/* P11 — Red social */}
            <Field label="¿Qué red social usás más para inspirarte?" required error={errores.redSocialInspiracion}>
              <RadioGroup
                name="redSocialInspiracion"
                options={[...REDES_SOCIALES_OPCIONES]}
                value={form.redSocialInspiracion}
                onChange={v => {
                  set('redSocialInspiracion', v)
                  if (v !== 'OTRA') set('redSocialOtraTexto', '')
                }}
                cols={2}
              />
            </Field>
            {form.redSocialInspiracion === 'OTRA' && (
              <Field label="Especificá" required error={errores.redSocialOtraTexto}>
                <input
                  type="text"
                  value={form.redSocialOtraTexto}
                  onChange={e => set('redSocialOtraTexto', e.target.value)}
                  className={`input ${errores.redSocialOtraTexto ? 'border-red-400' : ''}`}
                />
              </Field>
            )}
          </div>
        </div>

        {/* ─── Sección 4: Percepción ───────────────────────────────────────── */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">4</span>
            Percepción de Catamarca
          </h3>

          <div className="flex flex-col gap-5">
            {/* P12 — Dudas (opcional) */}
            <Field label="¿Qué dudas o dificultades te genera viajar?" hint="Opcional">
              <textarea
                value={form.dudasDificultades}
                onChange={e => set('dudasDificultades', e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="Contanos qué te preocupa o te genera dudas a la hora de planificar tu viaje…"
              />
            </Field>

            {/* P13 — Probabilidad (escala lineal 1-10) */}
            <Field label="¿Qué tan probable es que viajes a Catamarca?" required error={errores.probabilidadViaje}>
              <EscalaLineal
                valor={form.probabilidadViaje}
                onChange={v => set('probabilidadViaje', v)}
              />
            </Field>
          </div>
        </div>

        {/* ─── Sección 5: Enfoque en capital ───────────────────────────────── */}
        <div className="card p-6 overflow-visible">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">5</span>
            Enfoque en la capital
          </h3>

          <div className="flex flex-col gap-5">
            {/* P16 — Interés en capital */}
            <Field label="¿Te interesa visitar la ciudad capital?" required error={errores.interesCapital}>
              <RadioGroup
                name="interesCapital"
                options={[...INTERES_CAPITAL_OPCIONES]}
                value={form.interesCapital}
                onChange={v => {
                  set('interesCapital', v)
                  if (v === 'NO') {
                    setArray('actividadesCapital', [])
                    set('actividadesCapitalOtroTexto', '')
                    set('diasEnCapital', '')
                    set('expectativasCapital', '')
                  }
                }}
                cols={3}
              />
            </Field>

            {ocultarSeccion5 ? (
              <p className="text-sm text-text-secondary italic py-2">
                Pasamos a las siguientes preguntas.
              </p>
            ) : form.interesCapital ? (
              <>
                {/* P17 — Actividades en la capital (checkbox) */}
                <Field
                  label="¿Qué te gustaría hacer en la capital?"
                  required
                  hint="Podés seleccionar más de una opción"
                  error={errores.actividadesCapital}
                >
                  <CheckboxGroup
                    options={[...ACTIVIDADES_CAPITAL_OPCIONES]}
                    selected={form.actividadesCapital}
                    onChange={v => setArray('actividadesCapital', v)}
                  />
                </Field>
                {form.actividadesCapital.includes('OTRO') && (
                  <Field label="Especificá" required error={errores.actividadesCapitalOtroTexto}>
                    <input
                      type="text"
                      value={form.actividadesCapitalOtroTexto}
                      onChange={e => set('actividadesCapitalOtroTexto', e.target.value)}
                      className={`input ${errores.actividadesCapitalOtroTexto ? 'border-red-400' : ''}`}
                    />
                  </Field>
                )}

                {/* P18 — Días en capital */}
                <Field label="¿Cuántos días te quedarías en la capital?" required error={errores.diasEnCapital}>
                  <RadioGroup
                    name="diasEnCapital"
                    options={[...DIAS_EN_CAPITAL]}
                    value={form.diasEnCapital}
                    onChange={v => set('diasEnCapital', v)}
                    cols={2}
                  />
                </Field>

                {/* P19 — Expectativas */}
                <Field label="¿Qué esperás encontrar en una capital como Catamarca?" required error={errores.expectativasCapital}>
                  <input
                    type="text"
                    value={form.expectativasCapital}
                    onChange={e => set('expectativasCapital', e.target.value)}
                    className={`input ${errores.expectativasCapital ? 'border-red-400' : ''}`}
                    placeholder="Contanos qué esperás de la capital…"
                  />
                </Field>
              </>
            ) : null}
          </div>
        </div>

        {/* ─── Sección 6: Oportunidades ────────────────────────────────────── */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">6</span>
            Oportunidades
          </h3>

          <div className="flex flex-col gap-5">
            {/* P20 — Falta info */}
            <Field label="¿Qué información creés que falta sobre Catamarca?" hint="Opcional">
              <textarea
                value={form.faltaInfo}
                onChange={e => set('faltaInfo', e.target.value)}
                className="input resize-none"
                rows={2}
                placeholder="Información que te gustaría encontrar y no encontrás…"
              />
            </Field>

            {/* P21 — Motivador */}
            <Field label="¿Qué te haría decidirte a viajar hoy?" hint="Opcional">
              <textarea
                value={form.motivadorDecision}
                onChange={e => set('motivadorDecision', e.target.value)}
                className="input resize-none"
                rows={2}
                placeholder="Ej: una promo, más info, un acompañante…"
              />
            </Field>

            {/* P22 — Experiencias */}
            <Field label="¿Qué tipo de experiencias te gustaría encontrar?" hint="Opcional">
              <textarea
                value={form.experienciasDeseadas}
                onChange={e => set('experienciasDeseadas', e.target.value)}
                className="input resize-none"
                rows={2}
                placeholder="Ej: turismo aventura, gastronomía, termalismo…"
              />
            </Field>
          </div>
        </div>

        {/* ─── Sección 7: Cierre ───────────────────────────────────────────── */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">7</span>
            ¿Querés que te contemos más?
          </h3>

          <div className="flex flex-col gap-5">
            <Field label="¿Querés recibir información turística?" required error={errores.aceptaInfo}>
              <RadioGroup
                name="aceptaInfo"
                options={['SÍ', 'NO']}
                value={form.aceptaInfo}
                onChange={v => {
                  set('aceptaInfo', v)
                  if (v === 'NO') set('emailContacto', '')
                }}
                cols={2}
              />
            </Field>

            {form.aceptaInfo === 'SÍ' && (
              <Field label="Email" required error={errores.emailContacto}>
                <input
                  type="email"
                  value={form.emailContacto}
                  onChange={e => set('emailContacto', e.target.value)}
                  className={`input ${errores.emailContacto ? 'border-red-400' : ''}`}
                  placeholder="tuemail@ejemplo.com"
                />
              </Field>
            )}
          </div>
        </div>

        {/* ─── Sección 8: Operativo ────────────────────────────────────────── */}
        <div className="card p-6 border-dashed border-2 border-gray-200 bg-gray-50/50">
          <h3 className="text-base font-bold text-text-primary mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center font-bold">8</span>
            Datos Operativos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Responsable de carga"
              required={!!session?.user?.email}
              error={errores.responsableCarga}
            >
              <input
                type="text"
                value={form.responsableCarga}
                onChange={e => set('responsableCarga', e.target.value)}
                className={`input bg-white ${errores.responsableCarga ? 'border-red-400' : ''}`}
                placeholder={session?.user?.name ? undefined : 'Nombre del encuestador'}
              />
            </Field>

            <Field label="Canal de carga">
              <input
                type="text"
                value="Casa de Catamarca (Buenos Aires)"
                readOnly
                disabled
                className="input bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </Field>
          </div>
        </div>

        {/* ─── Botón enviar ──────────────────────────────────────────────── */}
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
