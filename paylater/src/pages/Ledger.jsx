import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import { formatPhoneNumber } from '../lib/messages'

export default function Ledger() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const customerId = searchParams.get('id')
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

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
        <h2
          className="text-[20px] font-medium mb-1 truncate"
          style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={customer.name}
        >
          {customer.name}
        </h2>
        <p className="text-[14px] text-muted font-mono">{formatPhoneNumber(customer.phone)}</p>
      </div>

      {/* Balance Card */}
      <div className="bg-white py-8 px-6 text-center mb-10">
        <p className="text-[13px] text-muted uppercase tracking-wider mb-3">Remaining Balance</p>
        <div
          className="text-[40px] font-medium font-mono tracking-tight mb-6"
          style={{ color: balance > 0 ? '#E53935' : '#22C55E' }}
        >
          ₹ {balance.toLocaleString('en-IN')}
        </div>
        {balance > 0 && (
          <button
            onClick={() => navigate(`/payment?id=${customer.id}`)}
            className="w-full bg-[#6C63FF] text-white py-4 font-semibold text-[14px] flex items-center justify-center gap-2.5 mb-3 cursor-pointer active:opacity-90 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Collect Payment (QR)
          </button>
        )}
        <button
          onClick={() => navigate(`/transactions?id=${customer.id}`)}
          className="w-full bg-white border border-[#D1D1D6] text-[#1C1C1E] py-4 font-semibold text-[14px] flex items-center justify-center gap-2.5 cursor-pointer active:bg-gray-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          View Transaction History
        </button>
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
