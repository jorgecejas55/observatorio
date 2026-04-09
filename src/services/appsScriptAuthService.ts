// Servicio de comunicación con Apps Script para autenticación de eventos
// Adaptado del proyecto events-management-app

const EVENTOS_AUTH_URL = process.env.NEXT_PUBLIC_EVENTOS_SCRIPT_URL || process.env.EVENTOS_SCRIPT_URL || ''

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

const AppsScriptAuthService = {
  /**
   * Helper para peticiones GET al Apps Script
   */
  async _requestGet(params: Record<string, string>): Promise<any> {
    if (!EVENTOS_AUTH_URL) {
      console.error('⚠️ EVENTOS_SCRIPT_URL no está definida en .env')
      throw new Error('Configuración de Apps Script faltante')
    }

    const url = new URL(EVENTOS_AUTH_URL)
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
      console.error('Error en request Apps Script:', error)
      throw error
    }
  },

  /**
   * Login con email y password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const result = await this._requestGet({
        action: 'login',
        email,
        password,
      })

      if (result.success) {
        // Guardar usuario en localStorage
        localStorage.setItem('eventos_user_session', JSON.stringify(result.user))
        return { success: true, user: result.user }
      } else {
        return { success: false, message: result.message || 'Credenciales inválidas' }
      }
    } catch (error) {
      console.error('❌ Error en login:', error)
      return { success: false, message: 'Error de conexión con el servidor' }
    }
  },

  /**
   * Logout
   */
  logout(): void {
    localStorage.removeItem('eventos_user_session')
  },

  /**
   * Obtener usuario actual desde localStorage
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    const session = localStorage.getItem('eventos_user_session')
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

export default AppsScriptAuthService
export type { User, LoginResponse }
