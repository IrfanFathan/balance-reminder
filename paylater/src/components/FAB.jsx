import { useState, useEffect, useRef } from 'react'

export default function FAB({ onNewCustomer, onNewTransaction }) {
  const [isOpen, setIsOpen] = useState(false)
  const fabRef = useRef(null)

  const toggleOpen = (e) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const handleOptionClick = (action, e) => {
    e.stopPropagation()
    setIsOpen(false)
    action()
  }

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('click', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [isOpen])

  return (
    <div ref={fabRef} className="fixed bottom-24 right-6 z-[150] flex flex-col items-end gap-3">
      {/* Background Backdrop Dimming */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/15 z-[-1] transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Speed Dial Options */}
      <div
        className="flex flex-col items-end gap-3 select-none pointer-events-none"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 200ms ease-out, transform 200ms ease-out',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Option A: New Customer */}
        <button
          onClick={(e) => handleOptionClick(onNewCustomer, e)}
          className="flex items-center gap-2 px-4 py-3 bg-white text-[#1C1C1E] shadow-lg border border-[#D1D1D6] cursor-pointer hover:bg-gray-50 active:scale-95 transition-all text-[13px] font-semibold"
          style={{
            transform: isOpen ? 'scale(1)' : 'scale(0.8)',
            transition: 'transform 200ms ease-out',
            transitionDelay: isOpen ? '50ms' : '0ms',
            borderRadius: '0px',
          }}
        >
          <span className="text-[14px]">👤</span>
          <span>New Customer</span>
        </button>

        {/* Option B: New Transaction */}
        <button
          onClick={(e) => handleOptionClick(onNewTransaction, e)}
          className="flex items-center gap-2 px-4 py-3 bg-white text-[#1C1C1E] shadow-lg border border-[#D1D1D6] cursor-pointer hover:bg-gray-50 active:scale-95 transition-all text-[13px] font-semibold"
          style={{
            transform: isOpen ? 'scale(1)' : 'scale(0.8)',
            transition: 'transform 200ms ease-out',
            transitionDelay: isOpen ? '100ms' : '0ms',
            borderRadius: '0px',
          }}
        >
          <span className="text-[14px]">💸</span>
          <span>New Transaction</span>
        </button>
      </div>

      {/* Main Trigger Button */}
      <button
        onClick={toggleOpen}
        className="w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg cursor-pointer hover:opacity-95 active:scale-95 transition-all"
        style={{
          backgroundColor: '#6C63FF', // Primary theme color
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 200ms ease-out, background-color 200ms ease-out',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
