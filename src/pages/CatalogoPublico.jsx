import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const DEMO = [
  { referencia: 'BLUSA-SATIN-001', talla: 'M', precio: 45000 },
  { referencia: 'JEAN-MOM-002', talla: '32', precio: 78000 },
  { referencia: 'VESTIDO-LIN-003', talla: 'S', precio: 62000 },
  { referencia: 'CROP-TOP-004', talla: 'L', precio: 35000 },
  { referencia: 'FALDA-DRILL-005', talla: '30', precio: 55000 },
]

export default function CatalogoPublico(){
  const empresaIdFallback = '676d535d-5045-41ac-9d7a-1177095e75d4'
  const WHATSAPP_CONFIRMACION = '3008901150'

  const [items, setItems] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [empresa, setEmpresa] = useState({ nombre: 'MÁXIMA IMPORTADORES', logo: null })
  const [paso, setPaso] = useState(1)
  const [datosEnvio, setDatosEnvio] = useState({ nombre:'', telefono:'', cedula:'', ciudad:'', direccion:'', barrio:'' })
  const [metodoPago, setMetodoPago] = useState('NEQUI')
  const [anticipoPago, setAnticipoPago] = useState('BRE-B')
  const [historialCliente, setHistorialCliente] = useState({ totalPedidos: 0, esPrimeraVez: true, verificando: false })
  const [toast, setToast] = useState('')

  const datosPago = {
    NEQUI: { label: 'Nequi', numero: '3186411851' },
    BANCOLOMBIA: { label: 'Bancolombia Ahorros', numero: '9127560414' },
    'BRE-B': { label: 'Llave Bre-B', numero: '83615157565' },
  }

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

  const copiar = (texto) => {
    navigator.clipboard.writeText(texto)
    setToast(`Copiado: ${texto}`)
    setTimeout(()=>setToast(''), 2000)
  }

  const seleccionarPago = (metodo) => {
    setMetodoPago(metodo)
    if(datosPago[metodo]) copiar(datosPago[metodo].numero)
  }

  const seleccionarAnticipo = (metodo) => {
    setAnticipoPago(metodo)
    if(datosPago[metodo]) copiar(datosPago[metodo].numero)
  }

  const verificarCliente = async () => {
    if(datosEnvio.telefono.length<10) return
    setHistorialCliente(p=>({...p, verificando:true}))
    const { data } = await supabase.from('pedidos').select('id').eq('empresa_id', empresaIdFallback).eq('cliente_telefono', datosEnvio.telefono).limit(10)
    const total = data?.length||0
    setHistorialCliente({ totalPedidos: total, esPrimeraVez: total===0, verificando:false })
    if(total>0 && metodoPago==='CONTRAENTREGA') setMetodoPago('NEQUI')
  }

  useEffect(()=>{ if(datosEnvio.telefono.length>=10) verificarCliente() },[datosEnvio.telefono])

  const total = carrito.reduce((s,p)=>s+Number(p.precio||0)*p.cantidad,0)
  const totalPares = carrito.reduce((s,p)=>s+p.cantidad,0)
  const esContraentregaValida = historialCliente.esPrimeraVez && totalPares>=1 && totalPares<=2
  const getCantidad = (ref, talla) => carrito.find(c=>c.referencia===ref && c.talla===talla)?.cantidad || 0

  const addCarrito = (prod) => {
    setCarrito(prev=>{
      const ex = prev.find(p=>p.referencia===prod.referencia && p.talla===prod.talla)
      if(ex) return prev.map(p=>p===ex?{...p,cantidad:p.cantidad+1}:p)
      return [...prev,{...prod,cantidad:1}]
    })
  }

  const restarCarrito = (prod) => {
    setCarrito(prev=>{
      const ex = prev.find(p=>p.referencia===prod.referencia && p.talla===prod.talla)
      if(!ex) return prev
      if(ex.cantidad<=1) return prev.filter(p=>p!==ex)
      return prev.map(p=>p===ex?{...p,cantidad:p.cantidad-1}:p)
    })
  }

  const lista = items.length>0? items : DEMO
  const filtrados = lista.filter(i=> i.referencia.toLowerCase().includes(busqueda.toLowerCase()))

  const finalizarPedido = async () => {
    if(!datosEnvio.nombre ||!datosEnvio.telefono ||!datosEnvio.ciudad ||!datosEnvio.direccion) return alert('Faltan datos de envío')

    const numeroGuia = `GUIA-${Date.now().toString().slice(-6)}`

    const pedidoDB = {
      empresa_id: empresaIdFallback,
      numero_guia: numeroGuia,
      cliente_nombre: datosEnvio.nombre,
      cliente_telefono: datosEnvio.telefono,
      cliente_cedula: datosEnvio.cedula,
      cliente_ciudad: datosEnvio.ciudad,
      cliente_direccion: datosEnvio.direccion,
      cliente_barrio: datosEnvio.barrio,
      es_primera_vez: historialCliente.esPrimeraVez,
      metodo_pago: metodoPago,
      anticipo_metodo: metodoPago==='CONTRAENTREGA'?anticipoPago:null,
      total_pares: totalPares,
      items: carrito,
      total,
      estado: 'pendiente_confirmacion_whatsapp'
    }
    await supabase.from('pedidos').insert(pedidoDB)

    let msg = `*NUEVO PEDIDO ${numeroGuia}*\n`
    msg += `${carrito.map(c=>`• ${c.referencia} T:${c.talla} x${c.cantidad}`).join('\n')}\n`
    msg += `Pares: ${totalPares}\n`
    msg += `Cliente: ${datosEnvio.nombre} - ${datosEnvio.telefono}\n`
    msg += `${datosEnvio.ciudad} - ${datosEnvio.direccion} - ${datosEnvio.barrio}\n`
    msg += `Pago: ${metodoPago} ${metodoPago==='CONTRAENTREGA'?`+ Anticipo ${anticipoPago} ${datosPago[anticipoPago].numero}`: `${datosPago[metodoPago].numero}`}`

    window.open(`https://wa.me/57${WHATSAPP_CONFIRMACION}?text=${encodeURIComponent(msg)}`,'_blank')
    setCarrito([])
    setShowCart(false)
    setPaso(1)
  }

  return(
    <div className="min-h-screen bg-white">
      <div className="bg-[#0f2d52] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2"><div className="bg-white text-[#0f2d52] w-8 h-8 rounded-full flex items-center justify-center font-black">S</div><span className="font-black text-">STOCKOS</span></div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          {empresa.logo? <img src={empresa.logo} className="w-9 h-9 rounded-full bg-white object-cover border-2 border-white"/> : <div className="w-9 h-9 rounded-full bg-white text-[#0f2d52] flex items-center justify-center font-black">M</div>}
          <div className="hidden md:block leading-none"><div className="font-black text- uppercase">{empresa.nombre}</div><div className="text- text-gray-300">CATALOGO OFICIAL</div></div>
        </div>
        <div className="flex items-center gap-2">
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar ref..." className="text-black px-3 py-2 rounded text-xs w-28 md:w-60"/>
          <button onClick={()=>{setShowCart(true); setPaso(1)}} className="bg-white text-black px-4 py-2 rounded-full font-black text-xs">🛒 {totalPares} | ${total.toLocaleString()}</button>
        </div>
      </div>

      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-xs z-[100] font-black">{toast} ✅ Copiado</div>}

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtrados.map((it,idx)=>{
            const cant = getCantidad(it.referencia, it.talla)
            return(
              <div key={idx} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="bg-gray-100 h-48 flex items-center justify-center text- text-gray-400">IMAGEN<br/>{it.referencia}</div>
                <div className="p-3">
                  <div className="font-black text- truncate">{it.referencia}</div>
                  <div className="text- text-gray-500">Talla: {it.talla}</div>
                  <div className="font-black text- mt-1">${Number(it.precio).toLocaleString()}</div>
                  {cant===0? <button onClick={()=>addCarrito(it)} className="mt-2 w-full bg-black text-white py-2.5 rounded font-black text-">AÑADIR AL CARRITO</button> :
                  <div className="mt-2 flex items-center justify-between bg-black text-white rounded py-1 px-2"><button onClick={()=>restarCarrito(it)} className="w-8 h-8 bg-white text-black rounded-full font-black">-</button><span className="font-black text-">{cant}</span><button onClick={()=>addCarrito(it)} className="w-8 h-8 bg-white text-black rounded-full font-black">+</button></div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col">
            <div className="bg-[#0f2d52] text-white p-4 flex justify-between items-center"><h3 className="font-black text-sm">MÉTODO DE PAGO</h3><button onClick={()=>setShowCart(false)} className="bg-white text-black w-7 h-7 rounded-full">X</button></div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {paso===1 && <div className="space-y-2">{carrito.map((c,i)=><div key={i} className="flex justify-between border p-2 rounded text-xs"><span>{c.referencia} x{c.cantidad}</span><div className="flex gap-1"><button onClick={()=>restarCarrito(c)} className="border w-6 h-6 rounded-full">-</button><button onClick={()=>addCarrito(c)} className="border w-6 h-6 rounded-full">+</button></div></div>)}<button onClick={()=>setPaso(2)} className="w-full bg-black text-white py-3 rounded font-black text-xs mt-4">CONTINUAR</button></div>}
              {paso===2 && <div className="space-y-2"><input value={datosEnvio.nombre} onChange={e=>setDatosEnvio({...datosEnvio,nombre:e.target.value})} placeholder="Nombre *" className="w-full border p-2 rounded text-xs"/><input value={datosEnvio.telefono} onChange={e=>setDatosEnvio({...datosEnvio,telefono:e.target.value})} placeholder="WhatsApp *" className="w-full border p-2 rounded text-xs"/><input value={datosEnvio.ciudad} onChange={e=>setDatosEnvio({...datosEnvio,ciudad:e.target.value})} placeholder="Ciudad *" className="w-full border p-2 rounded text-xs"/><input value={datosEnvio.direccion} onChange={e=>setDatosEnvio({...datosEnvio,direccion:e.target.value})} placeholder="Dirección *" className="w-full border p-2 rounded text-xs"/><input value={datosEnvio.barrio} onChange={e=>setDatosEnvio({...datosEnvio,barrio:e.target.value})} placeholder="Barrio" className="w-full border p-2 rounded text-xs"/><button onClick={()=>setPaso(3)} className="w-full bg-black text-white py-3 rounded font-black text-xs">CONTINUAR A PAGO</button></div>}
              {paso===3 && (
                <div className="space-y-3">
                  <div onClick={()=>seleccionarPago('【entity-NEQUI¦canonical_name=Nequi】')} className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='NEQUI'?'border-black bg-gray-50':''}`}><span className="text-xs font-black">【entity-Nequi¦canonical_name=Nequi】 - 3186411851 {metodoPago==='【entity-NEQUI¦canonical_name=Nequi】'?'✅ Copiado':''}</span><input type="radio" checked={metodoPago==='【entity-NEQUI¦canonical_name=Nequi】'} readOnly/></div>
                  <div onClick={()=>seleccionarPago('【entity-BANCOLOMBIA¦canonical_name=Bancolombia】')} className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='BANCOLOMBIA'?'border-black bg-gray-50':''}`}><span className="text-xs font-black">【entity-Bancolombia¦canonical_name=Bancolombia】 - 9127560414 {metodoPago==='【entity-BANCOLOMBIA¦canonical_name=Bancolombia】'?'✅ Copiado':''}</span><input type="radio" checked={metodoPago==='【entity-BANCOLOMBIA¦canonical_name=Bancolombia】'} readOnly/></div>
                  <div onClick={()=>seleccionarPago('BRE-B')} className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='BRE-B'?'border-black bg-gray-50':''}`}><span className="text-xs font-black">Llave Bre-B - 83615157565 {metodoPago==='BRE-B'?'✅ Copiado':''}</span><input type="radio" checked={metodoPago==='BRE-B'} readOnly/></div>
                  <label className={`border-2 p-3 rounded block ${metodoPago==='CONTRAENTREGA'?'border-green-600 bg-green-50':''} ${!esContraentregaValida?'opacity-60':''}`}>
                    <div className="flex justify-between items-center"><div><div className="font-black text-xs">Contraentrega</div><div className="text-">Hasta 2 pares max 1ra vez + anticipo</div></div><input type="radio" disabled={!esContraentregaValida} checked={metodoPago==='CONTRAENTREGA'} readOnly onChange={()=>setMetodoPago('CONTRAENTREGA')}/></div>
                    {metodoPago==='CONTRAENTREGA' && esContraentregaValida && (
                      <div className="mt-3 bg-yellow-50 border border-yellow-400 p-3 rounded">
                        <div className="font-black text-xs">Paga anticipo envío:</div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={()=>seleccionarAnticipo('NEQUI')} className={`px-3 py-1.5 rounded text-xs border ${anticipoPago==='NEQUI'?'bg-black text-white':''}`}>Nequi</button>
                          <button onClick={()=>seleccionarAnticipo('BANCOLOMBIA')} className={`px-3 py-1.5 rounded text-xs border ${anticipoPago==='BANCOLOMBIA'?'bg-black text-white':''}`}>Bancolombia</button>
                          <button onClick={()=>seleccionarAnticipo('BRE-B')} className={`px-3 py-1.5 rounded text-xs border ${anticipoPago==='BRE-B'?'bg-black text-white':''}`}>Bre-B ✅</button>
                        </div>
                        <div className="text- mt-2">Copiado: <b>{datosPago[anticipoPago].numero}</b></div>
                      </div>
                    )}
                  </label>
                  <button onClick={finalizarPedido} className="w-full bg-[#0f2d52] text-white py-4 rounded font-black text-xs mt-4">FINALIZAR - ENVIAR A {WHATSAPP_CONFIRMACION}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
