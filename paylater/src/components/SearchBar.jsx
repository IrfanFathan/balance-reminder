export default function SearchBar({ onSearch }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        placeholder="Search by name or number..."
        className="w-full pl-11 pr-4 py-3.5 bg-white border border-border text-[15px]"
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  )
}
