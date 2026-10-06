import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function CatalogoPublico(){
  const empresaId = window.location.pathname.split('/')[2]
  const [items, setItems] = useState([])
  useEffect(()=>{ (async()=>{
    const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaId).order('referencia')
    if(data) setItems(data)
  })() },[empresaId])
  return(
    <div className="min-h-screen bg-white p-4">
      <h1 className="text-2xl font-black mb-2">CATÁLOGO - {items.length} REFERENCIAS</h1>
      <p className="text-sm text-gray-500 mb-4">Actualizado en vivo desde proveedores</p>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((it,i)=>(<div key={i} className="border rounded p-2"><div className="bg-gray-100 h-24 rounded mb-2 flex items-center justify-center text-xs">FOTO</div><div className="font-black text-xs">{it.referencia}</div><div className="text-xs">{it.proveedor_nombre} T:{it.talla}</div><div className="font-bold text-sm">${Number(it.precio||0).toLocaleString()}</div><div className="text- text-green-600">Stock: {it.stock_proveedor}</div></div>))}
      </div>
    </div>
  )
}
