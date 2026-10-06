import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req,res){
  const { pedido_id } = req.body
  const { data: pedido } = await supabase.from('pedidos').select('*').eq('id',pedido_id).single()
  const { data: contactos } = await supabase.from('contactos_despacho').select('*')
  for(const c of contactos||[]){
    await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${process.env.WHATSAPP_TOKEN}`,'Content-Type':'application/json'},
      body: JSON.stringify({
        messaging_product:'whatsapp', to:c.telefono, type:'text',
        text:{ body:`📦 APROBADO MANUAL - ${pedido.cliente?.nombre}\n${pedido.total} pares $${pedido.total_precio}\nPago: ${pedido.metodo_pago}\nRef: ${pedido.carrito?.map(p=>p.referencia).join(',')}` }
      })
    })
  }
  res.json({ok:true})
}
