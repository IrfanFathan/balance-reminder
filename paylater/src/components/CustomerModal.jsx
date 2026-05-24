import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function CustomerModal({ isOpen, customer, onClose, onSave }) {
  const isEdit = !!customer
  const [form, setForm] = useState({
    name: '',
    phone: '',
    total_amount: '',
    paid_amount: '',
    purchase_details: '',
    last_purchase_date: '',
    notes: '',
    language_preference: 'english',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (customer) {
      const cleanPhone = customer.phone?.startsWith('+91')
        ? customer.phone.substring(3)
        : customer.phone || ''
      setForm({
        name: customer.name || '',
        phone: cleanPhone,
        total_amount: customer.total_amount || '',
        paid_amount: customer.paid_amount || '',
        purchase_details: customer.purchase_details || '',
        last_purchase_date: customer.last_purchase_date || '',
        notes: customer.notes || '',
        language_preference: customer.language_preference || 'english',
      })
    } else {
      setForm({
        name: '',
        phone: '',
        total_amount: '',
        paid_amount: '',
        purchase_details: '',
        last_purchase_date: '',
        notes: '',
        language_preference: 'english',
      })
    }
  }, [customer, isOpen])

  if (!isOpen) return null

  const balance = (Number(form.total_amount) || 0) - (Number(form.paid_amount) || 0)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    const phoneRegex = /^[6-9]\d{9}$/
    if (!phoneRegex.test(form.phone)) {
      toast.error("Please enter a valid 10-digit mobile number")
      return
    }
    const totalAmount = Number(form.total_amount) || 0
    const paidAmount = Number(form.paid_amount) || 0
    if (totalAmount < 0 || paidAmount < 0) {
      toast.error('Amounts cannot be negative')
      return
    }

    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        phone: `+91${form.phone}`,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        purchase_details: form.purchase_details.trim(),
        last_purchase_date: form.last_purchase_date || null,
        notes: form.notes.trim(),
        language_preference: form.language_preference,
      }

      if (isEdit) {
        const { error } = await supabase
          .from('customers')
          .update(data)
          .eq('id', customer.id)
        if (error) throw error
        toast.success('Customer updated')
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(data)
        if (error) throw error
        toast.success('Customer added')
      }
      onSave()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
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
          <h2 className="text-[18px] font-medium">
            {isEdit ? 'Edit customer' : 'Add customer'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-4 pb-6 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted">Customer name <span style={{ color: '#E53935' }}>*</span></label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Muhammad Shamil"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted">Phone number <span style={{ color: '#E53935' }}>*</span></label>
            <div className="flex border border-border overflow-hidden bg-white" style={{ borderRadius: '0px' }}>
              <span className="bg-gray-100 px-3 flex items-center justify-center text-[14px] text-muted border-r border-border font-semibold select-none">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                className="flex-1 px-3 py-2.5 text-[14px] bg-white focus:outline-none"
                style={{ border: '0px', height: '44px' }}
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').substring(0, 10)
                  handleChange('phone', val)
                }}
                placeholder="Enter 10-digit mobile number"
                required
              />
            </div>
          </div>

          {/* Amounts - side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium uppercase tracking-wider text-muted">Total amount</label>
              <input
                type="number"
                className="input-field font-mono"
                placeholder="0"
                value={form.total_amount}
                onChange={(e) => handleChange('total_amount', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium uppercase tracking-wider text-muted">Paid amount</label>
              <input
                type="number"
                className="input-field font-mono"
                placeholder="0"
                value={form.paid_amount}
                onChange={(e) => handleChange('paid_amount', e.target.value)}
              />
            </div>
          </div>

          {/* Remaining balance display */}
          <p className="text-[13px] text-muted font-mono">
            Balance: ₹{balance.toLocaleString('en-IN')}
          </p>

          {/* Purchase details */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted">Purchase details</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={form.purchase_details}
              onChange={(e) => handleChange('purchase_details', e.target.value)}
            />
          </div>

          {/* Last purchase date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted">Last purchase date</label>
            <input
              type="date"
              className="input-field"
              value={form.last_purchase_date}
              onChange={(e) => handleChange('last_purchase_date', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted">Notes</label>
            <input
              type="text"
              className="input-field"
              placeholder="Optional"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          {/* Language toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted">Language preference</label>
            <div className="flex border border-border overflow-hidden">
              <button
                type="button"
                className="flex-1 py-2.5 text-[13px] font-medium transition-colors"
                style={{
                  background: form.language_preference === 'english' ? '#1C1C1E' : 'transparent',
                  color: form.language_preference === 'english' ? '#FFFFFF' : '#8E8E93',
                }}
                onClick={() => handleChange('language_preference', 'english')}
              >
                English
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 text-[13px] font-medium transition-colors"
                style={{
                  background: form.language_preference === 'malayalam' ? '#1C1C1E' : 'transparent',
                  color: form.language_preference === 'malayalam' ? '#FFFFFF' : '#8E8E93',
                }}
                onClick={() => handleChange('language_preference', 'malayalam')}
              >
                Malayalam
              </button>
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            className="btn-primary mt-2"
            disabled={saving}
          >
            {saving ? 'Saving...' : isEdit ? 'Update customer' : 'Save customer'}
          </button>
        </form>
      </div>
    </div>
  )
}
