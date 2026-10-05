import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

const DEMO = [
  { id: 'SKU-001', nombre: 'Producto Premium A', categoria: 'Electrónica', precio: 25000, stock: 10 },
  { id: 'SKU-002', nombre: 'Producto Medio B', categoria: 'Accesorios', precio: 12000, stock: 5 },
  { id: 'SKU-003', nombre: 'Producto Base C', categoria: 'Insumos', precio: 3000, stock: 15 },
]

export default function TabCatalogo({ empresa }) {
  const empresaId = String(empresa?.id || window.location.pathname.split('/')[2] || '9')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('Todas')
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [demo, setDemo] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      try {
        // 1. LEER DE LA PAGINA POR EMPRESA (tu fuente principal)
        const refsRaw = localStorage.getItem(`stockos_refs_${empresaId}`)
        const invRaw = localStorage.getItem(`stockos_inventario_${empresaId}`)
        const refs = refsRaw? JSON.parse(refsRaw) : []

        if (refs.length === 0) { setDemo(true); return }

        const catsPagina = [...new Set(refs.map(r=>r.tipo).filter(Boolean))]
        setCategorias(catsPagina)

        // 2. CREAR EN SUPABASE SI NO EXISTEN (por empresa)
        for (const cat of catsPagina) {
          await supabase.from('categorias_stockos').upsert(
            { empresa_id: empresaId, nombre: cat, tipo_medida: cat },
            { onConflict: 'empresa_id,nombre' }
          )
        }

        // 3. PRODUCTOS DESDE PAGINA
        const inv = invRaw? JSON.parse(invRaw) : {}
        const stockPorRef = {}
        refs.forEach(r=> stockPorRef[r.id]=0)
        Object.entries(inv).forEach(([k,v])=>{
          const refId = k.split('|')[1]
          if(stockPorRef[refId]!==undefined) stockPorRef[refId]+= v.stock||0
        })

        const reales = refs.map(r=>({
          id: r.id, nombre: r.id, categoria: r.tipo, precio: 25000,
          stock: stockPorRef[r.id]||0, tallas: r.especificaciones||[]
        }))

        setProductos(reales); setDemo(false)

        // 4. ADEMAS JALAR CATEGORIAS REALES DE SUPABASE POR EMPRESA PARA DROPDOWN
        const { data: catsDB } = await supabase.from('categorias_stockos').select('nombre').eq('empresa_id', empresaId)
        if (catsDB && catsDB.length>0) {
          setCategorias(catsDB.map(c=>c.nombre))
        }

      } catch { setDemo(true) }
    }
    cargar()
  }, [empresaId])

  const lista = demo? DEMO : productos
  const catsDrop = demo? ['Todas',...new Set(lista.map(p=>p.categoria))] : ['Todas',...categorias]
  const filtrados = lista.filter(p=> p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && (filtro==='Todas' || p.categoria===filtro))

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><div><h2 className="text-xl font-black">CATALOGO PUBLICO</h2><p className="text-sm text-gray-500">{empresa?.nombre} - {filtrados.length} productos</p></div><span className={`px-3 py-1 rounded-full text-xs font-bold ${demo?'bg-gray-200':'bg-green-600 text-white'}`}>{demo?'MODO DEMO':'POR EMPRESA'}</span></div>
      <div className="flex gap-3"><input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar..." className="border p-2.5 rounded-lg flex-1 text-sm"/><select value={filtro} onChange={e=>setFiltro(e.target.value)} className="border p-2.5 rounded-lg text-sm font-bold bg-white min-w-">{catsDrop.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{filtrados.map(p=><div key={p.id} className="bg-white border rounded-lg p-4"><div className="text-xs font-mono text-gray-500">{p.id}</div><div className="font-black text-sm uppercase">{p.nombre}</div><div className="text-xs text-gray-500">{p.categoria} {p.tallas?.length?`- ${p.tallas.join(', ')}`:''}</div><div className="mt-3 flex justify-between"><div className="font-black">${p.precio.toLocaleString()}</div><div className={`px-2 py-1 rounded-full text-xs font-black ${p.stock>0?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{p.stock>0?`Stock: ${p.stock}`:'Sin stock'}</div></div></div>)}</div>
    </div>
  )
}
