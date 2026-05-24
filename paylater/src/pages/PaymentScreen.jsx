import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'

// ── helpers ──────────────────────────────────────────────────────────────────

function getAvatarColor(name) {
  if (!name) return '#6C63FF'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${Math.abs(hash % 360)}, 65%, 45%)`
}

function getInitials(name) {
  if (!name) return ''
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function getShopSettings() {
  try {
    const stored = localStorage.getItem('paylater_shop_settings')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return { shopName: '', upiId: '', ownerName: '' }
}

function buildUpiUrl(upiId, shopName, amount) {
  const pa = encodeURIComponent(upiId)
  const pn = encodeURIComponent(shopName || 'Shop')
  const am = Number(amount).toFixed(2)
  const tn = encodeURIComponent('Payment for outstanding due')
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`
}

function getMessageTemplate(lang, name, amount) {
  if (lang === 'malayalam') {
    return `നമസ്കാരം ${name},\n\nതാങ്കളുടെ കുടിശ്ശിക തുകയായ ₹${amount} അടയ്ക്കുന്നതിനുള്ള ഒരു ഓർമ്മപ്പെടുത്തൽ ആണിത്. പേയ്മെന്റ് പൂർത്തിയാക്കുന്നതിനായി ദയവായി ഇതിനൊപ്പം നൽകിയിട്ടുള്ള QR കോഡ് സ്കാൻ ചെയ്യുക.\n\nതാങ്കളുടെ സൗകര്യപ്രദമായ സമയത്ത് പേയ്മെന്റ് നടത്താവുന്നതാണ്.\n\nനന്ദി! ✨`
  }
  return `Hello ${name} 👋,\n\nThis is a gentle reminder regarding your outstanding due amount of ₹${amount}. To complete the payment, please scan the attached QR code.\n\nKindly make the payment at your earliest convenience.\n\nThank you! ✨`
}

// ── component ─────────────────────────────────────────────────────────────────

