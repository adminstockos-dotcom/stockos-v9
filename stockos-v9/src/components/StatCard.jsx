export default function StatCard({ titulo, valor, subtitulo, icono, color = 'brand' }) {
  const colores = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="card flex items-start gap-4">
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center text-xl ${colores[color]}`}>
        {icono}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className="text-2xl font-bold text-gray-900 truncate">{valor}</p>
        {subtitulo && <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>}
      </div>
    </div>
  )
}
