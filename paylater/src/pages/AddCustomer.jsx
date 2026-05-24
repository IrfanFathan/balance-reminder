import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import BottomNav from '../components/BottomNav'

export default function AddCustomer() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    total_amount: '',
    paid_amount: '',
    purchase_details: '',
    notes: '',
    language_preference: 'english',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) navigate('/', { replace: true })
    }
    init()
  }, [navigate])

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    const totalAmount = parseFloat(form.total_amount) || 0
    const paidAmount = parseFloat(form.paid_amount) || 0
    if (totalAmount < 0 || paidAmount < 0) {
      toast.error('Amounts cannot be negative')
      return
    }
    setLoading(true)
    try {
      const data = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        total_amount: totalAmount,
        paid_amount: paidAmount,
        purchase_details: form.purchase_details.trim(),
        notes: form.notes.trim(),
        language_preference: form.language_preference,
        last_purchase_date: new Date().toISOString().split('T')[0],
      }
      const { error } = await supabase.from('customers').insert(data)
      if (error) throw error
      toast.success('Customer added')
      navigate('/customers')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const remaining = (parseFloat(form.total_amount) || 0) - (parseFloat(form.paid_amount) || 0)

  return (
    <div className="min-h-screen pb-8" style={{ background: '#EAEAEA' }}>
      <div className="container">
        <header className="flex items-center justify-between" style={{ paddingBlock: '24px 16px' }}>
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-border flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[20px] font-medium">New Customer</h1>
          <div style={{ width: 40 }} />
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-8">
          <div className="flex flex-col gap-2">
            <label className="section-label">Full Name</label>
            <input
              type="text"
              className="input-field"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Muhammad Shamil"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="section-label">Phone Number</label>
            <input
              type="tel"
              className="input-field"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+91 00000 00000"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="section-label">Initial Credit Balance</label>
            <input
              type="number"
              className="input-field"
              value={form.total_amount}
              onChange={(e) => updateField('total_amount', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="section-label">Amount Already Paid</label>
            <input
              type="number"
              className="input-field"
              value={form.paid_amount}
              onChange={(e) => updateField('paid_amount', e.target.value)}
              placeholder="0.00"
            />
            <p className="text-[12px] text-muted font-mono">
              Remaining balance: ₹{remaining.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="section-label">Purchase Details</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={form.purchase_details}
              onChange={(e) => updateField('purchase_details', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="section-label">Language Preference</label>
            <div className="flex border border-border overflow-hidden">
              {['english', 'malayalam'].map((l) => (
                <button
                  key={l}
                  type="button"
                  className="flex-1 py-2.5 text-[13px] font-medium transition-all duration-200 capitalize"
                  style={{
                    background: form.language_preference === l ? '#1C1C1E' : 'transparent',
                    color: form.language_preference === l ? '#FFFFFF' : '#8E8E93',
                  }}
                  onClick={() => updateField('language_preference', l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary mt-4" disabled={loading}>
            {loading ? 'Saving...' : 'Add to Ledger'}
          </button>
        </form>
      </div>
    </div>
  )
}
