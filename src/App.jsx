import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import MaizeReceiving from './pages/maize/MaizeReceiving'
import Production from './pages/production/Production'
import Inventory from './pages/inventory/Inventory'
import Sales from './pages/sales/Sales'
import Suppliers from './pages/suppliers/Suppliers'
import Expenses from './pages/expenses/Expenses'
import Reports from './pages/reports/Reports'
import Users from './pages/users/Users'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>

            <Route index element={
              <ProtectedRoute roles={['admin', 'owner', 'manager']}><Dashboard /></ProtectedRoute>
            } />
            <Route path="maize" element={
              <ProtectedRoute roles={['admin', 'manager', 'worker']}><MaizeReceiving /></ProtectedRoute>
            } />
            <Route path="production" element={
              <ProtectedRoute roles={['admin', 'manager', 'worker']}><Production /></ProtectedRoute>
            } />
            <Route path="sales" element={
              <ProtectedRoute roles={['admin', 'manager', 'worker']}><Sales /></ProtectedRoute>
            } />
            <Route path="inventory" element={
              <ProtectedRoute roles={['admin', 'manager']}><Inventory /></ProtectedRoute>
            } />
            <Route path="suppliers" element={
              <ProtectedRoute roles={['admin', 'manager']}><Suppliers /></ProtectedRoute>
            } />
            <Route path="expenses" element={
              <ProtectedRoute roles={['admin', 'manager']}><Expenses /></ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute roles={['admin', 'owner']}><Reports /></ProtectedRoute>
            } />
            <Route path="users" element={
              <ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>
            } />

          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
