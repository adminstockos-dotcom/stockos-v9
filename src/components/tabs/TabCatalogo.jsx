import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

const PRODUCTOS_MOCK = [
  { id: 1, empresa_id: 'otra-empresa-demo', sku: 'SKU-78432', nombre: 'Taladro Inalambrico 18V', categoria: 'Herramientas Electricas', precio: 89990, stock: 45 },
  { id: 2, empresa_id: 'otra-empresa-demo', sku: 'SKU-55210', nombre: 'Juego de Brocas 100pz', categoria: 'Accesorios', precio: 24990, stock: 120 },
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
        const { data } = await supabase.from('productos').select('*').eq('empresa_id', empresa.id)
        if (data && data.length > 0) {
          setProductos(data)
        } else {
          setProductos(PRODUCTOS_MOCK.filter(p => String(p.empresa_id) === String(empresa.id)))
        }
      } catch {
        setProductos([])
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [empresa?.id])

  const categorias = useMemo(() => {
    const cats = [...new Set(productos.map(p => p.categoria).filter(Boolean))]
    return ['Todas',...cats]
  }, [productos])

  const filtered = productos.filter(p => {
    const matchCat = categoria === 'Todas' || p.categoria === categoria
    const matchSearch = p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (loading) return <div className="p-6 text-gray-500">Cargando catalogo de {empresa?.nombre}...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CATALOGO PUBLICO</h2>
          <p className="text-sm text-gray-500 mt-1">{empresa? `Catalogo de ${empresa.nombre} - ${productos.length} productos` : 'Catalogo de productos'}</p>
        </div>
        <button className="btn-primary">Nuevo Producto</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <input className="input flex-1" placeholder="Buscar por nombre o SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input!w-auto" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0? (
        <div className="card text-center py-12">
          <p className="text-gray-500">Esta empresa aun no tiene productos en el catalogo publico.</p>
          <p className="text-xs text-gray-400 mt-2">Crea productos en Bodega Stock + Pistola y apareceran aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="card!p-4 hover:shadow-md transition">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
              <h3 className="font-semibold text-gray-900 text-sm mt-1">{p.nombre}</h3>
              <p className="text-xs text-gray-500 mt-1">{p.categoria}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-lg font-bold text
