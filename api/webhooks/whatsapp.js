import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const NUMERO_NEQUI_OFICIAL = '57XXXXXXXX'
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'maxima123'

async function notificarDespacho(pedido){
  const { data: contactos } = await supabase.from('contactos_despacho').select('*')
  if(!contactos?.length) return
  await Promise.all(contactos.map(c =>
    fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${process.env.WHATSAPP_TOKEN}`,'Content-Type':'application/json'},
      body: JSON.stringify({
        messaging_product:'whatsapp', to: c.telefono, type:'text',
        text:{ body:`📦 PEDIDO PAGADO ${pedido.estado}\nCliente: ${pedido.cliente?.nombre} - ${pedido.total} pares $${pedido.total_precio}\nPago: ${pedido.metodo_pago}` }
      })
    })
  ))
}

export default async function handler(req, res){
  if(req.method === 'GET'){
    if(req.query['hub.mode']==='subscribe' && req.query['hub.verify_token']===VERIFY_TOKEN) return res.status(200).send(req.query['hub.challenge'])
    return res.status(403).send('Forbidden')
  }
  if(req.method!== 'POST') return res.status(200).json({ok:true})
  try{
    const value = req.body.entry?.[0]?.changes?.[0]?.value
    const msg = value?.messages?.[0]?.text?.body || ''
    const from = value?.messages?.[0]?.from || ''
    const esNequi = msg.toLowerCase().includes('recibiste') && (NUMERO_NEQUI_OFICIAL==='57XXXXXXXX' || from.includes(NUMERO_NEQUI_OFICIAL))
    if(!esNequi) return res.status(200).json({ok:true})
    const monto = parseInt((msg.match(/\$?([\d.,]+)/)?.[1]||'0').replace(/[.,]/g,''))
    if(monto<=0) return res.status(200).json({ok:true})
    const { data: pedido } = await supabase.from('pedidos').select('*').eq('estado','PENDIENTE').eq('total_precio',monto).gte('created_at', new Date(Date.now()-60*60*1000).toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle()
    if(pedido){
      await supabase.from('pedidos').update({estado:'APROBADO', confirmacion_nequi:msg, metodo_pago:'Nequi 3186411851'}).eq('id',pedido.id)
      await notificarDespacho({...pedido, estado:'APROBADO', metodo_pago:'Nequi 3186411851'})
    }
    return res.status(200).json({ok:true})
  }catch(e){ return res.status(200).json({ok:true}) }
}
