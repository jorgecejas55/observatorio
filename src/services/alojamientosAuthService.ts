// Servicio de autenticación para el módulo de alojamientos no registrados
// Reutiliza la hoja "usuarios" del sistema de eventos
import AppsScriptAuthService, { type User, type LoginResponse } from './appsScriptAuthService'

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT'
type AuthCallback = (event: AuthEvent, session: { user: User | null }, user: User | null) => void

class AlojamientosAuthService {
  private currentUser: User | null = null
  private sessionListeners: AuthCallback[] = []
  private STORAGE_KEY = 'alojamientos_user_session'

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadUserFromStorage()
    }
  }

  /**
   * Cargar usuario desde localStorage
   */
  private loadUserFromStorage(): void {
    const session = localStorage.getItem(this.STORAGE_KEY)
    this.currentUser = session ? JSON.parse(session) : null
  }

  /**
   * Inicializar el servicio de autenticación
   */
  async initialize(): Promise<User | null> {
    this.loadUserFromStorage()
    return this.currentUser
  }

  /**
   * Login con email y password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Usar el URL de alojamientos
      const ALOJAMIENTOS_URL = process.env.NEXT_PUBLIC_ALOJAMIENTOS_SCRIPT_URL || ''

      if (!ALOJAMIENTOS_URL) {
        return { success: false, message: 'URL del script no configurada' }
      }

      const url = new URL(ALOJAMIENTOS_URL)
      url.searchParams.set('action', 'login')
      url.searchParams.set('email', email)
      url.searchParams.set('password', password)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
      })

      const result = await response.json()

      if (result.success && result.user) {
        this.currentUser = result.user
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(result.user))
        this.notifyListeners('SIGNED_IN', result.user)
        return { success: true, user: result.user }
      } else {
        return { success: false, message: result.message || 'Credenciales inválidas' }
      }
    } catch (error) {
      console.error('❌ Error en login:', error)
      return { success: false, message: 'Error inesperado durante el login' }
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<{ success: boolean }> {
    localStorage.removeItem(this.STORAGE_KEY)
    this.currentUser = null
    this.notifyListeners('SIGNED_OUT', null)
    return { success: true }
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUser
  }

  /**
   * Obtener info del usuario
   */
  getUserInfo(): User | null {
    return this.currentUser
  }

  /**
   * Verificar si es admin
   */
  isAdmin(): boolean {
    return this.currentUser?.rol === 'admin'
  }

  /**
   * Verificar si está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.currentUser
  }

  /**
   * Suscribirse a cambios de estado de autenticación
   */
  onAuthStateChange(callback: AuthCallback): { unsubscribe: () => void } {
    this.sessionListeners.push(callback)
    return {
      unsubscribe: () => {
        this.sessionListeners = this.sessionListeners.filter((cb) => cb !== callback)
      },
    }
  }

  /**
   * Notificar a todos los listeners
   */
  private notifyListeners(event: AuthEvent, user: User | null): void {
    this.sessionListeners.forEach((cb) => cb(event, { user }, user))
  }
}

// Exportar instancia única (singleton)
export const alojamientosAuthService = new AlojamientosAuthService()
export default alojamientosAuthService
