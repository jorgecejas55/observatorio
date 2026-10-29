'use client'

import { useEffect } from 'react'

/**
 * "Guardar como PDF" del navegador usa document.title como nombre de archivo:
 * se reemplaza durante la impresión (botón o Ctrl+P) y se restaura después.
 */
export function useNombreArchivoImpresion(nombreArchivo: string | null) {
  useEffect(() => {
    if (!nombreArchivo) return
    let tituloOriginal = document.title
    const antes = () => {
      tituloOriginal = document.title
      document.title = nombreArchivo
    }
    const despues = () => { document.title = tituloOriginal }
    window.addEventListener('beforeprint', antes)
    window.addEventListener('afterprint', despues)
    return () => {
      window.removeEventListener('beforeprint', antes)
      window.removeEventListener('afterprint', despues)
    }
  }, [nombreArchivo])
}
