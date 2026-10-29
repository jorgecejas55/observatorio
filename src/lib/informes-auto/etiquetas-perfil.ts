/**
 * Códigos crudos de la encuesta de perfil ("HOTEL_OTRA CATEGORIA",
 * "SGO DEL ESTERO") → texto legible para el informe. Puro.
 */

/** Mayúsculas, sin tildes ni espacios sobrantes: clave para comparar respuestas. */
export function claveRespuesta(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ')
}

const ETIQUETAS: Record<string, string> = {
  // Provincias
  'SGO DEL ESTERO': 'Santiago del Estero',
  'CABA': 'CABA',
  // Motivo
  'VACACIONES/OCIO/RECREACION': 'Vacaciones / ocio',
  'VISITA A FAMILIARES/AMIGOS': 'Visita a familiares o amigos',
  'TRABAJO/ESTUDIO': 'Trabajo o estudio',
  'SALUD/ATENCION SANITARIA': 'Salud',
  // Grupo
  'AMIGAS/OS': 'Amigos/as',
  'GRUPO CORPORATIVO/TRABAJO/ESTUDIO': 'Grupo de trabajo o estudio',
  // Transporte
  'AUTOMOVIL PARTICULAR': 'Auto particular',
  'OMNIBUS': 'Ómnibus',
  'OMNIBUS CONTINGENTE': 'Ómnibus de contingente',
  'AVION': 'Avión',
  'VEHICULO DE ALQUILER': 'Auto de alquiler',
  // Alojamiento
  'HOTEL_OTRA CATEGORIA': 'Hotel (otra categoría)',
  'DEPARTAMENTO/ALQUILER TEMPORARIO': 'Departamento / alquiler temporario',
  'NO SE ALOJA/SE ENCUENTRA DE PASO': 'No se aloja (de paso)',
  'EN BUSCA DE ALOJAMIENTO': 'Buscando alojamiento',
  'CASA DE FAMILIAR/AMIGO': 'Casa de familiar o amigo',
  'CASA DE VACACIONES/SEGUNDA RESIDENCIA': 'Segunda residencia',
  'HOSTERIA': 'Hostería',
}

const PALABRAS_MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'o', 'en'])

/** "HOTEL 3*" → "Hotel 3 estrellas"; "SAN JUAN" → "San Juan" (nombres propios en tipo título). */
export function etiquetaPerfil(nombre: string, nombrePropio = false): string {
  const conocida = ETIQUETAS[claveRespuesta(nombre)]
  if (conocida) return conocida

  const texto = nombre.trim().replace(/_/g, ' ').replace(/(\d)\s*\*/g, '$1 estrellas').toLowerCase()
  if (!nombrePropio) return texto.charAt(0).toUpperCase() + texto.slice(1)
  return texto
    .split(' ')
    .map((p, i) => (i > 0 && PALABRAS_MENORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
}

/**
 * Une variantes con y sin tilde ("CÓRDOBA" / "CORDOBA"): la encuesta las
 * cuenta por separado y partían el top 5. Conserva la variante con tilde.
 */
export function unirVariantes(items: Array<{ nombre: string; cantidad: number }>): Array<{ nombre: string; cantidad: number }> {
  const porClave = new Map<string, { nombre: string; cantidad: number }>()
  for (const item of items) {
    const clave = claveRespuesta(item.nombre)
    const previo = porClave.get(clave)
    if (!previo) {
      porClave.set(clave, { ...item })
      continue
    }
    previo.cantidad += item.cantidad
    if (item.nombre !== claveRespuesta(item.nombre)) previo.nombre = item.nombre
  }
  return [...porClave.values()].sort((a, b) => b.cantidad - a.cantidad)
}
