import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const DEMO = [
  { referencia: 'BLUSA-SATIN-001', talla: 'M', precio: 45000, stock_proveedor: 12, proveedor_nombre: 'MAXIMA' },
  { referencia: 'JEAN-MOM-002', talla: '32', precio: 78000, stock_proveedor: 8, proveedor_nombre: 'MAXIMA' },
  { referencia: 'VESTIDO-LIN-003', talla: 'S', precio: 62000, stock_proveedor: 5, proveedor_nombre: 'MAXIMA' },
  { referencia: 'CROP-TOP-004', talla: 'L', precio: 35000, stock_proveedor: 20, proveedor_nombre: 'MAXIMA' },
  { referencia: 'FALDA-DRILL-005', talla: '30', precio: 55000, stock_proveedor: 10, proveedor_nombre: 'MAXIMA' },
  { referencia: 'ENTERIZO-006', talla: 'M', precio: 89000, stock_proveedor: 3, proveedor_nombre: 'MAXIMA' },
]

export default function CatalogoPublico(){
  const empresaIdFallback = '676d535d-5045-41ac-9d7a-1177095e75d4'
  const [items, setItems] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [empresa, setEmpresa] = useState({ nombre: 'MAXIMA IMPORTADORES', logo: null })
  const [paso, setPaso] = useState(1)
  const [datosEnvio, setDatosEnvio] = useState({ nombre:'', telefono:'', cedula:'', ciudad:'', direccion:'', barrio:'' })
  const [metodoPago, setMetodoPago] = useState('【entity-NEQUI¦canonical_name=Nequi】')
  const [anticipoPago, setAnticipoPago] = useState('【entity-NEQUI¦canonical_name=Nequi】')
  const [historialCliente, setHistorialCliente] = useState({ totalPedidos: 0, esPrimeraVez: true, verificando: false })

  useEffect(()=>{
    const saved = localStorage.getItem('stockos_carrito_maxima')
    if(saved) setCarrito(JSON.parse(saved))
    const cargar = async () => {
      const { data: emp } = await supabase.from('empresas').select('id,nombre,logo,logo_url').eq('id', empresaIdFallback).single()
      if(emp) setEmpresa({ nombre: emp.nombre, logo: emp.logo_url || emp.logo || null })
      const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaIdFallback).limit(500)
      if(data?.length>0) setItems(data)
    }
    cargar()
  },[])

  useEffect(()=>{ localStorage.setItem('stockos_carrito_maxima', JSON.stringify(carrito)) },[carrito])

  const verificarCliente = async () => {
    if(!datosEnvio.telefono &&!datosEnvio.cedula) return
    setHistorialCliente(prev=>({...prev, verificando: true}))
    const { data } = await supabase.from('pedidos').select('id').eq('empresa_id', empresaIdFallback).eq('cliente_telefono', datosEnvio.telefono).limit(10)
    const totalPedidos = data?.length || 0
    setHistorialCliente({ totalPedidos, esPrimeraVez: totalPedidos===0, verificando: false })
    if(totalPedidos>0 && metodoPago==='CONTRAENTREGA') setMetodoPago('【entity-NEQUI¦canonical_name=Nequi】')
  }

  useEffect(()=>{ if(datosEnvio.telefono.length>=10) verificarCliente() },[datosEnvio.telefono])

  const lista = items.length>0? items : DEMO
  const filtrados = lista.filter(i=> i.referencia.toLowerCase().includes(busqueda.toLowerCase()))
  const total = carrito.reduce((s,p)=>s + Number(p.precio||0)*p.cantidad, 0)
  const totalPares = carrito.reduce((s,p)=>s + p.cantidad, 0)
  const esContraentregaValida = historialCliente.esPrimeraVez && totalPares>=1 && totalPares<=2

  const addCarrito = (prod) => {
    setCarrito(prev=>{
      const ex = prev.find(p=>p.referencia===prod.referencia && p.talla===prod.talla)
      if(ex) return prev.map(p=>p===ex?{...p,cantidad:p.cantidad+1}:p)
      return [...prev,{...prod,cantidad:1}]
    })
    setShowCart(true); setPaso(1)
  }

  const finalizarPedido = async () => {
    if(!datosEnvio.nombre ||!datosEnvio.telefono ||!datosEnvio.ciudad ||!datosEnvio.direccion) return alert('Completa datos guía')
    if(metodoPago==='CONTRAENTREGA' &&!esContraentregaValida) return alert('Contraentrega solo 1ra vez hasta 2 pares')

    const pedido = {
      empresa_id: empresaIdFallback,
      cliente_nombre: datosEnvio.nombre,
      cliente_telefono: datosEnvio.telefono,
      cliente_cedula: datosEnvio.cedula,
      cliente_ciudad: datosEnvio.ciudad,
      cliente_direccion: datosEnvio.direccion,
      cliente_barrio: datosEnvio.barrio,
      es_primera_vez: historialCliente.esPrimeraVez,
      metodo_pago: metodoPago,
      anticipo_metodo: metodoPago==='CONTRAENTREGA'? anticipoPago : null,
      total_pares: totalPares,
      items: carrito,
      total,
      estado: metodoPago==='CONTRAENTREGA'?'pendiente_anticipo_envio':'pendiente_guia',
      origen: 'maxima.stockos.vercel.app'
    }
    await supabase.from('pedidos').insert(pedido)
    await fetch(`https://n8n.tu-dominio.com/webhook/stockos/pedido`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(pedido) }).catch(()=>{})
    const msg = `Pedido MAXIMA ${metodoPago}${metodoPago==='CONTRAENTREGA'?` - Anticipo: ${anticipoPago}`:''}\n${carrito.map(c=>`• ${c.referencia} T${c.talla} x${c.cantidad}`).join('\n')}\nTotal $${total.toLocaleString()}\n${datosEnvio.nombre} ${datosEnvio.telefono}\n${datosEnvio.ciudad} ${datosEnvio.direccion}`
    window.open(`https://wa.me/573186411851?text=${encodeURIComponent(msg)}`,'_blank')
    setCarrito([]); setShowCart(false); setPaso(1)
  }

  return(
    <div className="min-h-screen bg-white">
      <div className="bg-black text-white px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">{empresa.logo? <img src={empresa.logo} className="w-10 h-10 rounded-full bg-white object-cover"/> : <div className="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center font-black">{empresa.nombre[0]}</div>}<div className="leading-none"><div className="font-black text- uppercase">{empresa.nombre}</div><div className="text- text-gray-400">CATÁLOGO OFICIAL</div></div></div>
        <div className="flex items-center gap-2"><input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar ref..." className="text-black px-3 py-2 rounded text-xs w-32 md:w-60"/><button onClick={()=>{setShowCart(true); setPaso(1)}} className="bg-white text-black px-4 py-2 rounded-full font-black text-xs">🛒 {carrito.reduce((s,p)=>s+p.cantidad,0)} | ${total.toLocaleString()}</button></div>
      </div>

      <div className="max-w-7xl mx-auto p-4"><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{filtrados.map((it,idx)=><div key={idx} className="border rounded-xl overflow-hidden bg-white shadow-sm"><div className="bg-gray-100 h-48 flex items-center justify-center"><span className="text- text-gray-400 text-center">IMAGEN<br/>{it.referencia}</span></div><div className="p-3"><div className="font-black text- truncate">{it.referencia}</div><div className="text- text-gray-500">Talla: {it.talla}</div><div className="font-black text- mt-1">${Number(it.precio).toLocaleString()}</div><button onClick={()=>addCarrito(it)} className="mt-2 w-full bg-black text-white py-2.5 rounded font-black text-">AÑADIR AL CARRITO</button></div></div>)}</div></div>

      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col">
            <div className="bg-black text-white p-4 flex justify-between items-center"><h3 className="font-black text-sm">{paso===1?'CARRITO':paso===2?'DATOS ENVÍO':'MÉTODO DE PAGO'}</h3><button onClick={()=>setShowCart(false)} className="bg-white text-black w-7 h-7 rounded-full">X</button></div>
            <div className="flex-1 overflow-auto p-4">
              {paso===2 && <div className="space-y-3"><input value={datosEnvio.nombre} onChange={e=>setDatosEnvio({...datosEnvio,nombre:e.target.value})} placeholder="Nombre *" className="w-full border p-2 rounded text-xs"/><div className="grid grid-cols-2 gap-2"><input value={datosEnvio.telefono} onChange={e=>setDatosEnvio({...datosEnvio,telefono:e.target.value})} placeholder="WhatsApp *" className="border p-2 rounded text-xs"/><input value={datosEnvio.cedula} onChange={e=>setDatosEnvio({...datosEnvio,cedula:e.target.value})} placeholder="Cédula" className="border p-2 rounded text-xs"/></div>{!historialCliente.verificando && datosEnvio.telefono && <div className={`text- p-2 rounded ${historialCliente.esPrimeraVez?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>{historialCliente.esPrimeraVez?`✅ 1ra compra - Contraentrega habilitada (2 pares)`:`❌ ${historialCliente.totalPedidos} pedido(s) previos - 2da compra`}</div>}<div className="grid grid-cols-2 gap-2"><input value={datosEnvio.ciudad} onChange={e=>setDatosEnvio({...datosEnvio,ciudad:e.target.value})} placeholder="Ciudad *" className="border p-2 rounded text-xs"/><input value={datosEnvio.barrio} onChange={e=>setDatosEnvio({...datosEnvio,barrio:e.target.value})} placeholder="Barrio" className="border p-2 rounded text-xs"/></div><input value={datosEnvio.direccion} onChange={e=>setDatosEnvio({...datosEnvio,direccion:e.target.value})} placeholder="Dirección *" className="w-full border p-2 rounded text-xs"/></div>}
              {paso===3 && (
                <div className="space-y-3">
                  <div className="text-xs font-black">MÉTODOS DE PAGO AUTORIZADOS</div>
                  <label className={`border-2 p-3 rounded flex justify-between items-center ${metodoPago==='【entity-NEQUI¦canonical_name=Nequi】'?'border-black bg-gray-50':''}`}><div className="flex items-center gap-2"><div className="w-7 h-7 bg-[#2000B1] rounded-full flex items-center justify-center text-white font-black text-">N</div><div><div className="font-black text-xs">Nequi</div><div className="text-">3186411851</div></div></div><input type="radio" checked={metodoPago==='NEQUI'} onChange={()=>setMetodoPago('NEQUI')}/></label>
                  <label className={`border-2 p-3 rounded flex justify-between items-center ${metodoPago==='【entity-BANCOLOMBIA¦canonical_name=Bancolombia】'?'border-black bg-gray-50':''}`}><div className="flex items-center gap-2"><div className="w-7 h-7 bg-[#FFC300] rounded-full flex items-center justify-center font-black text-">B</div><div><div className="font-black text-xs">Bancolombia</div><div className="text-">Ahorros 9127560414</div></div></div><input type="radio" checked={metodoPago==='BANCOLOMBIA'} onChange={()=>setMetodoPago('BANCOLOMBIA')}/></label>
                  <label className={`border-2 p-3 rounded flex justify-between items-center ${metodoPago==='BRE-B'?'border-black bg-gray-50':''}`}><div className="flex items-center gap-2"><div className="w-7 h-7 bg-black rounded-full flex items-center justify-center text-white text-">🔑</div><div><div className="font-black text-xs">Llave Bre-B</div><div className="text-">83615157565</div></div></div><input type="radio" checked={metodoPago==='BRE-B'} onChange={()=>setMetodoPago('BRE-B')}/></label>

                  <label className={`border-2 p-3 rounded cursor-pointer ${metodoPago==='CONTRAENTREGA'?'border-green-600 bg-green-50':'border-gray-200'} ${!esContraentregaValida?'opacity-60':''}`}>
                    <div className="flex justify-between"><div className="flex gap-2"><div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-">📦</div><div><div className="font-black text-xs">Contraentrega ✅ {esContraentregaValida?'Habilitada':''}</div><div className="text- mt-1">Hasta 2 pares máximo por primera vez. Según peso/lugar + anticipo.</div><div className="text- mt-1">Llevas: {totalPares} pares | Previos: {historialCliente.totalPedidos}</div></div></div><input type="radio" disabled={!esContraentregaValida} checked={metodoPago==='CONTRAENTREGA'} onChange={()=>setMetodoPago('CONTRAENTREGA')}/></div>
                  </label>

                  {metodoPago==='CONTRAENTREGA' && esContraentregaValida && (
                    <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded">
                      <div className="font-black text-xs">💰 PAGO ANTICIPO ENVÍO (Obligatorio)</div>
                      <div className="text- mt-1 mb-2">Selecciona dónde pagar el envío por adelantado:</div>
                      <div className="space-y-2">
                        <label className={`bg-white border p-2 rounded flex justify-between items-center ${anticipoPago==='NEQUI'?'border-black':''}`}><div className="flex items-center gap-2"><div className="w-6 h-6 bg-[#2000B1] rounded-full flex items-center justify-center text-white text- font-black">N</div><span className="text-xs">Nequi 3186411851</span></div><input type="radio" checked={anticipoPago==='NEQUI'} onChange={()=>setAnticipoPago('NEQUI')}/></label>
                        <label className={`bg-white border p-2 rounded flex justify-between items-center ${anticipoPago==='BANCOLOMBIA'?'border-black':''}`}><div className="flex items-center gap-2"><div className="w-6 h-6 bg-[#FFC300] rounded-full flex items-center justify-center text- font-black">B</div><span className="text-xs">Bancolombia 9127560414</span></div><input type="radio" checked={anticipoPago==='BANCOLOMBIA'} onChange={()=>setAnticipoPago('BANCOLOMBIA')}/></label>
                        <label className={`bg-white border p-2 rounded flex justify-between items-center ${anticipoPago==='BRE-B'?'border-black':''}`}><div className="flex items-center gap-2"><div className="w-6 h-6 bg-black rounded-full flex items-center justify-center text-white text-">🔑</div><span className="text-xs">Bre-B 83615157565</span></div><input type="radio" checked={anticipoPago==='BRE-B'} onChange={()=>setAnticipoPago('BRE-B')}/></label>
                      </div>
                      <div className="text- text-gray-600 mt-2">Sube comprobante por WhatsApp después de finalizar.</div>
                    </div>
                  )}
                </div>
              )}
              {paso===1 && <div className="space-y-2">{carrito.map((c,i)=><div key={i} className="flex justify-between border p-2 rounded text-xs"><div><b>{c.referencia}</b> x{c.cantidad}</div><button onClick={()=>setCarrito(prev=>prev.filter((_,idx)=>idx!==i))} className="text-red-500">X</button></div>)}</div>}
            </div>
            <div className="p-4 border-t">
              {paso===1 && <button onClick={()=>setPaso(2)} className="w-full bg-black text-white py-3 rounded font-black text-xs">CONTINUAR → DATOS</button>}
              {paso===2 && <div className="flex gap-2"><button onClick={()=>setPaso(1)} className="w-1/3 bg-gray-200 py-3 rounded font-black text-xs">← VOLVER</button><button onClick={()=>setPaso(3)} className="w-2/3 bg-black text-white py-3 rounded font-black text-xs">CONTINUAR → PAGO</button></div>}
              {paso===3 && <div className="flex gap-2"><button onClick={()=>setPaso(2)} className="w-1/3 bg-gray-200 py-3 rounded font-black text-xs">← VOLVER</button><button onClick={finalizarPedido} className="w-2/3 bg-green-600 text-white py-3 rounded font-black text-xs">FINALIZAR - GENERAR GUÍA</button></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
