/**
 * Vista pública de un informe automático publicado (FSL, evento o mensual).
 * Sin autenticación. Se regenera al publicar (tag TAG_INFORMES_PUBLICOS).
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getInformeAutoPublicado } from '@/lib/informes-auto/publicos'
import InformeAutoVista from '@/components/informes-auto/vista/InformeAutoVista'
import BotonDescargarPdf from '@/components/informes-auto/BotonDescargarPdf'
import { nombreArchivoInforme, tituloInforme } from '@/components/informes-auto/vista/etiquetas'
import { formatearFecha } from '@/lib/formato-fechas'
import { OPEN_GRAPH_BASE } from '@/lib/seo/paginas-publicas'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const informe = await getInformeAutoPublicado(slug)
  if (!informe) return { title: 'Informe no disponible', robots: { index: false } }

  const titulo = tituloInforme(informe)
  const descripcion = `${titulo}, período del ${formatearFecha(informe.fechaInicio)} al ${formatearFecha(informe.fechaFin)}. Informe técnico del Observatorio Municipal de Turismo de San Fernando del Valle de Catamarca.`
  const ruta = `/informes/ver/${slug}`
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: { ...OPEN_GRAPH_BASE, type: 'article', title: titulo, description: descripcion, url: ruta },
  }
}

export default async function InformePublicoPage({ params }: Props) {
  const informe = await getInformeAutoPublicado((await params).slug)
  if (!informe) notFound()

  return (
    <div className="max-w-5xl mx-auto print:max-w-none">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-4">
        <Link href="/informes/ocio" className="btn-outline text-sm flex items-center gap-1.5 whitespace-nowrap">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Informes de turismo de ocio
        </Link>
        <BotonDescargarPdf nombreArchivo={nombreArchivoInforme(informe)} />
      </div>
      <InformeAutoVista informe={informe} />
    </div>
  )
}
