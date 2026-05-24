import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

export default function Settings() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState('english')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/', { replace: true })
    })
  }, [navigate])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    navigate('/', { replace: true })
  }

  return (
    <div className="container pb-32">
      <header className="py-4">
        <h1 className="text-[24px] font-medium tracking-tight">Shop Settings</h1>
      </header>

      {/* Shop Profile */}
      <section className="mt-6">
        <p className="section-label">Shop Profile</p>
        <div className="bg-white p-4 mb-2">
          <p className="text-[11px] text-muted mb-1">Shop Name</p>
          <p className="text-[15px]">My Shop</p>
        </div>
        <div className="bg-white p-4 mb-2">
          <p className="text-[11px] text-muted mb-1">Location</p>
          <p className="text-[15px]">Kerala, India</p>
        </div>
      </section>

      {/* Language */}
      <section className="mt-8">
        <p className="section-label">Default Reminder Language</p>
        <div className="flex border border-border overflow-hidden">
          {['english', 'malayalam'].map((l) => (
            <button
              key={l}
              type="button"
              className="flex-1 py-2.5 text-[13px] font-medium transition-all capitalize"
              style={{
                background: language === l ? '#1C1C1E' : 'transparent',
                color: language === l ? '#FFFFFF' : '#8E8E93',
              }}
              onClick={() => setLanguage(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      {/* Preferences */}
      <section className="mt-8">
        <p className="section-label">Preferences</p>
        <div className="bg-white p-4 mb-2 flex justify-between items-center cursor-pointer active:bg-[#F2F2F7]">
          <span className="text-[15px]">Secure Backup (Supabase)</span>
          <span className="text-[11px] font-semibold text-[#10B981] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Connected
          </span>
        </div>
        <div className="bg-white p-4 mb-2 flex justify-between items-center">
          <span className="text-[15px]">App Theme</span>
          <span className="text-[13px] text-muted">Light</span>
        </div>
      </section>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="btn-primary mt-12"
      >
        Sign Out
      </button>

      <BottomNav />
    </div>
  )
}
