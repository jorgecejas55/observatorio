'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { InputField } from '@/components/forms/FormField'
import MetricasService, { CanalDigital } from '@/services/metricasService'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Toast from '@/components/shared/Toast'
import MesAnioPicker from '@/components/forms/MesAnioPicker'
import MetricaRow from './MetricaRow'
import { formatearMesAnio, mesAnioOrdenable, normalizarMesAnio, esMesAnioValido } from '@/lib/formato-fechas'

const FORM_INICIAL = {
  mes_anio: '',
  visitantes: 0,
  regiones: [{ region: '', visitas: 0 }],
  fuentes: [{ fuente: '', visitas: 0 }],
  seguidores: 0,
  interacciones: 0,
  publicaciones: 0,
  conversaciones: 0,
  mensajes: 0,
  puntuacion_promedio: 0,
  tasa_resolucion: 0
}

export default function MetricasClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<CanalDigital>('web')
  const [cargandoLista, setCargandoLista] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [modoEdicion, setModoEdicion] = useState<{ id: string } | null>(null)
  const [formData, setFormData] = useState<any>(FORM_INICIAL)

  const resetFormData = () => setFormData(FORM_INICIAL)

  useEffect(() => {
    cargarRegistros()
  }, [activeTab])

  const cargarRegistros = async () => {
    setCargandoLista(true)
    const data = await MetricasService.getMetricas(activeTab)
    setRecords(
      data
        .map((r: any) => ({ ...r, mes_anio: normalizarMesAnio(r.mes_anio) }))
        .sort((a: any, b: any) => mesAnioOrdenable(b.mes_anio) - mesAnioOrdenable(a.mes_anio))
    )
    setCargandoLista(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }))
  }

  const handleDynamicChange = (type: 'regiones' | 'fuentes', index: number, field: string, value: string | number) => {
    setFormData((prev: any) => {
      const newList = [...prev[type]]
      newList[index] = {
        ...newList[index],
        [field]: field === 'visitas' ? (value === '' ? '' : parseInt(value as string)) : value
      }
      return { ...prev, [type]: newList }
    })
  }

  const addDynamicItem = (type: 'regiones' | 'fuentes') => {
    const max = type === 'regiones' ? 10 : 5
    if (formData[type].length < max) {
      setFormData((prev: any) => ({
        ...prev,
        [type]: [...prev[type], type === 'regiones' ? { region: '', visitas: 0 } : { fuente: '', visitas: 0 }]
      }))
    }
  }

  const handleEdit = (registro: any) => {
    setFormData({
      mes_anio: registro.mes_anio,
      visitantes: registro.visitantes || 0,
      regiones: registro.regiones?.length
        ? registro.regiones.map((r: any) => ({ region: r.region, visitas: r.visitas }))
        : [{ region: '', visitas: 0 }],
      fuentes: registro.fuentes?.length
        ? registro.fuentes.map((f: any) => ({ fuente: f.fuente, visitas: f.visitas }))
        : [{ fuente: '', visitas: 0 }],
      seguidores: registro.seguidores || 0,
      interacciones: registro.interacciones || 0,
      publicaciones: registro.publicaciones || 0,
      conversaciones: registro.conversaciones || 0,
      mensajes: registro.mensajes || 0,
      puntuacion_promedio: registro.puntuacion_promedio || 0,
      tasa_resolucion: registro.tasa_resolucion || 0,
    })
    setModoEdicion({ id: registro.id })
    setErrorFormulario(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelarEdicion = () => {
    setModoEdicion(null)
    setErrorFormulario(null)
    resetFormData()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!esMesAnioValido(formData.mes_anio)) {
      setErrorFormulario('El formato de mes/año debe ser MM/YYYY (ej: 04/2026)')
      return
    }
    if (!modoEdicion) {
      const yaExiste = records.some((r) => r.mes_anio === formData.mes_anio)
      if (yaExiste) {
        setErrorFormulario(`Ya existe un registro para ${formatearMesAnio(formData.mes_anio)}. Editalo en lugar de crear uno nuevo.`)
        return
      }
    }
    setErrorFormulario(null)
    setEnviando(true)

    const userEmail = session?.user?.email || 'admin@observatorio.com'
    let payload: any = {
      mes_anio: formData.mes_anio,
      usuario_registro: userEmail
    }

    if (activeTab === 'web') {
      payload = {
        ...payload,
        visitantes: Number(formData.visitantes) || 0,
        regiones: formData.regiones
          .filter((r: any) => r.region.trim())
          .map((r: any) => ({ region: r.region, visitas: Number(r.visitas) || 0 })),
        fuentes: formData.fuentes
          .filter((f: any) => f.fuente.trim())
          .map((f: any) => ({ fuente: f.fuente, visitas: Number(f.visitas) || 0 }))
      }
    } else if (activeTab === 'facebook' || activeTab === 'instagram') {
      payload = {
        ...payload,
        seguidores: Number(formData.seguidores) || 0,
        interacciones: Number(formData.interacciones) || 0,
        publicaciones: Number(formData.publicaciones) || 0
      }
    } else {
      payload = {
        ...payload,
        conversaciones: Number(formData.conversaciones) || 0,
        mensajes: Number(formData.mensajes) || 0,
        puntuacion_promedio: Number(formData.puntuacion_promedio) || 0,
        tasa_resolucion: Number(formData.tasa_resolucion) || 0
      }
    }

    const res = modoEdicion
      ? await MetricasService.updateMetrica(activeTab, modoEdicion.id, payload)
      : await MetricasService.createMetrica(activeTab, payload)

    if (res.success) {
      setToast({
        message: modoEdicion ? 'Registro actualizado con éxito' : 'Métrica guardada con éxito',
        type: 'success'
      })
      setModoEdicion(null)
      resetFormData()
      await cargarRegistros()
      router.refresh()
    } else {
      setToast({ message: res.error || 'Error al guardar', type: 'error' })
    }
    setEnviando(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return
    setEnviando(true)
    const res = await MetricasService.deleteMetrica(activeTab, id)
    if (res.success) {
      setToast({ message: 'Registro eliminado', type: 'success' })
      await cargarRegistros()
      router.refresh()
    } else {
      setToast({ message: res.error || 'Error al eliminar', type: 'error' })
    }
    setEnviando(false)
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-black text-text-primary mb-2">Métricas Digitales</h1>
      <p className="text-text-secondary mb-8 font-medium">Carga y gestión de indicadores mensuales de canales digitales.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-xl w-fit">
        {(['web', 'facebook', 'instagram', 'catu'] as CanalDigital[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'catu' ? 'Catu Bot' : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="card p-6 sticky top-24">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <i className={`fa-solid ${modoEdicion ? 'fa-pen-to-square' : 'fa-plus-circle'} text-primary`}></i>
              {modoEdicion ? 'Editar Métrica' : 'Nueva Métrica'} - {activeTab.toUpperCase()}
            </h2>

            <div className="space-y-4">
              <MesAnioPicker
                value={formData.mes_anio}
                onChange={(v) => setFormData((p: any) => ({ ...p, mes_anio: v }))}
                required
              />

              {errorFormulario && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errorFormulario}
                </p>
              )}

              {activeTab === 'web' && (
                <>
                  <InputField label="Total Visitantes" name="visitantes" type="number" value={formData.visitantes} onChange={handleInputChange} required />

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-black uppercase tracking-widest text-text-secondary">Top 10 Regiones</label>
                      <button type="button" onClick={() => addDynamicItem('regiones')} className="text-xs text-primary font-bold">+ Agregar</button>
                    </div>
                    {formData.regiones.map((r: any, i: number) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input className="input text-xs flex-grow" placeholder="Región" value={r.region} onChange={(e) => handleDynamicChange('regiones', i, 'region', e.target.value)} />
                        <input className="input text-xs w-20" type="number" placeholder="Visitas" value={r.visitas} onChange={(e) => handleDynamicChange('regiones', i, 'visitas', e.target.value)} />
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-black uppercase tracking-widest text-text-secondary">Top 5 Fuentes</label>
                      <button type="button" onClick={() => addDynamicItem('fuentes')} className="text-xs text-primary font-bold">+ Agregar</button>
                    </div>
                    {formData.fuentes.map((f: any, i: number) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input className="input text-xs flex-grow" placeholder="Fuente" value={f.fuente} onChange={(e) => handleDynamicChange('fuentes', i, 'fuente', e.target.value)} />
                        <input className="input text-xs w-20" type="number" placeholder="Visitas" value={f.visitas} onChange={(e) => handleDynamicChange('fuentes', i, 'visitas', e.target.value)} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {(activeTab === 'facebook' || activeTab === 'instagram') && (
                <>
                  <InputField label="Total Seguidores" name="seguidores" type="number" value={formData.seguidores} onChange={handleInputChange} required />
                  <InputField label="Total Interacciones" name="interacciones" type="number" value={formData.interacciones} onChange={handleInputChange} required />
                  <InputField label="Total Publicaciones" name="publicaciones" type="number" value={formData.publicaciones} onChange={handleInputChange} required />
                </>
              )}

              {activeTab === 'catu' && (
                <>
                  <InputField label="Conversaciones" name="conversaciones" type="number" value={formData.conversaciones} onChange={handleInputChange} required />
                  <InputField label="Mensajes Totales" name="mensajes" type="number" value={formData.mensajes} onChange={handleInputChange} required />
                  <InputField label="Tasa Resolución (%)" name="tasa_resolucion" type="number" value={formData.tasa_resolucion} onChange={handleInputChange} required min="0" max="100" />
                  <InputField label="Puntuación Promedio (0-10)" name="puntuacion_promedio" type="number" value={formData.puntuacion_promedio} onChange={handleInputChange} required min="0" max="10" step="0.1" />
                </>
              )}
            </div>

            <div className="flex gap-2 mt-8">
              {modoEdicion && (
                <button type="button" onClick={handleCancelarEdicion} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={enviando}
                className="btn btn-primary flex-1"
              >
                {enviando
                  ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
                  : modoEdicion ? 'Actualizar' : 'Guardar Métricas'}
              </button>
            </div>
          </form>
        </div>

        {/* Listado */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="p-6 border-b bg-gray-50/50">
              <h2 className="font-bold">Registros Históricos</h2>
            </div>

            {cargandoLista && records.length === 0 ? (
              <div className="p-12 text-center"><LoadingSpinner /></div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center text-text-secondary italic">No hay registros aún.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-text-secondary border-b">
                      <th className="px-4 py-4 w-8"></th>
                      <th className="px-6 py-4">Mes/Año</th>
                      {activeTab === 'web' && (
                        <th className="px-6 py-4 text-center">Visitantes</th>
                      )}
                      {(activeTab === 'facebook' || activeTab === 'instagram') && (
                        <>
                          <th className="px-6 py-4 text-center">Seguidores</th>
                          <th className="px-6 py-4 text-center">Interac.</th>
                          <th className="px-6 py-4 text-center">Public.</th>
                        </>
                      )}
                      {activeTab === 'catu' && (
                        <>
                          <th className="px-6 py-4 text-center">Conv.</th>
                          <th className="px-6 py-4 text-center">Mensajes</th>
                          <th className="px-6 py-4 text-center">Tasa Res.</th>
                        </>
                      )}
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records.map((r) => (
                      <MetricaRow
                        key={r.id}
                        canal={activeTab}
                        registro={r}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
