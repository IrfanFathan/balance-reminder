import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import SearchBar from '../components/SearchBar'
import CustomerCard from '../components/CustomerCard'
import SkeletonCard from '../components/SkeletonCard'
import CustomerModal from '../components/CustomerModal'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog'
import BottomNav from '../components/BottomNav'

export default function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)

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

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      if (err.message?.includes('JWT') || err.status === 401) {
        toast.error('Session expired, please sign in again')
        navigate('/', { replace: true })
      } else {
        toast.error(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers
    const q = searchQuery.toLowerCase()
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    )
  }, [customers, searchQuery])

  const handleAdd = () => {
    setSelectedCustomer(null)
    setModalOpen(true)
  }

  const handleEdit = (customer) => {
    setSelectedCustomer(customer)
    setModalOpen(true)
  }

  const handleDelete = (customer) => {
    setCustomerToDelete(customer)
    setDeleteConfirmOpen(true)
  }

  return (
    <div className="container pb-32">
      <header className="flex justify-between items-center py-4">
        <h1 className="text-[24px] font-medium">Customers</h1>
      </header>

      <div className="mb-4">
        <SearchBar onSearch={setSearchQuery} />
      </div>

      <div className="flex flex-col" style={{ gap: 1 }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white py-12 text-center">
            <p className="text-[14px] text-muted">No customers found</p>
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

      {/* FAB */}
      <button
        onClick={handleAdd}
        className="fixed right-6 w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center z-[90]"
        style={{ bottom: 100, boxShadow: '0 4px 12px rgba(239, 68, 52, 0.3)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <CustomerModal
        isOpen={modalOpen}
        customer={selectedCustomer}
        onClose={() => {
          setModalOpen(false)
          setSelectedCustomer(null)
        }}
        onSave={fetchCustomers}
      />

      <DeleteConfirmDialog
        isOpen={deleteConfirmOpen}
        customer={customerToDelete}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setCustomerToDelete(null)
        }}
        onConfirm={() => {
          fetchCustomers()
          setDeleteConfirmOpen(false)
          setCustomerToDelete(null)
        }}
      />

      <BottomNav />
    </div>
  )
}
