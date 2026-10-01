import { useState } from 'react'

const PRODUCTOS = [
  { id: 1, sku: 'SKU-78432', nombre: 'Taladro Inalambrico 18V', categoria: 'Herramientas Electricas', precio: 89990, stock: 45, estado: 'Activo' },
  { id: 2, sku: 'SKU-55210', nombre: 'Juego de Brocas 100pz', categoria: 'Accesorios', precio: 24990, stock: 120, estado: 'Activo' },
  { id: 3, sku: 'SKU-99120', nombre: 'Sierra Circular 7-1/4"', categoria: 'Herramientas Electricas', precio: 129990, stock: 18, estado: 'Activo' },
  { id: 4, sku: 'SKU-33456', nombre: 'Caja de Herramientas 22"', categoria: 'Almacenamiento', precio: 34990, stock: 67, estado: 'Activo' },
  { id: 5, sku: 'SKU-11234', nombre: 'Nivel Laser Cruzado', categoria: 'Medicion', precio: 45990, stock: 33, estado: 'Activo' },
  { id: 6, sku: 'SKU-66789', nombre: 'Compresor de Aire 50L', categoria: 'Herramientas Electricas', precio: 199990, stock: 8, estado: 'Activo' },
  { id: 7, sku: 'SKU-44567', nombre: 'Soldadora Inverter 200A', categoria: 'Soldadura', precio: 159990, stock: 12, estado: 'Activo' },
  { id: 8, sku: 'SKU-88901', nombre: 'Rotomartillo SDS Plus', categoria: 'Herramientas Electricas', precio: 119990, stock: 22, estado: 'Activo' },
  { id: 9, sku: 'SKU-22345', nombre: 'Juego de Llaves 120pz', categoria: 'Herramientas Manuales', precio: 59990, stock: 54, estado: 'Activo' },
  { id: 10, sku: 'SKU-77890', nombre: 'Pistola de Calor 2000W', categoria: 'Herramientas Electricas', precio: 39990, stock: 0, estado: 'Agotado' },
]

const CATEGORIAS = ['Todas', 'Herramientas Electricas', 'Herramientas Manuales', 'Accesorios', 'Medicion', 'Soldadura', 'Almacenamiento']

export default function TabCatalogo({ empresa }) {
  const [categoria, setCategoria] = useState('Todas')
  const [search, setSearch] = useState('')

  const filtered = PRODUCTOS.filter(p => {
    const matchCat = categoria === 'Todas' || p.categoria === categoria
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CATALOGO PUBLICO</h2>
          <p className="text-sm text-gray-500 mt-1">
            {empresa ? `Catálogo de ${empresa.nombre}` : 'Catálogo de productos visible al público'}
          </p>
        </div>
        <button className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Producto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="card !p-4 hover:shadow-md transition">
            <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
            <h3 className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2">{p.nombre}</h3>
            <p className="text-xs text-gray-500 mt-1">{p.categoria}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-lg font-bold text-gray-900">${p.precio.toLocaleString('es-CL')}</span>
              <span className={p.stock > 0 ? 'badge-green' : 'badge-red'}>
                {p.stock > 0 ? `${p.stock} uds` : 'Agotado'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
