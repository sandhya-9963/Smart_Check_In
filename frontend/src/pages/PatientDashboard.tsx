import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentService, patientService, doctorService } from '../services/api'
import { Layout } from '../components/Layout'
import { QRScanner } from '../components/QRScanner'
import { SuccessAnim } from '../components/SuccessAnim'
import { speakText } from '../hooks/useWebSocket'
import { useAuthStore } from '../store/useAuthStore'
import { Calendar, User, Clock, Ticket, Users, ThumbsUp, HelpCircle } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

export const PatientDashboard: React.FC = () => {
  const queryClient = useQueryClient()
  const { fullName } = useAuthStore()
  
  const [showSuccess, setShowSuccess] = useState(false)
  const [successToken, setSuccessToken] = useState('')
  const [checkinLoading, setCheckinLoading] = useState(false)
  
  // Booking Form state
  const [bookingDocId, setBookingDocId] = useState('')
  const [bookingReason, setBookingReason] = useState('')
  const [bookingError, setBookingError] = useState<string | null>(null)

  // Feedback state
  const [rating, setRating] = useState<number>(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  // 1. Fetch appointments
  const { data: appointments = [], isLoading: apptsLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: appointmentService.getAppointments
  })

  // Fetch doctors list for booking form
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorService.getDoctors
  })

  // Mutation to schedule today's session
  const bookSessionMutation = useMutation({
    mutationFn: appointmentService.createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setBookingDocId('')
      setBookingReason('')
      setBookingError(null)
    },
    onError: (err: any) => {
      setBookingError(err.response?.data?.detail || "Booking failed. Try again.")
    }
  })

  // Find today's appointment (that can be checked in: scheduled, or already checked_in / in_consultation)
  const todayAppt = appointments.find((appt: any) => {
    const apptDate = new Date(appt.appointment_time).toDateString()
    const todayDate = new Date().toDateString()
    return apptDate === todayDate && appt.status !== 'completed' && appt.status !== 'cancelled'
  })

  // 2. Fetch queue position for today's checked-in appointment
  const { data: queueData } = useQuery({
    queryKey: ['patient-queue', todayAppt?.id],
    queryFn: () => patientService.getQueueStatus(todayAppt.id),
    enabled: !!todayAppt && (todayAppt.status === 'checked_in' || todayAppt.status === 'in_consultation'),
    refetchInterval: 10000 // Refetch every 10 seconds for live queue updates
  })


  // 3. Handle check-in action
  const handleCheckIn = async (appointmentId: number) => {
    setCheckinLoading(true)
    try {
      await appointmentService.checkIn({
        appointment_id: appointmentId,
        method: 'QR',
        device_info: 'Mobile Web Scanner'
      })
      
      setSuccessToken(todayAppt?.token_number || 'TKN-001')
      setShowSuccess(true)
      
      // Voice confirmation message
      const docName = todayAppt?.doctor?.user?.full_name || 'your physician'
      const welcomeMsg = `Welcome ${fullName}. Your check-in is confirmed. Doctor ${docName} is notified.`
      speakText(welcomeMsg)
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['patient-queue', appointmentId] })
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedbackSubmitted(true)
  }

  const renderContent = () => {
    if (apptsLoading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500" />
        </div>
      )
    }

    if (!todayAppt) {
      const handleBookSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setBookingError(null)
        if (!bookingDocId) {
          setBookingError("Please select a doctor.")
          return
        }
        bookSessionMutation.mutate({
          patient_id: 0,
          doctor_id: parseInt(bookingDocId, 10),
          appointment_time: new Date().toISOString(),
          reason: bookingReason || "Routine Sports Injury Checkup"
        })
      }

      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <div className="flex flex-col gap-2 mb-6">
                <Calendar className="w-10 h-10 text-brand-400" />
                <h3 className="text-lg font-bold text-white">Book Today's Session</h3>
                <p className="text-xs text-slate-400">
                  You do not have a scheduled check-in session for today. Register one below to test the QR check-in scanner.
                </p>
              </div>

              {bookingError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4">
                  {bookingError}
                </div>
              )}

              <form onSubmit={handleBookSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Attending Doctor / Specialization
                  </label>
                  <select
                    value={bookingDocId}
                    onChange={(e) => setBookingDocId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="">-- Choose Specialist --</option>
                    {doctors.map((doc: any) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.user.full_name} ({doc.specialization} - Room {doc.room_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Reason for Consultation
                  </label>
                  <textarea
                    rows={3}
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    placeholder="e.g. Muscle conditioning checkup, general physical therapy, pain assessment"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookSessionMutation.isPending}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-500/15"
                >
                  {bookSessionMutation.isPending ? 'Scheduling...' : 'Schedule & Open QR Scanner'}
                </button>
              </form>
            </div>
          </div>
          
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 text-center flex flex-col items-center justify-center py-16">
            <Ticket className="w-10 h-10 text-slate-700 mb-3" />
            <h4 className="text-sm font-bold text-slate-400 font-sans">Token Ticket Pending</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">
              Schedule your session today to get a waiting ticket and scan confirmation helper.
            </p>
          </div>
        </div>
      )
    }

    const isCheckedIn = todayAppt.status === 'checked_in' || todayAppt.status === 'in_consultation'
    const isScheduled = todayAppt.status === 'scheduled'

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Appointment Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Main Info */}
          <div className="glass-panel p-6 rounded-3xl glow-brand relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isCheckedIn 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {todayAppt.status}
              </span>
            </div>

            <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-6">
              Today's Appointment Details
            </h3>

            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Attending Specialist</span>
                  <span className="font-extrabold text-white text-lg">{todayAppt.doctor?.user?.full_name}</span>
                  <span className="text-xs text-brand-400 font-semibold block mt-0.5">
                    {todayAppt.doctor?.specialization} • {todayAppt.doctor?.department?.name}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Scheduled Time</span>
                  <span className="font-bold text-slate-200">
                    {new Date(todayAppt.appointment_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                    {new Date(todayAppt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Room: {todayAppt.doctor?.room_number}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Reason for Consultation</span>
                  <span className="text-slate-300 text-sm font-medium">{todayAppt.reason || 'General Sports Injury Checkup'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Check-In Scanner Panel */}
          {isScheduled && (
            <div className="glass-card p-6 rounded-3xl border border-slate-800">
              <div className="flex flex-col gap-2 mb-6">
                <h3 className="text-lg font-bold text-white">QR Code Check-In Scanner</h3>
                <p className="text-xs text-slate-400">
                  Present your patient portal QR code or choose simulation scan to verify check-in instantly.
                </p>
              </div>

              <QRScanner 
                scheduledAppointments={[todayAppt]} 
                onScanSuccess={handleCheckIn}
                isScanning={checkinLoading}
              />
            </div>
          )}

          {/* Feedback Form (Only visible when checked in) */}
          {isCheckedIn && (
            <div className="glass-card p-6 rounded-3xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3">Rate Your Check-In Experience</h3>
              <p className="text-xs text-slate-400 mb-4">
                Help us improve Sporting Ethos services by leaving anonymous feedback.
              </p>

              {feedbackSubmitted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-center text-xs font-semibold flex flex-col items-center gap-2">
                  <ThumbsUp className="w-6 h-6" />
                  <span>Feedback submitted. Thank you!</span>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl transition-transform hover:scale-110 ${
                          star <= rating ? 'text-amber-400' : 'text-slate-600'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Any comments, features, or suggestions..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={rating === 0}
                    className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors"
                  >
                    Submit Feedback
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Live Queue / Token ticket */}
        <div>
          {isCheckedIn ? (
            <div className="space-y-6">
              
              {/* Digital Token Ticket */}
              <div className="relative bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden p-6 glow-brand text-center">
                {/* Visual Ticket Notch Cuts */}
                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-dark-950 border-r-2 border-slate-800 rounded-full -translate-y-1/2" />
                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-dark-950 border-l-2 border-slate-800 rounded-full -translate-y-1/2" />
                <div className="absolute top-1/2 left-4 right-4 border-t-2 border-dashed border-slate-800/80 -translate-y-1/2 pointer-events-none" />

                {/* Top Section */}
                <div className="pb-8">
                  <span className="text-xs text-brand-400 uppercase tracking-widest font-extrabold block mb-1">
                    Sporting Ethos
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
                    Digital Check-In Token
                  </span>
                  <div className="text-4xl font-black text-white font-mono mt-4">
                    {todayAppt.token_number}
                  </div>
                  <span className="text-xs text-slate-400 block mt-2 font-medium">
                    Queue Position: #{queueData?.position || 'Calculating...'}
                  </span>
                </div>

                {/* Bottom Section */}
                <div className="pt-8">
                  <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider mb-2">
                    Estimated Waiting Time
                  </span>
                  <div className="text-3xl font-extrabold text-brand-300 font-mono flex items-center justify-center gap-1">
                    {queueData?.estimated_wait_minutes ?? '--'}
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Mins</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-3 italic leading-relaxed">
                    Estimated wait times fluctuate based on consultation progress. Monitor status below.
                  </p>
                </div>
              </div>

              {/* Waiting list progress */}
              <div className="glass-card p-5 rounded-3xl border border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-400" />
                  Live Queue Progress
                </h4>

                <div className="space-y-3">
                  {queueData?.queue.map((q: any) => {
                    const isMe = q.appointment_id === todayAppt.id
                    return (
                      <div
                        key={q.appointment_id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isMe
                            ? 'bg-brand-600/10 border-brand-500/30 text-white font-bold'
                            : 'bg-slate-950/40 border-slate-800/40 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-extrabold ${
                            isMe ? 'bg-brand-500 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}>
                            {q.queue_number}
                          </span>
                          <span className="text-xs truncate max-w-[120px]">
                            {isMe ? 'You' : q.patient_name}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500">
                            {q.token_number}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide ${
                            q.status === 'in_consultation'
                              ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                              : 'bg-slate-900 text-slate-400'
                          }`}>
                            {q.status === 'in_consultation' ? 'in consultation' : 'waiting'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 text-center flex flex-col items-center justify-center py-12">
              <Ticket className="w-10 h-10 text-slate-600 mb-3" />
              <h4 className="text-sm font-bold text-white mb-1">Queue Token Pending</h4>
              <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
                Scan your QR code on check-in terminal to receive your digital ticket token and wait time details.
              </p>
            </div>
          )}
        </div>

      </div>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Welcome Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-white">Welcome back, {fullName}!</h2>
          <p className="text-slate-400 text-xs font-medium">
            Manage your appointment, check-in, and view real-time waiting times.
          </p>
        </div>

        {/* Dashboard Grid */}
        {renderContent()}

        {/* Success Animation Modal */}
        <AnimatePresence>
          {showSuccess && (
            <SuccessAnim 
              tokenNumber={successToken}
              onClose={() => setShowSuccess(false)}
            />
          )}
        </AnimatePresence>

      </div>
    </Layout>
  )
}
