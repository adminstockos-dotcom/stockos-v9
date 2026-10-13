export default async function handler(req,res){
  const SUPA_URL=process.env.SUPABASE_URL
  const SUPA_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY
  let BEARER=(process.env.MBR_BEARER_TOKEN||'').trim().replace(/^Bearer\s+/i,'')
  if(!SUPA_URL||!SUPA_KEY||!BEARER) return res.status(500).json({error:'Falta ENV en Vercel', hasUrl:!!SUPA_URL, hasKey:!!SUPA_KEY, bearerLen:BEARER.length})
  try{
    let page=1,pages=1,total=0
    do{
      const r=await fetch(`https://mbr.demachine.co/api/requests/indexMe?page=${page}&maxPerPage=100`,{headers:{Authorization:`Bearer ${BEARER}`}})
      const txt=await r.text()
      if(!r.ok) return res.status(500).json({error:`MBR ${r.status}`, body:txt.slice(0,800), hint:r.status===401?'TOKEN EXPIRADO':''})
      const data=JSON.parse(txt).data
      pages=data.info?.pages||1
      const rows=data.results.map(x=>({
        referencia:(x.product||'').trim(), nombre:x.product, precio:parseInt(x.price,10)||0, stock:parseInt(x.quantity,10)||1,
        talla:x.size, marca:x.brand, imagen:x.image_src?`https://mbr.demachine.co${x.image_src}`:null,
        imagen_sin_fondo:x.image_src?`https://mbr.demachine.co${x.image_src}`:null, updated_at:new Date().toISOString()
      }))
      for(let i=0;i<rows.length;i+=50){
        const chunk=rows.slice(i,i+50)
        const supa=await fetch(`${SUPA_URL}/rest/v1/productos_maestro?on_conflict=referencia`,{method:'POST', headers:{apikey:SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates'}, body:JSON.stringify(chunk)})
        if(!supa.ok){const t=await supa.text(); return res.status(500).json({error:'Supabase '+supa.status, detail:t.slice(0,800)})}
      }
      total+=rows.length; page++
    }while(page<=pages)
    return res.json({ok:true, total, msg:`${total} productos`})
  }catch(e){return res.status(500).json({error:e.message})}
}
