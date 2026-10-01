import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Header from '../components/Header.jsx'
import TabDefinicion from '../components/tabs/TabDefinicion.jsx'
import TabPersonas from '../components/tabs/TabPersonas.jsx'
import TabEscaner from '../components/tabs/TabEscaner.jsx'
import TabCatalogo from '../components/tabs/TabCatalogo.jsx'
import TabCampanas from '../components/tabs/TabCampanas.jsx'
import TabDisparo from '../components/tabs/TabDisparo.jsx'
import TabDespachos from '../components/tabs/TabDespachos.jsx'
import TabBodega from '../components/tabs/TabBodega.jsx'
import { useEmpresas } from '../hooks/useEmpresas.js'

const TABS = [
  { id: 0, label: 'Configuración Empresa', icon: '🏗️' },
  { id: 1, label: 'Personas y Roles', icon: '👥' },
  { id: 2, label: 'Bodegas y Centros', icon: '🏭' },
  { id: 3, label: 'Bodega Stock + Pistola', icon: '📡' },
  { id: 4, label: 'CATALOGO PUBLICO', icon: '📦' },
  { id: 5, label: 'Campañas IA + BOT CAZA', icon: '🤖' },
  { id: 6, label: 'Disparo + Link', icon: '🔗' },
  { id: 7, label: 'Despachos + CRM + Pagos', icon: '🚚' },
]

export default function EmpresaPanel({ user, onLogout }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getEmpresa } = useEmpresas()
  const [activeTab, setActiveTab] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const empresa = getEmpresa(id)

  if (!empresa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Empresa no encontrada</h2>
          <p className="text-gray-500 mb-4">La empresa que buscas no existe o fue eliminada.</p>
          <button onClick={() => navigate('/superadmin')} className="btn-primary">
            Volver al Super Admin
          </button>
        </div>
      </div>
    )
  }

  const renderTab = () => {
    switch (activeTab) {
      case 0: return <TabDefinicion empresa={empresa} />
      case 1: return <TabPersonas empresa={empresa} />
      case 2: return <TabBodega empresa={empresa} />
      case 3: return <TabEscaner empresa={empresa} />
      case 4: return <TabCatalogo empresa={empresa} />
      case 5: return <TabCampanas empresa={empresa} />
      case 6: return <TabDisparo empresa={empresa} />
      case 7: return <TabDespachos empresa={empresa} />
      default: return <TabDefinicion empresa={empresa} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={user}
          onLogout={onLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          empresa={empresa}
        />

        <main className="flex-1 p-6 overflow-auto">
          {renderTab()}
        </main>
      </div>
    </div>
  )
}