'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useState, useEffect, useMemo, useCallback } from 'react'
import type { TipoInforme, SubcategoriaInforme, CategoriaInforme, Informe } from '@/lib/types'
import { LABELS_CATEGORIA } from '@/lib/types'
import Toast from '@/components/shared/Toast'

type CategoriasPorCombinacion = Record<TipoInforme, Record<SubcategoriaInforme | '', CategoriaInforme[]>>

const CATEGORIAS: CategoriasPorCombinacion = {
  ocio: {
    periodico: ['mensual', 'trimestral', 'quincenal'],
    especial: ['finde', 'evento-especifico', 'tematico'],
    '': [],
  },
  mice: {
    '': ['trimestral', 'especial'],
    periodico: [],
    especial: [],
  },
}

const FORM_VACIO = {
  tipo: 'ocio' as TipoInforme,
  subcategoria: 'periodico' as SubcategoriaInforme | '',
  categoria: 'mensual' as CategoriaInforme,
  periodo: '',
  fecha: '',
  titulo: '',
  descripcion: '',
  urlPdf: '',
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function AdminInformesPage() {
  const { data: session, status } = useSession()

  // ── Form state ──
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [tipo, setTipo] = useState<TipoInforme>(FORM_VACIO.tipo)
  const [subcategoria, setSubcategoria] = useState<SubcategoriaInforme | ''>(FORM_VACIO.subcategoria)
  const [categoria, setCategoria] = useState<CategoriaInforme>(FORM_VACIO.categoria)
  const [periodo, setPeriodo] = useState(FORM_VACIO.periodo)
  const [fecha, setFecha] = useState(FORM_VACIO.fecha)
  const [titulo, setTitulo] = useState(FORM_VACIO.titulo)
  const [descripcion, setDescripcion] = useState(FORM_VACIO.descripcion)
  const [urlPdf, setUrlPdf] = useState(FORM_VACIO.urlPdf)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // ── Listado ──
  const [informes, setInformes] = useState<Informe[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)

  // ── Filtros ──
  const [filtroAno, setFiltroAno] = useState<string>('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')

  // ── Toast ──
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null)

  const categoriasDisponibles = useMemo(() => {
    if (tipo === 'mice') return CATEGORIAS.mice['']
    return CATEGORIAS.ocio[subcategoria as SubcategoriaInforme] ?? []
  }, [tipo, subcategoria])

  // ── Años disponibles en el listado (para el filtro) ──
  const anosDisponibles = useMemo(() => {
    const anos = informes
      .map(i => i.fecha ? new Date(i.fecha).getFullYear() : null)
      .filter((a): a is number => a !== null)
    return [...new Set(anos)].sort((a, b) => b - a)
  }, [informes])

  // ── Listado filtrado ──
  const informesFiltrados = useMemo(() => {
    return informes.filter(i => {
      if (filtroTipo !== 'todos' && i.tipo !== filtroTipo) return false
      if (filtroCategoria !== 'todas' && i.categoria !== filtroCategoria) return false
      if (filtroAno !== 'todos') {
        const ano = i.fecha ? new Date(i.fecha).getFullYear().toString() : null
        if (ano !== filtroAno) return false
      }
      return true
    })
  }, [informes, filtroTipo, filtroCategoria, filtroAno])

  const hayFiltrosActivos = filtroAno !== 'todos' || filtroTipo !== 'todos' || filtroCategoria !== 'todas'

  const fetchInformes = useCallback(async () => {
    try {
      const res = await fetch('/api/informes')
      const json = await res.json()
      if (json.data) setInformes(json.data)
    } catch {
      // silencioso
    } finally {
      setCargandoLista(false)
    }
  }, [])

  useEffect(() => {
    fetchInformes()
  }, [fetchInformes])

  if (status === 'loading') {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!session?.user) redirect('/login')
  const userEmail = session.user.email!

  // @ts-expect-error — rol extendido en la sesión
  if (session.user?.rol !== 'admin') redirect('/sin-acceso')

  function resetForm() {
    setTipo(FORM_VACIO.tipo)
    setSubcategoria(FORM_VACIO.subcategoria)
    setCategoria(FORM_VACIO.categoria)
    setPeriodo(FORM_VACIO.periodo)
    setFecha(FORM_VACIO.fecha)
    setTitulo(FORM_VACIO.titulo)
    setDescripcion(FORM_VACIO.descripcion)
    setUrlPdf(FORM_VACIO.urlPdf)
    setEditandoId(null)
    setMostrarFormulario(false)
  }

  function handleEdit(informe: Informe) {
    setTipo(informe.tipo)
    setSubcategoria(informe.tipo === 'mice' ? '' : informe.subcategoria)
    setCategoria(informe.categoria)
    setPeriodo(informe.periodo)
    // Normalizar la fecha a YYYY-MM-DD: el input[type=date] no acepta ISO con hora/zona
    setFecha(informe.fecha ? informe.fecha.toString().slice(0, 10) : '')
    setTitulo(informe.titulo)
    setDescripcion(informe.descripcion ?? '')
    setUrlPdf(informe.urlPdf)
    setEditandoId(informe.id)
    setMostrarFormulario(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este informe? La acción no se puede deshacer.')) return

    try {
      const res = await fetch('/api/informes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', id }),
      })
      const json = await res.json()
      if (json.success) {
        setToast({ mensaje: 'Informe eliminado.', tipo: 'success' })
        if (editandoId === id) resetForm()
        fetchInformes()
      } else {
        setToast({ mensaje: json.error || 'Error al eliminar.', tipo: 'error' })
      }
    } catch {
      setToast({ mensaje: 'Error de conexión.', tipo: 'error' })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!urlPdf.startsWith('https://')) {
      setToast({ mensaje: 'La URL del PDF debe empezar con https://', tipo: 'error' })
      return
    }

    const data = {
      titulo,
      descripcion,
      tipo,
      subcategoria: tipo === 'mice' ? 'periodico' : subcategoria,
      categoria,
      periodo,
      fecha,
      urlPdf,
      usuario: userEmail,
    }

    setEnviando(true)
    try {
      const body = editandoId
        ? { action: 'editar', id: editandoId, data }
        : { action: 'agregar', data }

      const res = await fetch('/api/informes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        setToast({
          mensaje: editandoId ? 'Informe actualizado.' : 'Informe cargado correctamente.',
          tipo: 'success',
        })
        resetForm()
        fetchInformes()
      } else {
        setToast({ mensaje: json.error || 'Error al guardar.', tipo: 'error' })
      }
    } catch {
      setToast({ mensaje: 'Error de conexión con el servidor.', tipo: 'error' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      {/* ── Encabezado ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title mb-0">Informes Técnicos</h2>
          {!cargandoLista && (
            <p className="text-sm text-text-secondary mt-1">
              {informes.length} {informes.length === 1 ? 'informe cargado' : 'informes cargados'}
            </p>
          )}
        </div>
        {!mostrarFormulario && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="btn-primary flex items-center gap-2"
          >
            <i className="fa-solid fa-plus" />
            Agregar informe
          </button>
        )}
      </div>

      {/* ── Formulario condicional ── */}
      {mostrarFormulario && (
        <div className="card p-6 max-w-2xl mb-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <i className="fa-solid fa-pen-to-square text-primary" />
              {editandoId ? 'Editar informe' : 'Nuevo informe'}
            </h3>
            <button onClick={resetForm} className="btn-outline text-xs">
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo */}
            <div>
              <label className="label">Tipo de turismo</label>
              <select
                className="input"
                value={tipo}
                onChange={e => {
                  const nuevoTipo = e.target.value as TipoInforme
                  setTipo(nuevoTipo)
                  if (nuevoTipo === 'mice') {
                    setSubcategoria('')
                    setCategoria('trimestral')
                  } else {
                    setSubcategoria('periodico')
                    setCategoria('mensual')
                  }
                }}
              >
                <option value="ocio">Turismo de Ocio</option>
                <option value="mice">Turismo MICE</option>
              </select>
            </div>

            {/* Subcategoría — solo ocio */}
            {tipo === 'ocio' && (
              <div>
                <label className="label">Subcategoría</label>
                <select
                  className="input"
                  value={subcategoria}
                  onChange={e => {
                    const nuevaSub = e.target.value as SubcategoriaInforme
                    setSubcategoria(nuevaSub)
                    setCategoria(CATEGORIAS.ocio[nuevaSub][0])
                  }}
                >
                  <option value="periodico">Periódico</option>
                  <option value="especial">Especial</option>
                </select>
              </div>
            )}

            {/* Categoría */}
            <div>
              <label className="label">Categoría</label>
              <select
                className="input"
                value={categoria}
                onChange={e => setCategoria(e.target.value as CategoriaInforme)}
              >
                {categoriasDisponibles.map(cat => (
                  <option key={cat} value={cat}>
                    {LABELS_CATEGORIA[cat]}
                  </option>
                ))}
              </select>
            </div>

            {/* Período */}
            <div>
              <label className="label">Período</label>
              <input
                type="text"
                className="input"
                placeholder="Enero 2026, Q1 2026, Carnaval 2026"
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
                required
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="label">Fecha</label>
              <input
                type="date"
                className="input"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                required
              />
            </div>

            {/* Título */}
            <div>
              <label className="label">Título</label>
              <input
                type="text"
                className="input"
                placeholder="Título del informe"
                maxLength={120}
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="label">Descripción (opcional)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Breve descripción del contenido del informe"
                maxLength={280}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
              />
            </div>

            {/* URL PDF */}
            <div>
              <label className="label">URL del PDF</label>
              <input
                type="url"
                className="input"
                placeholder="https://... "
                value={urlPdf}
                onChange={e => setUrlPdf(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={enviando}>
              {enviando ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2" />
                  Guardando...
                </>
              ) : editandoId ? (
                'Guardar cambios'
              ) : (
                'Cargar informe'
              )}
            </button>
          </form>
        </div>
      )}

      {/* ── Listado siempre visible ── */}
      <div className="card p-6 max-w-2xl">
        {/* ── Filtros ── */}
        <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-secondary whitespace-nowrap">Año</label>
            <select
              className="input py-1.5 text-sm w-auto"
              value={filtroAno}
              onChange={e => setFiltroAno(e.target.value)}
            >
              <option value="todos">Todos</option>
              {anosDisponibles.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-secondary whitespace-nowrap">Tipo</label>
            <select
              className="input py-1.5 text-sm w-auto"
              value={filtroTipo}
              onChange={e => {
                setFiltroTipo(e.target.value)
                setFiltroCategoria('todas') // resetear categoría al cambiar tipo
              }}
            >
              <option value="todos">Todos</option>
              <option value="ocio">Ocio</option>
              <option value="mice">MICE</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-secondary whitespace-nowrap">Categoría</label>
            <select
              className="input py-1.5 text-sm w-auto"
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
            >
              <option value="todas">Todas</option>
              {filtroTipo === 'mice' ? (
                <>
                  <option value="trimestral">{LABELS_CATEGORIA['trimestral']}</option>
                  <option value="especial">{LABELS_CATEGORIA['especial']}</option>
                </>
              ) : filtroTipo === 'ocio' ? (
                <>
                  <option value="mensual">{LABELS_CATEGORIA['mensual']}</option>
                  <option value="trimestral">{LABELS_CATEGORIA['trimestral']}</option>
                  <option value="quincenal">{LABELS_CATEGORIA['quincenal']}</option>
                  <option value="finde">{LABELS_CATEGORIA['finde']}</option>
                  <option value="evento-especifico">{LABELS_CATEGORIA['evento-especifico']}</option>
                  <option value="tematico">{LABELS_CATEGORIA['tematico']}</option>
                </>
              ) : (
                // Todos los tipos: mostrar todas las categorías
                <>
                  <option value="mensual">{LABELS_CATEGORIA['mensual']}</option>
                  <option value="trimestral">{LABELS_CATEGORIA['trimestral']}</option>
                  <option value="quincenal">{LABELS_CATEGORIA['quincenal']}</option>
                  <option value="finde">{LABELS_CATEGORIA['finde']}</option>
                  <option value="evento-especifico">{LABELS_CATEGORIA['evento-especifico']}</option>
                  <option value="tematico">{LABELS_CATEGORIA['tematico']}</option>
                  <option value="especial">{LABELS_CATEGORIA['especial']}</option>
                </>
              )}
            </select>
          </div>

          {hayFiltrosActivos && (
            <button
              onClick={() => {
                setFiltroAno('todos')
                setFiltroTipo('todos')
                setFiltroCategoria('todas')
              }}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-red-500 transition-colors"
            >
              <i className="fa-solid fa-xmark" />
              Limpiar filtros
            </button>
          )}
        </div>

        {/* ── Contador resultados ── */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <i className="fa-solid fa-list-check text-text-secondary" />
            Listado de informes
          </h3>
          {!cargandoLista && (
            <span className="text-xs text-text-secondary">
              {informesFiltrados.length} de {informes.length}
            </span>
          )}
        </div>

        {cargandoLista ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : informes.length === 0 ? (
          <p className="text-sm text-text-secondary italic">
            No hay informes cargados aún. Usá el botón &quot;Agregar informe&quot; para crear el
            primero.
          </p>
        ) : informesFiltrados.length === 0 ? (
          <p className="text-sm text-text-secondary italic">
            No hay informes que coincidan con los filtros seleccionados.
          </p>
        ) : (
          <div className="space-y-2">
            {informesFiltrados.map(informe => (
              <div
                key={informe.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  editandoId === informe.id
                    ? 'bg-primary/5 border-primary'
                    : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {informe.titulo}
                    </span>
                    <span
                      className={`badge text-xs ${
                        informe.tipo === 'ocio'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {informe.tipo === 'ocio' ? 'Ocio' : 'MICE'}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {LABELS_CATEGORIA[informe.categoria]}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    <span className="font-medium text-text-secondary/60">Período: </span>
                    {informe.periodo}
                    {informe.fecha ? (
                      <>
                        <span className="mx-1.5 text-text-secondary/30">·</span>
                        <span className="font-medium text-text-secondary/60">Publicado: </span>
                        {formatFecha(informe.fecha)}
                      </>
                    ) : null}
                    {informe.descripcion ? (
                      <>
                        <span className="mx-1.5 text-text-secondary/30">·</span>
                        {informe.descripcion}
                      </>
                    ) : null}
                  </p>
                </div>

                <a
                  href={informe.urlPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-600 transition-colors flex items-center justify-center flex-shrink-0"
                  title="Ver PDF"
                >
                  <i className="fa-regular fa-file-pdf text-xs" />
                </a>

                <button
                  onClick={() => handleEdit(informe)}
                  className="w-8 h-8 rounded-lg hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors flex items-center justify-center flex-shrink-0"
                  title="Editar"
                >
                  <i className="fa-solid fa-pen text-xs" />
                </button>

                <button
                  onClick={() => handleDelete(informe.id)}
                  className="w-8 h-8 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-600 transition-colors flex items-center justify-center flex-shrink-0"
                  title="Eliminar"
                >
                  <i className="fa-solid fa-trash-can text-xs" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.mensaje}
          type={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
