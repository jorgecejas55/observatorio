import type { Metadata } from 'next'

/** Metadata para pantallas internas (admin, login): que los buscadores no las indexen. */
export const METADATA_SIN_INDEXAR: Metadata = {
  robots: { index: false, follow: false },
}
