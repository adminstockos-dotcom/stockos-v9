import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import SuperAdmin from './pages/SuperAdmin.jsx'
import EmpresaPanel from './pages/EmpresaPanel.jsx'
import CatalogoPublico from './pages/CatalogoPublico.jsx'

export default function App() {
  const [session, setSession] = useState(null)

  return (
    <Routes>
      {/* LOGIN */}
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

      {/* SUPER ADMIN */}
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

      {/* PANEL PRIVADO POR EMPRESA */}
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

      {/* CATALOGO PUBLICO EN VIVO - SIN LOGIN - FIX 404 DEFINITIVO */}
      {/* Link largo original */}
      <Route path="/empresa/:id/catalogo" element={<CatalogoPublico />} />
      
      {/* Links cortos que quieres: primero MAXIMA luego stockos acortado */}
      <Route path="/m/:slug" element={<CatalogoPublico />} />
      <Route path="/c/:slug" element={<CatalogoPublico />} />
      <Route path="/maxima" element={<CatalogoPublico />} />
      <Route path="/maxima/catalogo" element={<CatalogoPublico />} />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
