import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { generateMessage } from '../lib/messages'
import BottomNav from '../components/BottomNav'

export default function Ledger() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const customerId = searchParams.get('id')
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/', { replace: true })
        return
      }
      if (!customerId) {
        // No customer ID provided — go back to customer list
        navigate('/customers', { replace: true })
        return
      }
      fetchCustomer(customerId)
    }
    checkSession()
  }, [navigate, customerId])

  const fetchCustomer = async (id) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      setCustomer(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsApp = () => {
    if (!customer) return
    const message = generateMessage(customer)
    const encoded = encodeURIComponent(message)
    let phone = customer.phone.replace(/\D/g, '')
    // Prepend India country code if the number looks like a local 10-digit number
    if (phone.length === 10) phone = `91${phone}`
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
  }

  if (loading) {
    return (
      <div className="container pb-32">
        <div className="py-12 text-center">
          <p className="text-[14px] text-muted">Loading...</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="container pb-32">
        <div className="py-12 text-center">
          <p className="text-[14px] text-muted">Customer not found</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  const balance = Number(customer.remaining_balance)

  return (
    <div className="container pb-32">
      {/* Header */}
      <header className="flex justify-between items-center py-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white border border-border flex items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[18px] font-medium">Customer Ledger</h1>
        <div style={{ width: 40 }} />
      </header>

      {/* Profile */}
      <div className="mb-8">
        <h2 className="text-[20px] font-medium mb-1">{customer.name}</h2>
        <p className="text-[14px] text-muted font-mono">{customer.phone}</p>
      </div>

      {/* Balance Card */}
      <div className="bg-white py-8 px-6 text-center mb-10">
        <p className="text-[13px] text-muted uppercase tracking-wider mb-3">Remaining Balance</p>
        <div
          className="text-[40px] font-medium font-mono tracking-tight mb-6"
          style={{ color: balance > 0 ? '#EF4434' : '#1C1C1E' }}
        >
          ₹ {balance.toLocaleString('en-IN')}
        </div>
        {balance > 0 && (
          <button
            onClick={handleWhatsApp}
            className="w-full bg-whatsapp text-white py-4 font-semibold text-[14px] flex items-center justify-center gap-2.5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.415-8.412" />
            </svg>
            Send WhatsApp Reminder
          </button>
        )}
      </div>

      {/* Customer Details */}
      <section>
        <h2 className="text-[16px] font-medium mb-4">Details</h2>
        <div className="flex flex-col" style={{ gap: 1 }}>
          {customer.purchase_details && (
            <div className="bg-white py-5 px-4 flex justify-between items-start border-b border-border">
              <div>
                <p className="text-[11px] text-muted uppercase font-mono mb-1">Purchase Details</p>
                <p className="text-[15px]">{customer.purchase_details}</p>
              </div>
            </div>
          )}
          <div className="bg-white py-5 px-4 flex justify-between items-start border-b border-border">
            <div>
              <p className="text-[11px] text-muted uppercase font-mono mb-1">Total Amount</p>
              <p className="text-[15px] font-medium font-mono">₹{Number(customer.total_amount).toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-white py-5 px-4 flex justify-between items-start border-b border-border">
            <div>
              <p className="text-[11px] text-muted uppercase font-mono mb-1">Paid Amount</p>
              <p className="text-[15px] font-medium font-mono">₹{Number(customer.paid_amount).toLocaleString('en-IN')}</p>
            </div>
          </div>
          {customer.last_purchase_date && (
            <div className="bg-white py-5 px-4 flex justify-between items-start border-b border-border">
              <div>
                <p className="text-[11px] text-muted uppercase font-mono mb-1">Last Purchase</p>
                <p className="text-[15px]">{customer.last_purchase_date}</p>
              </div>
            </div>
          )}
          {customer.notes && (
            <div className="bg-white py-5 px-4 flex justify-between items-start">
              <div>
                <p className="text-[11px] text-muted uppercase font-mono mb-1">Notes</p>
                <p className="text-[15px]">{customer.notes}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
