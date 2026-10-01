export default function LogoStockos({ size = 'md' }) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', slogan: 'text-[8px]', dot: 'w-2 h-2' },
    md: { icon: 'w-10 h-10', text: 'text-xl', slogan: 'text-[10px]', dot: 'w-2.5 h-2.5' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', slogan: 'text-xs', dot: 'w-3 h-3' },
    xl: { icon: 'w-16 h-16', text: 'text-3xl', slogan: 'text-sm', dot: 'w-4 h-4' },
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2">
      {/* SVG Logo - S con flechas + punto verde */}
      <div className={`${s.icon} relative`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* S circular con huecos - dos arcos circulares */}
          <path
            d="M 70 25 A 28 28 0 0 1 70 75"
            fill="none"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 30 25 A 28 28 0 0 1 30 75"
            fill="none"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Punto verde en O - arriba derecha */}
          <circle cx="78" cy="18" r="6" fill="#22c55e" />
        </svg>
      </div>
      {/* Texto STOCKOS + slogan */}
      <div className="flex flex-col">
        <span className={`${s.text} font-bold tracking-tight text-white leading-none`}>
          STOCKOS
        </span>
        <span className={`${s.slogan} text-white/60 font-medium leading-none`}>
          Stock Operating System
        </span>
      </div>
    </div>
  )
}
