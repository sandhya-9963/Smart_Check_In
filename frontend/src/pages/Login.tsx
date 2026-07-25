import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/useAuthStore'
import { authService } from '../services/api'
import { 
  ShieldCheck, User, Lock, Sparkles, RefreshCw, AlertCircle, 
  ArrowLeft, Heart, Briefcase, Phone, Calendar, UserPlus 
} from 'lucide-react'

export const Login: React.FC = () => {
  const [isSignup, setIsSignup] = useState(false)
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')
  
  // Credentials & profile
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  
  // Patient details
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Male')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [bloodGroup, setBloodGroup] = useState('O+')
  
  // Doctor details
  const [specialization, setSpecialization] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [departmentId, setDepartmentId] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const loginStore = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  // Fetch departments for doctor registration
  const { data: departments = [] } = useQuery({
    queryKey: ['signup-departments'],
    queryFn: authService.getDepartments,
    enabled: isSignup && role === 'doctor'
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      const data = await authService.login({ email, password })
      loginStore(data)
      
      if (data.role === 'admin') navigate('/admin')
      else if (data.role === 'doctor') navigate('/doctor')
      else if (data.role === 'receptionist') navigate('/reception')
      else navigate('/patient')
      
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Verify email/password.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      const payload: any = {
        email,
        password,
        full_name: fullName,
        role,
      }

      if (role === 'patient') {
        payload.date_of_birth = dob || undefined
        payload.gender = gender || undefined
        payload.phone = phone || undefined
        payload.emergency_contact = emergencyContact || undefined
        payload.blood_group = bloodGroup || undefined
      } else {
        if (!departmentId) {
          setError("Please select a department.")
          setLoading(false)
          return
        }
        payload.department_id = parseInt(departmentId, 10)
        payload.specialization = specialization
        payload.room_number = roomNumber
      }

      await authService.signup(payload)
      
      // Auto login after successful signup
      const data = await authService.login({ email, password })
      loginStore(data)
      
      if (data.role === 'admin') navigate('/admin')
      else if (data.role === 'doctor') navigate('/doctor')
      else if (data.role === 'receptionist') navigate('/reception')
      else navigate('/patient')
      
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Verify inputs.")
    } finally {
      setLoading(false)
    }
  }

  // Pre-fill helper for hackathon judges
  const prefill = (roleEmail: string) => {
    setEmail(roleEmail)
    setPassword('SportingEthos2026!')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-lg relative z-10">
        
        {/* Logo and Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="bg-brand-600 p-3 rounded-2xl text-white shadow-xl shadow-brand-500/20 mb-3 flex items-center justify-center">
            <Sparkles className="w-8 h-8 animate-pulse-fast" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-brand-300 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
            SmartCheck AI
          </h1>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-1">
            Sporting Ethos High-Performance Centre
          </p>
        </div>

        {/* Login/Signup Card */}
        <div className="glass-panel p-8 rounded-3xl glow-brand shadow-2xl relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-extrabold text-white">
              {isSignup ? 'Create Your Account' : 'Staff & Patient Portal'}
            </h2>
            <button
              onClick={() => {
                setIsSignup(!isSignup)
                setError(null)
              }}
              className="text-brand-400 hover:text-brand-300 text-xs font-bold transition-colors flex items-center gap-1"
            >
              {isSignup ? (
                <>
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" /> Sign Up / Register
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isSignup ? (
            /* SIGN IN FORM */
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@sportingethos.com"
                    className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-500/15 flex items-center justify-center gap-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          ) : (
            /* SIGN UP FORM */
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Role Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  I am a
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('patient')
                      setError(null)
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
                      role === 'patient'
                        ? 'bg-brand-600/20 border-brand-500 text-brand-400 shadow-md shadow-brand-500/5'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" /> Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('doctor')
                      setError(null)
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
                      role === 'doctor'
                        ? 'bg-brand-600/20 border-brand-500 text-brand-400 shadow-md shadow-brand-500/5'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" /> Doctor
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your first & last name"
                    className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {/* Email & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {/* Patient Fields */}
              {role === 'patient' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
                          className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="date"
                          required
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                      >
                        <option value="Male" className="bg-slate-950">Male</option>
                        <option value="Female" className="bg-slate-950">Female</option>
                        <option value="Other" className="bg-slate-950">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Blood Group
                      </label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                      >
                        <option value="A+" className="bg-slate-950">A+</option>
                        <option value="A-" className="bg-slate-950">A-</option>
                        <option value="B+" className="bg-slate-950">B+</option>
                        <option value="B-" className="bg-slate-950">B-</option>
                        <option value="O+" className="bg-slate-950">O+</option>
                        <option value="O-" className="bg-slate-950">O-</option>
                        <option value="AB+" className="bg-slate-950">AB+</option>
                        <option value="AB-" className="bg-slate-950">AB-</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Emergency Contact Name/Relation
                    </label>
                    <input
                      type="text"
                      required
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="e.g. John Doe Sr. (Father)"
                      className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </>
              )}

              {/* Doctor Fields */}
              {role === 'doctor' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Clinical Department
                    </label>
                    <select
                      required
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                    >
                      <option value="" className="bg-slate-950">Select clinical department...</option>
                      {departments.map((dept: any) => (
                        <option key={dept.id} value={dept.id} className="bg-slate-950">
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Clinical Specialization
                      </label>
                      <input
                        type="text"
                        required
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. Sports Physiotherapy"
                        className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Consultation Room Number
                      </label>
                      <input
                        type="text"
                        required
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        placeholder="e.g. Room 101"
                        className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-500/15 flex items-center justify-center gap-2 mt-4"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                {loading ? 'Registering Account...' : 'Register Account'}
              </button>
            </form>
          )}
        </div>

        {/* Hackathon Preset Accounts */}
        {!isSignup && (
          <div className="mt-8 bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Hackathon Evaluation Accounts
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                onClick={() => prefill('patient@sportingethos.com')}
                className="bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold p-2.5 rounded-xl border border-slate-800 text-left transition-colors"
              >
                <span className="text-brand-400 block font-bold text-[9px] uppercase">Patient Portal</span>
                John Doe (Patient)
              </button>
              <button
                onClick={() => prefill('reception@sportingethos.com')}
                className="bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold p-2.5 rounded-xl border border-slate-800 text-left transition-colors"
              >
                <span className="text-teal-400 block font-bold text-[9px] uppercase">Reception Desk</span>
                Sarah Connors
              </button>
              <button
                onClick={() => prefill('doctor@sportingethos.com')}
                className="bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold p-2.5 rounded-xl border border-slate-800 text-left transition-colors"
              >
                <span className="text-blue-400 block font-bold text-[9px] uppercase">Doctor Dashboard</span>
                Dr. Robert Chen
              </button>
              <button
                onClick={() => prefill('admin@sportingethos.com')}
                className="bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold p-2.5 rounded-xl border border-slate-800 text-left transition-colors"
              >
                <span className="text-purple-400 block font-bold text-[9px] uppercase">System Admin</span>
                Admin Manager
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
