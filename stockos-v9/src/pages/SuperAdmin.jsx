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
    <div className="w-full min-h-screen bg-gray-50 overflow-x-hidden box-border">
      {/* HEADER */}
      <div className="w-full bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto w-full p-3 flex flex-col sm:flex-row justify-between items-center gap-2">
          <img src="/logo.png" className="h-10 w-auto object-contain mx-auto sm:mx-0" alt="STOCKOS" />
          <button
            onClick={() => { localStorage.clear(); navigate('/login') }}
            className="w-full sm:w-auto text-sm border px-4 py-2 rounded-lg"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-3 md:p-6 space-y-4 box-border">
        {/* FORMULARIO */}
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border w-full box-border overflow-hidden">
          <h2 className="font-bold text-base md:text-lg mb-4">+ Crear Nueva Empresa</h2>
          <div className="grid grid-cols-1 gap-3 w-full">
            <input className="w-full box-border px-3 py-3 border rounded-lg text-sm" placeholder="Nombre de Empresa*" value={nueva.nombreEmpresa} onChange={(e) => setNueva({ ...nueva, nombreEmpresa: e.target.value })} />
            <input className="w-full box-border px-3 py-3 border rounded-lg text-sm" placeholder="Nombre Contacto*" value={nueva.nombreContacto} onChange={(e) => setNueva({ ...nueva, nombreContacto: e.target.value })} />
            <input className="w-full box-border px-3 py-3 border rounded-lg text-sm" placeholder="WhatsApp*" value={nueva.whatsappContacto} onChange={(e) => setNueva({ ...nueva, whatsappContacto: e.target.value })} />
            <input className="w-full box-border px-3 py-3 border rounded-lg text-sm" placeholder="Email*" value={nueva.email} onChange={(e) => setNueva({ ...nueva, email: e.target.value })} />
            <input className="w-full box-border px-3 py-3 border rounded-lg text-sm" placeholder="subdominio*" value={nueva.subdomain} onChange={(e) => setNueva({ ...nueva, subdomain: e.target.value.toLowerCase().replace(/\s/g, '') })} />
            <button onClick={crear} className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-bold mt-2">Crear Empresa</button>
          </div>
        </div>

        {/* LISTA EMPRESAS */}
        <div className="w-full space-y-3">
          <h3 className="font-bold">Empresas ({empresas.length})</h3>
          {empresas.map((emp) => (
            <div key={emp.id} className="bg-white rounded-xl p-4 border shadow-sm w-full box-border overflow-hidden">
              <div className="w-full flex flex-col gap-3">
                <div className="w-full min-w-0">
                  <p className="font-bold text-sm truncate">{emp.nombreEmpresa}</p>
                  <p className="text-xs text-gray-500">{emp.subdomain}</p>
                  <p className="text-xs mt-1 break-all leading-relaxed">{emp.nombreContacto} - {emp.whatsappContacto} - {emp.email}</p>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                  <select
                    value={emp.estado}
                    onChange={(e) => cambiarEstado(emp.id, e.target.value)}
                    className={`w-full px-2 py-2.5 rounded-lg text-xs font-bold border-0 ${badgeEstado(emp.estado)}`}
                  >
                    <option value="aprobado">Aprobado</option>
                    <option value="pausado">Pausado</option>
                    <option value="en_espera">En espera</option>
                  </select>
                  <button
                    onClick={() => navigate(`/empresa/${emp.subdomain}`)}
                    className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold text-sm"
                  >
                    Entrar
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
    </div>
  )
}
