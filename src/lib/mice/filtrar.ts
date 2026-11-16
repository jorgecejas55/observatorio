import type { CategoriaMice, ContactoMice } from '@/data/mice-ecosistema'

/** Minúsculas y sin tildes, para buscar "musquy" o "Musquy", "economicas" o "Económicas". */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function contactoCoincide(contacto: ContactoMice, consulta: string): boolean {
  return [contacto.nombre, contacto.referente ?? ''].some(campo => normalizarTexto(campo).includes(consulta))
}

/**
 * Filtra el directorio por texto libre. Si la consulta coincide con el nombre del
 * rubro se muestran todos sus contactos; si no, solo los contactos que coinciden por
 * nombre o referente. Los rubros sin resultados se descartan.
 */
export function filtrarCategorias(categorias: CategoriaMice[], consulta: string): CategoriaMice[] {
  const consultaNormalizada = normalizarTexto(consulta)
  if (!consultaNormalizada) return categorias

  return categorias
    .map(categoria => {
      if (normalizarTexto(categoria.titulo).includes(consultaNormalizada)) return categoria
      const contactos = categoria.contactos.filter(contacto => contactoCoincide(contacto, consultaNormalizada))
      return { ...categoria, contactos }
    })
    .filter(categoria => categoria.contactos.length > 0)
}

export function contarContactos(categorias: CategoriaMice[]): number {
  return categorias.reduce((total, categoria) => total + categoria.contactos.length, 0)
}
