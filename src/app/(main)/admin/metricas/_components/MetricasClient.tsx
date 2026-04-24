'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { InputField, RatingField } from '@/components/forms/FormField'
import MetricasService, { CanalDigital } from '@/services/metricasService'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Toast from '@/components/shared/Toast'

export default function MetricasClient() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<CanalDigital>('web')
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [formData, setFormData] = useState<any>({
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
  })

  useEffect(() => {
    cargarRegistros()
  }, [activeTab])

  const cargarRegistros = async () => {
    setLoading(true)
    const data = await MetricasService.getMetricas(activeTab)
    setRecords(data.sort((a, b) => {
      const [ma, ya] = a.mes_anio.split('/').map(Number)
      const [mb, yb] = b.mes_anio.split('/').map(Number)
      return ya !== yb ? yb - ya : mb - ma
    }))
    setLoading(false)
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
      let finalValue = value
      if (field === 'visitas') {
        finalValue = value === '' ? '' : parseInt(value as string)
      }
      newList[index] = { ...newList[index], [field]: finalValue }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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

    const res = await MetricasService.createMetrica(activeTab, payload)

    if (res.success) {
      setToast({ message: 'Métrica guardada con éxito', type: 'success' })
      cargarRegistros()
      setFormData((prev: any) => ({ 
        ...prev, 
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
      }))
    } else {
      // Manejo de errores detallado
      const errorMsg = res.error || 'Error al guardar'
      setToast({ message: errorMsg, type: 'error' })
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return
    setLoading(true)
    const res = await MetricasService.deleteMetrica(activeTab, id)
    if (res.success) {
      setToast({ message: 'Registro eliminado', type: 'success' })
      cargarRegistros()
    } else {
      setToast({ message: res.error || 'Error al eliminar', type: 'error' })
    }
    setLoading(false)
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
              <i className="fa-solid fa-plus-circle text-primary"></i>
              Nueva Métrica - {activeTab.toUpperCase()}
            </h2>

            <div className="space-y-4">
              <InputField
                label="Mes/Año (MM/YYYY)"
                name="mes_anio"
                value={formData.mes_anio}
                onChange={handleInputChange}
                placeholder="04/2026"
                required
              />

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
                  <RatingField label="Puntuación Promedio" name="puntuacion_promedio" value={formData.puntuacion_promedio} onChange={(v) => setFormData((p:any)=>({...p, puntuacion_promedio: v}))} required />
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-8"
            >
              {loading ? <LoadingSpinner /> : 'Guardar Métricas'}
            </button>
          </form>
        </div>

        {/* Listado */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="p-6 border-b bg-gray-50/50">
              <h2 className="font-bold">Registros Históricos</h2>
            </div>

            {loading && records.length === 0 ? (
              <div className="p-12 text-center"><LoadingSpinner /></div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center text-text-secondary italic">No hay registros aún.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-text-secondary border-b">
                      <th className="px-6 py-4">Mes/Año</th>
                      {activeTab === 'web' && <th className="px-6 py-4 text-center">Visitantes</th>}
                      {(activeTab === 'facebook' || activeTab === 'instagram') && (
                        <>
                          <th className="px-6 py-4 text-center">Seguidores</th>
                          <th className="px-6 py-4 text-center">Interac.</th>
                        </>
                      )}
                      {activeTab === 'catu' && (
                        <>
                          <th className="px-6 py-4 text-center">Conv.</th>
                          <th className="px-6 py-4 text-center">Tasa Res.</th>
                        </>
                      )}
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records.map((r) => (
                      <tr key={r.id} className="text-sm hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold">{r.mes_anio}</td>
                        {activeTab === 'web' && <td className="px-6 py-4 text-center font-medium">{r.visitantes?.toLocaleString() || 0}</td>}
                        {(activeTab === 'facebook' || activeTab === 'instagram') && (
                          <>
                            <td className="px-6 py-4 text-center font-medium">{r.seguidores?.toLocaleString() || 0}</td>
                            <td className="px-6 py-4 text-center font-medium">{r.interacciones?.toLocaleString() || 0}</td>
                          </>
                        )}
                        {activeTab === 'catu' && (
                          <>
                            <td className="px-6 py-4 text-center font-medium">{r.conversaciones?.toLocaleString() || 0}</td>
                            <td className="px-6 py-4 text-center font-medium">{r.tasa_resolucion || 0}%</td>
                          </>
                        )}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
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
