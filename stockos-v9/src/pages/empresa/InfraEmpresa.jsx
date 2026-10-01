import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'

const MODULOS = [
  { key: 'personas_roles', label: 'Personas y Roles', icon: '👥' },
  { key: 'escaner_abc', label: 'Escáner A/B/C', icon: '📊' },
  { key: 'catalogo_publico', label: 'Catálogo Público', icon: '🌐' },
  { key: 'campanas_ia', label: 'Campañas IA + BOT', icon: '🤖' },
  { key: 'disparo_link', label: 'Disparo + Link', icon: '🚀' },
  { key: 'despachos_crm', label: 'Despachos + CRM + Pagos', icon: '📦' },
  { key: 'bodega_stock', label: 'Bodega Stock + Pistola', icon: '🔫' },
]

export default function InfraEmpresa() {
  const [searchParams] = useSearchParams()
  const subdomain = searchParams.get('subdomain') || localStorage.getItem('subdomain_actual') || 'virtualclass512'

  const [mods, setMods] = useState(() => {
    try {
      const s = localStorage.getItem(`modulos_${subdomain}`)
      return s ? JSON.parse(s) : {
        personas_roles: true, escaner_abc: true, catalogo_publico: true,
        campanas_ia: true, disparo_link: true, despachos_crm: true, bodega_stock: true,
      }
    } catch {
      return {
        personas_roles: true, escaner_abc: true, catalogo_publico: true,
        campanas_ia: true, disparo_link: true, despachos_crm: true, bodega_stock: true,
      }
    }
  })

  const toggle = (k) => {
    const n = { ...mods, [k]: !mods[k] }
    setMods(n)
    localStorage.setItem(`modulos_${subdomain}`, JSON.stringify(n))
  }

  return (
    <div className="p-6 pb-24">
      <h1 className="text-2xl font-bold">Definición Infra - {subdomain}</h1>
      <p className="text-gray-500 mb-6">Activa módulos (guardado local, sin error 406)</p>

      <details open className="border rounded p-4 mb-4 bg-white">
        <summary className="font-bold">0. Infra Base</summary>
        <p className="mt-2 text-sm">Siempre activo</p>
      </details>

      <details open className="border rounded p-4 mb-4 bg-white">
        <summary className="font-bold">1. Módulos Principales</summary>
        <div className="mt-3 space-y-2">
          {MODULOS.map((mod) => (
            <label key={mod.key} className="flex gap-3 items-center p-2 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={mods[mod.key]}
                onChange={() => toggle(mod.key)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <span>{mod.icon}</span>
              <span className="text-sm">{mod.label}</span>
              <span className={`ml-auto text-xs font-medium ${mods[mod.key] ? 'text-emerald-600' : 'text-gray-400'}`}>
                {mods[mod.key] ? 'ON' : 'OFF'}
              </span>
            </label>
          ))}
        </div>
      </details>

      <button
        onClick={() => {
          localStorage.setItem(`modulos_${subdomain}`, JSON.stringify(mods))
          alert('Guardado en ' + subdomain)
        }}
        className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700"
      >
        Guardar Cambios
      </button>
    </div>
  )
}
