'use client'

import { useState, useEffect } from 'react'
import {
  ESTADOS, FUENTES, ORIGENES, TIPOS, SUBTIPOS, TIPOS_SEDE,
  PERIODICIDADES, PRIORIDADES, SI_NO, EVENTO_VACIO,
  type Evento,
} from '@/config/eventConfig'

// ─── Helpers de formulario ────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function Select({ value, onChange, options, placeholder = '— Seleccioná —', disabled, error }: {
  value: string; onChange: (v: string) => void; options: readonly string[] | string[]
  placeholder?: string; disabled?: boolean; error?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={`input bg-white ${error ? 'border-red-400' : ''}`}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Textarea({ value, onChange, rows = 3, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="input resize-none"
    />
  )
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type FormData = Omit<Evento, 'id' | 'creadoPor' | 'fechaCreacion' | 'modificadoPor' | 'fechaModificacion'>
type Errores = Partial<Record<keyof FormData, string>>

const SECCIONES = ['Identificación', 'Evaluación', 'Resultados'] as const
type Seccion = typeof SECCIONES[number]

// ─── Componente principal ─────────────────────────────────────────────────────

interface EventFormProps {
  evento?: Evento | null
  onSave: (data: FormData) => Promise<void>
  onClose: () => void
}

export default function EventForm({ evento, onSave, onClose }: EventFormProps) {
  const [form, setForm] = useState<FormData>({ ...EVENTO_VACIO })
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)
  const [seccion, setSeccion] = useState<Seccion>('Identificación')

  // Cargar datos si es edición
  useEffect(() => {
    if (evento) {
      const { id, creadoPor, fechaCreacion, modificadoPor, fechaModificacion, ...rest } = evento
      void id; void creadoPor; void fechaCreacion; void modificadoPor; void fechaModificacion
      setForm(rest as FormData)
    } else {
      setForm({ ...EVENTO_VACIO })
    }
  }, [evento])

  const set = <K extends keyof FormData>(campo: K, valor: FormData[K]) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setErrores(prev => ({ ...prev, [campo]: undefined }))
  }

  function validar(): boolean {
    const e: Errores = {}
    if (!form.denominacion.trim()) e.denominacion = 'Requerido.'
    else if (form.denominacion.trim().length < 3) e.denominacion = 'Mínimo 3 caracteres.'
    if (!form.tipo) e.tipo = 'Requerido.'
    if (!form.estado) e.estado = 'Requerido.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Formato de email inválido.'
    if (form.fechaInicio && form.fechaFin && form.fechaFin < form.fechaInicio)
      e.fechaFin = 'Debe ser posterior a la fecha de inicio.'
    const res = Number(form.totalResidentes), noRes = Number(form.totalNoResidentes), tot = Number(form.totalAsistentes)
    if (tot && res && noRes && (res + noRes) > tot)
      e.totalNoResidentes = 'Residentes + no residentes no pueden superar el total.'
    setErrores(e)
    if (Object.keys(e).length > 0) {
      // Navegar a la sección con el primer error
      const camposSeccion1 = ['denominacion','tipo','estado','fuente','generador','origen','subtipo','sede','tipoSede','fechaInicio','fechaFin','duracion','periodicidad','referente','email','telefono']
      const camposSeccion2 = ['prioridad','aprobacionAgenda','solicitaAsistencia','detallesAsistenciaSolicitada','detallesAsistenciaAsignada','derivado','detallesDerivacion','presenciaFisica']
      const campos = Object.keys(e)
      if (campos.some(c => camposSeccion1.includes(c))) setSeccion('Identificación')
      else if (campos.some(c => camposSeccion2.includes(c))) setSeccion('Evaluación')
      else setSeccion('Resultados')
    }
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    setGuardando(true)
    try {
      await onSave(form)
    } finally {
      setGuardando(false)
    }
  }

  const subtipOpciones = form.tipo ? SUBTIPOS[form.tipo as keyof typeof SUBTIPOS] ?? [] : []

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              {evento ? 'Editar evento' : 'Nuevo evento'}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {evento?.denominacion ?? 'Completá los datos del evento'}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost w-9 h-9 rounded-full p-0">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Tabs de sección */}
        <div className="flex border-b border-gray-100">
          {SECCIONES.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeccion(s)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px
                ${seccion === s
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
            >
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-1.5
                ${seccion === s ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary'}`}>
                {i + 1}
              </span>
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">

            {/* ── SECCIÓN 1: Identificación ──────────────────────────────── */}
            {seccion === 'Identificación' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Estado" required error={errores.estado}>
                    <Select value={form.estado} onChange={v => set('estado', v)} options={ESTADOS} error={!!errores.estado} />
                  </Field>
                  <Field label="Fuente">
                    <Select value={form.fuente} onChange={v => set('fuente', v)} options={FUENTES} />
                  </Field>
                </div>

                <Field label="Denominación" required error={errores.denominacion}>
                  <input
                    type="text"
                    value={form.denominacion}
                    onChange={e => set('denominacion', e.target.value)}
                    placeholder="Nombre del evento"
                    className={`input ${errores.denominacion ? 'border-red-400' : ''}`}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Generador">
                    <input type="text" value={form.generador} onChange={e => set('generador', e.target.value)} placeholder="Organización o persona" className="input" />
                  </Field>
                  <Field label="Origen">
                    <Select value={form.origen} onChange={v => set('origen', v)} options={ORIGENES} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Tipo" required error={errores.tipo}>
                    <Select
                      value={form.tipo}
                      onChange={v => { set('tipo', v); set('subtipo', '') }}
                      options={TIPOS}
                      error={!!errores.tipo}
                    />
                  </Field>
                  <Field label="Subtipo">
                    <Select
                      value={form.subtipo}
                      onChange={v => set('subtipo', v)}
                      options={subtipOpciones}
                      disabled={!form.tipo}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Sede">
                    <input type="text" value={form.sede} onChange={e => set('sede', e.target.value)} placeholder="Nombre del lugar" className="input" />
                  </Field>
                  <Field label="Tipo de sede">
                    <Select value={form.tipoSede} onChange={v => set('tipoSede', v)} options={TIPOS_SEDE} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field label="Fecha inicio" error={errores.fechaInicio}>
                    <input type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} className="input" />
                  </Field>
                  <Field label="Fecha fin" error={errores.fechaFin}>
                    <input type="date" value={form.fechaFin} onChange={e => set('fechaFin', e.target.value)} className={`input ${errores.fechaFin ? 'border-red-400' : ''}`} />
                  </Field>
                  <Field label="Duración (días)">
                    <input type="number" min={1} max={365} value={form.duracion} onChange={e => set('duracion', e.target.value)} placeholder="0" className="input" />
                  </Field>
                  <Field label="Periodicidad">
                    <Select value={form.periodicidad} onChange={v => set('periodicidad', v)} options={PERIODICIDADES} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Referente">
                    <input type="text" value={form.referente} onChange={e => set('referente', e.target.value)} placeholder="Nombre" className="input" />
                  </Field>
                  <Field label="Email" error={errores.email}>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" className={`input ${errores.email ? 'border-red-400' : ''}`} />
                  </Field>
                  <Field label="Teléfono">
                    <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+54 383..." className="input" />
                  </Field>
                </div>
              </div>
            )}

            {/* ── SECCIÓN 2: Evaluación ──────────────────────────────────── */}
            {seccion === 'Evaluación' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Prioridad">
                    <Select value={form.prioridad} onChange={v => set('prioridad', v)} options={PRIORIDADES} />
                  </Field>
                  <Field label="Aprobación en agenda">
                    <Select value={form.aprobacionAgenda} onChange={v => set('aprobacionAgenda', v)} options={SI_NO} />
                  </Field>
                  <Field label="Presencia física STDE">
                    <Select value={form.presenciaFisica} onChange={v => set('presenciaFisica', v)} options={SI_NO} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Solicita asistencia STDE">
                    <Select value={form.solicitaAsistencia} onChange={v => set('solicitaAsistencia', v)} options={SI_NO} />
                  </Field>
                  <Field label="Derivado">
                    <Select value={form.derivado} onChange={v => set('derivado', v)} options={SI_NO} />
                  </Field>
                </div>

                <Field label="Detalles asistencia solicitada">
                  <Textarea value={form.detallesAsistenciaSolicitada} onChange={v => set('detallesAsistenciaSolicitada', v)} />
                </Field>
                <Field label="Detalles asistencia asignada">
                  <Textarea value={form.detallesAsistenciaAsignada} onChange={v => set('detallesAsistenciaAsignada', v)} />
                </Field>
                <Field label="Detalles derivación">
                  <Textarea value={form.detallesDerivacion} onChange={v => set('detallesDerivacion', v)} />
                </Field>
              </div>
            )}

            {/* ── SECCIÓN 3: Resultados ──────────────────────────────────── */}
            {seccion === 'Resultados' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Total asistentes" error={errores.totalAsistentes}>
                    <input type="number" min={0} value={form.totalAsistentes} onChange={e => set('totalAsistentes', e.target.value)} placeholder="0" className="input" />
                  </Field>
                  <Field label="Residentes" error={errores.totalResidentes}>
                    <input type="number" min={0} value={form.totalResidentes} onChange={e => set('totalResidentes', e.target.value)} placeholder="0" className="input" />
                  </Field>
                  <Field label="No residentes" error={errores.totalNoResidentes}>
                    <input type="number" min={0} value={form.totalNoResidentes} onChange={e => set('totalNoResidentes', e.target.value)} className={`input ${errores.totalNoResidentes ? 'border-red-400' : ''}`} placeholder="0" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Inversión STDE ($)">
                    <input type="number" min={0} step="0.01" value={form.inversionSTDE} onChange={e => set('inversionSTDE', e.target.value)} placeholder="0.00" className="input" />
                  </Field>
                  <Field label="Inversión generador ($)">
                    <input type="number" min={0} step="0.01" value={form.inversionGenerador} onChange={e => set('inversionGenerador', e.target.value)} placeholder="0.00" className="input" />
                  </Field>
                  <Field label="Recaudación ($)">
                    <input type="number" min={0} step="0.01" value={form.recaudacion} onChange={e => set('recaudacion', e.target.value)} placeholder="0.00" className="input" />
                  </Field>
                </div>

                <Field label="Observaciones">
                  <Textarea value={form.observaciones} onChange={v => set('observaciones', v)} rows={4} placeholder="Observaciones adicionales..." />
                </Field>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <div className="flex gap-1">
              {SECCIONES.map((s, i) => (
                <button key={s} type="button" onClick={() => setSeccion(s)}
                  className={`w-2 h-2 rounded-full transition-all ${seccion === s ? 'bg-primary w-4' : 'bg-gray-300'}`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              {/* Navegar entre secciones */}
              {seccion !== 'Identificación' && (
                <button type="button" onClick={() => setSeccion(SECCIONES[SECCIONES.indexOf(seccion) - 1])} className="btn-ghost">
                  <i className="fa-solid fa-arrow-left text-xs" /> Anterior
                </button>
              )}
              {seccion !== 'Resultados' ? (
                <button type="button" onClick={() => setSeccion(SECCIONES[SECCIONES.indexOf(seccion) + 1])} className="btn-outline">
                  Siguiente <i className="fa-solid fa-arrow-right text-xs" />
                </button>
              ) : (
                <button type="submit" disabled={guardando} className="btn-primary min-w-32">
                  {guardando ? <><i className="fa-solid fa-spinner fa-spin" /> Guardando...</> : <><i className="fa-solid fa-floppy-disk" /> Guardar</>}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
