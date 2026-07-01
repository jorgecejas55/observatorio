'use client'

import { ComboboxField } from './ComboboxField'
import { Field } from './Field'
import { RadioGroup } from './RadioGroup'
import {
  PROCEDENCIAS,
  PAISES,
  PROVINCIAS_ARG,
  DEPARTAMENTOS_CATAMARCA,
  PARTIDOS_BUENOS_AIRES,
  BARRIOS_CABA,
} from '@/lib/geografia'
import type { Procedencia } from '@/lib/geografia'

/**
 * Componente que encapsula TODA la cascada de procedencia.
 *
 * Flujo:
 *   Procedencia (radio NACIONAL / PROVINCIAL / INTERNACIONAL)
 *   ├── INTERNACIONAL → ComboboxField PAISES
 *   ├── PROVINCIAL    → <select> DEPARTAMENTOS_CATAMARCA
 *   └── NACIONAL      → <select> PROVINCIAS_ARG
 *                         ├── BUENOS AIRES → ComboboxField PARTIDOS_BUENOS_AIRES (solo si mostrarLocalidad)
 *                         ├── CABA         → <select> BARRIOS_CABA (solo si mostrarLocalidad)
 *                         └── otra         → no se pide más detalle
 *
 * Al cambiar la procedencia limpia los hijos y sus errores.
 * Al cambiar la provincia limpia localidad cuando deja de ser BsAs/CABA.
 *
 * Usado por:
 *   - /ocio/encuesta        (mostrarLocalidad = false)
 *   - /casa-catamarca/encuesta (mostrarLocalidad = true)
 */

interface ProcedenciaState {
  procedencia: Procedencia | ''
  paisOrigen: string
  provinciaOrigen: string
  departamentoOrigen: string
  localidadOrigen: string
}

interface ProcedenciaFieldsProps {
  values: ProcedenciaState
  onProcedenciaChange: (v: Procedencia | '') => void
  onPaisOrigenChange: (v: string) => void
  onProvinciaOrigenChange: (v: string) => void
  onDepartamentoOrigenChange: (v: string) => void
  onLocalidadOrigenChange: (v: string) => void
  errores: {
    procedencia?: string
    paisOrigen?: string
    provinciaOrigen?: string
    departamentoOrigen?: string
    localidadOrigen?: string
  }
  mostrarLocalidad?: boolean  // default false — solo Casa de Catamarca necesita la cascada BsAs/CABA
  /** Subconjunto de PROCEDENCIAS a mostrar. Default: todas. Ej: ['NACIONAL', 'INTERNACIONAL'] excluye PROVINCIAL. */
  mostrarProcedencias?: readonly string[]
}

export function ProcedenciaFields({
  values,
  onProcedenciaChange,
  onPaisOrigenChange,
  onProvinciaOrigenChange,
  onDepartamentoOrigenChange,
  onLocalidadOrigenChange,
  errores,
  mostrarLocalidad = false,
  mostrarProcedencias = PROCEDENCIAS,
}: ProcedenciaFieldsProps) {

  const { procedencia, paisOrigen, provinciaOrigen, departamentoOrigen, localidadOrigen } = values

  // ── Wrappers que limpian hijos al cambiar el padre ─────────────────────

  function handleProcedencia(v: string) {
    onProcedenciaChange(v as Procedencia | '')
    // Limpiar todos los hijos
    onPaisOrigenChange('')
    onProvinciaOrigenChange('')
    onDepartamentoOrigenChange('')
    onLocalidadOrigenChange('')
  }

  function handleProvincia(v: string) {
    onProvinciaOrigenChange(v)
    // Limpiar localidad cuando cambia la provincia
    if (v !== 'BUENOS AIRES' && v !== 'CABA') {
      onLocalidadOrigenChange('')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      <Field label="Procedencia" required error={errores.procedencia}>
        <RadioGroup
          name="procedencia"
          options={[...mostrarProcedencias]}
          value={procedencia}
          onChange={handleProcedencia}
          cols={3}
        />
      </Field>

      {/* INTERNACIONAL → país */}
      {procedencia === 'INTERNACIONAL' && (
        <ComboboxField
          label="País de Origen"
          options={[...PAISES]}
          value={paisOrigen}
          onChange={onPaisOrigenChange}
          placeholder="Escribí el país…"
          required
          error={errores.paisOrigen}
        />
      )}

      {/* NACIONAL → provincia (y opcionalmente partido/barrio) */}
      {procedencia === 'NACIONAL' && (
        <>
          <Field label="Provincia de Origen" required error={errores.provinciaOrigen}>
            <select
              value={provinciaOrigen}
              onChange={e => handleProvincia(e.target.value)}
              className={`input bg-white ${errores.provinciaOrigen ? 'border-red-400' : ''}`}
            >
              <option value="">— Seleccioná una provincia —</option>
              {PROVINCIAS_ARG.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          {mostrarLocalidad && provinciaOrigen === 'BUENOS AIRES' && (
            <ComboboxField
              label="Partido"
              options={[...PARTIDOS_BUENOS_AIRES]}
              value={localidadOrigen}
              onChange={onLocalidadOrigenChange}
              placeholder="Escribí el partido…"
              required
              error={errores.localidadOrigen}
            />
          )}

          {mostrarLocalidad && provinciaOrigen === 'CABA' && (
            <Field label="Barrio" required error={errores.localidadOrigen}>
              <select
                value={localidadOrigen}
                onChange={e => onLocalidadOrigenChange(e.target.value)}
                className={`input bg-white ${errores.localidadOrigen ? 'border-red-400' : ''}`}
              >
                <option value="">— Seleccioná un barrio —</option>
                {BARRIOS_CABA.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          )}
        </>
      )}

      {/* PROVINCIAL → departamento de Catamarca */}
      {procedencia === 'PROVINCIAL' && (
        <Field label="Departamento de Origen" required error={errores.departamentoOrigen}>
          <select
            value={departamentoOrigen}
            onChange={e => onDepartamentoOrigenChange(e.target.value)}
            className={`input bg-white ${errores.departamentoOrigen ? 'border-red-400' : ''}`}
          >
            <option value="">— Seleccioná un departamento —</option>
            {DEPARTAMENTOS_CATAMARCA.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
      )}
    </div>
  )
}
