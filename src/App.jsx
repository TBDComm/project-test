import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Index    from './pages/Index'
import Auth     from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Spotlight from './pages/Spotlight'
import Timing   from './pages/Timing'
import Pricing  from './pages/Pricing'
import MyPage   from './pages/MyPage'
import Payment  from './pages/Payment'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"         element={<Index />} />
          <Route path="/auth"     element={<Auth />} />
          <Route path="/pricing"  element={<Pricing />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/spotlight" element={<ProtectedRoute><Spotlight /></ProtectedRoute>} />
          <Route path="/timing"   element={<ProtectedRoute><Timing /></ProtectedRoute>} />
          <Route path="/mypage"   element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
          <Route path="/payment"  element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
