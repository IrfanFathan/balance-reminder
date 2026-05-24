import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function DeleteConfirmDialog({ isOpen, customer, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

  if (!isOpen || !customer) return null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)
      if (error) throw error
      toast.success('Customer deleted')
      onConfirm()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.35)]" onClick={onClose} />
      <div className="relative bg-white p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <p className="text-[15px] font-medium mb-1">Delete {customer.name}?</p>
        <p className="text-[13px] text-muted mb-6">This cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-[14px] font-medium border border-border bg-white"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-3 text-[14px] font-medium bg-accent text-white border-0"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
