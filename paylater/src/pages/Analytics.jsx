import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabase'
import { generateMessage } from '../lib/messages'
import BottomNav from '../components/BottomNav'

export default function Analytics() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  // Monthly Report picker state
  const [selectedMonth, setSelectedMonth] = useState('May')
  const [selectedYear, setSelectedYear] = useState('2026')

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const years = ['2024', '2025', '2026']

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

  // Real-time calculations computed from the shared customer records
  const totalCredits = useMemo(
    () => customers.reduce((sum, c) => sum + Number(c.total_amount || 0), 0),
    [customers]
  )

  const totalReceipts = useMemo(
    () => customers.reduce((sum, c) => sum + Number(c.paid_amount || 0), 0),
    [customers]
  )

  const totalPending = useMemo(
    () => totalCredits - totalReceipts,
    [totalCredits, totalReceipts]
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

  // Feature 5: client-side PDF export compiler using jsPDF
  const handleExportPDF = () => {
    try {
      // Load settings from localStorage
      let settings = {
        shopName: 'Royal Fancy',
        ownerName: 'Shamil',
        phone: '9876543210',
        address: 'Kerala, India',
        logo: ''
      }
      const stored = localStorage.getItem('paylater_shop_settings')
      if (stored) {
        try {
          settings = { ...settings, ...JSON.parse(stored) }
        } catch (e) {
          console.error(e)
        }
      }

      const doc = new jsPDF()

      // Header Banner Section
      let textOffset = 15
      if (settings.logo) {
        try {
          doc.addImage(settings.logo, 'PNG', 15, 15, 18, 18)
          textOffset = 38
        } catch (e) {
          console.error('Failed drawing logo in PDF', e)
        }
      }

      // Shop Information Headers
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(28, 28, 30)
      doc.text(settings.shopName, textOffset, 21)

      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(112, 112, 112)
      doc.text(`Owner: ${settings.ownerName}  |  Phone: +91 ${settings.phone}`, textOffset, 26)
      doc.text(`Address: ${settings.address}`, textOffset, 31)

      // Divider Line
      doc.setDrawColor(229, 229, 234)
      doc.line(15, 38, 195, 38)

      // Title & Date Header
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(28, 28, 30)
      doc.text(`Monthly Customer Ledger Report — ${selectedMonth} ${selectedYear}`, 15, 48)

      // Table Header Row
      let currentY = 56
      doc.setFillColor(28, 28, 30)
      doc.rect(15, currentY, 180, 8, 'F')
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(255, 255, 255)
      doc.text('Customer Name', 18, currentY + 5.5)
      doc.text('Phone', 70, currentY + 5.5)
      doc.text('Total Credit (INR)', 108, currentY + 5.5)
      doc.text('Paid (INR)', 142, currentY + 5.5)
      doc.text('Balance (INR)', 170, currentY + 5.5)
      currentY += 8

      // Table Data Rows
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(8.5)

      customers.forEach((c, idx) => {
        // Page overflow protection
        if (currentY + 8 > 270) {
          doc.addPage()
          currentY = 20

          // Redraw Table Headers on new page
          doc.setFillColor(28, 28, 30)
          doc.rect(15, currentY, 180, 8, 'F')
          doc.setFont('Helvetica', 'bold')
          doc.setTextColor(255, 255, 255)
          doc.text('Customer Name', 18, currentY + 5.5)
          doc.text('Phone', 70, currentY + 5.5)
          doc.text('Total Credit (INR)', 108, currentY + 5.5)
          doc.text('Paid (INR)', 142, currentY + 5.5)
          doc.text('Balance (INR)', 170, currentY + 5.5)
          doc.setFont('Helvetica', 'normal')
          currentY += 8
        }

        // Alternating row styling
        if (idx % 2 === 1) {
          doc.setFillColor(248, 249, 250)
          doc.rect(15, currentY, 180, 8, 'F')
        }

        doc.setTextColor(28, 28, 30)
        let nameText = c.name
        if (nameText.length > 24) nameText = nameText.substring(0, 22) + '...'
        doc.text(nameText, 18, currentY + 5.5)
        doc.text(c.phone || 'N/A', 70, currentY + 5.5)
        
        doc.text(Number(c.total_amount || 0).toLocaleString('en-IN'), 108, currentY + 5.5)
        doc.text(Number(c.paid_amount || 0).toLocaleString('en-IN'), 142, currentY + 5.5)
        doc.text(Number(c.remaining_balance || 0).toLocaleString('en-IN'), 170, currentY + 5.5)

        currentY += 8
      })

      // Sum Total Row at Bottom
      if (currentY + 10 > 270) {
        doc.addPage()
        currentY = 20
      }
      doc.setDrawColor(28, 28, 30)
      doc.setLineWidth(0.5)
      doc.line(15, currentY, 195, currentY)

      doc.setFont('Helvetica', 'bold')
      doc.text('TOTAL', 18, currentY + 6)
      doc.text(totalCredits.toLocaleString('en-IN'), 108, currentY + 6)
      doc.text(totalReceipts.toLocaleString('en-IN'), 142, currentY + 6)
      doc.text(totalPending.toLocaleString('en-IN'), 170, currentY + 6)

      // Post-Process Footers (Page X of Y & Confidentiality Notice)
      const totalPages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setDrawColor(229, 229, 234)
        doc.setLineWidth(0.2)
        doc.line(15, 282, 195, 282)

        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(142, 142, 147)
        
        doc.text('CONFIDENTIAL - FOR INTERNAL MERCHANT USE ONLY', 15, 287)
        doc.text(`Page ${i} of ${totalPages}`, 175, 287)
      }

      doc.save(`ledger_report_${selectedMonth.toLowerCase()}_${selectedYear}.pdf`)
      toast.success('Report downloaded successfully')
    } catch (err) {
      console.error(err)
      toast.error('Could not generate PDF report')
    }
  }

  return (
    <div className="container pb-32 min-h-screen" style={{ background: '#F8F9FA' }}>
      <header className="flex justify-between items-center py-4">
        <h1 className="text-[24px] font-medium tracking-tight">Analytics</h1>
      </header>

      {/* Real-time calculated cards with designated colors */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        {/* Credits Card */}
        <div className="p-5" style={{ background: '#FFF0F0', color: '#E53935', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: '0px' }}>
          <p className="text-[11px] uppercase tracking-wider mb-1 font-semibold opacity-85">Total Credits</p>
          <p className="text-[32px] font-bold font-mono">₹{totalCredits.toLocaleString('en-IN')}</p>
        </div>

        {/* Receipts Card */}
        <div className="p-5" style={{ background: '#F0FFF4', color: '#22C55E', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: '0px' }}>
          <p className="text-[11px] uppercase tracking-wider mb-1 font-semibold opacity-85">Total Receipts</p>
          <p className="text-[32px] font-bold font-mono">₹{totalReceipts.toLocaleString('en-IN')}</p>
        </div>

        {/* Pending Card */}
        <div className="p-5" style={{ background: '#FFF8E1', color: '#F59E0B', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: '0px' }}>
          <p className="text-[11px] uppercase tracking-wider mb-1 font-semibold opacity-85">Pending Balance</p>
          <p className="text-[32px] font-bold font-mono">₹{totalPending.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Feature 5: Inline Monthly Report Picker Panel */}
      <section className="bg-white p-5 border border-border mb-8" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h2 className="text-[15px] font-semibold mb-3">Export Monthly PDF Report</h2>
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-[11px] text-muted uppercase tracking-wider block mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-white border border-border px-3 py-2 text-[13px] outline-none"
              style={{ borderRadius: '0px', height: '44px' }}
            >
              {months.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-muted uppercase tracking-wider block mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-white border border-border px-3 py-2 text-[13px] outline-none"
              style={{ borderRadius: '0px', height: '44px' }}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleExportPDF}
          className="w-full bg-[#1C1C1E] text-white py-3 text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-black transition-colors cursor-pointer"
          style={{ height: '44px' }}
        >
          Download PDF Report
        </button>
      </section>

      {/* Top Pending Leaderboard */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[16px] font-medium">Top Pending Accounts</h2>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <div className="border border-border" style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#D1D1D6' }}>
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
                  <span className="font-mono text-[14px] font-medium" style={{ color: '#E53935' }}>
                    ₹{Number(customer.remaining_balance).toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => handleRemind(customer)}
                    className="w-8 h-8 bg-[#1C1C1E] text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
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
