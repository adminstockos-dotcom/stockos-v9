export default function Sidebar({ tabs, activeTab, onTabChange, isOpen, onToggle }) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-navy-900 text-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {/* Logo quitado */}
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden text-white/60 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }
              `}
              title={!isOpen ? tab.label : undefined}
            >
              <span className="text-lg flex-shrink-0">{tab.icon}</span>
              {isOpen && <span className="truncate">{tab.label}</span>}
            </button>
          ))}
        </nav>

        {isOpen && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold">
                SA
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">Super Admin</p>
                <p className="text-xs text-blue-300 truncate">adminstockos@gmail.com</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}