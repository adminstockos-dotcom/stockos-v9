import { useNavigate } from 'react-router-dom'
import LogoStockOS from './LogoStockOS'

export default function Header() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('isSuperAdmin')
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <LogoStockOS size="text-lg" />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Salir
        </button>
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
          S
        </div>
      </div>
    </header>
  )
}
