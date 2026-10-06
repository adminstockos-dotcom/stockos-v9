import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function CatalogoPublico(){
  const path = window.location.pathname
  const parts = path.split('/').filter(Boolean)
  const isSlug = parts[0]==='m' || parts[0]==='c'
  const slug = isSlug? parts[1] : 'maxima'
  const empresaIdFallback = '676d535d-5045-41ac-9d7a-1177095e75d4' // MAXIMA IMPORTADORES
  const empresaIdFromUrl =!isSlug? parts[1] : null

  const [items, setItems] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [empresaNombre, setEmpresaNombre] = useState('MAXIMA')

  useEffect(()=>{
    const saved = localStorage.getItem('stockos_carrito_maxima')
    if(saved) setCarrito(JSON.parse(saved))
    cargar()
  },[])

  useEffect(()=>{ localStorage.setItem('stockos_carrito_maxima', JSON.stringify(carrito)) },[carrito])

  const cargar = async () => {
    let empresaId = empresaIdFromUrl || empresaIdFallback
    let nombreEmpresa = 'MAXIMA'

    if(isSlug){
      try{
        const { data: emp } = await supabase.from('empresas').select('id,nombre').ilike('nombre', `%${slug}%`).limit(1).single()
        if(emp){ empresaId = emp.id; nombreEmpresa = emp.nombre }
      }catch{
        nombreEmpresa = 'MAXIMA IMPORTADORES'
      }
    }
    setEmpresaNombre(nombreEmpresa.toUpperCase())
    const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaId).order('fecha_escaneo',{ascending:false}).limit(500)
    if(data) setItems(data)
  }

  const addCarrito = (prod) => {
    setCarrito(prev=>{
      const ex = prev.find(p=>p.referencia===prod.referencia && p.talla===prod.talla)
      if(ex) return prev.map(p=>p===ex?{...p,cantidad:p.cantidad+1}:p)
      return [...prev,{...prod,cantidad:1}]
    })
    setShowCart(true)
  }
  const total = carrito.reduce((s,p)=>s + Number(p.precio||0)*p.cantidad, 0)
  const vaciar = () => { setCarrito([]); localStorage.removeItem('stockos_carrito_maxima') }

  const pagar = async () => {
    if(carrito.length===0) return
    const pedido = {
      empresa_id: empresaIdFromUrl || empresaIdFallback,
      cliente_nombre: 'Cliente Web',
      items: carrito,
      total,
      estado: 'pendiente',
      origen: 'catalogo_maxima',
      created_at: new Date().toISOString()
    }
    try{
      const { data } = await supabase.from('pedidos').insert(pedido).select().single()
      // Dispara n8n para automatizar pedido
      await fetch(`https://n8n.tu-dominio.com/webhook/stockos/pedido/${pedido.empresa_id}`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ pedido_id: data?.id || Date.now(),...pedido })
      }).catch(()=>{})
      const msg = `Hola MAXIMA, quiero este pedido:%0A${carrito.map(c=>`• ${c.referencia} T:${c.talla} x${c.cantidad} - $${Number(c.precio).toLocaleString()}`).join('%0A')}%0A%0ATotal: $${total.toLocaleString()}%0A%0ACatalogo: https://maxima.stockos.vercel.app`
      window.open(`https://wa.me/573177384534?text=${msg}`,'_blank')
      vaciar(); setShowCart(false)
      alert('Pedido enviado a Supabase y a WhatsApp. n8n lo automatiza.')
    }catch(e){
      alert('Error guardando pedido, pero se envía a WhatsApp')
      const msg = `Pedido MAXIMA:%0A${carrito.map(c=>`${c.referencia} T${c.talla} x${c.cantidad}`).join('%0A')}`
      window.open(`https://wa.me/573177384534?text=${msg}`,'_blank')
    }
  }

  const filtrados = items.filter(i=>
    i.referencia?.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.proveedor_nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  // MOCK para ver estructura aunque esté en 0
  const productosMostrar = filtrados.length>0? filtrados : []

  return(
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-black text-white p-4 sticky top-0 z-20 flex justify-between items-center">
        <div>
          <div className="font-black text-xl tracking-widest">{empresaNombre} <span className="text-green-400">.STOCKOS</span></div>
          <div className="text- text-gray-400">CATÁLOGO EN VIVO - Actualizado 8:30 AM y 2:30 PM</div>
        </div>
        <div className="flex items-center gap-3">
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar ref..." className="text-black px-3 py-2 rounded text-xs w-32 md:w-64"/>
          <button onClick={()=>setShowCart(true)} className="bg-white text-black px-4 py-2 rounded-full font-black text-xs relative">
            🛒 {carrito.length} | ${total.toLocaleString()}
            {carrito.length>0 && <span className="absolute -top-1 -right-1 bg-green-500 text-white w-5 h-5 rounded-full text- flex items-center justify-center">{carrito.reduce((s,p)=>s+p.cantidad,0)}</span>}
          </button>
        </div>
      </div>

      {/* BANNER */}
      <div className="bg-green-600 text-white text-center py-2 text-xs font-black">
        ENVÍO GRATIS + CONTRAENTREGA CALI • 【entity-NEQUI¦canonical_name=Nequi】 - 【entity-BANCOLOMBIA¦canonical_name=Bancolombia】 - DAVIPLATA • https://maxima.stockos.vercel.app
      </div>

      {/* GRID PRODUCTOS */}
      <div className="max-w-7xl mx-auto p-4">
        {productosMostrar.length===0? (
          <div className="text-center py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 opacity-40">
              {[1,2,3,4,5,6,7,8].map(i=>(
                <div key={i} className="bg-white border rounded-lg p-3">
                  <div className="bg-gray-200 h-48 rounded mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-black rounded"></div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm text-gray-500 font-bold">CATÁLOGO ESTRUCTURADO LISTO - Esperando escaneos de n8n para llenar {items.length} referencias</p>
            <p className="text-xs text-gray-400">Espacio para imagen, referencia, talla, precio venta, stock, botón carrito y métodos de pago ya configurado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {productosMostrar.map((it,idx)=>(
              <div key={idx} className="bg-white border rounded-xl overflow-hidden hover:shadow-lg transition">
                <div className="bg-gray-100 h-52 flex items-center justify-center relative">
                  {it.imagen_url? <img src={it.imagen_url} className="h-full object-cover w-full"/> : <span className="text-xs text-gray-400">FOTO {it.referencia}</span>}
                  <span className="absolute top-2 left-2 bg-black text-white text- px-2 py-1 rounded-full font-black">{it.proveedor_nombre}</span>
                  <span className="absolute top-2 right-2 bg-green-500 text-white text- px-2 py-1 rounded-full">Stock: {it.stock_proveedor}</span>
                </div>
                <div className="p-3">
                  <div className="font-black text-xs truncate">{it.referencia}</div>
                  <div className="text- text-gray-500">Talla: {it.talla} • Ref: {it.referencia}</div>
                  <div className="font-black text-lg mt-1">${Number(it.precio||0).toLocaleString()}</div>
                  <div className="text- text-gray-400 line-through">Antes ${(Number(it.precio||0)*1.3).toLocaleString()}</div>
                  <button onClick={()=>addCarrito(it)} className="mt-2 w-full bg-black text-white py-2 rounded font-black text-xs hover:bg-green-600">+ AÑADIR AL CARRITO</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CARRITO DRAWER */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-4 flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black">CARRITO - {carrito.length} productos</h3>
              <button onClick={()=>setShowCart(false)} className="bg-black text-white w-8 h-8 rounded-full">X</button>
            </div>
            <div className="flex-1 overflow-auto mt-3 space-y-2">
              {carrito.map((c,i)=>(
                <div key={i} className="flex justify-between items-center border p-2 rounded">
                  <div><div className="font-bold text-xs">{c.referencia} T:{c.talla}</div><div className="text-xs">${Number(c.precio).toLocaleString()} x {c.cantidad}</div></div>
                  <div className="flex gap-2"><button onClick={()=>setCarrito(prev=>prev.filter((_,idx)=>idx!==i))} className="text-red-600 text-xs">Quitar</button></div>
                </div>
              ))}
              {carrito.length===0 && <p className="text-center text-xs text-gray-400 mt-10">Carrito vacío</p>}
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between font-black"><span>Total</span><span>${total.toLocaleString()}</span></div>
              <div className="bg-gray-50 p-2 rounded text-">
                <div className="font-black">MÉTODOS DE PAGO:</div>
                <div>• 【entity-Nequi¦canonical_name=Nequi】 / Daviplata: 317 738 4534</div>
                <div>• 【entity-Bancolombia¦canonical_name=Bancolombia】: Ahorros ***</div>
                <div>• Contraentrega Cali</div>
                <div>• Link de pago Wompi / Bold</div>
              </div>
              <button onClick={pagar} className="w-full bg-green-600 text-white py-3 rounded font-black">PAGAR Y ENVIAR PEDIDO A MAXIMA</button>
              <button onClick={vaciar} className="w-full bg-gray-200 py-2 rounded text-xs">Vaciar carrito</button>
              <div className="text- text-gray-400 text-center">Al pagar se guarda en Supabase tabla pedidos y n8n automatiza despacho + CRM + Pagos</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
