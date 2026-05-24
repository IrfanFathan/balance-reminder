import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import { formatPhoneNumber } from '../lib/messages'

export default function Ledger() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const customerId = searchParams.get('id')

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'alerts'
  const [alertLogs, setAlertLogs] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [expandedAlertId, setExpandedAlertId] = useState(null)
  const [alertQrs, setAlertQrs] = useState({}) // id → dataUrl

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

  const fetchAlertLogs = async (id) => {
    setAlertsLoading(true)
    try {
      const { data, error } = await supabase
        .from('alert_logs')
        .select('*')
        .eq('customer_id', id)
        .order('sent_at', { ascending: false })
      if (error) throw error
      setAlertLogs(data || [])
    } catch (err) {
      console.error('Failed to load alert logs:', err)
    } finally {
      setAlertsLoading(false)
    }
  }

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/', { replace: true }); return }
      if (!customerId) { navigate('/customers', { replace: true }); return }
      fetchCustomer(customerId)
    }
    checkSession()
  }, [navigate, customerId])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'alerts' && alertLogs.length === 0) {
      fetchAlertLogs(customerId)
    }
  }

  const toggleExpandAlert = async (log) => {
    const isOpen = expandedAlertId === log.id
    setExpandedAlertId(isOpen ? null : log.id)
    if (!isOpen && !alertQrs[log.id] && log.upi_qr_payload) {
      try {
        const dataUrl = await QRCode.toDataURL(log.upi_qr_payload, {
          width: 160,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#1A1A2E', light: '#FFFFFF' },
        })
        setAlertQrs(prev => ({ ...prev, [log.id]: dataUrl }))
      } catch (err) {
        console.error('QR regen failed:', err)
      }
    }
  }

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return iso }
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
      <div className="mb-6">
        <h2
          className="text-[20px] font-medium mb-1 truncate"
          style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={customer.name}
        >
          {customer.name}
        </h2>
        <p className="text-[14px] text-muted font-mono">{formatPhoneNumber(customer.phone)}</p>
      </div>

      {/* Balance Card */}
      <div className="bg-white py-8 px-6 text-center mb-6">
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
              <rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Collect Payment (QR)
          </button>
        )}
        <button
          onClick={() => navigate(`/transactions?id=${customer.id}`)}
          className="w-full bg-white border border-[#D1D1D6] text-[#1C1C1E] py-4 font-semibold text-[14px] flex items-center justify-center gap-2.5 cursor-pointer active:bg-gray-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
          </svg>
          View Transaction History
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border border-border overflow-hidden mb-5">
        {[{ key: 'details', label: 'Details' }, { key: 'alerts', label: '🔔 Alert History' }].map(tab => (
          <button
            key={tab.key}
            type="button"
            className="flex-1 py-3 text-[13px] font-semibold transition-colors cursor-pointer"
            style={{
              background: activeTab === tab.key ? '#1C1C1E' : 'transparent',
              color: activeTab === tab.key ? '#FFFFFF' : '#8E8E93',
            }}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
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
      )}

      {activeTab === 'alerts' && (
        <section>
          <h2 className="text-[16px] font-medium mb-4">Reminder History</h2>
          {alertsLoading ? (
            <div className="py-10 text-center">
              <p className="text-[13px] text-muted">Loading alert history...</p>
            </div>
          ) : alertLogs.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-[#D1D1D6]">
              <p className="text-[14px] text-muted">No reminders sent yet</p>
              <p className="text-[12px] text-muted mt-1">Reminders you send will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {alertLogs.map(log => (
                <div key={log.id} className="bg-white border border-border overflow-hidden">
                  {/* Row summary */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpandAlert(log)}
                  >
                    <div className="text-left flex-1">
                      <p className="text-[13px] font-semibold text-[#1C1C1E]">
                        ₹{Number(log.amount).toLocaleString('en-IN')}
                        <span className="ml-2 text-[11px] font-normal text-muted capitalize">
                          ({log.message_language})
                        </span>
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">{formatDate(log.sent_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider"
                        style={{
                          background: log.status === 'sent' ? '#F0FFF4' : '#FFF0F0',
                          color: log.status === 'sent' ? '#15803D' : '#DC2626',
                        }}
                      >
                        {log.status}
                      </span>
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#8E8E93" strokeWidth="2"
                        style={{ transform: expandedAlertId === log.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expandedAlertId === log.id && (
                    <div className="border-t border-border px-4 py-4 bg-gray-50">
                      {/* QR reconstruction */}
                      {log.upi_qr_payload && (
                        <div className="flex flex-col items-center mb-4">
                          {alertQrs[log.id] ? (
                            <>
                              <img src={alertQrs[log.id]} alt="UPI QR" width={140} height={140} />
                              <p className="text-[12px] font-mono font-bold mt-1 text-[#1A1A2E]">
                                ₹{Number(log.amount).toLocaleString('en-IN')}
                              </p>
                              <p className="text-[10px] text-muted">Scan to Pay via UPI</p>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-[140px]">
                              <div className="w-6 h-6 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* UPI details */}
                      <div className="mb-3">
                        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">UPI ID at Send Time</p>
                        <p className="text-[12px] font-mono text-[#1C1C1E]">{log.upi_id}</p>
                      </div>

                      {/* Message body */}
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Message Sent</p>
                        <p className="text-[12px] text-[#1C1C1E] whitespace-pre-wrap leading-relaxed bg-white p-3 border border-border" dir="auto">
                          {log.message_body}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <BottomNav />
    </div>
  )
}
