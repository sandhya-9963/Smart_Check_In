import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'warning'
}

interface NotificationState {
  toasts: Toast[]
  addToast: (message: string, type?: 'info' | 'success' | 'warning') => void
  removeToast: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }))
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }))
    }, 5000)
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  }
}))
