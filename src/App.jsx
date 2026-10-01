import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import SuperAdmin from './pages/SuperAdmin.jsx'
import EmpresaPanel from './pages/EmpresaPanel.jsx'

export default function App() {
  const [session, setSession] = useState(null)

  return (
    <Routes>
      <Route
        path="/"
        element={
          session ? (
            <Navigate to="/superadmin" replace />
          ) : (
            <Login onLogin={(u) => setSession(u)} />
          )
        }
      />
      <Route
        path="/superadmin"
        element={
          session ? (
            <SuperAdmin user={session} onLogout={() => setSession(null)} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/empresa/:id/panel"
        element={
          session ? (
            <EmpresaPanel user={session} onLogout={() => setSession(null)} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
