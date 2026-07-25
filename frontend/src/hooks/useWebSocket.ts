import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useNotificationStore } from '../store/useNotificationStore'
import { useQueryClient } from '@tanstack/react-query'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

// Web Audio API Synthesizer for notifications
export const playNotificationChime = (type: 'info' | 'success' | 'warning' = 'info') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.type = 'sine'
    if (type === 'success') {
      // Elegant major third upward chime
      osc.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1) // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2) // G5
    } else if (type === 'warning') {
      // Discard alert chord
      osc.frequency.setValueAtTime(440.00, ctx.currentTime) // A4
      osc.frequency.setValueAtTime(415.30, ctx.currentTime + 0.15) // G#4
    } else {
      // standard neutral chime
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15) // A5
    }
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.45)
  } catch (e) {
    console.warn('AudioContext playback blocked or not supported:', e)
  }
}

// Web Speech Synthesis for Voice Check-in confirmation
export const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    // Stop any speaking in queue to prevent overlaps
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.05
    window.speechSynthesis.speak(utterance)
  }
}

export const useWebSocket = () => {
  const { token, role, userId } = useAuthStore()
  const addToast = useNotificationStore((s) => s.addToast)
  const queryClient = useQueryClient()
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  const connect = useCallback(() => {
    if (!token) return

    const wsUrl = `${WS_URL}?token=${token}`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      console.log('WebSocket connection successfully opened.')
    }

    socket.onmessage = (event) => {
      if (event.data === 'pong') return
      
      try {
        const payload = JSON.parse(event.data)
        const { event: eventName, data } = payload
        
        console.log('WebSocket event received:', eventName, data)

        // Invalidate React Query cache to trigger automatic visual updates
        queryClient.invalidateQueries()

        // Handle specific events
        switch (eventName) {
          case 'patient_checked_in':
            // Alert logic based on roles
            if (role === 'receptionist') {
              playNotificationChime('success')
              addToast(`Patient ${data.patient_name} checked in successfully.`, 'success')
            } else if (role === 'doctor') {
              playNotificationChime('success')
              addToast(`Patient ${data.patient_name} is waiting in your queue.`, 'info')
            } else if (role === 'patient' && userId === data.appointment_id) {
              // Wait, the ws payload sends the user_id (not appointment_id) to verify if it is me
              // But we can check if it relates to my login user
            }
            break

          case 'duplicate_checkin_detected':
            if (role === 'receptionist' || role === 'admin') {
              playNotificationChime('warning')
              addToast(`Duplicate Scan: ${data.patient_name} has already checked in!`, 'warning')
            }
            break

          case 'appointment_status_changed':
            // Toast notification
            if (role === 'patient') {
              playNotificationChime('info')
              if (data.status === 'in_consultation') {
                speakText(`Attention please. ${data.patient_name}, please proceed to room ${data.doctor_id || 'one'}.`)
                addToast(`It's your turn! Proceed to room.`, 'success')
              } else if (data.status === 'completed') {
                addToast(`Consultation completed.`, 'info')
              }
            } else if (role === 'receptionist' || role === 'admin') {
              addToast(`Patient ${data.patient_name} status updated to ${data.status}.`, 'info')
            }
            break

          case 'doctor_delay_alert':
            playNotificationChime('warning')
            addToast(`Delay alert: ${data.message}`, 'warning')
            break

          default:
            break
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err)
      }
    }

    socket.onclose = (event) => {
      console.log('WebSocket closed, scheduling reconnect:', event.reason)
      if (token) {
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect()
        }, 3000)
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket encountered an error:', error)
      socket.close()
    }
  }, [token, role, userId, addToast, queryClient])

  useEffect(() => {
    connect()

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send('ping')
      }
    }, 30000)

    return () => {
      clearInterval(pingInterval)
      if (socketRef.current) {
        socketRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return socketRef.current
}
