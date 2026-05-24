import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import BottomNav from '../components/BottomNav'

export default function AddTransaction() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [mode, setMode] = useState('credit')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    customer_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/', { replace: true }); return }
      const { data } = await supabase.from('customers').select('id, name').order('name')
      setCustomers(data || [])
    }
    init()
  }, [navigate])

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customer_id || !form.amount) {
      toast.error('Select a customer and enter an amount')
      return
    }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }
    setLoading(true)
    try {
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('total_amount, paid_amount')
        .eq('id', form.customer_id)
        .single()
      if (fetchError) throw fetchError

      const update = mode === 'credit'
        ? {
            total_amount: Number(customer.total_amount) + amount,
            last_purchase_date: form.date,
          }
        : {
            paid_amount: Number(customer.paid_amount) + amount,
            last_purchase_date: form.date,
          }

      const { error } = await supabase
        .from('customers')
        .update(update)
        .eq('id', form.customer_id)
      if (error) throw error

      // Record transaction history entry
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          customer_id: form.customer_id,
          amount: amount,
          date: new Date(form.date).toISOString(),
          status: mode === 'credit' ? 'Pending' : 'Paid',
          method: 'Manual',
          note: form.description.trim() || null,
        })
      if (txError) throw txError

      toast.success(mode === 'credit' ? 'Credit entry saved' : 'Payment entry saved')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#EAEAEA' }}>
      <div className="container">
        <header className="flex items-center justify-between" style={{ paddingBlock: '24px 16px' }}>
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-border flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[20px] font-medium">New Entry</h1>
          <div style={{ width: 40 }} />
        </header>

        {/* Mode Switcher */}
        <div className="flex p-1 mt-6" style={{ background: '#D1D1D6' }}>
          <button
            type="button"
            className="flex-1 py-3 text-[14px] font-semibold uppercase tracking-wider transition-all"
            style={{
              background: mode === 'credit' ? '#EF4434' : 'transparent',
              color: mode === 'credit' ? '#FFFFFF' : '#8E8E93',
            }}
            onClick={() => setMode('credit')}
          >
            Give Credit
          </button>
          <button
            type="button"
            className="flex-1 py-3 text-[14px] font-semibold uppercase tracking-wider transition-all"
            style={{
              background: mode === 'payment' ? '#1C1C1E' : 'transparent',
              color: mode === 'payment' ? '#FFFFFF' : '#8E8E93',
            }}
            onClick={() => setMode('payment')}
          >
            Got Payment
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-8">
          <div className="flex flex-col gap-2">
            <label className="section-label">Amount (₹)</label>
            <input
              type="number"
              className="w-full px-6 py-6 bg-white border border-border text-[32px] font-mono text-center"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => updateField('amount', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="section-label">Select Customer</label>
            <select
              className="input-field"
              value={form.customer_id}
              onChange={(e) => updateField('customer_id', e.target.value)}
              required
            >
              <option value="">Choose a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="section-label">Description (Optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Milk, Rice, Monthly bill"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="section-label">Date</label>
            <input
              type="date"
              className="input-field"
              value={form.date}
              onChange={(e) => updateField('date', e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="mt-4 w-full py-5 font-semibold text-[16px] text-white cursor-pointer active:opacity-90 active:scale-[0.98]"
            style={{ background: mode === 'credit' ? '#EF4434' : '#1C1C1E' }}
            disabled={loading}
          >
            {loading ? 'Saving...' : mode === 'credit' ? 'Save Credit Entry' : 'Save Payment Entry'}
          </button>
        </form>
      </div>
      <BottomNav />
    </div>
  )
}
