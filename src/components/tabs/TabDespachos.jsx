import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabDespachos({ empresa }){
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const cargar = async () => {
      setLoading(true)
      // SOLO APROBADOS para despacho
      const { data } = await supabase.from('pedidos')
       .select('*')
       .eq('empresa_id', empresa.id)
       .eq('estado','APROBADO')
       .order('created_at', { ascending: false })
       .limit(100)
      setPedidos(data||[])
      setLoading(false)
    }
    if(empresa?.id) cargar()
  },[empresa?.id])

  const imprimirGuia = (pedido) => {
    const lista = pedido.carrito || pedido.items || []
    const contenido = lista.map(i=>`${i.referencia || i.sku} x${i.cantidad}`).join(', ')
    const totalPares = pedido.total_pares || pedido.total || lista.reduce((a,b)=>a+(b.cantidad||0),0)

    const win = window.open('', '_blank')
    win.document.write(`<html><body><div style="width:380px;border:2px solid black;padding:20px;font-family:Arial">
      <h2>GUÍA ${pedido.numero_guia || pedido.id.slice(0,8).toUpperCase()}</h2>
      <p><b>DESTINATARIO:</b><br/>${pedido.cliente?.nombre || pedido.cliente_nombre}<br/>${pedido.cliente?.telefono || pedido.cliente_telefono}<br/>${pedido.cliente?.ciudad || pedido.cliente_ciudad} - ${pedido.cliente?.direccion || pedido.cliente_direccion}</p>
      <p><b>CONTENIDO:</b> ${contenido} - ${totalPares} PARES</p>
      <p><b>EMPRESA:</b> ${empresa.nombre} - WhatsApp: 3008901150</p>
      <p style="text-align:center">*** Pegar en paquete - SIN PRECIOS ***</p>
    </div><script>window.print()</script></body></html>`)
  }

  const marcarDespachado = async (pedido) => {
    await supabase.from('pedidos').update({estado:'DESPACHADO'}).eq('id',pedido.id)
    setPedidos(pedidos.filter(p=>p.id!==pedido.id))
  }

  if(loading) return <div className="p-4 text-xs">Cargando despachos...</div>

  return(
    <div className="space-y-4">
      <div className="bg-white border p-4 rounded-xl">
        <h2 className="font-black text-sm">DESPACHOS - {empresa.nombre}</h2>
        <p className="text-xs">WhatsApp: 3008901150 - Guía sin precios - Solo APROBADOS</p>
        <p className="text-xs font-bold">{pedidos.length} pedidos listos para imprimir</p>
      </div>
      <div className="bg-white border rounded-xl">
        {pedidos.length===0 && <div className="p-4 text-xs text-center">No hay pedidos APROBADOS</div>}
        {pedidos.map(p=>(
          <div key={p.id} className="flex justify-between items-center p-3 border-t text-xs">
            <div>
              <div className="font-black">{p.numero_guia || p.id.slice(0,8)}</div>
              <div>{p.cliente?.nombre || p.cliente_nombre} - {p.cliente?.ciudad || p.cliente_ciudad}</div>
              <div className="text-">${p.total_precio} - {p.metodo_pago}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>imprimirGuia(p)} className="bg-black text-white px-3 py-2 rounded font-black">🖨 GUÍA</button>
              <button onClick={()=>marcarDespachado(p)} className="bg-green-600 text-white px-3 py-2 rounded font-black">✓</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
