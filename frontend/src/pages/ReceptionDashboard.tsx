import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentService, doctorService, patientService } from '../services/api'
import { Layout } from '../components/Layout'
import { 
  Users, Clock, Search, UserPlus, 
  UserCheck, AlertTriangle, Play, Check, X 
} from 'lucide-react'

export const ReceptionDashboard: React.FC = () => {
  const queryClient = useQueryClient()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  
  // Walk-in form state
  const [walkInEmail, setWalkInEmail] = useState('')
  const [walkInName, setWalkInName] = useState('')
  const [walkInPhone, setWalkInPhone] = useState('')
  const [walkInDob, setWalkInDob] = useState('')
  const [walkInGender, setWalkInGender] = useState('Male')
  const [walkInReason, setWalkInReason] = useState('')
  const [walkInDoctorId, setWalkInDoctorId] = useState('')
  const [walkInCheckInNow, setWalkInCheckInNow] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  // 1. Fetch today's appointments
  const { data: appointments = [], isLoading: apptsLoading } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: appointmentService.getTodayAppointments,
    refetchInterval: 10000 // refresh every 10s
  })

  // 2. Fetch doctors for walk-in registration dropdown
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorService.getDoctors
  })

  // 3. Mutation for manual check-in
  const checkinMutation = useMutation({
    mutationFn: appointmentService.checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] })
    }
  })

  // 4. Mutation for walk-in registration
  const registerWalkInMutation = useMutation({
    mutationFn: patientService.registerWalkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] })
      setShowWalkInModal(false)
      resetForm()
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Registration failed. Verify input details.")
    }
  })

  // 5. Mutation for updating appointment status
  const updateStatusMutation = useMutation({
    mutationFn: ({ apptId, status }: { apptId: number; status: string }) => 
      doctorService.updateStatus(apptId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] })
    }
  })

  const resetForm = () => {
    setWalkInEmail('')
    setWalkInName('')
    setWalkInPhone('')
    setWalkInDob('')
    setWalkInGender('Male')
    setWalkInReason('')
    setWalkInDoctorId('')
    setWalkInCheckInNow(true)
    setFormError(null)
  }

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    
    if (!walkInDoctorId) {
      setFormError("Please assign an attending physician.")
      return
    }

    registerWalkInMutation.mutate({
      email: walkInEmail,
      full_name: walkInName,
      phone: walkInPhone,
      date_of_birth: walkInDob,
      gender: walkInGender,
      reason: walkInReason,
      doctor_id: parseInt(walkInDoctorId, 10),
      check_in_now: walkInCheckInNow
    })
  }

  // Statistics calculation
  const total = appointments.length
  const checkedIn = appointments.filter((a: any) => a.status === 'checked_in').length
  const waiting = checkedIn
  const inConsultation = appointments.filter((a: any) => a.status === 'in_consultation').length
  const completed = appointments.filter((a: any) => a.status === 'completed').length

  // Filtered Appointments
  const filteredAppointments = appointments.filter((a: any) => 
    a.patient?.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.token_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeQueue = filteredAppointments.filter((a: any) => 
    a.status === 'checked_in' || a.status === 'in_consultation'
  ).sort((a: any, b: any) => (a.queue_number || 999) - (b.queue_number || 999))

  const pendingList = filteredAppointments.filter((a: any) => 
    a.status === 'scheduled'
  )

  const archivedList = filteredAppointments.filter((a: any) => 
    a.status === 'completed' || a.status === 'cancelled'
  )

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Top Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black text-white">Reception Desk Dashboard</h2>
            <p className="text-slate-400 text-xs font-medium">
              Manage patient walk-ins, verify appointments, and coordinate the live check-in queue.
            </p>
          </div>

          <button
            onClick={() => setShowWalkInModal(true)}
            className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-500/15"
          >
            <UserPlus className="w-4 h-4" />
            Walk-in Patient Check-in
          </button>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Today's Schedule</span>
            <span className="text-2xl font-extrabold text-white mt-1">{total}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Checked In</span>
            <span className="text-2xl font-extrabold text-teal-300 mt-1">{checkedIn + inConsultation}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Waiting Queue</span>
            <span className="text-2xl font-extrabold text-amber-300 mt-1">{waiting}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">In Consultation</span>
            <span className="text-2xl font-extrabold text-blue-300 mt-1">{inConsultation}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Completed Sessions</span>
            <span className="text-2xl font-extrabold text-emerald-300 mt-1">{completed}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patients by name or token ID..."
            className="w-full bg-slate-900/60 border border-slate-800/80 text-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Dashboards Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Live Waiting Queue */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-400" />
                Live Waiting Queue ({activeQueue.length})
              </h3>

              {apptsLoading ? (
                <div className="text-center py-6 text-slate-500">Loading...</div>
              ) : activeQueue.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                  No patients waiting or in consultation.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {activeQueue.map((appt: any) => (
                    <div key={appt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-brand-400 font-mono">
                          {appt.queue_number || '#'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{appt.patient?.user?.full_name}</span>
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-400">
                              {appt.token_number}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                            Doctor: {appt.doctor?.user?.full_name} ({appt.doctor?.department?.name})
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            Checked in: {appt.check_in ? new Date(appt.check_in.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Walk-in'}
                          </span>
                        </div>
                      </div>

                      {/* Queue Actions */}
                      <div className="flex items-center gap-2">
                        {appt.status === 'checked_in' ? (
                          <button
                            onClick={() => updateStatusMutation.mutate({ apptId: appt.id, status: 'in_consultation' })}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Play className="w-3.5 h-3.5" /> Call In
                          </button>
                        ) : (
                          <button
                            onClick={() => updateStatusMutation.mutate({ apptId: appt.id, status: 'completed' })}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Complete
                          </button>
                        )}
                        <button
                          onClick={() => updateStatusMutation.mutate({ apptId: appt.id, status: 'cancelled' })}
                          className="bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all font-semibold text-xs px-2.5 py-2 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Scheduled (Pending Check-In) & History */}
          <div className="space-y-6">
            
            {/* Scheduled Pending Check-In */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Scheduled Pending Check-In ({pendingList.length})
              </h3>

              {pendingList.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No pending scheduled check-ins today.
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                  {pendingList.map((appt: any) => (
                    <div key={appt.id} className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{appt.patient?.user?.full_name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{appt.token_number}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Doctor: {appt.doctor?.user?.full_name}
                        </span>
                        <span className="text-[9px] text-slate-500 block font-semibold">
                          Time: {new Date(appt.appointment_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(appt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => checkinMutation.mutate({ appointment_id: appt.id, method: 'Manual' })}
                        className="bg-brand-600/10 hover:bg-brand-600 border border-brand-500/20 text-brand-300 hover:text-white font-semibold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Manual Verify
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed/Cancelled Log */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                Archived Log ({archivedList.length})
              </h3>
              
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {archivedList.map((appt: any) => (
                  <div key={appt.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-800/60">
                    <div className="truncate pr-2">
                      <span className="text-slate-300 block font-semibold truncate">{appt.patient?.user?.full_name}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">Doc: {appt.doctor?.user?.full_name}</span>
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      appt.status === 'completed' 
                        ? 'bg-emerald-500/15 text-emerald-400' 
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* WALK-IN REGISTRATION MODAL */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl glow-brand shadow-2xl flex flex-col">
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-400" />
                Walk-In Registration & Check-In
              </h3>
              <button
                onClick={() => {
                  setShowWalkInModal(false)
                  resetForm()
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleWalkInSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="e.g. Mike Tyson"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={walkInEmail}
                    onChange={(e) => setWalkInEmail(e.target.value)}
                    placeholder="mike@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="+91 99999 88888"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    value={walkInGender}
                    onChange={(e) => setWalkInGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={walkInDob}
                    onChange={(e) => setWalkInDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Assign Attending Physician
                  </label>
                  <select
                    required
                    value={walkInDoctorId}
                    onChange={(e) => setWalkInDoctorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="">-- Attending Doctor --</option>
                    {doctors.map((doc: any) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.user.full_name} ({doc.specialization} - Room {doc.room_number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Reason for Visit
                </label>
                <textarea
                  rows={2}
                  required
                  value={walkInReason}
                  onChange={(e) => setWalkInReason(e.target.value)}
                  placeholder="Sports injury check, routine physical therapy..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              {/* Check-in now toggle */}
              <div className="flex items-center gap-2 py-1 select-none">
                <input
                  type="checkbox"
                  id="walkInCheckInNow"
                  checked={walkInCheckInNow}
                  onChange={(e) => setWalkInCheckInNow(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-brand-500 focus:ring-brand-500"
                />
                <label 
                  htmlFor="walkInCheckInNow" 
                  className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider cursor-pointer"
                >
                  Check-in patient immediately
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowWalkInModal(false)
                    resetForm()
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerWalkInMutation.isPending}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  {registerWalkInMutation.isPending ? 'Registering...' : 'Register & Check In'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
