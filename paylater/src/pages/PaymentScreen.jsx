import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function PaymentScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const customerId = searchParams.get('id')

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('english')
  const [updating, setUpdating] = useState(false)
  
  // Stunning post-payment success screen
  const [isPaidSuccess, setIsPaidSuccess] = useState(false)

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()
      if (error) throw error
      setCustomer(data)
      setSelectedLanguage(data.language_preference || 'english')
    } catch {
      toast.error('Failed to load customer profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/', { replace: true })
        return
      }
      if (!customerId) {
        navigate('/customers', { replace: true })
        return
      }
      await fetchCustomer()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, customerId])

  // Generate HSL color based on name hash for harmony
  const getAvatarColor = (name) => {
    if (!name) return '#6C63FF'
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash % 360)
    return `hsl(${hue}, 65%, 45%)`
  }

  const getInitials = (name) => {
    if (!name) return ''
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (loading || !customer) {
    return (
      <div className="container min-h-screen flex items-center justify-center bg-white">
        <p className="text-[14px] text-muted">Loading payment details...</p>
      </div>
    )
  }

  const balance = Math.round(Number(customer.remaining_balance))
  
  // Construct Indian UPI Deep Link
  // Merchant details defaults to merchant VPA or standard mock
  const upiUrl = `upi://pay?pa=merchant@upi&pn=PayLater%20Store&am=${balance}&cu=INR`
  // eslint-disable-next-line no-unused-vars
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`

  // Bilingual Templates
  const getMessageTemplate = (lang) => {
    if (lang === 'malayalam') {
      return `നമസ്കാരം ${customer.name},\n\nതാങ്കളുടെ കുടിശ്ശിക തുകയായ ₹${balance} അടയ്ക്കുന്നതിനുള്ള ഒരു ഓർമ്മപ്പെടുത്തൽ ആണിത്. പേയ്മെന്റ് പൂർത്തിയാക്കുന്നതിനായി ദയവായി ഇതിനൊപ്പം നൽകിയിട്ടുള്ള QR കോഡ് സ്കാൻ ചെയ്യുക.\n\nതാങ്കളുടെ സൗകര്യപ്രദമായ സമയത്ത് പേയ്മെന്റ് നടത്താവുന്നതാണ്. ഇതിനെക്കുറിച്ച് എന്തെങ്കിലും സംശയങ്ങൾ ഉണ്ടെങ്കിൽ ദയവായി ഞങ്ങളെ അറിയിക്കുക.\n\nനന്ദി! ✨`
    }
    return `Hello ${customer.name} 👋,\n\nThis is a gentle reminder regarding your outstanding due amount of ₹${balance}. To complete the payment, please scan the attached QR code.\n\nKindly make the payment at your earliest convenience. If you have any questions or need assistance, please let us know.\n\nThank you! ✨`
  }

  const messageText = getMessageTemplate(selectedLanguage)

  // Handle Mark Payment as Done
  const handlePaymentDone = async () => {
    setUpdating(true)
    try {
      // 1. Fetch current profile
      const { data: latestCustomer, error: fetchErr } = await supabase
        .from('customers')
        .select('total_amount, paid_amount')
        .eq('id', customerId)
        .single()
      if (fetchErr) throw fetchErr

      // 2. Set paid_amount equal to total_amount to wipe remaining balance
      const totalAmt = Number(latestCustomer.total_amount)
      const currentPaid = Number(latestCustomer.paid_amount)
      const toPay = totalAmt - currentPaid

      if (toPay <= 0) {
        toast.error('This customer already has a ₹0 outstanding balance!')
        setConfirmPaidOpen(false)
        return
      }

      const { error: customerErr } = await supabase
        .from('customers')
        .update({
          paid_amount: totalAmt,
          last_purchase_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', customerId)
      if (customerErr) throw customerErr

      // 3. Log Paid transaction in transactions table
      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          customer_id: customerId,
          amount: toPay,
          status: 'Paid',
          method: 'QR',
          note: 'QR Payment Received'
        })
      if (txErr) throw txErr

      toast.success(`Payment of ₹${toPay} marked as received!`)
      setConfirmPaidOpen(false)
      setIsPaidSuccess(true) // Transition to successful paid state!
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  // Handle Sending WhatsApp Reminder
  const handleSendReminder = async () => {
    setUpdating(true)
    try {
      // 1. Save language preference to DB
      const { error } = await supabase
        .from('customers')
        .update({ language_preference: selectedLanguage })
        .eq('id', customerId)
      if (error) throw error

      // 2. Open WhatsApp URL
      let cleanPhone = customer.phone.replace(/\D/g, '')
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone
      }
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`
      window.open(whatsappUrl, '_blank')
      
      setReminderOpen(false)
      toast.success('Opening WhatsApp to send reminder!')
    } catch {
      toast.error('Failed to update language preference')
    } finally {
      setUpdating(false)
    }
  }

  // Post-payment success presentation
  if (isPaidSuccess) {
    return (
      <div className="container min-h-screen bg-white flex flex-col justify-between p-6 text-center">
        <div className="flex-1 flex flex-col justify-center items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-[#E2FBE9] text-[#22C55E] flex items-center justify-center animate-bounce">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-[26px] font-bold text-[#1C1C1E]">Payment Completed!</h2>
            <p className="text-[15px] text-muted mt-2">
              Balance for <strong className="text-fg font-bold">{customer.name}</strong> successfully settled.
            </p>
          </div>
          <div className="bg-gray-50 border border-border p-4 font-mono w-full">
            <div className="flex justify-between items-center py-1">
              <span className="text-[12px] text-muted">Customer</span>
              <span className="text-[14px] font-semibold">{customer.name}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[12px] text-muted">Amount Received</span>
              <span className="text-[16px] font-bold text-[#22C55E]">₹{balance}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[12px] text-muted">Status</span>
              <span className="text-[13px] font-bold text-[#22C55E]">PAID ✅</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/ledger?id=${customerId}`, { replace: true })}
          className="w-full bg-[#6C63FF] text-white py-4 font-semibold text-[15px] cursor-pointer"
          style={{ borderRadius: '0px' }}
        >
          Back to Customer Profile
        </button>
      </div>
    )
  }

  return (
    <div className="container min-h-screen bg-white flex flex-col justify-between p-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-[#D1D1D6] flex items-center justify-center cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[16px] font-semibold text-[#1C1C1E]">Collect Payment</h1>
        <div className="w-10" />
      </header>

      {/* Top Customer Info */}
      <div className="flex flex-col items-center text-center mt-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[20px] font-bold font-sans shadow-inner mb-3"
          style={{ backgroundColor: getAvatarColor(customer.name) }}
        >
          {getInitials(customer.name)}
        </div>
        <h2 className="text-[20px] font-semibold text-[#1C1C1E]">{customer.name}</h2>
        <div className="mt-2">
          <p className="text-[12px] text-muted uppercase font-semibold">Outstanding Balance</p>
          <p className="text-[36px] font-bold text-[#1C1C1E] font-mono tracking-tight mt-1">
            ₹ {balance.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Middle QR Box (DISABLED TEMPORARILY) */}
      <div className="flex flex-col items-center justify-center my-8">
        <div className="bg-gray-50 border border-dashed border-[#D1D1D6] flex flex-col items-center justify-center mb-3" style={{ width: '252px', height: '252px' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" className="mb-3 animate-pulse">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-[13px] text-center font-semibold text-[#8E8E93] px-4 leading-relaxed">
            QR Code Payment<br />Temporarily Disabled
          </p>
        </div>
        <p className="text-[12px] text-[#8E8E93] font-semibold tracking-wider uppercase">Feature Unavailable</p>
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-4 mt-auto">
        <button
          onClick={() => setConfirmPaidOpen(true)}
          className="flex-1 bg-[#22C55E] hover:bg-[#1fbd59] text-white py-4 font-semibold text-[14px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform select-none"
          style={{ height: '48px', borderRadius: '0px' }}
        >
          Payment Done ✅
        </button>
        <button
          onClick={() => setReminderOpen(true)}
          className="flex-1 bg-[#6C63FF] hover:opacity-95 text-white py-4 font-semibold text-[14px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform select-none"
          style={{ height: '48px', borderRadius: '0px' }}
        >
          Send Reminder 💬
        </button>
      </div>

      {/* Confirm Payment Modal */}
      {confirmPaidOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmPaidOpen(false)} />
          <div className="bg-white p-6 shadow-xl relative z-10 max-w-sm w-full border border-border" style={{ borderRadius: '0px' }}>
            <h3 className="text-[16px] font-bold text-[#1C1C1E] mb-2">Confirm Payment</h3>
            <p className="text-[14px] text-muted mb-6 leading-relaxed">
              Mark <strong className="text-fg font-mono font-bold">₹{balance}</strong> from <strong className="text-fg font-bold">{customer.name}</strong> as paid?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmPaidOpen(false)}
                className="px-4 py-2.5 text-[13px] font-semibold border border-border text-muted cursor-pointer active:bg-gray-100"
                style={{ borderRadius: '0px' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentDone}
                disabled={updating}
                className="px-4 py-2.5 text-[13px] font-semibold bg-[#22C55E] text-white cursor-pointer active:scale-95 transition-all"
                style={{ borderRadius: '0px', border: '0px' }}
              >
                {updating ? 'Saving...' : '✅ Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Language / Reminder Modal */}
      {reminderOpen && (
        <div className="fixed inset-0 z-[300]" onClick={() => setReminderOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white max-h-[85vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
            style={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}
          >
            {/* Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[17px] font-bold text-[#1C1C1E]">Bilingual Payment Reminder</h3>
              <button onClick={() => setReminderOpen(false)} className="text-muted text-[13px] cursor-pointer">Close</button>
            </div>

            {/* Language Selection Tab */}
            <div className="flex border border-border overflow-hidden mb-4">
              <button
                type="button"
                className="flex-1 py-3 text-[13px] font-semibold transition-colors cursor-pointer"
                style={{
                  background: selectedLanguage === 'english' ? '#6C63FF' : 'transparent',
                  color: selectedLanguage === 'english' ? '#FFFFFF' : '#8E8E93',
                }}
                onClick={() => setSelectedLanguage('english')}
              >
                English 🇬🇧
              </button>
              <button
                type="button"
                className="flex-1 py-3 text-[13px] font-semibold transition-colors cursor-pointer"
                style={{
                  background: selectedLanguage === 'malayalam' ? '#6C63FF' : 'transparent',
                  color: selectedLanguage === 'malayalam' ? '#FFFFFF' : '#8E8E93',
                }}
                onClick={() => setSelectedLanguage('malayalam')}
              >
                Malayalam 🇮🇳
              </button>
            </div>

            {/* Message Preview */}
            <div className="bg-gray-50 border border-border p-4 mb-5 text-[13px] leading-relaxed relative">
              <span className="absolute top-2 right-2 text-[10px] text-muted font-bold uppercase tracking-wider bg-gray-200 px-1.5 py-0.5">
                Preview
              </span>
              <p
                className="whitespace-pre-wrap text-[#1C1C1E]"
                dir="auto"
              >
                {messageText}
              </p>
            </div>

            {/* Send Action */}
            <button
              onClick={handleSendReminder}
              disabled={updating}
              className="w-full bg-[#6C63FF] hover:opacity-95 text-white py-4 font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-transform"
              style={{ borderRadius: '0px', border: '0px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send Now 📤
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
