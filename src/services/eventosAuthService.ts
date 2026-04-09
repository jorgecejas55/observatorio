// Servicio de autenticación para el módulo de eventos
// Maneja estado de sesión y notificaciones a listeners
import AppsScriptAuthService, { type User, type LoginResponse } from './appsScriptAuthService'

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT'
type AuthCallback = (event: AuthEvent, session: { user: User | null }, user: User | null) => void

class EventosAuthService {
  private currentUser: User | null = null
  private sessionListeners: AuthCallback[] = []

  constructor() {
    // Cargar usuario inicial desde storage (solo en cliente)
    if (typeof window !== 'undefined') {
      this.currentUser = AppsScriptAuthService.getCurrentUser()
    }
  }

  /**
   * Inicializar el servicio de autenticación
   */
  async initialize(): Promise<User | null> {
    this.currentUser = AppsScriptAuthService.getCurrentUser()
    return this.currentUser
  }

  /**
   * Login con email y password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const result = await AppsScriptAuthService.login(email, password)

      if (result.success && result.user) {
        this.currentUser = result.user
        this.notifyListeners('SIGNED_IN', result.user)
        return { success: true, user: result.user }
      } else {
        return { success: false, message: result.message }
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
    AppsScriptAuthService.logout()
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
    return AppsScriptAuthService.isAdmin()
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
    // Retornar función unsubscribe
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
export const eventosAuthService = new EventosAuthService()
export default eventosAuthService
