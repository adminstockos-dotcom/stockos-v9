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
  const [empresa, setEmpresa] = useState({ nombre: 'MAXIMA IMPORTADORES', logo: null })
  const [paso, setPaso] = useState(1) // 1 carrito, 2 datos, 3 pago
  const [datosEnvio, setDatosEnvio] = useState({ nombre:'', telefono:'', cedula:'', ciudad:'', direccion:'', barrio:'', notas:'' })
  const [metodoPago, setMetodoPago] = useState('【entity-NEQUI¦canonical_name=NEQUI】')

  useEffect(()=>{
    const saved = localStorage.getItem('stockos_carrito_maxima')
    if(saved) setCarrito(JSON.parse(saved))
    const cargar = async () => {
      const { data: emp } = await supabase.from('empresas').select('id,nombre,logo,logo_url').eq('id', empresaIdFallback).single()
      if(emp) setEmpresa({ nombre: emp.nombre || 'MAXIMA IMPORTADORES', logo: emp.logo_url || emp.logo || null })
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
    setShowCart(true); setPaso(1)
  }

  const finalizarPedido = async () => {
    if(!datosEnvio.nombre ||!datosEnvio.telefono ||!datosEnvio.ciudad ||!datosEnvio.direccion) return alert('Completa nombre, teléfono, ciudad y dirección para la guía')
    const pedido = {
      empresa_id: empresaIdFallback,
      cliente_nombre: datosEnvio.nombre,
      cliente_telefono: datosEnvio.telefono,
      cliente_cedula: datosEnvio.cedula,
      cliente_ciudad: datosEnvio.ciudad,
      cliente_direccion: datosEnvio.direccion,
      cliente_barrio: datosEnvio.barrio,
      cliente_notas: datosEnvio.notas,
      metodo_pago: metodoPago,
      items: carrito,
      total,
      estado: 'pendiente_guia',
      origen: 'maxima.stockos.vercel.app'
    }
    try{
      await supabase.from('pedidos').insert(pedido)
      // n8n genera guía + factura
      await fetch(`https://n8n.tu-dominio.com/webhook/stockos/pedido`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(pedido) }).catch(()=>{})
      const msg = `Hola MAXIMA IMPORTADORES%0A%0APEDIDO NUEVO:%0A${carrito.map(c=>`• ${c.referencia} T:${c.talla} x${c.cantidad} $${Number(c.precio).toLocaleString()}`).join('%0A')}%0A%0ATotal: $${total.toLocaleString()}%0A%0ADATOS ENVÍO:%0A${datosEnvio.nombre}%0ATel: ${datosEnvio.telefono}%0ACed: ${datosEnvio.cedula}%0A${datosEnvio.ciudad} - ${datosEnvio.direccion} - ${datosEnvio.barrio}%0ANota: ${datosEnvio.notas}%0A%0APAGO: ${metodoPago}%0A%0AGracias!`
      window.open(`https://wa.me/573186411851?text=${msg}`,'_blank')
      alert(`Pedido guardado en Supabase. Guía se genera para ${datosEnvio.ciudad}. n8n automatiza.`)
      setCarrito([]); setShowCart(false); setPaso(1); setDatosEnvio({nombre:'',telefono:'',cedula:'',ciudad:'',direccion:'',barrio:'',notas:''})
    }catch(e){ alert('Error guardando pero se envía a WhatsApp'); }
  }

  return(
    <div className="min-h-screen bg-white">
      <div className="bg-black text-white px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {empresa.logo? <img src={empresa.logo} alt={empresa.nombre} className="w-10 h-10 rounded-full object-cover bg-white"/> : <div className="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center font-black">{empresa.nombre.charAt(0)}</div>}
          <div className="leading-none"><div className="font-black text- uppercase">{empresa.nombre}</div><div className="text- text-gray-400">CATÁLOGO OFICIAL</div></div>
        </div>
        <div className="flex items-center gap-2">
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar ref..." className="text-black px-3 py-2 rounded text-xs w-32 md:w-60"/>
          <button onClick={()=>{setShowCart(true); setPaso(1)}} className="bg-white text-black px-4 py-2 rounded-full font-black text-xs">🛒 {carrito.reduce((s,p)=>s+p.cantidad,0)} | ${total.toLocaleString()}</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtrados.map((it,idx)=>(
            <div key={idx} className="border rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="bg-gray-100 h-48 flex items-center justify-center relative"><span className="text- text-gray-400 text-center">IMAGEN<br/>{it.referencia}</span><span className="absolute bottom-2 left-2 bg-black text-white text- px-2 py-1 rounded-full">Stock: {it.stock_proveedor}</span></div>
              <div className="p-3"><div className="font-black text- truncate">{it.referencia}</div><div className="text- text-gray-500 mt-1">Talla: {it.talla} • {it.proveedor_nombre}</div><div className="font-black text- mt-1">${Number(it.precio).toLocaleString()}</div><button onClick={()=>addCarrito(it)} className="mt-2 w-full bg-black text-white py-2.5 rounded font-black text-">AÑADIR AL CARRITO</button></div>
            </div>
          ))}
        </div>
      </div>

      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col">
            <div className="bg-black text-white p-4 flex justify-between items-center"><h3 className="font-black text-sm">{paso===1?'CARRITO':paso===2?'DATOS DE ENVÍO':'MÉTODO DE PAGO'}</h3><button onClick={()=>setShowCart(false)} className="bg-white text-black w-7 h-7 rounded-full text-xs font-black">X</button></div>

            <div className="flex-1 overflow-auto p-4">
              {paso===1 && (
                <div className="space-y-2">
                  {carrito.map((c,i)=><div key={i} className="flex justify-between border p-2 rounded text-xs"><div><b>{c.referencia}</b><br/>T:{c.talla} x{c.cantidad} - ${Number(c.precio).toLocaleString()}</div><button onClick={()=>setCarrito(prev=>prev.filter((_,idx)=>idx!==i))} className="text-red-500">X</button></div>)}
                  {carrito.length===0 && <p className="text-center text-xs text-gray-400 mt-10">Carrito vacío</p>}
                  {carrito.length>0 && <div className="font-black flex justify-between mt-4 border-t pt-2"><span>Total</span><span>${total.toLocaleString()}</span></div>}
                </div>
              )}
              {paso===2 && (
                <div className="space-y-3">
                  <div className="text-xs font-black">FORMULARIO PARA GUÍA DE ENVÍO</div>
                  <input value={datosEnvio.nombre} onChange={e=>setDatosEnvio({...datosEnvio,nombre:e.target.value})} placeholder="Nombre completo *" className="w-full border p-2 rounded text-xs"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={datosEnvio.telefono} onChange={e=>setDatosEnvio({...datosEnvio,telefono:e.target.value})} placeholder="WhatsApp * 318..." className="border p-2 rounded text-xs"/>
                    <input value={datosEnvio.cedula} onChange={e=>setDatosEnvio({...datosEnvio,cedula:e.target.value})} placeholder="Cédula" className="border p-2 rounded text-xs"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={datosEnvio.ciudad} onChange={e=>setDatosEnvio({...datosEnvio,ciudad:e.target.value})} placeholder="Ciudad * Ej: Cali" className="border p-2 rounded text-xs"/>
                    <input value={datosEnvio.barrio} onChange={e=>setDatosEnvio({...datosEnvio,barrio:e.target.value})} placeholder="Barrio" className="border p-2 rounded text-xs"/>
                  </div>
                  <input value={datosEnvio.direccion} onChange={e=>setDatosEnvio({...datosEnvio,direccion:e.target.value})} placeholder="Dirección completa * Cra 10 # 20-30" className="w-full border p-2 rounded text-xs"/>
                  <textarea value={datosEnvio.notas} onChange={e=>setDatosEnvio({...datosEnvio,notas:e.target.value})} placeholder="Notas para la guía (Ej: Casa azul, 2do piso)" className="w-full border p-2 rounded text-xs h-16"></textarea>
                </div>
              )}
              {paso===3 && (
                <div className="space-y-3">
                  <div className="text-xs font-black">MÉTODOS DE PAGO AUTORIZADOS - MÁXIMA IMPORTADORES</div>
                  <div className="space-y-2">
                    <label className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='NEQUI'?'border-black bg-gray-50':'border-gray-200'}`}><div><div className="font-black text-xs">【entity-NEQUI¦canonical_name=NEQUI】</div><div className="text-xs">3186411851</div></div><input type="radio" checked={metodoPago==='【entity-NEQUI¦canonical_name=NEQUI】'} onChange={()=>setMetodoPago('【entity-NEQUI¦canonical_name=NEQUI】')}/></label>
                    <label className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='BANCOLOMBIA'?'border-black bg-gray-50':'border-gray-200'}`}><div><div className="font-black text-xs">【entity-BANCOLOMBIA¦canonical_name=BANCOLOMBIA】 Ahorros</div><div className="text-xs">9127560414</div></div><input type="radio" checked={metodoPago==='【entity-BANCOLOMBIA¦canonical_name=BANCOLOMBIA】'} onChange={()=>setMetodoPago('【entity-BANCOLOMBIA¦canonical_name=BANCOLOMBIA】')}/></label>
                    <label className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='BRE-B'?'border-black bg-gray-50':'border-gray-200'}`}><div><div className="font-black text-xs">🔑 LLAVE BRE-B</div><div className="text-xs">83615157565</div></div><input type="radio" checked={metodoPago==='BRE-B'} onChange={()=>setMetodoPago('BRE-B')}/></label>
                    <label className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='CONTRAENTREGA'?'border-black bg-gray-50':'border-gray-200'}`}><div><div className="font-black text-xs">CONTRAENTREGA CALI</div><div className="text-xs">Pagas al recibir</div></div><input type="radio" checked={metodoPago==='CONTRAENTREGA'} onChange={()=>setMetodoPago('CONTRAENTREGA')}/></label>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-xs mt-4">
                    <div className="font-black">RESUMEN GUÍA:</div>
                    <div>{datosEnvio.nombre} - {datosEnvio.telefono}</div>
                    <div>{datosEnvio.ciudad} - {datosEnvio.direccion}</div>
                    <div className="mt-2 font-black">Total a pagar: ${total.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-white space-y-2">
              {paso===1 && <button onClick={()=>{if(carrito.length===0)return alert('Carrito vacío'); setPaso(2)}} className="w-full bg-black text-white py-3 rounded font-black text-xs">CONTINUAR → DATOS ENVÍO</button>}
              {paso===2 && <div className="flex gap-2"><button onClick={()=>setPaso(1)} className="w-1/3 bg-gray-200 py-3 rounded font-black text-xs">← VOLVER</button><button onClick={()=>setPaso(3)} className="w-2/3 bg-black text-white py-3 rounded font-black text-xs">CONTINUAR → PAGO</button></div>}
              {paso===3 && <div className="flex gap-2"><button onClick={()=>setPaso(2)} className="w-1/3 bg-gray-200 py-3 rounded font-black text-xs">← VOLVER</button><button onClick={finalizarPedido} className="w-2/3 bg-green-600 text-white py-3 rounded font-black text-xs">FINALIZAR PEDIDO - GENERAR GUÍA</button></div>}
              <div className="text- text-gray-400 text-center">Se guarda en Supabase pedidos + n8n genera guía automática</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
