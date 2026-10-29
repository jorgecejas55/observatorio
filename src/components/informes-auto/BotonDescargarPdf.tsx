'use client'

import { useNombreArchivoImpresion } from '@/hooks/useNombreArchivoImpresion'

/** Abre el diálogo de impresión: el navegador permite guardarlo como PDF (A4 apaisado). */
export default function BotonDescargarPdf({ nombreArchivo }: { nombreArchivo: string }) {
  useNombreArchivoImpresion(nombreArchivo)
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary text-sm flex items-center gap-1.5 whitespace-nowrap"
    >
      <i className="fa-solid fa-file-pdf" aria-hidden="true" />
      Descargar PDF
    </button>
  )
}
