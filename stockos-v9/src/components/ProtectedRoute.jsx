import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const ADMIN_EMAIL = 'adminstockos@gmail.com'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && session.user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
