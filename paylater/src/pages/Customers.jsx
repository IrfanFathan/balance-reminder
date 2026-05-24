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
import FAB from '../components/FAB'
import TransactionModal from '../components/TransactionModal'

export default function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)

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

      {/* FAB Speed Dial */}
      <FAB
        onNewCustomer={handleAdd}
        onNewTransaction={() => setTransactionModalOpen(true)}
      />

      <CustomerModal
        isOpen={modalOpen}
        customer={selectedCustomer}
        onClose={() => {
          setModalOpen(false)
          setSelectedCustomer(null)
        }}
        onSave={fetchCustomers}
      />

      <TransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
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
