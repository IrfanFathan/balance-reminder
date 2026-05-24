import StatusBadge from './StatusBadge'
import WhatsAppButton from './WhatsAppButton'

export default function CustomerCard({ customer, onEdit, onDelete, onSendReminder }) {
  const balance = Number(customer.remaining_balance)
  const isPending = balance > 0

  return (
    <div className="bg-white p-5 flex justify-between items-center border border-transparent active:border-fg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[16px] font-medium truncate">{customer.name}</h3>
          <StatusBadge remainingBalance={balance} />
        </div>
        <p className="text-[12px] text-muted font-mono">{customer.phone}</p>
      </div>
      <div className="flex flex-col items-end gap-3 ml-3">
        <div className="text-right">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Pending</p>
          <p
            className="font-mono text-[14px] font-medium"
            style={{ color: isPending ? '#EF4434' : '#1C1C1E' }}
          >
            ₹ {Number(balance).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(customer)}
            className="w-7 h-7 flex items-center justify-center bg-bg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(customer)}
            className="w-7 h-7 flex items-center justify-center bg-bg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
          {isPending && (
            <WhatsAppButton customer={customer} />
          )}
        </div>
      </div>
    </div>
  )
}
