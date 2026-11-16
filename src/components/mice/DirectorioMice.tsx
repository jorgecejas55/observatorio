'use client'

import { useMemo, useState } from 'react'
import type { CategoriaMice, GrupoMice } from '@/data/mice-ecosistema'
import { contarContactos, filtrarCategorias } from '@/lib/mice/filtrar'
import IndiceRubros from './IndiceRubros'
import SeccionCategoria from './SeccionCategoria'

interface DirectorioMiceProps {
  grupos: { id: GrupoMice; titulo: string }[]
  categorias: CategoriaMice[]
}

function Buscador({ valor, onCambio }: { valor: string; onCambio: (valor: string) => void }) {
  return (
    <div className="relative">
      <label htmlFor="buscar-mice" className="sr-only">Buscar en el directorio</label>
      <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
      <input
        id="buscar-mice"
        type="search"
        value={valor}
        onChange={evento => onCambio(evento.target.value)}
        placeholder="Buscar nombre o rubro"
        className="input bg-white pl-11 pr-11 py-3 text-base shadow-sm"
        autoComplete="off"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onCambio('')}
          aria-label="Borrar búsqueda"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-primary"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default function DirectorioMice({ grupos, categorias }: DirectorioMiceProps) {
  const [consulta, setConsulta] = useState('')
  const resultados = useMemo(() => filtrarCategorias(categorias, consulta), [categorias, consulta])
  const estaBuscando = consulta.trim() !== ''

  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-gray-50/95 backdrop-blur">
        <Buscador valor={consulta} onCambio={setConsulta} />
        {estaBuscando && (
          <p className="text-xs text-text-secondary mt-2" aria-live="polite">
            {contarContactos(resultados)} resultados
          </p>
        )}
      </div>

      {!estaBuscando && (
        <div className="mt-4">
          <IndiceRubros grupos={grupos} categorias={categorias} />
        </div>
      )}

      {resultados.length === 0 ? (
        <div className="card p-8 mt-6 text-center">
          <i className="fa-solid fa-magnifying-glass text-3xl text-gray-300 mb-3 block" aria-hidden="true" />
          <p className="text-text-primary font-medium">No encontramos resultados para “{consulta}”.</p>
          <p className="text-sm text-text-secondary mt-1">Probá con otro nombre o rubro.</p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {resultados.map(categoria => (
            <SeccionCategoria key={categoria.id} categoria={categoria} />
          ))}
        </div>
      )}
    </>
  )
}
