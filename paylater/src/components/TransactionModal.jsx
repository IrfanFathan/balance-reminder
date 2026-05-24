import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function TransactionModal({ isOpen, onClose, onSave }) {
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('credit') // 'credit' or 'payment'
  const [form, setForm] = useState({
    customer_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  })

  useEffect(() => {
    if (isOpen) {
      fetchCustomers()
      setForm({
        customer_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
      })
      setSearchQuery('')
      setType('credit')
    }
  }, [isOpen])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, total_amount, paid_amount')
        .order('name')
      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      toast.error('Failed to load customers')
    }
  }

  if (!isOpen) return null

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customer_id) {
      toast.error('Please select a customer')
      return
    }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }

    setLoading(true)
    try {
      // 1. Fetch current customer details to calculate update
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('total_amount, paid_amount')
        .eq('id', form.customer_id)
        .single()
      if (fetchError) throw fetchError

      const customerUpdate = type === 'credit'
        ? {
            total_amount: Number(customer.total_amount) + amount,
            last_purchase_date: form.date,
          }
        : {
            paid_amount: Number(customer.paid_amount) + amount,
            last_purchase_date: form.date,
          }

      // 2. Update customer record
      const { error: customerError } = await supabase
        .from('customers')
        .update(customerUpdate)
        .eq('id', form.customer_id)
      if (customerError) throw customerError

      // 3. Insert transaction record
      const transactionData = {
        customer_id: form.customer_id,
        amount: amount,
        date: new Date(form.date).toISOString(),
        status: type === 'credit' ? 'Pending' : 'Paid',
        method: 'Manual',
        note: form.note.trim() || null,
      }

      const { error: txError } = await supabase
        .from('transactions')
        .insert(transactionData)
      if (txError) throw txError

      toast.success(type === 'credit' ? 'Credit entry saved!' : 'Payment entry saved!')
      onSave()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.35)]" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-4 pb-4">
          <h2 className="text-[18px] font-medium text-[#1C1C1E]">New Transaction</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-4 pb-6 flex flex-col gap-4">
          {/* Type Selector (Credit / Payment) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-muted">Transaction Type</label>
            <div className="flex border border-border overflow-hidden">
              <button
                type="button"
                className="flex-1 py-2.5 text-[13px] font-semibold transition-colors cursor-pointer"
                style={{
                  background: type === 'credit' ? '#EF4434' : 'transparent',
                  color: type === 'credit' ? '#FFFFFF' : '#8E8E93',
                }}
                onClick={() => setType('credit')}
              >
                GIVE CREDIT
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 text-[13px] font-semibold transition-colors cursor-pointer"
                style={{
                  background: type === 'payment' ? '#22C55E' : 'transparent',
                  color: type === 'payment' ? '#FFFFFF' : '#8E8E93',
                }}
                onClick={() => setType('payment')}
              >
                GOT PAYMENT
              </button>
            </div>
          </div>

          {/* Amount (₹) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-muted">Amount (₹)</label>
            <input
              type="number"
              step="any"
              className="w-full px-4 py-4 bg-white border border-[#D1D1D6] text-[28px] font-mono text-center font-bold"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              required
              autoFocus
              style={{ borderRadius: '0px' }}
            />
          </div>

          {/* Searchable Customer Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-muted">Select Customer</label>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                className="input-field py-2 text-[14px]"
                placeholder="🔍 Search customer by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: '0px' }}
              />
              <select
                className="input-field"
                value={form.customer_id}
                onChange={(e) => handleChange('customer_id', e.target.value)}
                required
                style={{ borderRadius: '0px' }}
              >
                <option value="">-- Choose a Customer --</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Due: ₹{Math.round(c.total_amount - c.paid_amount)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-muted">Transaction Date</label>
            <input
              type="date"
              className="input-field"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
              style={{ borderRadius: '0px' }}
            />
          </div>

          {/* Note / Reference */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-muted">Note / Reference (Optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Groceries bill, Rice bags, UPI scan"
              value={form.note}
              onChange={(e) => handleChange('note', e.target.value)}
              style={{ borderRadius: '0px' }}
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full text-white py-4 font-semibold text-[15px] cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              background: type === 'credit' ? '#EF4434' : '#22C55E',
              borderRadius: '0px',
              border: '0px',
            }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  )
}
