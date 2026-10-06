import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabDespachos({ empresa }){
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const cargar = async () => {
      setLoading(true)
      const { data } = await supabase.from('pedidos')
       .select('*')
       .eq('empresa_id', empresa.id)
       .order('created_at', { ascending: false })
       .limit(100)
      setPedidos(data||[])
      setLoading(false)
    }
    cargar()
  },[empresa.id])

  const imprimirGuia = (pedido) => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>GUIA ${pedido.numero_guia}</title>
      <style>
        @media print { button{display:none} }
        body{font-family:Arial; margin:0; padding:20px}
      </style></head><body>
      <div style="width:380px; border:2px solid black; padding:20px">
        <h2 style="margin:0; font-size:18px">GUÍA DE ENVÍO - ${pedido.numero_guia}</h2>
        <p style="font-size:11px; margin:4px 0">${new Date(pedido.created_at).toLocaleString()} - ${empresa.nombre}</p>
        <hr/>
        <p style="font-size:12px"><b>REMITENTE:</b><br/>
          ${empresa.nombre}<br/>
          3008901150
        </p>
        <p style="font-size:12px"><b>DESTINATARIO:</b><br/>
          ${pedido.cliente_nombre} - ${pedido.cliente_telefono}<br/>
          ${pedido.cliente_ciudad} - ${pedido.cliente_barrio||''}<br/>
          ${pedido.cliente_direccion}<br/>
          CC: ${pedido.cliente_cedula||''}
        </p>
        <hr/>
        <p style="font-size:11px"><b>CONTENIDO:</b><br/>
          ${pedido.items.map(i=>`${i.referencia} Talla:${i.talla} x${i.cantidad}`).join('<br/>')}
          <br/><br/>
          <b>${pedido.total_pares} PARES - ${pedido.metodo_pago}</b>
        </p>
        <p style="text-align:center; margin-top:20px; font-size:11px; font-weight:bold">*** Pegar esta guía en el paquete - SIN PRECIOS ***</p>
      </div>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  if(loading) return <div className="p-4 text-xs">Cargando pedidos...</div>

  return(
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-black text-sm">DESPACHOS + CRM + PAGOS - {empresa.nombre}</h2>
        <p className="text- text-gray-500">{pedidos.length} pedidos - WhatsApp confirmación: 3008901150 - Guía sin precios</p>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left p-3">GUÍA / FECHA</th>
              <th className="text-left p-3">CLIENTE / ENVÍO</th>
              <th className="text-left p-3">PRODUCTOS</th>
              <th className="text-left p-3">ESTADO</th>
              <th className="text-left p-3">ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map(p=>(
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3"><div className="font-black">{p.numero_guia}</div><div className="text- text-gray-500">{new Date(p.created_at).toLocaleString()}</div><div className="text-">{p.metodo_pago} {p.anticipo_metodo?`+ ${p.anticipo_metodo}`:''}</div></td>
                <td className="p-3"><div className="font-black">{p.cliente_nombre}</div><div>{p.cliente_telefono}</div><div>{p.cliente_ciudad} - {p.cliente_direccion}</div></td>
                <td className="p-3"><div>{p.items.map(i=>`${i.referencia} x${i.cantidad}`).join(', ')}</div><div className="font-black">{p.total_pares} pares</div></td>
                <td className="p-3"><span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text- font-black">{p.estado}</span></td>
                <td className="p-3">
                  <button onClick={()=>imprimirGuia(p)} className="bg-black text-white px-3 py-2 rounded font-black text-">🖨️ IMPRIMIR GUÍA</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pedidos.length===0 && <div className="p-8 text-center text-xs text-gray-500">No hay pedidos aún. Cuando un cliente finalice en el catálogo y se confirme por WhatsApp 3008901150 aparecerán aquí.</div>}
      </div>
    </div>
  )
}
