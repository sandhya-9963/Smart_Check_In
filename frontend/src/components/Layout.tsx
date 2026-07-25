import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useNotificationStore } from '../store/useNotificationStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '../services/api'
import { Bell, LogOut, ShieldAlert, Sparkles, X, Check, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { fullName, role, logout } = useAuthStore()
  const toasts = useNotificationStore((s) => s.toasts)
  const removeToast = useNotificationStore((s) => s.removeToast)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Initialize websocket hook (binds connections for real-time updates)
  useWebSocket()
  
  const [showNotifications, setShowNotifications] = useState(false)

  // Fetch db notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
    refetchInterval: 15000 // Fallback poll every 15s, but ws updates it instantly!
  })

  // Mark notification read
  const markReadMutation = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Mark all notifications read
  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const unreadCount = notifications.filter((n: any) => !n.read).length

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Get color depending on role
  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'doctor': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'receptionist': return 'bg-teal-500/10 text-teal-400 border-teal-500/20'
      default: return 'bg-brand-500/10 text-brand-400 border-brand-500/20'
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col relative overflow-x-hidden">
      
      {/* Toast Alert overlay */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto p-4 rounded-xl shadow-2xl flex items-start gap-3 border ${
                toast.type === 'success' 
                  ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300' 
                  : toast.type === 'warning'
                    ? 'bg-amber-950/80 border-amber-500/30 text-amber-300'
                    : 'bg-dark-900/90 border-brand-500/30 text-brand-300'
              }`}
            >
              <Activity className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-semibold">{toast.message}</div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Glass Header */}
      <header className="glass-panel fixed top-0 left-0 right-0 h-16 z-40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 p-2 rounded-xl text-white shadow-md shadow-brand-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-brand-300 to-teal-400 bg-clip-text text-transparent">
              SmartCheck AI
            </span>
            <span className="text-[10px] text-slate-500 block -mt-1 font-semibold uppercase tracking-widest">
              Sporting Ethos
            </span>
          </div>
        </div>

        {/* User profile & nav controls */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-sm font-bold text-slate-200">{fullName}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider mt-0.5 ${getRoleBadgeColor()}`}>
              {role}
            </span>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-500 text-white font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark-950 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Notifications Drawer */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black z-45"
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm glass-panel z-50 p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-brand-400" />
                  Notifications
                </h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {notifications.length > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold mb-4 text-right flex items-center gap-1 justify-end ml-auto"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark all as read
                </button>
              )}

              {/* List */}
              <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
                {notifications.length === 0 ? (
                  <div className="text-slate-500 text-sm py-12 text-center flex flex-col items-center gap-3">
                    <ShieldAlert className="w-8 h-8 text-slate-700" />
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.read && markReadMutation.mutate(notif.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        notif.read
                          ? 'bg-slate-900/20 border-slate-800/40 text-slate-400'
                          : 'bg-slate-900 border-slate-800 hover:border-brand-500/40 text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          notif.type === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : notif.type === 'warning'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-brand-500/10 text-brand-400'
                        }`}>
                          {notif.type}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-medium">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Page Layout Wrapper */}
      <main className="flex-1 pt-24 px-6 pb-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
