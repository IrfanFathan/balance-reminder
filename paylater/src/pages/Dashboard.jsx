import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import BottomNav from '../components/BottomNav'
import CustomerCard from '../components/CustomerCard'
import CustomerModal from '../components/CustomerModal'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog'
import SearchBar from '../components/SearchBar'
import SkeletonCard from '../components/SkeletonCard'

export default function Dashboard() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/', { replace: true })
        return
      }
      await fetchCustomers()
    }
    init()
  }, [navigate])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCustomers(data || [])
      setFilteredCustomers(data || [])
    } catch (err) {
      if (err.message?.includes('auth')) {
        toast.error('Session expired, please sign in again')
        navigate('/', { replace: true })
      } else {
        toast.error(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query) => {
    const q = query.toLowerCase()
    setFilteredCustomers(
      customers.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      )
    )
  }

  const handleEdit = (customer) => {
    setSelectedCustomer(customer)
    setModalOpen(true)
  }

  const handleDelete = (customer) => {
    setCustomerToDelete(customer)
    setDeleteConfirmOpen(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const totalPending = customers.reduce((sum, c) => sum + Number(c.remaining_balance || 0), 0)

  return (
    <div className="min-h-screen" style={{ background: '#EAEAEA' }}>
      <div className="container pb-32">
        {/* Header */}
        <header className="flex items-center justify-between" style={{ paddingBlock: '24px 16px' }}>
          <div>
            <h1 className="text-[20px] font-medium">PayLater</h1>
            <p className="text-[12px] text-muted mt-1">Your Shop</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 bg-white border border-border flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </header>

        {/* Hero Balance */}
        <div className="bg-fg text-white py-8 px-6 text-center mb-6">
          <p className="text-[11px] uppercase tracking-[0.1em] opacity-60 mb-3">Total Outstanding Credit</p>
          <div className="text-[36px] font-medium font-mono" style={{ letterSpacing: '-0.02em' }}>
            ₹ {totalPending.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link to="/add-customer" className="card flex flex-col gap-3">
            <div className="w-8 h-8 bg-bg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <h3 className="text-[14px] font-medium">Add Customer</h3>
          </Link>
          <Link to="/add-transaction" className="card flex flex-col gap-3">
            <div className="w-8 h-8 bg-bg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <h3 className="text-[14px] font-medium">New Entry</h3>
          </Link>
          <Link to="/customers" className="card flex flex-col gap-3">
            <div className="w-8 h-8 bg-bg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="text-[14px] font-medium">View All</h3>
          </Link>
          <Link to="/analytics" className="card flex flex-col gap-3">
            <div className="w-8 h-8 bg-bg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="m7 15 4-4 4 4 5-5" />
              </svg>
            </div>
            <h3 className="text-[14px] font-medium">Insights</h3>
          </Link>
        </div>

        {/* Recent Customers */}
        <section>
          <h2 className="text-[16px] font-medium mb-4">Recent Customers</h2>
          <div className="mb-4">
            <SearchBar onSearch={handleSearch} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#D1D1D6' }}>
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : filteredCustomers.length === 0 ? (
              <div className="bg-white py-12 text-center">
                <p className="text-[14px] text-muted">No customers yet</p>
                <p className="text-[12px] text-muted mt-1">Tap + to add your first customer</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* FAB */}
      <button
        onClick={() => { setSelectedCustomer(null); setModalOpen(true) }}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center z-[90]"
        style={{ boxShadow: '0 4px 12px rgba(239, 68, 52, 0.3)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <CustomerModal
        isOpen={modalOpen}
        customer={selectedCustomer}
        onClose={() => { setModalOpen(false); setSelectedCustomer(null) }}
        onSave={fetchCustomers}
      />

      <DeleteConfirmDialog
        isOpen={deleteConfirmOpen}
        customer={customerToDelete}
        onClose={() => { setDeleteConfirmOpen(false); setCustomerToDelete(null) }}
        onConfirm={() => { fetchCustomers(); setDeleteConfirmOpen(false); setCustomerToDelete(null) }}
      />

      <BottomNav />
    </div>
  )
}
