export default function StatCard({ label, value, valueColor }) {
  return (
    <div className="bg-white px-4 py-3 border border-transparent">
      <p className="text-[11px] text-muted uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-[20px] font-medium font-mono" style={{ color: valueColor }}>{value}</p>
    </div>
  )
}
