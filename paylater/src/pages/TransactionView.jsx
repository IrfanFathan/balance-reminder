import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function TransactionView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const customerId = searchParams.get('id')

  const [customer, setCustomer] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedTxId, setExpandedTxId] = useState(null)

  // Filters state (defaults: "All Time" and "Recent ↓")
  const [timeFilter, setTimeFilter] = useState('All Time') // 'This Month' | 'Today' | 'All Time'
  const [sortOption, setSortOption] = useState('Recent') // 'Recent' | 'Oldest' | 'High Amount' | 'Low Amount'

  // Confirm dialog state for marking paid from accordion
  const [confirmPaidTx, setConfirmPaidTx] = useState(null)
  const [updating, setUpdating] = useState(false)

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()
      if (error) throw error
      setCustomer(data)
    } catch {
      toast.error('Failed to load customer profile')
    }
  }

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerId)
      if (error) throw error
      setTransactions(data || [])
    } catch {
      toast.error('Failed to load transactions')
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
      await Promise.all([fetchCustomer(), fetchTransactions()])
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, customerId])

  const toggleAccordion = (id) => {
    setExpandedTxId(expandedTxId === id ? null : id)
  }

  // Handle marking a transaction as paid from accordion
  const handleMarkAsPaid = async (tx) => {
    setConfirmPaidTx(tx)
  }

  const confirmMarkAsPaid = async () => {
    if (!confirmPaidTx) return
    setUpdating(true)
    try {
      const amount = Number(confirmPaidTx.amount)

      // 1. Fetch latest customer record
      const { data: currentCustomer, error: fetchErr } = await supabase
        .from('customers')
        .select('paid_amount')
        .eq('id', customerId)
        .single()
      if (fetchErr) throw fetchErr

      // 2. Update customer paid amount
      const { error: customerErr } = await supabase
        .from('customers')
        .update({
          paid_amount: Number(currentCustomer.paid_amount) + amount
        })
        .eq('id', customerId)
      if (customerErr) throw customerErr

      // 3. Update transaction status
      const { error: txErr } = await supabase
        .from('transactions')
        .update({
          status: 'Paid',
          date: new Date().toISOString()
        })
        .eq('id', confirmPaidTx.id)
      if (txErr) throw txErr

      toast.success(`Payment of ₹${Math.round(amount)} marked as received!`)
      setConfirmPaidTx(null)
      
      // Update local state immediately (no page reload)
      await Promise.all([fetchCustomer(), fetchTransactions()])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  // Processed (filtered & sorted) Transactions
  const processedTransactions = useMemo(() => {
    let result = [...transactions]

    // 1. Filter by Time
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    if (timeFilter === 'Today') {
      result = result.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate.toISOString().split('T')[0] === todayStr
      })
    } else if (timeFilter === 'This Month') {
      result = result.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
      })
    }

    // 2. Sort By
    if (sortOption === 'Recent') {
      result.sort((a, b) => new Date(b.date) - new Date(a.date))
    } else if (sortOption === 'Oldest') {
      result.sort((a, b) => new Date(a.date) - new Date(b.date))
    } else if (sortOption === 'High Amount') {
      result.sort((a, b) => Number(b.amount) - Number(a.amount))
    } else if (sortOption === 'Low Amount') {
      result.sort((a, b) => Number(a.amount) - Number(b.amount))
    }

    return result
  }, [transactions, timeFilter, sortOption])

  if (loading || !customer) {
    return (
      <div className="container pb-32">
        <header className="flex items-center py-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-[#D1D1D6] flex items-center justify-center cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[18px] font-medium ml-4">Transactions</h1>
        </header>
        <div className="py-12 text-center">
          <p className="text-[14px] text-muted">Loading transactions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container pb-32" style={{ background: '#EAEAEA', minHeight: '100vh' }}>
      {/* Header */}
      <header className="flex items-center py-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-[#D1D1D6] flex items-center justify-center cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="ml-4">
          <h1 className="text-[18px] font-medium text-[#1C1C1E]">Transaction History</h1>
          <p className="text-[12px] text-muted">{customer.name}</p>
        </div>
      </header>

      {/* FILTER & SORT BAR (Horizontally scrollable chips, no wrap) */}
      <div className="mt-4 flex flex-col gap-3">
        {/* Time Filters */}
        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
          {['This Month', 'Today', 'All Time'].map((tf) => {
            const isActive = timeFilter === tf
            return (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className="whitespace-nowrap px-4 py-2 text-[13px] font-semibold transition-all cursor-pointer"
                style={{
                  background: isActive ? '#6C63FF' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#6C63FF',
                  border: '1px solid #6C63FF',
                  borderRadius: '0px',
                }}
              >
                {isActive ? '◉ ' : '○ '}{tf}
              </button>
            )
          })}
        </div>

        {/* Sort Choices */}
        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
          {['Recent', 'Oldest', 'High Amount', 'Low Amount'].map((so) => {
            const isActive = sortOption === so
            const labelMap = {
              'Recent': 'Recent ↓',
              'Oldest': 'Oldest ↑',
              'High Amount': 'High Amount ↓',
              'Low Amount': 'Low Amount ↑',
            }
            return (
              <button
                key={so}
                onClick={() => setSortOption(so)}
                className="whitespace-nowrap px-4 py-2 text-[13px] font-semibold transition-all cursor-pointer"
                style={{
                  background: isActive ? '#6C63FF' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#6C63FF',
                  border: '1px solid #6C63FF',
                  borderRadius: '0px',
                }}
              >
                {isActive ? '◉ ' : '○ '}{labelMap[so]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Counter label */}
      <p className="text-[13px] text-muted mt-4 font-semibold">
        Showing {processedTransactions.length} transactions
      </p>

      {/* Transaction List */}
      <div className="mt-4 flex flex-col gap-1" style={{ background: '#D1D1D6' }}>
        {processedTransactions.length === 0 ? (
          <div className="bg-white py-12 text-center">
            <p className="text-[14px] text-muted">No transactions found</p>
            <p className="text-[12px] text-muted mt-1">Change filters or add a new transaction.</p>
          </div>
        ) : (
          processedTransactions.map((tx) => {
            const isExpanded = expandedTxId === tx.id
            const dateObj = new Date(tx.date)
            const formattedDate = dateObj.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
            const formattedTime = dateObj.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
            
            // Check status colors
            let statusBg = '#FFE2E2'
            let statusText = '#FF3B30'
            if (tx.status === 'Paid') {
              statusBg = '#E2FBE9'
              statusText = '#22C55E'
            } else if (tx.status === 'Pending') {
              statusBg = '#FFF4E2'
              statusText = '#FF9500'
            }

            return (
              <div
                key={tx.id}
                className="bg-white transition-all duration-200"
                style={{ borderBottom: '1px solid #EAEAEA' }}
              >
                {/* Accordion Trigger Row */}
                <div
                  onClick={() => toggleAccordion(tx.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-mono font-semibold text-fg bg-gray-100 px-2 py-0.5">
                        #{tx.id.substring(0, 8).toUpperCase()}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5"
                        style={{ background: statusBg, color: statusText }}
                      >
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted font-semibold">
                      {formattedDate} • {formattedTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 text-right">
                    <div>
                      <p className="text-[10px] text-muted uppercase font-semibold">Amount</p>
                      <p className="font-mono text-[15px] font-bold text-[#1C1C1E]">
                        ₹{Number(tx.amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                    {/* Method Badge */}
                    <span className="text-[11px] font-semibold bg-gray-100 text-muted px-2 py-1">
                      {tx.method || 'Manual'}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-muted transition-transform duration-200"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Accordion Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-1 bg-[#FAF9FF] border-t border-[#F2F2F7] flex flex-col gap-3 text-[13px]" dir="auto">
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      <div>
                        <p className="text-[10px] text-muted uppercase font-semibold">Full Transaction ID</p>
                        <p className="font-mono text-[12px] select-all break-all">{tx.id}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase font-semibold">Customer</p>
                        <p className="font-semibold">{customer.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase font-semibold">Date & Time</p>
                        <p className="font-semibold">{formattedDate} at {formattedTime}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase font-semibold">Method Used</p>
                        <p className="font-semibold">{tx.method || 'Manual'}</p>
                      </div>
                    </div>

                    {tx.note && (
                      <div className="bg-white p-3 border border-border mt-1">
                        <p className="text-[10px] text-muted uppercase font-semibold mb-1">Merchant Notes</p>
                        <p className="text-[#1C1C1E]">{tx.note}</p>
                      </div>
                    )}

                    {/* Inline action to mark as paid */}
                    {tx.status !== 'Paid' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsPaid(tx)
                        }}
                        className="mt-2 w-full bg-[#22C55E] hover:bg-[#1fbd59] text-white py-3 font-semibold text-[13px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
                        style={{ borderRadius: '0px' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Mark as Paid ✅
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmPaidTx && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmPaidTx(null)} />
          <div className="bg-white p-6 shadow-xl relative z-10 max-w-sm w-full border border-border" style={{ borderRadius: '0px' }}>
            <h3 className="text-[16px] font-bold text-[#1C1C1E] mb-2">Confirm Payment</h3>
            <p className="text-[14px] text-muted mb-6 leading-relaxed">
              Mark <strong className="text-fg font-mono font-bold">₹{Math.round(confirmPaidTx.amount)}</strong> from <strong className="text-fg font-bold">{customer.name}</strong> as paid?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmPaidTx(null)}
                className="px-4 py-2.5 text-[13px] font-semibold border border-border text-muted cursor-pointer active:bg-gray-100"
                style={{ borderRadius: '0px' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkAsPaid}
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
    </div>
  )
}
