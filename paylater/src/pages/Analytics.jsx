import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { generateMessage } from '../lib/messages'
import BottomNav from '../components/BottomNav'

export default function Analytics() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('remaining_balance', { ascending: false })
      if (error) throw error
      setCustomers(data || [])
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
      fetchCustomers()
    }
    checkSession()
  }, [navigate])

  const totalPending = useMemo(
    () => customers.reduce((sum, c) => sum + Number(c.remaining_balance || 0), 0),
    [customers]
  )

  const totalCustomers = customers.length
  const paidCount = useMemo(
    () => customers.filter((c) => Number(c.remaining_balance) <= 0).length,
    [customers]
  )
  const pendingCount = totalCustomers - paidCount

  const topPending = useMemo(
    () => customers.filter((c) => Number(c.remaining_balance) > 0).slice(0, 5),
    [customers]
  )

  const handleRemind = (customer) => {
    const message = generateMessage(customer)
    const encoded = encodeURIComponent(message)
    let phone = customer.phone.replace(/\D/g, '')
    if (phone.length === 10) phone = `91${phone}`
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
  }

  return (
    <div className="container pb-32">
      <header className="flex justify-between items-center py-4">
        <h1 className="text-[24px] font-medium tracking-tight">Analytics</h1>
      </header>

      {/* Total Volume */}
      <div className="mb-8">
        <p className="text-[14px] text-muted mb-2">Total Outstanding</p>
        <p className="text-[32px] font-medium font-mono tracking-tight">
          ₹ {totalPending.toLocaleString('en-IN')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-white p-4">
          <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Total Customers</p>
          <p className="text-[24px] font-medium font-mono">{totalCustomers}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Paid</p>
          <p className="text-[24px] font-medium font-mono">{paidCount}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Pending</p>
          <p className="text-[24px] font-medium font-mono">{pendingCount}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Avg. Balance</p>
          <p className="text-[24px] font-medium font-mono">
            ₹ {totalCustomers > 0 ? Math.round(totalPending / totalCustomers).toLocaleString('en-IN') : 0}
          </p>
        </div>
      </div>

      {/* Top Pending Leaderboard */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[16px] font-medium">Top Pending Accounts</h2>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <div className="border border-border" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {loading ? (
            <div className="bg-white py-8 text-center">
              <p className="text-[13px] text-muted">Loading...</p>
            </div>
          ) : topPending.length === 0 ? (
            <div className="bg-white py-8 text-center">
              <p className="text-[13px] text-muted">No pending accounts</p>
            </div>
          ) : (
            topPending.map((customer) => (
              <div key={customer.id} className="bg-white p-4 flex justify-between items-center">
                <div>
                  <h3 className="text-[15px] font-medium mb-0.5">{customer.name}</h3>
                  <p className="text-[12px] text-muted">
                    Last active: {customer.last_purchase_date || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[14px] font-medium">
                    ₹{Number(customer.remaining_balance).toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => handleRemind(customer)}
                    className="w-8 h-8 bg-fg text-white flex items-center justify-center"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
