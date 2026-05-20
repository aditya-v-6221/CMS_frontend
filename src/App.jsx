import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ContractsPage from './pages/ContractsPage'
import ContractDetailPage from './pages/ContractDetailPage'
import UploadPage from './pages/UploadPage'
import SearchPage from './pages/SearchPage'
import AuditPage from './pages/AuditPage'
import TemplatesPage from './pages/TemplatesPage'
import DeadlineTrackerPage from './pages/DeadlineTrackerPage'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={
            <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
          } />
          <Route path="/contracts" element={
            <ProtectedRoute><Layout><ContractsPage /></Layout></ProtectedRoute>
          } />
          <Route path="/contracts/upload" element={
            <ProtectedRoute><Layout><UploadPage /></Layout></ProtectedRoute>
          } />
          <Route path="/contracts/:id" element={
            <ProtectedRoute><Layout><ContractDetailPage /></Layout></ProtectedRoute>
          } />
          <Route path="/search" element={
            <ProtectedRoute><Layout><SearchPage /></Layout></ProtectedRoute>
          } />
          <Route path="/audit" element={
            <ProtectedRoute><Layout><AuditPage /></Layout></ProtectedRoute>
          } />
          <Route path="/deadlines" element={
            <ProtectedRoute><Layout><DeadlineTrackerPage /></Layout></ProtectedRoute>
          } />
          <Route path="/templates" element={
            <ProtectedRoute><Layout><TemplatesPage /></Layout></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
