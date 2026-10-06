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
  const [paso, setPaso] = useState(1)
  const [datosEnvio, setDatosEnvio] = useState({ nombre:'', telefono:'', cedula:'', ciudad:'', direccion:'', barrio:'', notas:'', esPrimeraVez: true })
  const [metodoPago, setMetodoPago] = useState('NEQUI')

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
  const totalPares = carrito.reduce((s,p)=>s + p.cantidad, 0)
  const esContraentregaValida = datosEnvio.esPrimeraVez && totalPares>0 && totalPares<=2

  const addCarrito = (prod) => {
    setCarrito(prev=>{
      const ex = prev.find(p=>p.referencia===prod.referencia && p.talla===prod.talla)
      if(ex) return prev.map(p=>p===ex?{...p,cantidad:p.cantidad+1}:p)
      return [...prev,{...prod,cantidad:1}]
    })
    setShowCart(true); setPaso(1)
  }

  const finalizarPedido = async () => {
    if(!datosEnvio.nombre ||!datosEnvio.telefono ||!datosEnvio.ciudad ||!datosEnvio.direccion) return alert('Completa datos de envío para la guía')
    if(metodoPago==='CONTRAENTREGA' &&!esContraentregaValida) return alert('Contraentrega solo 1ra vez y hasta 2 pares máximo.')

    const pedido = { empresa_id: empresaIdFallback, cliente_nombre: datosEnvio.nombre, cliente_telefono: datosEnvio.telefono, cliente_cedula: datosEnvio.cedula, cliente_ciudad: datosEnvio.ciudad, cliente_direccion: datosEnvio.direccion, cliente_barrio: datosEnvio.barrio, es_primera_vez: datosEnvio.esPrimeraVez, metodo_pago: metodoPago, total_pares: totalPares, items: carrito, total, estado: metodoPago==='CONTRAENTREGA'?'pendiente_verificacion_contraentrega':'pendiente_guia', origen: 'maxima.stockos.vercel.app' }
    try{
      await supabase.from('pedidos').insert(pedido)
      await fetch(`https://n8n.tu-dominio.com/webhook/stockos/pedido`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(pedido) }).catch(()=>{})
      window.open(`https://wa.me/573186411851?text=${encodeURIComponent(`Pedido MAXIMA ${metodoPago}\n${carrito.map(c=>`• ${c.referencia} T${c.talla} x${c.cantidad}`).join('\n')}\nTotal $${total.toLocaleString()}\n${datosEnvio.nombre} ${datosEnvio.telefono}\n${datosEnvio.ciudad} ${datosEnvio.direccion}\n1ra vez:${datosEnvio.esPrimeraVez?'SI':'NO'}`)}`,'_blank')
      setCarrito([]); setShowCart(false); setPaso(1)
      alert('Pedido guardado. Guía se genera.')
    }catch{}
  }

  return(
    <div className="min-h-screen bg-white">
      <div className="bg-black text-white px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {empresa.logo? <img src={empresa.logo} className="w-10 h-10 rounded-full bg-white object-cover"/> : <div className="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center font-black">{empresa.nombre[0]}</div>}
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
              <div className="p-3"><div className="font-black text- truncate">{it.referencia}</div><div className="text- text-gray-500">Talla: {it.talla}</div><div className="font-black text- mt-1">${Number(it.precio).toLocaleString()}</div><button onClick={()=>addCarrito(it)} className="mt-2 w-full bg-black text-white py-2.5 rounded font-black text-">AÑADIR AL CARRITO</button></div>
            </div>
          ))}
        </div>
      </div>

      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col">
            <div className="bg-black text-white p-4 flex justify-between items-center"><h3 className="font-black text-sm">{paso===1?'CARRITO':paso===2?'DATOS ENVÍO':'MÉTODO DE PAGO'}</h3><button onClick={()=>setShowCart(false)} className="bg-white text-black w-7 h-7 rounded-full">X</button></div>
            <div className="flex-1 overflow-auto p-4">
              {paso===1 && <div className="space-y-2">{carrito.map((c,i)=><div key={i} className="flex justify-between border p-2 rounded text-xs"><div><b>{c.referencia}</b><br/>T:{c.talla} x{c.cantidad} - ${Number(c.precio).toLocaleString()}</div><button onClick={()=>setCarrito(prev=>prev.filter((_,idx)=>idx!==i))} className="text-red-500">X</button></div>)}</div>}
              {paso===2 && (
                <div className="space-y-3">
                  <div className="text-xs font-black">DATOS PARA GUÍA</div>
                  <input value={datosEnvio.nombre} onChange={e=>setDatosEnvio({...datosEnvio,nombre:e.target.value})} placeholder="Nombre completo *" className="w-full border p-2 rounded text-xs"/>
                  <div className="grid grid-cols-2 gap-2"><input value={datosEnvio.telefono} onChange={e=>setDatosEnvio({...datosEnvio,telefono:e.target.value})} placeholder="WhatsApp *" className="border p-2 rounded text-xs"/><input value={datosEnvio.cedula} onChange={e=>setDatosEnvio({...datosEnvio,cedula:e.target.value})} placeholder="Cédula" className="border p-2 rounded text-xs"/></div>
                  <div className="grid grid-cols-2 gap-2"><input value={datosEnvio.ciudad} onChange={e=>setDatosEnvio({...datosEnvio,ciudad:e.target.value})} placeholder="Ciudad *" className="border p-2 rounded text-xs"/><input value={datosEnvio.barrio} onChange={e=>setDatosEnvio({...datosEnvio,barrio:e.target.value})} placeholder="Barrio" className="border p-2 rounded text-xs"/></div>
                  <input value={datosEnvio.direccion} onChange={e=>setDatosEnvio({...datosEnvio,direccion:e.target.value})} placeholder="Dirección *" className="w-full border p-2 rounded text-xs"/>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={datosEnvio.esPrimeraVez} onChange={e=>setDatosEnvio({...datosEnvio,esPrimeraVez:e.target.checked})}/> Es mi primera compra</label>
                </div>
              )}
              {paso===3 && (
                <div className="space-y-3">
                  <div className="text-xs font-black">MÉTODOS DE PAGO AUTORIZADOS</div>

                  <label className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='NEQUI'?'border-black bg-gray-50':'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#2000B1] rounded-full flex items-center justify-center text-white font-black text-">N</div>
                      <div><div className="font-black text-xs">【entity-Nequi¦canonical_name=Nequi】</div><div className="text- text-gray-500">3186411851</div></div>
                    </div>
                    <input type="radio" checked={metodoPago==='【entity-NEQUI¦canonical_name=Nequi】'} onChange={()=>setMetodoPago('【entity-NEQUI¦canonical_name=Nequi】')}/>
                  </label>

                  <label className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='BANCOLOMBIA'?'border-black bg-gray-50':'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#FFC300] rounded-full flex items-center justify-center font-black text-">B</div>
                      <div><div className="font-black text-xs">Bancolombia</div><div className="text- text-gray-500">Ahorros 9127560414</div></div>
                    </div>
                    <input type="radio" checked={metodoPago==='BANCOLOMBIA'} onChange={()=>setMetodoPago('BANCOLOMBIA')}/>
                  </label>

                  <label className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='BRE-B'?'border-black bg-gray-50':'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center text-white text-">🔑</div>
                      <div><div className="font-black text-xs">Llave Bre-B</div><div className="text- text-gray-500">83615157565</div></div>
                    </div>
                    <input type="radio" checked={metodoPago==='BRE-B'} onChange={()=>setMetodoPago('BRE-B')}/>
                  </label>

                  <label className={`border-2 p-3 rounded cursor-pointer ${metodoPago==='CONTRAENTREGA'?'border-black bg-green-50':'border-gray-200'} ${!esContraentregaValida?'opacity-60':''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2">
                        <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-">📦</div>
                        <div className="pr-2">
                          <div className="font-black text-xs">Contraentrega</div>
                          <div className="text- leading-tight mt-1">Hasta <b>2 pares máximo por primera vez</b>. Según peso y lugar de envío + anticipo del envío. Sujeto a verificación.</div>
                          {!esContraentregaValida && <div className="text- text-red-600 font-bold mt-1">{totalPares>2?'❌ Máximo 2 pares':!datosEnvio.esPrimeraVez?'❌ Solo primera compra':''}</div>}
                        </div>
                      </div>
                      <input type="radio" disabled={!esContraentregaValida} checked={metodoPago==='CONTRAENTREGA'} onChange={()=>setMetodoPago('CONTRAENTREGA')}/>
                    </div>
                  </label>

                  <div className="bg-gray-50 p-3 rounded text-xs"><div className="font-black">Resumen guía:</div><div>{datosEnvio.nombre} {datosEnvio.telefono}</div><div>{datosEnvio.ciudad} {datosEnvio.direccion}</div><div className="mt-2 font-black">Total: ${total.toLocaleString()} - {totalPares} pares</div></div>
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              {paso===1 && <button onClick={()=>{if(carrito.length===0)return; setPaso(2)}} className="w-full bg-black text-white py-3 rounded font-black text-xs">CONTINUAR → DATOS ENVÍO</button>}
              {paso===2 && <div className="flex gap-2"><button onClick={()=>setPaso(1)} className="w-1/3 bg-gray-200 py-3 rounded font-black text-xs">← VOLVER</button><button onClick={()=>setPaso(3)} className="w-2/3 bg-black text-white py-3 rounded font-black text-xs">CONTINUAR → PAGO</button></div>}
              {paso===3 && <div className="flex gap-2"><button onClick={()=>setPaso(2)} className="w-1/3 bg-gray-200 py-3 rounded font-black text-xs">← VOLVER</button><button onClick={finalizarPedido} className="w-2/3 bg-green-600 text-white py-3 rounded font-black text-xs">FINALIZAR PEDIDO - GENERAR GUÍA</button></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
