const STORAGE_KEY = 'museo_virgen_valle_session'

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

const MuseoVirgenValleAuthService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch('/api/ocio/ingresos/museo-virgen-valle/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (result.success) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user))
        return { success: true, user: result.user }
      } else {
        return { success: false, message: result.message || 'Credenciales inválidas' }
      }
    } catch (error) {
      console.error('❌ Error en login (Virgen del Valle):', error)
      return { success: false, message: 'Error de conexión con el servidor' }
    }
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEY)
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    const session = localStorage.getItem(STORAGE_KEY)
    return session ? JSON.parse(session) : null
  },

  isAuthenticated(): boolean {
    return !!this.getCurrentUser()
  },

  isAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.rol === 'admin'
  },
}

export default MuseoVirgenValleAuthService
export type { User, LoginResponse }
