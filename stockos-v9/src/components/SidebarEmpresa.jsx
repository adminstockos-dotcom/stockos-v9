import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

const links = [
  { n: 0, label: 'Infra', icon: '⚙️' },
  { n: 1, label: 'Personas', icon: '👥' },
  { n: 2, label: 'Escaner', icon: '📊' },
  { n: 3, label: 'Catalogo', icon: '🌐' },
  { n: 4, label: 'Campañas', icon: '🤖' },
  { n: 5, label: 'Disparo', icon: '🚀' },
  { n: 6, label: 'Despachos', icon: '📦' },
  { n: 7, label: 'Bodega', icon: '🔫' },
]

export default function SidebarEmpresa() {
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const subdomain = params.get('subdomain') || localStorage.getItem('subdomain_actual') || 'virtualclass512'
  const currentTab = parseInt(params.get('tab') || '0')

  const [mods, setMods] = useState(() => {
    const s = localStorage.getItem(`modulos_${subdomain}`)
    return s ? JSON.parse(s) : {
      personas_roles: true, escaner_abc: true, catalogo_publico: true,
      campanas_ia: true, disparo_link: true, despachos_crm: true, bodega_stock: true,
    }
  })

  useEffect(() => {
    const s = localStorage.getItem(`modulos_${subdomain}`)
    if (s) setMods(JSON.parse(s))
  }, [subdomain])

  const go = (n) => {
    navigate(`/dashboard?subdomain=${subdomain}&tab=${n}`)
  }

  return (
    <div className="w-64 bg-white border-r min-h-screen p-4">
      <div className="mb-6">
        <h2 className="font-bold">STOCKOS</h2>
        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{subdomain}</span>
      </div>

      <nav className="space-y-1">
        {links.map((l) => {
          const isActive = currentTab === l.n
          const isDisabled = l.n > 0 && !mods[Object.keys(mods)[l.n - 1]]
          return (
            <button
              key={l.n}
              onClick={() => go(l.n)}
              className={`w-full text-left p-2 rounded flex gap-2 ${
                isActive ? 'bg-gray-100 font-bold' : isDisabled ? 'opacity-40' : ''
              }`}
            >
              <span>{l.icon}</span>
              <span className="flex-1">{l.label}</span>
              <span className="ml-auto text-xs">{l.n}</span>
            </button>
          )
        })}
      </nav>

      <button onClick={() => navigate('/superadmin')} className="mt-8 text-sm text-gray-500 underline">
        ← Volver a SuperAdmin
      </button>
    </div>
  )
}
