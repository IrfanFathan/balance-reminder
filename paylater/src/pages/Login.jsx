import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
    })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#EAEAEA' }}>
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 flex items-center justify-center mb-4"
            style={{ background: '#1C1C1E', borderRadius: '20px' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <h1 className="text-[20px] font-medium">PayLater</h1>
          <p className="text-[13px] text-muted mt-1">Balance reminder for your shop</p>
        </div>

        {/* Form Card */}
        <div className="bg-white p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] text-muted">Email</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] text-muted">Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            {error && (
              <p className="text-[13px] text-accent text-center">{error}</p>
            )}
          </form>
        </div>

        <p className="text-[11px] text-muted text-center mt-4">Secured by Supabase Auth</p>
      </div>
    </div>
  )
}
