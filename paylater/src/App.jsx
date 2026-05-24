import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Ledger from './pages/Ledger'
import AddCustomer from './pages/AddCustomer'
import AddTransaction from './pages/AddTransaction'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2500,
          success: {
            style: {
              background: '#1C1C1E',
              color: '#FFFFFF',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
            },
          },
          error: {
            style: {
              background: '#EF4434',
              color: '#FFFFFF',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/add-customer" element={<AddCustomer />} />
        <Route path="/add-transaction" element={<AddTransaction />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/ledger" element={<Ledger />} />
      </Routes>
    </BrowserRouter>
  )
}
