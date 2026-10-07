import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import SuperAdmin from './pages/SuperAdmin.jsx'
import EmpresaPanel from './pages/EmpresaPanel.jsx'
import CatalogoPublico from './pages/CatalogoPublico.jsx'

export default function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('stockos_session')
    return saved? JSON.parse(saved) : null
  })

  useEffect(() => {
    if (session) localStorage.setItem('stockos_session', JSON.stringify(session))
    else localStorage.removeItem('stockos_session')
  }, [session])

  const logout = () => setSession(null)

  return (
    <Routes>
      {/* LOGIN */}
      <Route
        path="/"
        element={
          session? (
            <Navigate to="/superadmin" replace />
          ) : (
            <Login onLogin={(u) => setSession(u)} />
          )
        }
      />

      {/* SUPER ADMIN - CON SESIÓN PERSISTENTE */}
      <Route
        path="/superadmin"
        element={
          session? (
            <SuperAdmin user={session} onLogout={logout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* PANEL PRIVADO POR EMPRESA - YA NO TE MANDA A LOGIN */}
      <Route
        path="/empresa/:id/panel"
        element={
          session? (
            <EmpresaPanel user={session} onLogout={logout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* CATALOGO PUBLICO - SIN LOGIN */}
      <Route path="/empresa/:id/catalogo" element={<CatalogoPublico />} />
      <Route path="/m/:slug" element={<CatalogoPublico />} />
      <Route path="/c/:slug" element={<CatalogoPublico />} />
      <Route path="/maxima" element={<CatalogoPublico />} />
      <Route path="/maxima/catalogo" element={<CatalogoPublico />} />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
