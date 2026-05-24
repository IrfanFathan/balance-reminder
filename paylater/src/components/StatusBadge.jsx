export default function StatusBadge({ remainingBalance }) {
  const isPending = remainingBalance > 0

  return (
    <span
      className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
      style={{
        background: isPending ? '#1C1C1E' : '#10B981',
        color: '#FFFFFF',
      }}
    >
      {isPending ? 'PENDING' : 'PAID'}
    </span>
  )
}
