import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCatalogo({ empresa }) {
  const [categoria, setCategoria] = useState('Todas')
  const [search, setSearch] = useState('')
  const [productos, setProductos] = useState([])

  useEffect(() => {
    if (!empresa?.id) return
    supabase.from('productos').select('*').eq('empresa_id', empresa.id).then(({data}) => {
      if (data) setProductos(data)
    })
  }, [empresa])

  const categorias = useMemo(() => {
    const cats = [...new Set(productos.map(p => p.categoria).filter(Boolean))]
    return ['Todas',...cats]
  }, [productos])

  const filtered = productos.filter(p => {
    const mCat = categoria === 'Todas' || p.categoria === categoria
    const mSearch = (p.nombre||'').toLowerCase().includes(search.toLowerCase())
    return mCat && mSearch
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">CATALOGO PUBLICO</h2>
        <p className="text-sm text-gray-500">{empresa?.nombre} - {productos.length} productos</p>
      </div>
      <div className="flex gap-4">
        <input className="input flex-1" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="input w-48" value={categoria} onChange={e=>setCategoria(e.target.value)}>
          {categorias.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      {filtered.length===0? (
        <div className="card text-center py-12 text-gray-500">Esta empresa aun no tiene productos. Crea productos en Bodega Stock + Pistola.</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {filtered.map(p=>(
            <div key={p.id} className="card p-4">
              <p className="text-xs">{p.sku}</p>
              <h3 className="font-bold text-sm">{p.nombre}</h3>
              <p className="text-xs text-gray-500">{p.categoria}</p>
              <p className="mt-2 font-bold">${p.precio}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