export default function PaymentScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const customerId = searchParams.get('id')

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingAmount, setPendingAmount] = useState(0)
  const [shopSettings, setShopSettings] = useState(null)

  // QR state
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState(null)
  const [upiUrl, setUpiUrl] = useState('')

  // UI state
  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('english')
  const [updating, setUpdating] = useState(false)
  const [isPaidSuccess, setIsPaidSuccess] = useState(false)

  // ── fetch customer ────────────────────────────────────────────────────────
  const fetchCustomer = useCallback(async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()
    if (error) throw error
    setCustomer(data)
    setSelectedLanguage(data.language_preference || 'english')
    return data
  }, [customerId])

  // ── compute pending amount from transactions ──────────────────────────────
  const fetchPendingAmount = useCallback(async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('customer_id', customerId)
    if (error) throw error
    const credits = (data || []).filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0)
    const receipts = (data || []).filter(t => t.type === 'receipt').reduce((s, t) => s + Number(t.amount), 0)
    return Math.max(0, credits - receipts)
  }, [customerId])

  // ── generate QR code ─────────────────────────────────────────────────────
  const generateQr = useCallback(async (upiId, shopName, amount) => {
    setQrLoading(true)
    setQrError(null)
    try {
      const url = buildUpiUrl(upiId, shopName, amount)
      setUpiUrl(url)
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#1A1A2E', light: '#FFFFFF' },
      })
      setQrDataUrl(dataUrl)
    } catch (err) {
      console.error('QR generation failed:', err)
      setQrError('Unable to generate QR. Check your UPI ID in Settings.')
    } finally {
      setQrLoading(false)
    }
  }, [])

  // ── init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/', { replace: true }); return }
      if (!customerId) { navigate('/customers', { replace: true }); return }

      try {
        const [cust, pending] = await Promise.all([fetchCustomer(), fetchPendingAmount()])
        setPendingAmount(pending)

        // Read store settings from localStorage (current app pattern)
        const settings = getShopSettings()
        setShopSettings(settings)

        if (settings.upiId && pending > 0) {
          await generateQr(settings.upiId, settings.shopName, pending)
        }
      } catch (err) {
        toast.error('Failed to load payment details')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, customerId])

  // ── mark payment done ─────────────────────────────────────────────────────
  const handlePaymentDone = async () => {
    setUpdating(true)
    try {
      const { data: latest, error: fetchErr } = await supabase
        .from('customers').select('total_amount, paid_amount').eq('id', customerId).single()
      if (fetchErr) throw fetchErr

      const toPay = Number(latest.total_amount) - Number(latest.paid_amount)
      if (toPay <= 0) {
        toast.error('This customer already has a ₹0 outstanding balance!')
        setConfirmPaidOpen(false)
        return
      }

      const { error: customerErr } = await supabase.from('customers').update({
        paid_amount: Number(latest.total_amount),
        last_purchase_date: new Date().toISOString().split('T')[0],
      }).eq('id', customerId)
      if (customerErr) throw customerErr

      const { error: txErr } = await supabase.from('transactions').insert({
        customer_id: customerId,
        amount: toPay,
        status: 'Paid',
        type: 'receipt',
        method: 'QR',
        note: 'QR Payment Received',
      })
      if (txErr) throw txErr

      toast.success(`Payment of ₹${toPay} marked as received!`)
      setConfirmPaidOpen(false)
      setIsPaidSuccess(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  // ── send reminder ─────────────────────────────────────────────────────────
  const handleSendReminder = async () => {
    setUpdating(true)
    const { data: { session } } = await supabase.auth.getSession()
    const shopId = session?.user?.id

    const renderedMessage = getMessageTemplate(selectedLanguage, customer.name, pendingAmount.toLocaleString('en-IN'))

    // 1. Save to alert_logs (non-blocking)
    try {
      const { error: logErr } = await supabase.from('alert_logs').insert({
        shop_id: shopId,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        upi_id: shopSettings?.upiId || '',
        amount: Number(pendingAmount.toFixed(2)),
        upi_qr_payload: upiUrl,
        message_language: selectedLanguage,
        message_body: renderedMessage,
        sent_at: new Date().toISOString(),
        status: 'sent',
      })
      if (logErr) {
        console.error('Alert log save failed:', logErr)
        toast.error('Message sent but log could not be saved. Please check your connection.')
      }
    } catch (logEx) {
      console.error('Alert log exception:', logEx)
    }

    // 2. Save language preference
    try {
      await supabase.from('customers').update({ language_preference: selectedLanguage }).eq('id', customerId)
    } catch { /* non-critical */ }

    // 3. Open WhatsApp
    let cleanPhone = customer.phone.replace(/\D/g, '')
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(renderedMessage)}`
    window.open(whatsappUrl, '_blank')

    setReminderOpen(false)
    toast.success('Reminder sent successfully')
    setUpdating(false)
  }

  // ── paid success screen ───────────────────────────────────────────────────
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
              Balance for <strong className="text-fg font-bold">{customer?.name}</strong> successfully settled.
            </p>
          </div>
          <div className="bg-gray-50 border border-border p-4 font-mono w-full">
            <div className="flex justify-between items-center py-1">
              <span className="text-[12px] text-muted">Customer</span>
              <span className="text-[14px] font-semibold">{customer?.name}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[12px] text-muted">Amount Received</span>
              <span className="text-[16px] font-bold text-[#22C55E]">₹{pendingAmount.toLocaleString('en-IN')}</span>
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

  if (loading || !customer) {
    return (
      <div className="container min-h-screen flex items-center justify-center bg-white">
        <p className="text-[14px] text-muted">Loading payment details...</p>
      </div>
    )
  }

  const upiMissing = !shopSettings?.upiId
  const noBalance = pendingAmount <= 0
  const messageText = getMessageTemplate(selectedLanguage, customer.name, pendingAmount.toLocaleString('en-IN'))

  // ── main render ───────────────────────────────────────────────────────────
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

      {/* Customer Info */}
      <div className="flex flex-col items-center text-center mt-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[20px] font-bold shadow-inner mb-3"
          style={{ backgroundColor: getAvatarColor(customer.name) }}
        >
          {getInitials(customer.name)}
        </div>
        <h2 className="text-[20px] font-semibold text-[#1C1C1E]">{customer.name}</h2>
        <div className="mt-2">
          <p className="text-[12px] text-muted uppercase font-semibold">Outstanding Balance</p>
          <p className="text-[36px] font-bold text-[#1C1C1E] font-mono tracking-tight mt-1">
            ₹ {pendingAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* UPI Missing Warning */}
      {upiMissing && (
        <div className="mt-6 bg-[#FFF8E1] border border-[#FFD54F] p-4">
          <p className="text-[13px] font-semibold text-[#B45309] mb-1">⚠️ UPI ID not configured</p>
          <p className="text-[12px] text-[#92400E] leading-relaxed mb-3">
            Please add your UPI ID in Shop Settings before sending a payment reminder.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="text-[12px] font-bold text-[#6C63FF] underline cursor-pointer"
          >
            Go to Shop Settings →
          </button>
        </div>
      )}

      {/* No Balance Warning */}
      {!upiMissing && noBalance && (
        <div className="mt-6 bg-[#F0FFF4] border border-[#86EFAC] p-4 text-center">
          <p className="text-[14px] font-semibold text-[#15803D]">✅ No outstanding balance</p>
          <p className="text-[12px] text-[#166534] mt-1">This customer has no outstanding balance.</p>
        </div>
      )}

      {/* QR Code Panel */}
      <div className="flex flex-col items-center justify-center my-6">
        <div
          className="flex flex-col items-center justify-center border border-[#D1D1D6] bg-white"
          style={{ width: 300, minHeight: 300 }}
        >
          {upiMissing ? (
            <div className="flex flex-col items-center justify-center w-full h-full py-10 px-4 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" className="mb-3">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p className="text-[12px] text-[#8E8E93]">Set up UPI ID to enable QR payments</p>
            </div>
          ) : noBalance ? (
            <div className="flex flex-col items-center justify-center w-full h-full py-10 px-4 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" className="mb-3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-[12px] text-[#22C55E] font-semibold">No QR needed — balance is cleared</p>
            </div>
          ) : qrLoading ? (
            <div className="flex flex-col items-center justify-center w-full h-full py-10">
              <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-[12px] text-muted">Generating QR...</p>
            </div>
          ) : qrError ? (
            <div className="flex flex-col items-center justify-center w-full h-full py-10 px-4 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E53935" strokeWidth="2" className="mb-3">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[12px] text-[#E53935] leading-relaxed">{qrError}</p>
            </div>
          ) : qrDataUrl ? (
            <div className="flex flex-col items-center p-3">
              <img src={qrDataUrl} alt="UPI QR Code" width={270} height={270} />
              <p className="text-[15px] font-bold font-mono text-[#1A1A2E] mt-2">
                ₹ {pendingAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-muted mt-0.5 tracking-wide">Scan to Pay via UPI</p>
            </div>
          ) : null}
        </div>

        {qrDataUrl && !qrError && (
          <p className="text-[11px] text-[#8E8E93] mt-2 text-center">
            Works with GPay, PhonePe, Paytm, BHIM
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-auto">
        <button
          onClick={() => setConfirmPaidOpen(true)}
          disabled={noBalance}
          className="flex-1 bg-[#22C55E] hover:bg-[#1fbd59] text-white py-4 font-semibold text-[14px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform select-none disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ height: '48px', borderRadius: '0px' }}
        >
          Payment Done ✅
        </button>
        <button
          onClick={() => setReminderOpen(true)}
          disabled={upiMissing || noBalance}
          className="flex-1 bg-[#6C63FF] hover:opacity-95 text-white py-4 font-semibold text-[14px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform select-none disabled:opacity-40 disabled:cursor-not-allowed"
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
              Mark <strong className="text-fg font-mono font-bold">₹{pendingAmount.toLocaleString('en-IN')}</strong> from{' '}
              <strong className="text-fg font-bold">{customer.name}</strong> as paid?
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

      {/* Send Reminder Bottom Sheet */}
      {reminderOpen && (
        <div className="fixed inset-0 z-[300]" onClick={() => setReminderOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white max-h-[92vh] overflow-y-auto p-5"
            onClick={e => e.stopPropagation()}
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

            {/* Language Tab */}
            <div className="flex border border-border overflow-hidden mb-4">
              {['english', 'malayalam'].map(lang => (
                <button
                  key={lang}
                  type="button"
                  className="flex-1 py-3 text-[13px] font-semibold transition-colors cursor-pointer capitalize"
                  style={{
                    background: selectedLanguage === lang ? '#6C63FF' : 'transparent',
                    color: selectedLanguage === lang ? '#FFFFFF' : '#8E8E93',
                  }}
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {lang === 'english' ? 'English 🇬🇧' : 'Malayalam 🇮🇳'}
                </button>
              ))}
            </div>

            {/* Message Preview */}
            <div className="bg-gray-50 border border-border p-4 mb-4 text-[13px] leading-relaxed relative">
              <span className="absolute top-2 right-2 text-[10px] text-muted font-bold uppercase tracking-wider bg-gray-200 px-1.5 py-0.5">
                Preview
              </span>
              <p className="whitespace-pre-wrap text-[#1C1C1E]" dir="auto">{messageText}</p>
            </div>

            {/* QR Preview inside sheet */}
            {qrDataUrl && !qrError && (
              <div className="flex flex-col items-center mb-4 p-3 border border-[#E5E5EA] bg-white">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-2 font-semibold">QR Code Attachment</p>
                <img src={qrDataUrl} alt="UPI QR" width={160} height={160} />
                <p className="text-[13px] font-bold font-mono mt-1 text-[#1A1A2E]">
                  ₹ {pendingAmount.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-muted">Scan to Pay via UPI</p>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendReminder}
              disabled={updating}
              className="w-full bg-[#6C63FF] hover:opacity-95 text-white py-4 font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-transform disabled:opacity-60"
              style={{ borderRadius: '0px', border: '0px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {updating ? 'Sending...' : 'Send Now 📤'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
