import { useState, useEffect } from 'react'

export default function Header({ user, onLogout, onToggleSidebar, empresa }) {
  const [logoEmpresa, setLogoEmpresa] = useState(
    localStorage.getItem(`empresa_${empresa?.id || 9}_logo`) || empresa?.logo || null
  )

  useEffect(()=>{
    setLogoEmpresa(localStorage.getItem(`empresa_${empresa?.id || 9}_logo`) || empresa?.logo || null)
  },[empresa])

  useEffect(()=>{
    const handler = (e) => setLogoEmpresa(e.detail.logo)
    window.addEventListener('logo-updated', handler)
    return () => window.removeEventListener('logo-updated', handler)
  },[])

  const inicial = empresa?.inicial || empresa?.nombre?.charAt(0) || 'E'
  const color = empresa?.color || 'bg-orange-500'

  return (
    <header className="h-[64px] bg-navy-900 text-white flex items-center justify-between px-4 shadow-lg">
      <div className="flex items-center gap-3">
        <img src="/assets/logo-stockos-oficial.png" alt="STOCKOS" className="h-12 md:h-14 w-auto brightness-0 invert ml-0" />
        {onToggleSidebar && (
          <button onClick={onToggleSidebar} className="ml-3 text-white/70 hover:text-white p-2 border border-white/20 rounded">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}
      </div>

      {empresa && (
        <div className="hidden md:flex items-center gap-4">
          {logoEmpresa? (
            <img src={logoEmpresa} className="w-12 h-12 rounded-full object-cover border-2 border-white/20 bg-white" />
          ) : (
            <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white font-bold text-xl`}>{inicial}</div>
          )}
          <div>
            <p className="text-base font-medium leading-tight">{empresa.nombre}</p>
            <p className="text-sm text-white/50 leading-tight">Panel de empresa</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-sm text-white/70"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />Sistema Activo</div>
        <div className="h-8 w-px bg-white/20" />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">SA</div>
          <div className="hidden sm:block"><p className="text-sm font-medium leading-tight">Super Admin</p><p className="text-xs text-white/50 leading-tight">{user?.email}</p></div>
        </div>
        <button onClick={onLogout} className="ml-2 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
      </div>
    </header>
  )
}