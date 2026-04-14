// Servicio de autenticación para Museo de la Ciudad - Casa Caravati
// Maneja estado de sesión y comunicación con Google Apps Script

const MUSEO_AUTH_URL = process.env.NEXT_PUBLIC_MUSEO_CASA_CARAVATI_SCRIPT_URL || ''
const STORAGE_KEY = 'museo_casa_caravati_session'

interface User {
  id: string
  email: string
  nombre: string
  apellido: string
  rol: 'admin' | 'operador'
  created_at?: string
  last_login?: string
}

interface LoginResponse {
  success: boolean
  user?: User
  message?: string
}

const MuseoCasaCaravatiAuthService = {
  /**
   * Helper para peticiones GET al Apps Script
   */
  async _requestGet(params: Record<string, string>): Promise<any> {
    if (!MUSEO_AUTH_URL) {
      console.error('⚠️ NEXT_PUBLIC_MUSEO_CASA_CARAVATI_SCRIPT_URL no está definida en .env.local')
      throw new Error('Configuración de Apps Script faltante')
    }

    const url = new URL(MUSEO_AUTH_URL)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
      })
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error en request Apps Script (Casa Caravati):', error)
      throw error
    }
  },

  /**
   * Login con email y password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('🔐 Intentando login con:', { email, url: MUSEO_AUTH_URL })

      const result = await this._requestGet({
        action: 'login',
        email,
        password,
      })

      console.log('📥 Respuesta del servidor:', result)

      if (result.success) {
        // Guardar usuario en localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user))
        console.log('✅ Login exitoso, usuario guardado')
        return { success: true, user: result.user }
      } else {
        console.warn('⚠️ Login fallido:', result.message)
        return { success: false, message: result.message || 'Credenciales inválidas' }
      }
    } catch (error) {
      console.error('❌ Error en login (Casa Caravati):', error)
      return { success: false, message: 'Error de conexión con el servidor' }
    }
  },

  /**
   * Logout
   */
  logout(): void {
    localStorage.removeItem(STORAGE_KEY)
  },

  /**
   * Obtener usuario actual desde localStorage
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    const session = localStorage.getItem(STORAGE_KEY)
    return session ? JSON.parse(session) : null
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getCurrentUser()
  },

  /**
   * Verificar si el usuario es admin
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.rol === 'admin'
  },
}

export default MuseoCasaCaravatiAuthService
export type { User, LoginResponse }
