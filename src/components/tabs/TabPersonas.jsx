import { useState, useEffect } from 'react'

const ROLES_BASE = [
  'Admin',
  'Gerente General',
  'Supervisor',
  'Solo Lectura',
]

export default function TabPersonas({ empresa }) {
  const empresaId = empresa?.id || 0
  const storageKeyUsuarios = `empresa_${empresaId}_usuarios_v4`
  const storageKeyRoles = `empresa_${empresaId}_roles_v4`

  const [usuarios, setUsuarios] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKeyUsuarios)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [roles, setRoles] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKeyRoles)
      return stored ? JSON.parse(stored) : [...ROLES_BASE]
    } catch {
      return [...ROLES_BASE]
    }
  })

  const [showModalUsuario, setShowModalUsuario] = useState(false)
  const [showModalRol, setShowModalRol] = useState(false)
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', whatsapp: '', rol: 'Admin', estado: 'Activo' })
  const [nuevoRol, setNuevoRol] = useState({ nombre: '', descripcion: '' })

  useEffect(() => {
    localStorage.setItem(storageKeyUsuarios, JSON.stringify(usuarios))
  }, [usuarios, storageKeyUsuarios])

  useEffect(() => {
    localStorage.setItem(storageKeyRoles, JSON.stringify(roles))
  }, [roles, storageKeyRoles])

  const agregarUsuario = () => {
    if (!nuevoUsuario.nombre || !nuevoUsuario.whatsapp) return
    const waLimpio = nuevoUsuario.whatsapp.replace(/\D/g, '')
    const nuevo = {
      id: Date.now(),
      nombre: nuevoUsuario.nombre,
      whatsapp: waLimpio,
      rol: nuevoUsuario.rol,
      estado: nuevoUsuario.estado,
      empresaId,
    }
    setUsuarios(prev => [...prev, nuevo])
    setNuevoUsuario({ nombre: '', whatsapp: '', rol: 'Admin', estado: 'Activo' })
    setShowModalUsuario(false)
  }

  const agregarRol = () => {
    if (!nuevoRol.nombre) return
    if (!roles.includes(nuevoRol.nombre)) {
      setRoles(prev => [...prev, nuevoRol.nombre])
    }
    setNuevoRol({ nombre: '', descripcion: '' })
    setShowModalRol(false)
  }

  const cambiarEstado = (id, nuevoEstado) => {
    if (nuevoEstado === 'Eliminar') {
      setUsuarios(prev => prev.filter(u => u.id !== id))
    } else {
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, estado: nuevoEstado } : u))
    }
  }

  const enviarWhatsApp = (usuario) => {
    const texto = `Hola ${usuario.nombre}, te enviamos tu link de acceso al panel de ${empresa?.nombre || 'la empresa'}.`
    const url = `https://wa.me/${usuario.whatsapp}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Personas y Roles</h2>
          <p className="text-sm text-gray-500">Gestión de usuarios y roles de {empresa?.nombre || 'la empresa'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModalRol(true)} className="btn-secondary">+ Nuevo Rol</button>
          <button onClick={() => setShowModalUsuario(true)} className="btn-primary">+ Nuevo Usuario</button>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Usuario</th>
              <th className="th">Rol</th>
              <th className="th">WhatsApp</th>
              <th className="th">Estado</th>
              <th className="th text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={5} className="td text-center text-gray-400 py-8">
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="td font-medium">{u.nombre}</td>
                  <td className="td">
                    <span className="badge-blue">{u.rol}</span>
                  </td>
                  <td className="td">
                    <a
                      href={`https://wa.me/${u.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {u.whatsapp}
                    </a>
                  </td>
                  <td className="td">
                    <select
                      value={u.estado}
                      onChange={(e) => cambiarEstado(u.id, e.target.value)}
                      className={`text-xs font-medium rounded-lg px-2 py-1 border-0 cursor-pointer ${
                        u.estado === 'Activo' ? 'bg-green-100 text-green-800' :
                        u.estado === 'Pausado' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Pausado">Pausado</option>
                      <option value="Eliminar">Eliminar</option>
                    </select>
                  </td>
                  <td className="td text-center">
                    <div className="flex items-center justify-center gap-2">
                      <a
                        href={`https://wa.me/${u.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary !px-3 !py-1.5 text-xs"
                      >
                        Link
                      </a>
                      <button
                        onClick={() => setUsuarios(prev => prev.filter(user => user.id !== u.id))}
                        className="btn-danger !px-3 !py-1.5 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Usuario */}
      {showModalUsuario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold">Nuevo Usuario</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  className="input"
                  placeholder="Nombre completo"
                  value={nuevoUsuario.nombre}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="label">WhatsApp (solo números)</label>
                <input
                  className="input"
                  placeholder="3001234567"
                  value={nuevoUsuario.whatsapp}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, whatsapp: e.target.value.replace(/\D/g, '') })}
                />
              </div>
              <div>
                <label className="label">Rol</label>
                <select
                  className="input"
                  value={nuevoUsuario.rol}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                >
                  {roles.map((rol) => (
                    <option key={rol} value={rol}>{rol}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Estado</label>
                <select
                  className="input"
                  value={nuevoUsuario.estado}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, estado: e.target.value })}
                >
                  <option value="Activo">Activo</option>
                  <option value="Pausado">Pausado</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModalUsuario(false)} className="btn-secondary">Cancelar</button>
              <button onClick={agregarUsuario} className="btn-primary">Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Rol */}
      {showModalRol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold">Nuevo Rol</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nombre del Rol</label>
                <input
                  className="input"
                  placeholder="Ej: Jefe de Bodega"
                  value={nuevoRol.nombre}
                  onChange={(e) => setNuevoRol({ ...nuevoRol, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea
                  className="input"
                  placeholder="Descripción del rol"
                  rows={3}
                  value={nuevoRol.descripcion}
                  onChange={(e) => setNuevoRol({ ...nuevoRol, descripcion: e.target.value })}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModalRol(false)} className="btn-secondary">Cancelar</button>
              <button onClick={agregarRol} className="btn-primary">Agregar Rol</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
