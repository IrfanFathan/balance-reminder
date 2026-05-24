import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import { formatPhoneNumber } from '../lib/messages'

export default function Settings() {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [language, setLanguage] = useState('english')

  // Load configuration from localStorage with seed defaults
  const [settings, setSettings] = useState({
    shopName: 'Royal Fancy',
    ownerName: 'Shamil',
    phone: '9876543210',
    address: 'Kerala, India',
    upiId: 'owner@upi',
    logo: ''
  })

  const [editForm, setEditForm] = useState({ ...settings })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/', { replace: true })
        return
      }
    })

    // Load persisted settings
    const stored = localStorage.getItem('paylater_shop_settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings(parsed)
        setEditForm(parsed)
      } catch (err) {
        console.error('Failed to parse settings', err)
      }
    }

    const storedLang = localStorage.getItem('paylater_language')
    if (storedLang) {
      setLanguage(storedLang)
    }
  }, [navigate])

  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    localStorage.setItem('paylater_language', lang)
    toast.success(`Language updated to ${lang.toUpperCase()}`)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    navigate('/', { replace: true })
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo must be under 2MB")
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, logo: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = (e) => {
    e.preventDefault()

    // Validate fields
    if (!editForm.shopName.trim() || !editForm.ownerName.trim() || !editForm.phone.trim()) {
      toast.error('Shop Name, Owner Name, and Phone are required')
      return
    }

    const phoneRegex = /^[6-9]\d{9}$/
    if (!phoneRegex.test(editForm.phone)) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    const updated = {
      shopName: editForm.shopName.trim(),
      ownerName: editForm.ownerName.trim(),
      phone: editForm.phone.trim(),
      address: editForm.address.trim(),
      upiId: editForm.upiId.trim(),
      logo: editForm.logo
    }

    setSettings(updated)
    localStorage.setItem('paylater_shop_settings', JSON.stringify(updated))
    setIsEditing(false)
    toast.success('Settings updated successfully')
  }

  const handleCancel = () => {
    setEditForm({ ...settings })
    setIsEditing(false)
  }

  return (
    <div className="container pb-32">
      <header className="py-4 flex justify-between items-center">
        <h1 className="text-[24px] font-medium tracking-tight">Shop Settings</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-[13px] font-semibold border border-border bg-white hover:bg-gray-50 transition-colors"
          >
            Edit Settings
          </button>
        )}
      </header>

      {isEditing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-6 mt-6">
          {/* Shop Name */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Shop Name <span style={{ color: '#E53935' }}>*</span></label>
            <input
              type="text"
              className="input-field"
              value={editForm.shopName}
              onChange={(e) => setEditForm(prev => ({ ...prev, shopName: e.target.value }))}
              required
            />
          </div>

          {/* Owner Name */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Owner Name <span style={{ color: '#E53935' }}>*</span></label>
            <input
              type="text"
              className="input-field"
              value={editForm.ownerName}
              onChange={(e) => setEditForm(prev => ({ ...prev, ownerName: e.target.value }))}
              required
            />
          </div>

          {/* Phone Number */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Phone Number <span style={{ color: '#E53935' }}>*</span></label>
            <div className="flex border border-border overflow-hidden bg-white" style={{ borderRadius: '0px' }}>
              <span className="bg-gray-100 px-3 flex items-center justify-center text-[14px] text-muted border-r border-border font-semibold select-none">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                className="flex-1 px-3 py-2.5 text-[14px] bg-white focus:outline-none"
                style={{ border: '0px', height: '44px' }}
                value={editForm.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').substring(0, 10)
                  setEditForm(prev => ({ ...prev, phone: val }))
                }}
                placeholder="Enter 10-digit mobile number"
                required
              />
            </div>
          </div>

          {/* Shop Address */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Shop Address</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={editForm.address}
              onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          {/* UPI ID */}
          <div className="flex flex-col gap-2">
            <label className="section-label">UPI ID</label>
            <input
              type="text"
              className="input-field"
              value={editForm.upiId}
              onChange={(e) => setEditForm(prev => ({ ...prev, upiId: e.target.value }))}
              placeholder="e.g. owner@upi"
            />
          </div>

          {/* Logo Uploader */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Shop Logo (Max 2MB)</label>
            <div className="flex items-center gap-4 bg-white p-4 border border-border">
              {editForm.logo && (
                <img
                  src={editForm.logo}
                  alt="Shop Logo Preview"
                  className="w-12 h-12 object-cover border border-border"
                />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleLogoChange}
                  className="text-[13px]"
                />
                <p className="text-[11px] text-muted mt-1">Accepts PNG or JPG files under 2MB</p>
              </div>
              {editForm.logo && (
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, logo: '' }))}
                  className="text-[12px] text-[#E53935] font-semibold"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Edit Actions */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3 text-[14px] font-semibold border border-border bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 text-[14px] font-semibold bg-[#1C1C1E] text-white"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {/* Shop Profile View */}
          <section>
            <p className="section-label">Shop Profile</p>
            <div className="flex flex-col bg-white border border-border overflow-hidden">
              {settings.logo && (
                <div className="p-4 border-b border-border flex justify-center bg-gray-50">
                  <img
                    src={settings.logo}
                    alt={settings.shopName}
                    className="w-20 h-20 object-cover border border-border shadow-sm"
                  />
                </div>
              )}
              <div className="p-4 border-b border-border">
                <p className="text-[11px] text-muted mb-1 uppercase tracking-wider">Shop Name</p>
                <p className="text-[15px] font-medium">{settings.shopName}</p>
              </div>
              <div className="p-4 border-b border-border">
                <p className="text-[11px] text-muted mb-1 uppercase tracking-wider">Owner Name</p>
                <p className="text-[15px] font-medium">{settings.ownerName}</p>
              </div>
              <div className="p-4 border-b border-border">
                <p className="text-[11px] text-muted mb-1 uppercase tracking-wider">Phone Number</p>
                <p className="text-[15px] font-mono">{formatPhoneNumber(`+91${settings.phone}`)}</p>
              </div>
              <div className="p-4 border-b border-border">
                <p className="text-[11px] text-muted mb-1 uppercase tracking-wider">Shop Address</p>
                <p className="text-[15px] whitespace-pre-wrap">{settings.address || 'N/A'}</p>
              </div>
              <div className="p-4">
                <p className="text-[11px] text-muted mb-1 uppercase tracking-wider">UPI ID</p>
                <p className="text-[15px] font-mono">{settings.upiId || 'N/A'}</p>
              </div>
            </div>
          </section>

          {/* Language preference */}
          <section>
            <p className="section-label">Default Reminder Language</p>
            <div className="flex border border-border overflow-hidden bg-white">
              {['english', 'malayalam'].map((l) => (
                <button
                  key={l}
                  type="button"
                  className="flex-1 py-2.5 text-[13px] font-medium transition-all capitalize"
                  style={{
                    background: language === l ? '#1C1C1E' : 'transparent',
                    color: language === l ? '#FFFFFF' : '#8E8E93',
                  }}
                  onClick={() => handleLanguageChange(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          {/* Preferences */}
          <section>
            <p className="section-label">Preferences</p>
            <div className="bg-white p-4 border border-border flex justify-between items-center">
              <span className="text-[15px]">Secure Backup (Supabase)</span>
              <span className="text-[11px] font-semibold text-[#22C55E] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                Connected
              </span>
            </div>
            <div className="bg-white p-4 mt-2 border border-border flex justify-between items-center">
              <span className="text-[15px]">App Theme</span>
              <span className="text-[13px] text-muted">Light</span>
            </div>
          </section>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full bg-[#E53935] text-white py-4 font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer active:opacity-90 transition-opacity mt-4"
          >
            Sign Out
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
