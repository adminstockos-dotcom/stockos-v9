import { useState, useEffect } from 'react'

const DEFAULT_USERS = [
  { id: 'u1', nombre: 'Iván Cadena', usuario: 'admin', pass: 'vc512', rol: 'Administrador', fijo: true, activo: true },
  { id: 'u2', nombre: 'Supervisor', usuario: 'supervisor', pass: 'vc512', rol: 'Supervisor de Pedidos', fijo: true, activo: true },
  { id: 'u3', nombre: 'Caja', usuario: 'caja', pass: 'vc512', rol: 'Responsable de Caja', fijo: true, activo: true },
  { id: 'u4', nombre: 'Mensajero 1', usuario: 'mensajero1', pass: 'vc512', rol: 'Mensajeros / Patinadores', fijo: true, activo: true },
]

export function useEmpresaUsers(subdomain) {
  const storageKey = `stockos_users_${subdomain}`

  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : DEFAULT_USERS
    } catch {
      return DEFAULT_USERS
    }
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(users))
  }, [users, storageKey])

  const agregar = (user) => {
    setUsers((prev) => [...prev, { ...user, id: `u${Date.now()}`, activo: true }])
  }

  const actualizar = (id, updates) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updates } : u))
  }

  const eliminar = (id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const resetPass = (id, newPass) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, pass: newPass } : u))
  }

  return { users, agregar, actualizar, eliminar, resetPass }
}
