import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useEmpresas() {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)

  // Cargar empresas desde Supabase al iniciar
  useEffect(() => {
    fetchEmpresas()
  }, [])

  const fetchEmpresas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setEmpresas(data)
    } catch (error) {
      console.error('Error cargando empresas:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const addEmpresa = async (empresa) => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .insert([empresa])
        .select()

      if (error) throw error
      if (data && data.length > 0) {
        setEmpresas(prev => [data[0], ...prev])
        return data[0]
      }
    } catch (error) {
      console.error('Error al agregar empresa:', error.message)
    }
  }

  const updateEmpresa = async (id, updates) => {
    try {
      // Mapeamos 'estado' a minúscula o como lo maneje tu base de datos de Supabase
      const dbUpdates = { ...updates }
      if (dbUpdates.estado) {
        dbUpdates.estado = dbUpdates.estado.toLowerCase() === 'aprobada' ? 'aprobada' : 'pendiente'
      }

      const { error } = await supabase
        .from('empresas')
        .update(dbUpdates)
        .eq('id', id)

      if (error) throw error

      // Actualizamos el estado localmente para reflejarlo de inmediato en la interfaz
      setEmpresas(prev => prev.map(e => e.id === Number(id) ? { ...e, ...updates } : e))
    } catch (error) {
      console.error('Error al actualizar empresa:', error.message)
    }
  }

  const deleteEmpresa = async (id) => {
    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id)

      if (error) throw error
      setEmpresas(prev => prev.filter(e => e.id !== Number(id)))
    } catch (error) {
      console.error('Error al eliminar empresa:', error.message)
    }
  }

  const getEmpresa = (id) => {
    return empresas.find(e => e.id === Number(id))
  }

  return { empresas, addEmpresa, updateEmpresa, deleteEmpresa, getEmpresa, loading }
}
