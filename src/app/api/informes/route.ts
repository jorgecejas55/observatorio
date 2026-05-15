import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const SCRIPT_URL = process.env.INFORMES_SCRIPT_URL!
const SECRET = process.env.INFORMES_SCRIPT_SECRET!

export async function GET() {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=listar`, { cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[informes GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, secret: SECRET }),
    })
    const data = await res.json()

    // Si la operación fue exitosa, invalidar el caché de las páginas públicas
    // para que la próxima visita vea los datos actualizados sin esperar 1 hora
    if (data.success) {
      revalidatePath('/informes/ocio')
      revalidatePath('/informes/mice')
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[informes POST]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
