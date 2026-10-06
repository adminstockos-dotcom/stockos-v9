import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const DEMO = [
  { referencia: 'BLUSA-SATIN-001', talla: 'M', precio: 45000, stock_proveedor: 12, proveedor_nombre: 'MAXIMA' },
  { referencia: 'JEAN-MOM-002', talla: '32', precio: 78000, stock_proveedor: 8, proveedor_nombre: 'MAXIMA' },
  { referencia: 'VESTIDO-LIN-003', talla: 'S', precio: 62000, stock_proveedor: 5, proveedor_nombre: 'MAXIMA' },
  { referencia: 'CROP-TOP-004', talla: 'L', precio: 35000, stock_proveedor: 20, proveedor_nombre: 'MAXIMA' },
  { referencia: 'FALDA-DRILL-005', talla: '30', precio: 55000, stock_proveedor: 10, proveedor_nombre: 'MAXIMA' },
  { referencia: 'ENTERIZO-006', talla: 'M', precio: 89000, stock_proveedor: 3, proveedor_nombre: 'MAXIMA' },
  { referencia: 'BLAZER-007', talla: 'S', precio: 95000, stock_proveedor: 7, proveedor_nombre: 'MAXIMA' },
  { referencia: 'PANTALON-008', talla: '32', precio: 72000, stock_proveedor: 15, proveedor_nombre: 'MAXIMA' },
]

export default function CatalogoPublico(){
  const empresaIdFallback = '676d535d-5045-41ac-9d7a-1177095e75d4'
  const [items, setItems] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [showCart, setShowCart] = useState(false)

  useEffect(()=>{
    const saved = localStorage.getItem('stockos_carrito_maxima')
    if(saved) setCarrito(JSON.parse(saved))
    const cargar = async () => {
      const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaIdFallback).limit(500)
      if(data && data.length>0) setItems(data)
    }
    cargar()
  },[])

  useEffect(()=>{ localStorage.setItem('stockos_carrito_maxima', JSON.stringify(carrito)) },[carrito])

  const lista = items.length>0? items : DEMO
  const filtrados = lista.filter(i=> i.referencia.toLowerCase().includes(busqueda.toLowerCase()))
  const total = carrito.reduce((s,p)=>s + Number(p.precio||0)*p.cantidad, 0)

  const addCarrito = (prod) => {
    setCarrito(prev=>{
      const ex = prev.find(p=>p.referencia===prod.referencia && p.talla===prod.talla)
      if(ex) return prev.map(p=>p===ex?{...p,cantidad:p.cantidad+1}:p)
      return [...prev,{...prod,cantidad:1}]
    })
    setShowCart(true)
  }

  return(
    <div className="min-h-screen bg-white">
      {/* HEADER LIMPIO - SOLO LOGO MAXIMA IMPORTADORES */}
      <div className="bg-black text-white px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-white text-black w-9 h-9 rounded-full flex items-center justify-center font-black text-sm">M</div>
          <div className="leading-none">
            <div className="font-black text-">MAXIMA IMPORTADORES</div>
            <div className="text- text-green-400 font-bold">MAXIMA.STOCKOS.VERCEL.APP</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar ref..." className="text-black px-3 py-2 rounded text-xs w-32 md:w-60"/>
          <button onClick={()=>setShowCart(true)} className="bg-white text-black px-4 py-2 rounded-full font-black text-xs">🛒 {carrito.reduce((s,p)=>s+p.cantidad,0)} | ${total.toLocaleString()}</button>
        </div>
      </div>

      {/* PRODUCTOS CON TEXTOS DEMO */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtrados.map((it,idx)=>(
            <div key={idx} className="border rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="bg-gray-100 h-48 flex items-center justify-center relative">
                <span className="text- text-gray-400">IMAGEN<br/>{it.referencia}</span>
                <span className="absolute bottom-2 left-2 bg-black text-white text- px-2 py-1 rounded-full">Stock: {it.stock_proveedor}</span>
              </div>
              <div className="p-3">
                <div className="font-black text- truncate">{it.referencia}</div>
                <div className="text- text-gray-500 mt-1">Talla: {it.talla} • {it.proveedor_nombre}</div>
                <div className="font-black text- mt-1">${Number(it.precio).toLocaleString()}</div>
                <button onClick={()=>addCarrito(it)} className="mt-2 w-full bg-black text-white py-2.5 rounded font-black text- hover:bg-green-600">AÑADIR AL CARRITO</button>
              </div>
            </div>
          ))}
        </div>
        {items.length===0 && <div className="text-center mt-6 text- text-gray-400">Mostrando DEMO - Cuando n8n escanee se reemplaza automático desde Supabase</div>}
      </div>

      {/* CARRITO */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-sm h-full p-4 flex flex-col">
            <div className="flex justify-between items-center border-b pb-3"><h3 className="font-black text-sm">CARRITO</h3><button onClick={()=>setShowCart(false)} className="bg-black text-white w-7 h-7 rounded-full text-xs">X</button></div>
            <div className="flex-1 overflow-auto mt-3 space-y-2">
              {carrito.map((c,i)=><div key={i} className="flex justify-between border p-2 rounded text-xs"><div><b>{c.referencia}</b><br/>T:{c.talla} x{c.cantidad} - ${Number(c.precio).toLocaleString()}</div><button onClick={()=>setCarrito(prev=>prev.filter((_,idx)=>idx!==i))} className="text-red-500">X</button></div>)}
              {carrito.length===0 && <p className="text-center text-xs text-gray-400 mt-10">Carrito vacío</p>}
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between font-black text-sm mb-3"><span>Total</span><span>${total.toLocaleString()}</span></div>
              <div className="bg-gray-50 p-2 rounded text- mb-3">Pagos: Nequi 3177384534 • Bancolombia • Contraentrega</div>
              <button onClick={()=>{ alert('Pedido guardado. n8n lo procesa.'); setCarrito([]); setShowCart(false)}} className="w-full bg-black text-white py-3 rounded font-black text-xs">FINALIZAR PEDIDO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
