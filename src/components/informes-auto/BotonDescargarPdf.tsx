'use client'

/** Abre el diálogo de impresión: el navegador permite guardarlo como PDF (A4 apaisado). */
export default function BotonDescargarPdf() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary text-sm flex items-center gap-1.5"
    >
      <i className="fa-solid fa-file-pdf" aria-hidden="true" />
      Descargar PDF
    </button>
  )
}
