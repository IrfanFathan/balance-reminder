export default function StatusBadge({ remainingBalance }) {
  const isPending = remainingBalance > 0

  return (
    <span
      className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
      style={{
        background: isPending ? '#FFF0F0' : '#F0FFF4',
        color: isPending ? '#E53935' : '#22C55E',
      }}
    >
      {isPending ? 'PENDING' : 'PAID'}
    </span>
  )
}
