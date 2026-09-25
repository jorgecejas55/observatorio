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
import { tituloInforme } from '@/components/informes-auto/vista/etiquetas'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const informe = await getInformeAutoPublicado((await params).slug)
  return { title: informe ? `${tituloInforme(informe)} | Observatorio de Turismo` : 'Informe no disponible' }
}

export default async function InformePublicoPage({ params }: Props) {
  const informe = await getInformeAutoPublicado((await params).slug)
  if (!informe) notFound()

  return (
    <div className="max-w-5xl mx-auto print:max-w-none">
      <div className="no-print flex items-center justify-between gap-3 mb-4">
        <Link href="/informes/ocio" className="btn-outline text-sm flex items-center gap-1.5">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Informes de turismo de ocio
        </Link>
        <BotonDescargarPdf />
      </div>
      <InformeAutoVista informe={informe} />
    </div>
  )
}
