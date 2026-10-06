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

  const esContraentregaValida = carrito.reduce((a,b)=>a+b.cantidad,0) <= 2

  useEffect(()=>{
    const cargar = async ()=>{
      setLoading(true)
      const { data: emp } = await supabase.from('empresas').select('*').eq('slug', slug).single()
      if(emp){
        setEmpresa(emp)
        const { data: prods } = await supabase.from('productos').select('*').eq('empresa_id', emp.id).eq('activo', true)
        setProductos(prods||[])
      }
      setLoading(false)
    }
    cargar()
  },[slug])

  const seleccionarPago = (metodo) => {
    setMetodoPago(metodo)
    let numero = ''
    if(metodo==='NEQUI') numero = '3186411851'
    if(metodo==='BANCOLOMBIA') numero = '9127560414'
    if(metodo==='BRE-B') numero = '83615157565'
    if(numero){
      navigator.clipboard.writeText(numero)
      setToast(`Copiado: ${numero}`)
      setTimeout(()=>setToast(null), 2000)
    }
  }

  const finalizarPedido = async () => {
    // tu logica existente de crear pedido en supabase
    const totalPares = carrito.reduce((a,b)=>a+b.cantidad,0)
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
      const mensaje = `Hola ${empresa.nombre} - Pedido ${data.numero_guia} - ${totalPares} pares - ${metodoPago}`
      window.open(`https://wa.me/57${WHATSAPP_CONFIRMACION}?text=${encodeURIComponent(mensaje)}`,'_blank')
    }
  }

  if(loading) return <div className="p-8 text-center">Cargando catálogo...</div>
  if(!empresa) return <div className="p-8 text-center">Empresa no encontrada</div>

  return(
    <div className="min-h-screen bg-gray-50 p-4">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded text-xs z-50">{toast}</div>}

      <div className="max-w-md mx-auto bg-white rounded-xl border overflow-hidden">
        <div className="p-4 bg-black text-white text-center">
          <h1 className="font-black">{empresa.nombre}</h1>
          <p className="text- opacity-70">Catálogo oficial</p>
        </div>

        {/* AQUI VA TU LISTADO DE PRODUCTOS / CARRITO - PASO 1 y 2 */}
        {paso===1 && (
          <div className="p-4 space-y-2">
            {productos.map(p=>(
              <div key={p.id} className="border p-2 rounded text-xs">{p.referencia} - Stock: {p.stock}</div>
            ))}
            <button onClick={()=>setPaso(3)} className="w-full bg-black text-white py-3 rounded font-black">IR A PAGAR</button>
          </div>
        )}

        {paso===3 && (
          <div className="p-4 space-y-3">
            <h2 className="font-black text-sm">Selecciona método de pago</h2>

            <div onClick={()=>seleccionarPago('NEQUI')} className={`border-2 p-3 rounded-lg flex justify-between items-center cursor-pointer ${metodoPago==='NEQUI'?'border-black bg-gray-50':''}`}>
              <span className="text-sm font-bold flex items-center gap-2">💜 Nequi {metodoPago==='NEQUI'?'✅ Copiado':''}</span>
              <input type="radio" checked={metodoPago==='NEQUI'} readOnly/>
            </div>

            <div onClick={()=>seleccionarPago('BANCOLOMBIA')} className={`border-2 p-3 rounded-lg flex justify-between items-center cursor-pointer ${metodoPago==='BANCOLOMBIA'?'border-black bg-gray-50':''}`}>
              <span className="text-sm font-bold flex items-center gap-2">🏦 Bancolombia {metodoPago==='BANCOLOMBIA'?'✅ Copiado':''}</span>
              <input type="radio" checked={metodoPago==='BANCOLOMBIA'} readOnly/>
            </div>

            <div onClick={()=>seleccionarPago('BRE-B')} className={`border-2 p-3 rounded-lg flex justify-between items-center cursor-pointer ${metodoPago==='BRE-B'?'border-black bg-gray-50':''}`}>
              <span className="text-sm font-bold flex items-center gap-2">⚡ Llave Bre-B - 83615157565 {metodoPago==='BRE-B'?'✅ Copiado':''}</span>
              <input type="radio" checked={metodoPago==='BRE-B'} readOnly/>
            </div>

            <label className={`border-2 p-3 rounded-lg block ${metodoPago==='CONTRAENTREGA'?'border-green-600 bg-green-50':''} ${!esContraentregaValida?'opacity-60':''}`}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">Contraentrega</div>
                  <div className="text-xs text-gray-600">Hasta 2 pares max 1ra vez + anticipo</div>
                </div>
                <input type="radio" disabled={!esContraentregaValida} checked={metodoPago==='CONTRAENTREGA'} readOnly onChange={()=>setMetodoPago('CONTRAENTREGA')}/>
              </div>
            </label>

            <button onClick={finalizarPedido} className="w-full bg-[#0f2d52] text-white py-4 rounded-lg font-black text-xs mt-4">FINALIZAR - ENVIAR A {WHATSAPP_CONFIRMACION}</button>
          </div>
        )}
      </div>
    </div>
  )
}
