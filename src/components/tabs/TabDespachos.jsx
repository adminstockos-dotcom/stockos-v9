import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabDespachos({ empresa }){
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const cargar = async () => {
      setLoading(true)
      const { data } = await supabase.from('pedidos').select('*').eq('empresa_id', empresa.id).order('created_at', { ascending: false }).limit(100)
      setPedidos(data||[])
      setLoading(false)
    }
    if(empresa?.id) cargar()
  },[empresa?.id])

  const imprimirGuia = (pedido) => {
    const win = window.open('', '_blank')
    win.document.write(`<html><body><div style="width:380px;border:2px solid black;padding:20px;font-family:Arial">
      <h2>GUÍA ${pedido.numero_guia}</h2>
      <p><b>DESTINATARIO:</b><br/>${pedido.cliente_nombre}<br/>${pedido.cliente_telefono}<br/>${pedido.cliente_ciudad} - ${pedido.cliente_direccion}</p>
      <p><b>CONTENIDO:</b> ${pedido.items.map(i=>`${i.referencia} x${i.cantidad}`).join(', ')} - ${pedido.total_pares} PARES</p>
      <p style="text-align:center">*** Pegar en paquete - SIN PRECIOS ***</p>
    </div><script>window.print()</script></body></html>`)
  }

  if(loading) return <div className="p-4 text-xs">Cargando...</div>

  return(
    <div className="space-y-4">
      <div className="bg-white border p-4 rounded-xl"><h2 className="font-black text-sm">DESPACHOS - {empresa.nombre}</h2><p className="text-">WhatsApp: 3008901150 - Guía sin precios</p></div>
      <div className="bg-white border rounded-xl">
        {pedidos.map(p=>(
          <div key={p.id} className="flex justify-between p-3 border-t text-">
            <div><div className="font-black">{p.numero_guia}</div><div>{p.cliente_nombre} - {p.cliente_ciudad}</div></div>
            <button onClick={()=>imprimirGuia(p)} className="bg-black text-white px-3 py-2 rounded font-black">🖨️ IMPRIMIR GUÍA</button>
          </div>
        ))}
      </div>
    </div>
  )
}
