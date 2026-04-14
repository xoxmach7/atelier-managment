import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // Состояние
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Действия
      login: async (email, password) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data } = await api.post('/auth/login', { email, password })
          
          if (data.success) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            })
            return { success: true }
          }
        } catch (error) {
          set({
            error: error.response?.data?.error?.message || 'Ошибка входа',
            isLoading: false,
          })
          return { success: false, error: error.response?.data?.error?.message }
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
        localStorage.removeItem('brigada-auth')
      },

      clearError: () => set({ error: null }),
      
      // Проверка роли
      hasRole: (role) => {
        const { user } = get()
        return user?.role === role || user?.role === 'admin'
      },
    }),
    {
      name: 'brigada-auth',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
)
