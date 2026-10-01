import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LogoStockOS from '../components/LogoStockOS'

export default function SuperAdmin() {
  const navigate = useNavigate()
  const [empresas, setEmpresas] = useState([])
  const [nueva, setNueva] = useState({
    nombreEmpresa: '',
    nombreContacto: '',
    whatsappContacto: '',
    email: '',
    subdomain: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (localStorage.getItem('isSuperAdmin') !== 'true') {
      navigate('/login')
      return
    }
    const saved = localStorage.getItem('stockos_empresas')
    if (saved) {
      setEmpresas(JSON.parse(saved))
    } else {
      const init = [{
        id: 1,
        nombreEmpresa: 'Virtualclass512',
        nombreContacto: 'Ivn cadena',
        whatsappContacto: '+57 301 791 9560',
        email: 'virtualclass512@gmail.com',
        subdomain: 'vc512',
        estado: 'aprobado',
        fechaCreacion: new Date().toISOString(),
      }]
      setEmpresas(init)
      localStorage.setItem('stockos_empresas', JSON.stringify(init))
    }
  }, [])

  const validar = () => {
    const errs = {}
    if (!nueva.nombreEmpresa.trim()) errs.nombreEmpresa = 'Requerido'
    if (!nueva.nombreContacto.trim()) errs.nombreContacto = 'Requerido'
    if (!/^\+?[0-9\s-]+$/.test(nueva.whatsappContacto)) errs.whatsappContacto = 'Solo números'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nueva.email)) errs.email = 'Email inválido'
    if (!/^[a-z0-9-]+$/.test(nueva.subdomain.toLowerCase().trim())) errs.subdomain = 'Lowercase sin espacios'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const crear = (e) => {
    e.preventDefault()
    if (!validar()) return
    const empresa = {
      id: Date.now(),
      nombreEmpresa: nueva.nombreEmpresa.trim(),
      nombreContacto: nueva.nombreContacto.trim(),
      whatsappContacto: nueva.whatsappContacto.trim(),
      email: nueva.email.trim(),
      subdomain: nueva.subdomain.toLowerCase().trim(),
      estado: 'en_espera',
      fechaCreacion: new Date().toISOString(),
    }
    const updated = [...empresas, empresa]
    setEmpresas(updated)
    localStorage.setItem('stockos_empresas', JSON.stringify(updated))
    setNueva({ nombreEmpresa: '', nombreContacto: '', whatsappContacto: '', email: '', subdomain: '' })
    setErrors({})
  }

  const eliminar = (sub) => {
    if (!confirm(`¿Eliminar empresa ${sub}?`)) return
    const updated = empresas.filter((e) => e.subdomain !== sub)
    setEmpresas(updated)
    localStorage.setItem('stockos_empresas', JSON.stringify(updated))
  }

  const cambiarEstado = (id, estado) => {
    const updated = empresas.map((e) => e.id === id ? { ...e, estado } : e)
    setEmpresas(updated)
    localStorage.setItem('stockos_empresas', JSON.stringify(updated))
  }

  const badgeEstado = (estado) => {
    const colores = {
      aprobado: 'bg-emerald-100 text-emerald-700',
      pausado: 'bg-amber-100 text-amber-700',
      en_espera: 'bg-gray-100 text-gray-600',
    }
    return colores[estado] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <LogoStockOS height={72} />
        <button
          onClick={() => { localStorage.clear(); navigate('/login') }}
          className="border px-3 py-1 rounded text-sm"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="bg-white border rounded p-6 mb-8">
        <h2 className="font-bold mb-4">+ Crear Nueva Empresa</h2>
        <form onSubmit={crear}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <input
                className="border p-2 rounded w-full"
                placeholder="Nombre de Empresa*"
                value={nueva.nombreEmpresa}
                onChange={(e) => setNueva({ ...nueva, nombreEmpresa: e.target.value })}
              />
              {errors.nombreEmpresa && <p className="text-red-500 text-xs mt-1">{errors.nombreEmpresa}</p>}
            </div>
            <div>
              <input
                className="border p-2 rounded w-full"
                placeholder="Nombre Contacto*"
                value={nueva.nombreContacto}
                onChange={(e) => setNueva({ ...nueva, nombreContacto: e.target.value })}
              />
              {errors.nombreContacto && <p className="text-red-500 text-xs mt-1">{errors.nombreContacto}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <input
                className="border p-2 rounded w-full"
                placeholder="WhatsApp Contacto* +57"
                value={nueva.whatsappContacto}
                onChange={(e) => setNueva({ ...nueva, whatsappContacto: e.target.value })}
              />
              {errors.whatsappContacto && <p className="text-red-500 text-xs mt-1">{errors.whatsappContacto}</p>}
            </div>
            <div>
              <input
                className="border p-2 rounded w-full"
                placeholder="Email*"
                value={nueva.email}
                onChange={(e) => setNueva({ ...nueva, email: e.target.value })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <input
                className="border p-2 rounded w-full"
                placeholder="subdomain* ej: maxima"
                value={nueva.subdomain}
                onChange={(e) => setNueva({ ...nueva, subdomain: e.target.value.toLowerCase().replace(/\s/g, '') })}
              />
              {errors.subdomain && <p className="text-red-500 text-xs mt-1">{errors.subdomain}</p>}
            </div>
          </div>
          <button className="bg-blue-600 text-white p-2 rounded w-full">
            Crear Empresa
          </button>
        </form>
      </div>

      <h2 className="font-bold mb-4">Empresas ({empresas.length})</h2>
      <div className="grid gap-4">
        {empresas.map((emp) => (
          <div key={emp.id} className="border p-4 rounded bg-white flex justify-between items-center">
            <div>
              <h3 className="font-bold">{emp.nombreEmpresa}</h3>
              <p className="text-xs text-gray-500">{emp.subdomain}</p>
              <p className="text-sm text-gray-600 mt-1">
                {emp.nombreContacto} - {emp.whatsappContacto} - {emp.email}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={emp.estado}
                onChange={(e) => cambiarEstado(emp.id, e.target.value)}
                className={`text-xs font-medium rounded px-2 py-1 border-0 ${badgeEstado(emp.estado)}`}
              >
                <option value="aprobado">Aprobado</option>
                <option value="pausado">Pausado</option>
                <option value="en_espera">En espera</option>
              </select>
              <button
                onClick={() => navigate(`/empresa/${emp.subdomain}`)}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm"
              >
                Entrar
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(`http://localhost:5173/empresa/${emp.subdomain}`)}
                className="bg-gray-200 px-3 py-2 rounded text-sm"
              >
                Copiar
              </button>
              <button
                onClick={() => eliminar(emp.subdomain)}
                className="bg-red-100 text-red-600 px-3 py-2 rounded text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
