'use client'

import { useState } from 'react'
import { formatearMesAnio } from '@/lib/formato-fechas'
import type { CanalDigital } from '@/services/metricasService'

interface Props {
  canal: CanalDigital
  registro: any
  onDelete: (id: string) => void
  onEdit: (registro: any) => void
}

export default function MetricaRow({ canal, registro, onDelete, onEdit }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <tr
        className="text-sm hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setAbierto(!abierto)}
      >
        <td className="px-4 py-4">
          <i className={`fa-solid fa-chevron-${abierto ? 'down' : 'right'} text-xs text-text-secondary`} />
        </td>
        <td className="px-6 py-4 font-bold capitalize">{formatearMesAnio(registro.mes_anio)}</td>

        {canal === 'web' && (
          <td className="px-6 py-4 text-center font-medium">{registro.visitantes?.toLocaleString('es-AR') || 0}</td>
        )}
        {(canal === 'facebook' || canal === 'instagram') && (
          <>
            <td className="px-6 py-4 text-center font-medium">{registro.seguidores?.toLocaleString('es-AR') || 0}</td>
            <td className="px-6 py-4 text-center font-medium">{registro.interacciones?.toLocaleString('es-AR') || 0}</td>
            <td className="px-6 py-4 text-center font-medium">{registro.publicaciones?.toLocaleString('es-AR') || 0}</td>
          </>
        )}
        {canal === 'catu' && (
          <>
            <td className="px-6 py-4 text-center font-medium">{registro.conversaciones?.toLocaleString('es-AR') || 0}</td>
            <td className="px-6 py-4 text-center font-medium">{registro.mensajes?.toLocaleString('es-AR') || 0}</td>
            <td className="px-6 py-4 text-center font-medium">{registro.tasa_resolucion || 0}%</td>
          </>
        )}

        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(registro)}
            className="text-blue-400 hover:text-blue-600 transition-colors mr-3"
            title="Editar"
          >
            <i className="fa-solid fa-pen-to-square" />
          </button>
          <button
            onClick={() => onDelete(registro.id)}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Eliminar"
          >
            <i className="fa-solid fa-trash-can" />
          </button>
        </td>
      </tr>

      {abierto && (
        <tr className="bg-gray-50/70">
          <td colSpan={canal === 'web' ? 4 : 6} className="px-6 py-5">
            <DetalleCanal canal={canal} registro={registro} />
          </td>
        </tr>
      )}
    </>
  )
}

function DetalleCanal({ canal, registro }: { canal: CanalDigital; registro: any }) {
  if (canal === 'web') {
    const regiones = (registro.regiones || []).slice().sort((a: any, b: any) => (b.visitas || 0) - (a.visitas || 0))
    const fuentes = (registro.fuentes || []).slice().sort((a: any, b: any) => (b.visitas || 0) - (a.visitas || 0))
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary mb-3">Top Regiones</h4>
          {regiones.length === 0 ? (
            <p className="text-sm italic text-text-secondary">Sin regiones cargadas.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {regiones.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2 pr-4">{r.region}</td>
                    <td className="py-2 text-right font-medium">{Number(r.visitas || 0).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary mb-3">Top Fuentes</h4>
          {fuentes.length === 0 ? (
            <p className="text-sm italic text-text-secondary">Sin fuentes cargadas.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {fuentes.map((f: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2 pr-4">{f.fuente}</td>
                    <td className="py-2 text-right font-medium">{Number(f.visitas || 0).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {registro.usuario_registro && (
          <div className="md:col-span-2 pt-4 border-t">
            <DatoDetalle label="Cargado por" valor={registro.usuario_registro} />
          </div>
        )}
      </div>
    )
  }

  if (canal === 'catu') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DatoDetalle label="Conversaciones" valor={Number(registro.conversaciones || 0).toLocaleString('es-AR')} />
        <DatoDetalle label="Mensajes" valor={Number(registro.mensajes || 0).toLocaleString('es-AR')} />
        <DatoDetalle label="Puntuación" valor={`${registro.puntuacion_promedio || 0} / 10`} />
        <DatoDetalle label="Tasa Resolución" valor={`${registro.tasa_resolucion || 0}%`} />
        {registro.usuario_registro && (
          <div className="col-span-2 md:col-span-4 pt-4 border-t">
            <DatoDetalle label="Cargado por" valor={registro.usuario_registro} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <DatoDetalle label="Seguidores" valor={Number(registro.seguidores || 0).toLocaleString('es-AR')} />
      <DatoDetalle label="Interacciones" valor={Number(registro.interacciones || 0).toLocaleString('es-AR')} />
      <DatoDetalle label="Publicaciones" valor={Number(registro.publicaciones || 0).toLocaleString('es-AR')} />
      {registro.usuario_registro && (
        <DatoDetalle label="Cargado por" valor={registro.usuario_registro} />
      )}
    </div>
  )
}

function DatoDetalle({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border">
      <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{label}</div>
      <div className="text-lg font-bold text-text-primary mt-1">{valor}</div>
    </div>
  )
}
