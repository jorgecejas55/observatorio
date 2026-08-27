'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Toast from '@/components/shared/Toast'
import { MODULOS, ROLES, type ModuloKey, type Rol } from '@/lib/permisos/modulos'
import { puedeEscribir } from '@/lib/permisos'
import type { SessionUser } from '@/lib/permisos'

// ── Tipos ────────────────────────────────────────────────────────────────────────

interface Usuario {
  id: number
  email: string
  nombre: string
  rol: string
  modulos: string[]
  activo: boolean
}

interface FormData {
  email: string
  nombre: string
  rol: Rol
  modulos: ModuloKey[]
  activo: boolean
  oldEmail?: string // email original al editar (para cambio de email)
}

const FORM_VACIO: FormData = {
  email: '',
  nombre: '',
  rol: 'operador',
  modulos: [],
  activo: true,
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function rolColor(rol: string) {
  if (rol === 'admin') return 'primary' as const
  if (rol === 'lector') return 'cyan' as const
  if (rol === 'cargador') return 'orange' as const
  return 'gray' as const
}

function rolLabel(rol: string) {
  if (rol === 'admin') return 'Admin'
  if (rol === 'lector') return 'Lector'
  if (rol === 'cargador') return 'Cargador'
  return 'Operador'
}

// ── Componente ──────────────────────────────────────────────────────────────────

export default function UsuariosClient() {
  // ── Sesión ──
  const { data: session } = useSession()
  const escribir = puedeEscribir(session?.user as SessionUser)

  // ── Estado ──
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null)

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<FormData>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [filterActivos, setFilterActivos] = useState<'todos' | 'activos' | 'inactivos'>('todos')

  // ── Cargar usuarios ──
  const cargarUsuarios = useCallback(async () => {
    try {
      setCargando(true)
      const res = await fetch('/api/admin/usuarios')
      if (!res.ok) throw new Error('Error al cargar usuarios')
      const json = await res.json()
      setUsuarios(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarUsuarios()
  }, [cargarUsuarios])

  // ── Abrir modal ──
  function abrirNuevo() {
    setForm(FORM_VACIO)
    setEditando(false)
    setModalAbierto(true)
  }

  function abrirEditar(usr: Usuario) {
    setForm({
      email: usr.email,
      nombre: usr.nombre || '',
      rol: usr.rol as Rol,
      modulos: (usr.modulos || []) as ModuloKey[],
      activo: usr.activo,
      oldEmail: usr.email,
    })
    setEditando(true)
    setModalAbierto(true)
  }

  // ── Guardar ──
  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    try {
      setGuardando(true)
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al guardar')
      setToast({ tipo: 'success', mensaje: json.message || 'Usuario guardado' })
      setModalAbierto(false)
      cargarUsuarios()
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err instanceof Error ? err.message : 'Error' })
    } finally {
      setGuardando(false)
    }
  }

  // ── Desactivar / Reactivar ──
  async function toggleActivo(usr: Usuario) {
    const accion = usr.activo ? 'desactivar' : 'reactivar'
    if (!confirm(`¿${accion === 'desactivar' ? 'Desactivar' : 'Reactivar'} a ${usr.email}?`)) return

    try {
      if (usr.activo) {
        // Desactivar vía DELETE
        const res = await fetch(`/api/admin/usuarios?email=${encodeURIComponent(usr.email)}`, {
          method: 'DELETE',
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Error')
      } else {
        // Reactivar vía POST (upsert con activo=true)
        const res = await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: usr.email,
            nombre: usr.nombre,
            rol: usr.rol,
            modulos: usr.modulos,
            activo: true,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Error')
      }
      setToast({ tipo: 'success', mensaje: `Usuario ${accion}do` })
      cargarUsuarios()
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err instanceof Error ? err.message : 'Error' })
    }
  }

  // ── Toggle módulo en form ──
  function toggleModulo(key: ModuloKey) {
    setForm((prev) => ({
      ...prev,
      modulos: prev.modulos.includes(key)
        ? prev.modulos.filter((m) => m !== key)
        : [...prev.modulos, key],
    }))
  }

  // ── Filtrado ──
  const usuariosFiltrados = usuarios.filter((u) => {
    if (filterActivos === 'activos') return u.activo
    if (filterActivos === 'inactivos') return !u.activo
    return true
  })

  // ── Render ──
  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-8 text-center text-red-600">
        <i className="fa-solid fa-triangle-exclamation text-3xl mb-3 block" />
        <p>{error}</p>
        <Button variant="outline" className="mt-4" onClick={cargarUsuarios}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div>
      {toast && (
        <Toast
          message={toast.mensaje}
          type={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['todos', 'activos', 'inactivos'] as const).map((filtro) => (
            <button
              key={filtro}
              onClick={() => setFilterActivos(filtro)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                filterActivos === filtro
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filtro === 'todos' ? 'Todos' : filtro === 'activos' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
        {escribir && (
          <Button onClick={abrirNuevo}>
            <i className="fa-solid fa-plus mr-1.5 text-xs" />
            Nuevo usuario
          </Button>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Nombre</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Rol</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Módulos</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 font-semibold text-gray-600 w-20">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <i className="fa-solid fa-users-slash text-2xl block mb-2" />
                    No hay usuarios{filterActivos !== 'todos' ? ` ${filterActivos}` : ''}
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usr) => (
                  <tr
                    key={usr.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !usr.activo ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">{usr.email}</td>
                    <td className="px-4 py-3 text-gray-600">{usr.nombre || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={rolColor(usr.rol)}>{rolLabel(usr.rol)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {usr.modulos && usr.modulos.length > 0 ? (
                          usr.modulos.map((m) => (
                            <span
                              key={m}
                              className="px-2 py-0.5 text-xs rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200"
                            >
                              {MODULOS[m as ModuloKey]?.label || m}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">Sin módulos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          usr.activo ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        <i
                          className={`fa-solid fa-circle text-[6px] ${
                            usr.activo ? 'text-green-500' : 'text-red-400'
                          }`}
                        />
                        {usr.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {escribir ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => abrirEditar(usr)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                            title="Editar"
                          >
                            <i className="fa-solid fa-pen-to-square text-xs" />
                          </button>
                          <button
                            onClick={() => toggleActivo(usr)}
                            className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${
                              usr.activo
                                ? 'text-gray-500 hover:text-red-600'
                                : 'text-gray-500 hover:text-green-600'
                            }`}
                            title={usr.activo ? 'Desactivar' : 'Reactivar'}
                          >
                            <i
                              className={`fa-solid text-xs ${
                                usr.activo ? 'fa-user-slash' : 'fa-user-check'
                              }`}
                            />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ── */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !guardando && setModalAbierto(false)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={guardar}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800">
                  <i className={`fa-solid ${editando ? 'fa-pen-to-square' : 'fa-plus'} mr-2 text-primary`} />
                  {editando ? 'Editar usuario' : 'Nuevo usuario'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-4 space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Nombre completo"
                  />
                </div>

                {/* Rol */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <div className="flex flex-wrap gap-3">
                    {ROLES.map((r) => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rol"
                          value={r}
                          checked={form.rol === r}
                          onChange={() => setForm((p) => ({ ...p, rol: r }))}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                          {rolLabel(r)}
                          {r === 'admin' && (
                            <span className="text-xs text-gray-400 ml-1">(acceso total)</span>
                          )}
                          {r === 'cargador' && (
                            <span className="text-xs text-gray-400 ml-1">(solo cargar, sin ver/editar el resto)</span>
                          )}
                          {r === 'lector' && (
                            <span className="text-xs text-gray-400 ml-1">(solo lectura)</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Módulos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Módulos
                    {form.rol === 'admin' ? (
                      <span className="text-xs text-gray-400 ml-1">
                        (admin tiene acceso total automáticamente)
                      </span>
                    ) : form.rol === 'lector' ? (
                      <span className="text-xs text-cyan-600 ml-1">
                        (solo lectura en los módulos seleccionados)
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 ml-1">
                        (lectura y escritura en los módulos seleccionados)
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {(Object.entries(MODULOS) as [ModuloKey, { label: string }][]).map(([key, mod]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                          form.modulos.includes(key)
                            ? 'bg-cyan-50 text-cyan-800'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.modulos.includes(key)}
                          onChange={() => toggleModulo(key)}
                          className="text-primary focus:ring-primary rounded"
                        />
                        <span className="text-sm">{mod.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Activo */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
                    className="text-primary focus:ring-primary rounded"
                  />
                  <span className="text-sm text-gray-700">Usuario activo</span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalAbierto(false)}
                  disabled={guardando}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={guardando}>
                  {editando ? 'Guardar cambios' : 'Crear usuario'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
