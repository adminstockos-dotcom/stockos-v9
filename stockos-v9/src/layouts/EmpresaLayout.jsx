import { Outlet, useLocation } from 'react-router-dom'
import SidebarEmpresa from '../components/SidebarEmpresa'
import LogoStockOS from '../components/LogoStockOS'

export default function EmpresaLayout() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const subdomain = params.get('subdomain') || localStorage.getItem('subdomain_actual') || 'virtualclass512'
  const tab = params.get('tab') || '0'

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <LogoStockOS size="text-lg" />
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{subdomain}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { localStorage.removeItem('isSuperAdmin'); window.location.href = '/superadmin' }}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            SuperAdmin
          </button>
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
            S
          </div>
        </div>
      </header>
      <div className="flex">
        <SidebarEmpresa />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet context={{ subdomain, tab }} />
        </main>
      </div>
    </div>
  )
}
