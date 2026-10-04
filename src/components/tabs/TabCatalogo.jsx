import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

// Datos de ejemplo SOLO si no hay nada en BD - cada uno con empresa_id
const PRODUCTOS_MOCK = [
  // Estos son de ejemplo, si tu empresa es Máxima no le aparecerán porque no es su ID
  { id: 1, empresa_id: 'otra-empresa-demo', sku: 'SKU-78432', nombre: 'Taladro Inalambrico 18V', categoria: 'Herramientas Electricas', precio: 89990, stock: 45, estado: 'Activo' },
  { id: 2, empresa_id: 'otra-empresa-demo', sku: 'SKU-55210', nombre: 'Juego de Brocas 100pz', categoria: 'Accesorios', precio: 24990, stock: 120, estado: 'Activo' },
]

export default function TabCatalogo({ empresa }) {
  const [categoria, setCategoria] = useState('Todas')
  const [search, setSearch] = useState('')
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!empresa?.id) return
    const cargar = async () => {
      setLoading(true)
      try {
        // Intenta traer productos reales de la empresa
        const { data } = await supabase
          .from('productos')
          .select('*')
          .eq('empresa_id', empresa.id)

        if (data && data.length > 0) {
          setProductos(data)
        } else {
          // Si no hay nada en BD, filtra los mock por empresa.id (quedará vacío para Máxima, que es lo correcto)
          setProductos(PRODUCTOS_MOCK.filter(p => String(p.empresa_id) === String(empresa.id)))
        }
      } catch {
        // Fallback localStorage del escaner si existe
        try {
          const local = JSON.parse(localStorage.getItem(`productos_${empresa.id}`) || '[]')
          setProductos(local)
        } catch {
          setProductos([])
        }
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [empresa?.id])

  const categorias = useMemo(() => {
    const cats = [...new Set(productos.map(p => p.categoria).filter(Boolean))]
    return ['Todas', ...cats]
  }, [productos])

  const filtered = productos.filter(p => {
    const matchCat = categoria === 'Todas' || p.categoria === categoria
    const matchSearch = p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (loading) {
    return <div className="p-6 text-gray-500">Cargando catálogo de {empresa?.nombre}...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CATALOGO PUBLICO</h2>
          <p className="text-sm text-gray-500 mt-1">
            {empresa ? `Catálogo de ${empresa.nombre} - ${productos.length} productos` : 'Catálogo de productos visible al público'}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2"[STRIPPED 27 bytes]"w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Producto
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1"[STRIPPED 27 bytes]"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input !pl-10"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input !w-auto" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">Esta empresa aún no tiene productos en el catálogo público.</p>
          <p className="text-xs text-gray-400 mt-2">Crea productos en Bodega Stock + Pistola y aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="card !p-4 hover:shadow-md transition">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center"[STRIPPED 33 bytes]"w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
              <h3 className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2">{p.nombre}</h3>
              <p className="text-xs text-gray-500 mt-1">{p.categoria}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-lg font-bold text-gray-900">${Number(p.precio).toLocaleString('es-CL')}</span>
                <span className={p.stock > 0 ? 'badge-green' : 'badge-red'}>
                  {p.stock > 0 ? `${p.stock} uds` : 'Agotado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
