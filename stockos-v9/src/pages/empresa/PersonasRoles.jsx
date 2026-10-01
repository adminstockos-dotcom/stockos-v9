import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const ROLES_FIJOS = [
  { nombre: 'Administrador', desc: 'Acceso total', icono: '👑' },
  { nombre: 'Supervisor de Pedidos', desc: 'Gestiona despachos', icono: '📋' },
  { nombre: 'Responsable de Caja', desc: 'Pagos y facturación', icono: '💰' },
  { nombre: 'Mensajeros / Patinadores', desc: 'Entregas a domicilio', icono: '🛵' },
]

export default function PersonasRoles() {
  const [searchParams] = useSearchParams()
  const subdomain = searchParams.get('subdomain') || localStorage.getItem('subdomain_actual') || 'virtualclass512'
  const [personas, setPersonas] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`data_${subdomain}_personas`)) || []
    } catch { return [] }
  })
  const [nueva, setNueva] = useState({ nombre: '', email: '', rol: 'vendedor' })

  useEffect(() => {
    localStorage.setItem(`data_${subdomain}_personas`, JSON.stringify(personas))
  }, [personas, subdomain])

  const agregar = (e) => {
    e.preventDefault()
    if (!nueva.nombre) return
    setPersonas([...personas, { ...nueva, id: Date.now() }])
    setNueva({ nombre: '', email: '', rol: 'vendedor' })
  }

  const eliminar = (id) => {
    setPersonas(personas.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Personas y Roles</h2>
        <p className="text-sm text-gray-500">Usuarios con acceso a {subdomain}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES_FIJOS.map((rol) => (
          <div key={rol.nombre} className="card text-center">
            <p className="text-3xl mb-2">{rol.icono}</p>
            <h4 className="font-semibold text-gray-900 text-sm">{rol.nombre}</h4>
            <p className="text-xs text-gray-500 mt-1">{rol.desc}</p>
            <span className="badge bg-blue-100 text-blue-700 mt-2">FIJO</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">+ Añadir Persona</h3>
        <form onSubmit={agregar} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <input className="input" placeholder="Nombre" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} required />
          <input className="input" placeholder="Email" value={nueva.email} onChange={(e) => setNueva({ ...nueva, email: e.target.value })} />
          <select className="input" value={nueva.rol} onChange={(e) => setNueva({ ...nueva, rol: e.target.value })}>
            <option value="admin">Administrador</option>
            <option value="vendedor">Vendedor</option>
            <option value="bodega">Bodega</option>
          </select>
          <button className="btn-primary">Añadir</button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="th">Nombre</th>
              <th className="th">Email</th>
              <th className="th">Rol</th>
              <th className="th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr key={p.id} className="border-b border-gray-50">
                <td className="td font-medium">{p.nombre}</td>
                <td className="td">{p.email || '—'}</td>
                <td className="td">
                  <span className={`badge ${p.rol === 'admin' ? 'bg-purple-100 text-purple-700' : p.rol === 'vendedor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.rol}
                  </span>
                </td>
                <td className="td">
                  <button onClick={() => eliminar(p.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {personas.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No hay personas registradas</p>
        )}
      </div>
    </div>
  )
}
