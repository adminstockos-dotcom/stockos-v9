import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function CatalogoPublico(){
  const { slug } = useParams()
  const [empresa,setEmpresa]=useState(null)
  const [productos,setProductos]=useState([])
  const [filtro,setFiltro]=useState('')
  const [carrito,setCarrito]=useState([])
  const [loading,setLoading]=useState(true)
  const [showCarrito,setShowCarrito]=useState(false)

  useEffect(()=>{
    const load=async()=>{
      const s=(slug||'maxima').toLowerCase().trim()
      let {data:emp}=await supabase.from('empresas').select('*').ilike('slug',s).maybeSingle()
      if(!emp){ const {data}=await supabase.from('empresas').select('*').ilike('slug',`%${s}%`).limit(1).maybeSingle(); emp=data }
      if(emp){
        setEmpresa(emp)
        const {data:prods}=await supabase.from('productos').select('*').eq('empresa_id',emp.id).eq('activo',true).order('referencia')
        setProductos(prods||[])
      }
      setLoading(false)
    }
    load()
  },[slug])

  const add=(p)=>setCarrito(prev=>{
    const ex=prev.find(x=>x.id===p.id)
    return ex? prev.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x) : [...prev,{...p,qty:1}]
  })
  const menos=(id)=>setCarrito(prev=>prev.flatMap(x=>x.id===id? (x.qty>1? [{...x,qty:x.qty-1}]:[]) : [x]))
  const mas=(id)=>add(productos.find(p=>p.id===id)||carrito.find(c=>c.id===id))

  const filtrados=productos.length? productos.filter(p=>p.referencia.toLowerCase().includes(filtro.toLowerCase())) : [
    {id:'1',referencia:'MAX-101 NEGRO',precio:48500,talla:'35-40'},{id:'2',referencia:'MAX-102 BEIGE',precio:48500,talla:'35-40'},
    {id:'3',referencia:'MAX-103 BLANCO',precio:52000,talla:'35-40'},{id:'4',referencia:'MAX-104 CAFÉ',precio:48500,talla:'35-40'},
    {id:'5',referencia:'MAX-105 NEGRO CHAROL',precio:55000,talla:'35-40'},{id:'6',referencia:'MAX-106',precio:48500,talla:'35-40'},
    {id:'7',referencia:'MAX-201',precio:48500,talla:'35-40'},{id:'8',referencia:'MAX-202',precio:52000,talla:'35-40'},
  ]

  const total=carrito.reduce((a,b)=>a+b.qty,0)
  const totalPrecio=carrito.reduce((a,b)=>a+(b.precio||0)*b.qty,0)

  if(loading) return <div className="p-8 text-center text-xs">Cargando...</div>

  return(
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="h-14 bg-[#0E2A4D] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {empresa?.logo_url? <img src={empresa.logo_url} className="h-7 w-7 bg-white rounded-full p-1 object-contain"/> : <div className="h-7 w-7 bg-white text-black rounded-full flex items-center justify-center font-black text-xs">S</div>}
          <span className="text-white font-black text-xs tracking-widest">STOCKOS</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <div className="text-right"><div className="font-black text-xs">MÁXIMA IMPORTADORES</div><div className="text- opacity-60">/ CATALOGO OFICIAL</div></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[#2A3F5F] rounded-full flex items-center px-3 py-1.5"><input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Buscar ref..." className="bg-transparent text-xs text-white placeholder-gray-400 outline-none w-28"/><span className="text-gray-400 text-xs">🔍</span></div>
          {/* BOTON ARRIBA CORREGIDO - CON ICONO Y CLICKEABLE */}
          <button onClick={()=>setShowCarrito(true)} className="bg-white rounded-full px-3 py-1.5 text-xs font-black flex items-center gap-1.5 hover:bg-gray-100"[STRIPPED 25 bytes]"14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 20a1 1 0 100-2 1 1 0 000 2zM20 20a1 1 0 100-2 1 1 0 000 2zM1 4h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            CARRITO {total}
          </button>
        </div>
      </div>

      <div className="bg-[#e9ecef] flex justify-between px-4 py-2 text- text-gray-600 font-bold">
        <span>20 REFERENCIAS • TALLA 35-40 • ENTREGA BOGOTA 24H</span>
        <span className="opacity-50">STOCKOS / MÁXIMA • CATALOGO FINAL CON LOGOS OFICIALES</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4">
        {filtrados.map(p=>{
          const enCarrito=carrito.find(c=>c.id===p.id)
          return(
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden relative">
              <div className="absolute top-2 left-2 bg-black text-white text- font-black px-2 py-0.5 rounded-full z-10">{p.referencia.split(' ')[0]}</div>
              <div className="h-44 bg-[#f2f2f2] flex items-center justify-center relative">
                <span className="border border-dashed border-gray-300 px-3 py-1 text- text-gray-400 bg-white">IMAGEN</span>
                {p.imagen_url && <img src={p.imagen_url} className="absolute inset-0 w-full h-full object-cover"/>}
                <div className="absolute bottom-2 right-2 bg-white border text- px-2 py-0.5 rounded-full">{p.talla||'35-40'}</div>
              </div>
              <div className="p-3">
                <div className="font-black text-xs uppercase">{p.referencia}</div>
                <div className="text- text-gray-500">TALLA {p.talla||'35-40'} • STOCKOS</div>
                <div className="font-black text-xs mt-1">${p.precio.toLocaleString()}</div>
                {enCarrito? (
                  <div className="flex items-center justify-between mt-2 bg-black text-white rounded-full px-2 py-1"><button onClick={()=>menos(p.id)} className="w-6 h-6 bg-white text-black rounded-full font-black">-</button><span className="text-xs font-black">{enCarrito.qty}</span><button onClick={()=>mas(p.id)} className="w-6 h-6 bg-white text-black rounded-full font-black">+</button></div>
                ):(
                  <button onClick={()=>add(p)} className="w-full mt-2 bg-black text-white text- font-black py-2 rounded-full">AÑADIR AL CARRITO</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* BOTON FLOTANTE CORREGIDO - SIN NUMERO */}
      {total>0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#0f2d52] text-white rounded-full px-4 py-2 text-xs font-black flex gap-3 items-center shadow-xl">
          <span>{total} pares | ${totalPrecio.toLocaleString()}</span>
          <button onClick={()=>setShowCarrito(true)} className="bg-white text-black px-4 py-1 rounded-full">VER CARRITO</button>
        </div>
      )}

      {/* MODAL CARRITO - AL DAR CLIC */}
      {showCarrito && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={()=>setShowCarrito(false)}>
          <div className="bg-white w- h-full p-4 overflow-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="font-black">CARRITO ({total})</h2><button onClick={()=>setShowCarrito(false)} className="font-black">X</button></div>
            {carrito.map(c=><div key={c.id} className="flex justify-between py-2 border-b text-xs"><span>{c.referencia} x{c.qty}</span><span>${(c.precio*c.qty).toLocaleString()}</span></div>)}
            <div className="font-black text-sm mt-4">TOTAL: ${totalPrecio.toLocaleString()}</div>
            <a href={`https://wa.me/573008901150?text=Hola%20MÁXIMA%20quiero%20pedir%20${total}%20pares%20$${totalPrecio}%20${carrito.map(c=>c.referencia+'x'+c.qty).join(',')}`} target="_blank" className="w-full bg-[#0E2A4D] text-white py-3 rounded-full font-black mt-4 block text-center">ENVIAR PEDIDO</a>
          </div>
        </div>
      )}
    </div>
  )
}
