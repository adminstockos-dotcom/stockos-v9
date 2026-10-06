import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const WHATSAPP_CONFIRMACION = '3008901150'

export default function CatalogoPublico(){
  const { slug } = useParams()
  const [empresa, setEmpresa] = useState(null)
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [paso, setPaso] = useState(1)
  const [metodoPago, setMetodoPago] = useState(null)
  const [cliente, setCliente] = useState({ nombre:'', telefono:'', ciudad:'', direccion:'', barrio:'', cedula:'' })
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  const totalPares = carrito.reduce((a,b)=>a+b.cantidad,0)
  const esContraentregaValida = totalPares <= 2 && totalPares > 0

  useEffect(()=>{
    const cargar = async ()=>{
      setLoading(true)
      const s = (slug || 'maxima').toLowerCase().trim()
      let { data: emp } = await supabase.from('empresas').select('*').ilike('slug', s).maybeSingle()
      if(!emp){
        const { data } = await supabase.from('empresas').select('*').ilike('slug', `%${s}%`).limit(1).maybeSingle()
        emp = data
      }
      if(emp){
        setEmpresa(emp)
        const { data: prods } = await supabase.from('productos').select('*').eq('empresa_id', emp.id).eq('activo', true).order('referencia')
        setProductos(prods||[])
      }
      setLoading(false)
    }
    cargar()
  },[slug])

  const addCarrito = (prod, talla='UNICA') => {
    setCarrito(prev=>{
      const ex = prev.find(p=>p.id===prod.id && p.talla===talla)
      if(ex) return prev.map(p=> p.id===prod.id && p.talla===talla? {...p, cantidad:p.cantidad+1} : p)
      return [...prev, { id: prod.id, referencia: prod.referencia, talla, cantidad:1, precio: prod.precio, imagen_url: prod.imagen_url || prod.imagen }]
    })
    setToast(`Agregado: ${prod.referencia}`)
    setTimeout(()=>setToast(null),1500)
  }

  const quitarCarrito = (id, talla) => {
    setCarrito(prev=> prev.filter(p=>!(p.id===id && p.talla===talla)))
  }

  const seleccionarPago = (metodo) => {
    setMetodoPago(metodo)
    const nums = { NEQUI:'3186411851', BANCOLOMBIA:'9127560414', 'BRE-B':'83615157565' }
    if(nums[metodo]){
      navigator.clipboard.writeText(nums[metodo])
      setToast(`Copiado: ${nums[metodo]}`)
      setTimeout(()=>setToast(null),2000)
    }
  }

  const finalizarPedido = async () => {
    if(!cliente.nombre ||!cliente.telefono) { setToast('Falta nombre y teléfono'); return }
    if(!metodoPago) { setToast('Selecciona método de pago'); return }
    const { data, error } = await supabase.from('pedidos').insert([{
      empresa_id: empresa.id,
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
      cliente_ciudad: cliente.ciudad,
      cliente_direccion: cliente.direccion,
      cliente_barrio: cliente.barrio,
      cliente_cedula: cliente.cedula,
      items: carrito,
      total_pares: totalPares,
      metodo_pago: metodoPago,
      estado: 'PENDIENTE',
      numero_guia: `GUIA-${Date.now()}`
    }]).select().single()

    if(!error){
      const msg = `Hola ${empresa.nombre} - Pedido ${data.numero_guia} - ${totalPares} pares - ${metodoPago} - Cliente ${cliente.nombre} ${cliente.ciudad}`
      window.open(`https://wa.me/57${WHATSAPP_CONFIRMACION}?text=${encodeURIComponent(msg)}`,'_blank')
    }
  }

  if(loading) return <div className="p-8 text-center text-xs">Cargando catálogo...</div>
  if(!empresa) return <div className="p-8 text-center font-black">Empresa no encontrada</div>

  return(
    <div className="min-h-screen bg-gray-50 p-3">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-xs z-50 shadow-xl">{toast}</div>}

      <div className="max-w-6xl mx-auto">
        <div className="bg-black text-white p-4 rounded-t-xl text-center">
          <h1 className="font-black text-lg">{empresa.nombre}</h1>
          <p className="text- opacity-60">Catálogo oficial - {empresa.slug}</p>
        </div>

        <div className="bg-white rounded-b-xl border p-4">
          {/* PASO 1 - PRODUCTOS */}
          {paso===1 && (
            <>
              {productos.length===0? (
                <div className="py-16 text-center text-xs text-gray-500">
                  Catálogo vacío - Ve al panel y dale <b>ESCANEAR AHORA</b> para cargar stock de {empresa.nombre}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {productos.map(p=>(
                    <div key={p.id} className="border rounded-lg overflow-hidden flex flex-col">
                      <div className="aspect-square bg-gray-100">
                        {p.imagen_url || p.imagen? <img src={p.imagen_url || p.imagen} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text- text-gray-400">SIN FOTO</div>}
                      </div>
                      <div className="p-2 flex-1">
                        <div className="font-black text-xs">{p.referencia}</div>
                        <div className="text- text-gray-500">Stock: {p.stock} | ${p.precio?.toLocaleString()}</div>
                      </div>
                      <button onClick={()=>addCarrito(p)} className="bg-black text-white text- font-black py-2">AGREGAR</button>
                    </div>
                  ))}
                </div>
              )}
              {carrito.length>0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#0f2d52] text-white rounded-full p-2 flex justify-between items-center shadow-2xl">
                  <span className="text-xs font-black px-4">{totalPares} pares - {carrito.length} refs</span>
                  <button onClick={()=>setPaso(2)} className="bg-white text-black px-6 py-2 rounded-full font-black text-xs">VER CARRITO</button>
                </div>
              )}
            </>
          )}

          {/* PASO 2 - DATOS CLIENTE */}
          {paso===2 && (
            <div className="max-w-md mx-auto space-y-3">
              <h2 className="font-black text-sm">Datos de envío</h2>
              {carrito.map((c,i)=>(
                <div key={i} className="flex justify-between text-xs border p-2 rounded">
                  <span>{c.referencia} x{c.cantidad}</span>
                  <button onClick={()=>quitarCarrito(c.id,c.talla)} className="text-red-600 font-black">X</button>
                </div>
              ))}
              <input placeholder="Nombre" value={cliente.nombre} onChange={e=>setCliente({...cliente,nombre:e.target.value})} className="w-full border p-3 rounded text-xs"/>
              <input placeholder="WhatsApp" value={cliente.telefono} onChange={e=>setCliente({...cliente,telefono:e.target.value})} className="w-full border p-3 rounded text-xs"/>
              <input placeholder="Ciudad" value={cliente.ciudad} onChange={e=>setCliente({...cliente,ciudad:e.target.value})} className="w-full border p-3 rounded text-xs"/>
              <input placeholder="Dirección" value={cliente.direccion} onChange={e=>setCliente({...cliente,direccion:e.target.value})} className="w-full border p-3 rounded text-xs"/>
              <div className="flex gap-2">
                <button onClick={()=>setPaso(1)} className="flex-1 border py-3 rounded font-black text-xs">VOLVER</button>
                <button onClick={()=>setPaso(3)} className="flex-1 bg-black text-white py-3 rounded font-black text-xs">IR A PAGAR</button>
              </div>
            </div>
          )}

          {/* PASO 3 - PAGOS */}
          {paso===3 && (
            <div className="max-w-md mx-auto space-y-3">
              <h2 className="font-black text-sm">Selecciona método de pago</h2>

              <div onClick={()=>seleccionarPago('NEQUI')} className={`border-2 p-3 rounded-lg flex justify-between items-center cursor-pointer ${metodoPago==='NEQUI'?'border-black bg-gray-50':''}`}>
                <span className="text-sm font-bold flex items-center gap-2">💜 Nequi {metodoPago==='NEQUI'?'✅ Copiado':''}</span>
                <span className="text-xs">3186411851</span>
              </div>

              <div onClick={()=>seleccionarPago('BANCOLOMBIA')} className={`border-2 p-3 rounded-lg flex justify-between items-center cursor-pointer ${metodoPago==='BANCOLOMBIA'?'border-black bg-gray-50':''}`}>
                <span className="text-sm font-bold flex items-center gap-2">🏦 Bancolombia {metodoPago==='BANCOLOMBIA'?'✅ Copiado':''}</span>
                <span className="text-xs">9127560414</span>
              </div>

              <div onClick={()=>seleccionarPago('BRE-B')} className={`border-2 p-3 rounded-lg flex justify-between items-center cursor-pointer ${metodoPago==='BRE-B'?'border-black bg-gray-50':''}`}>
                <span className="text-sm font-bold flex items-center gap-2">⚡ Llave Bre-B - 83615157565 {metodoPago==='BRE-B'?'✅ Copiado':''}</span>
                <span className="text-xs">83615157565</span>
              </div>

              <label className={`border-2 p-3 rounded-lg block cursor-pointer ${metodoPago==='CONTRAENTREGA'?'border-green-600 bg-green-50':''} ${!esContraentregaValida?'opacity-50':''}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm">Contraentrega</div>
                    <div className="text-xs text-gray-600">Hasta 2 pares máx 1ra vez + anticipo</div>
                  </div>
                  <input type="radio" disabled={!esContraentregaValida} checked={metodoPago==='CONTRAENTREGA'} onChange={()=>setMetodoPago('CONTRAENTREGA')}/>
                </div>
              </label>

              <button onClick={finalizarPedido} className="w-full bg-[#0f2d52] text-white py-4 rounded-lg font-black text-xs mt-2">FINALIZAR - ENVIAR A {WHATSAPP_CONFIRMACION}</button>
              <button onClick={()=>setPaso(2)} className="w-full text-xs text-gray-500">← Volver</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
