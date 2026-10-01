import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [empresas, setEmpresas] = useState([])
  const [empresaActual, setEmpresaActual] = useState(null)
  const [productos, setProductos] = useState([])
  const [campanias, setCampanias] = useState([])
  const [despachos, setDespachos] = useState([])
  const [pagos, setPagos] = useState([])
  const [notificaciones, setNotificaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargarTodo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [empRes, prodRes, campRes, desRes, pagRes, notifRes] = await Promise.all([
        supabase.from('empresas').select('*').order('nombre'),
        supabase.from('productos').select('*').order('nombre'),
        supabase.from('campanias').select('*').order('created_at', { ascending: false }),
        supabase.from('despachos').select('*').order('created_at', { ascending: false }),
        supabase.from('pagos').select('*').order('created_at', { ascending: false }),
        supabase.from('notificaciones_whatsapp').select('*').order('created_at', { ascending: false }),
      ])

      if (empRes.error) throw empRes.error
      if (prodRes.error) throw prodRes.error
      if (campRes.error) throw campRes.error
      if (desRes.error) throw desRes.error
      if (pagRes.error) throw pagRes.error
      if (notifRes.error) throw notifRes.error

      setEmpresas(empRes.data || [])
      setProductos(prodRes.data || [])
      setCampanias(campRes.data || [])
      setDespachos(desRes.data || [])
      setPagos(pagRes.data || [])
      setNotificaciones(notifRes.data || [])
      setEmpresaActual((prev) => prev || (empRes.data?.[0] ?? null))
    } catch (e) {
      setError(e.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarTodo()
  }, [cargarTodo])

  const value = {
    empresas,
    empresaActual,
    setEmpresaActual,
    productos,
    campanias,
    despachos,
    pagos,
    notificaciones,
    loading,
    error,
    refresh: cargarTodo,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
