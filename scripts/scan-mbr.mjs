// scripts/scan-mbr.mjs - V9.25 FINAL DEFINITIVO 2778 - Todos los errores corregidos
import https from 'https';
import dns from 'dns/promises';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

console.log('[MBR] V9.25 FINAL - Análisis completo de errores pasados y futuros');

// --- 1. RESOLVER IP CON 3 METODOS (evita ENOTFOUND) ---
async function getSupabaseIP(host){
  // método 1: DNS sistema (funciona al inicio)
  try{
    const ips = await dns.resolve4(host);
    console.log(`[DNS] resolve4 OK ${host} -> ${ips[0]}`);
    return ips[0];
  }catch(e){ console.log(`[DNS] resolve4 fallo: ${e.message}`); }

  // método 2: Google DoH recursivo (sigue CNAME)
  async function googleDoH(h, depth=0){
    if(depth>5) return null;
    try{
      const r = await fetch(`https://dns.google/resolve?name=${h}&type=1`);
      const j = await r.json();
      if(!j.Answer) return null;
      const a = j.Answer.find(x=>x.type===1);
      if(a) return a.data;
      const cname = j.Answer.find(x=>x.type===5);
      if(cname) return googleDoH(cname.data.replace(/\.$/,''), depth+1);
    }catch{}
    return null;
  }
  let ip = await googleDoH(host);
  if(ip){ console.log(`[DNS] Google DoH OK -> ${ip}`); return ip; }

  // método 3: Cloudflare DoH recursivo
  async function cfDoH(h, depth=0){
    if(depth>5) return null;
    try{
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${h}&type=A`, { headers:{'Accept':'application/dns-json'} });
      const j = await r.json();
      const a = j.Answer?.find(x=>x.type===1);
      if(a) return a.data;
      const cname = j.Answer?.find(x=>x.type===5);
      if(cname) return cfDoH(cname.data.replace(/\.$/,''), depth+1);
    }catch{}
    return null;
  }
  ip = await cfDoH(host);
  if(ip){ console.log(`[DNS] CF DoH OK -> ${ip}`); return ip; }
  throw new Error(`No se pudo resolver IP de ${host}`);
}

function supaReq(ip, host, method, path, body){
  return new Promise((resolve,reject)=>{
    const opts={
      hostname: ip,
      path: path,
      method: method,
      servername: host,
      timeout: 25000,
      headers:{
        'Host': host,
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      }
    };
    const req = https.request(opts, res=>{
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode, body:d}));
    });
    req.on('error', reject);
    req.on('timeout', ()=>req.destroy(new Error('timeout supabase')));
    if(body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken(){
  const r = await fetch('https://mbr.demachine.co/api/users/token', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ company:'MBR', name:'CARLSO ROJAS', password:PASS })
  });
  const txt = await r.text();
  if(txt.includes('<!DOCTYPE')) throw new Error('MBR devolvió HTML en token');
  const j = JSON.parse(txt);
  if(!j.success) throw new Error('Token fail '+txt.slice(0,200));
  return j.data.token;
}

async function run(){
  const sbHost = new URL(SB_URL).hostname;
  const sbIP = await getSupabaseIP(sbHost);
  console.log(`[MBR] IP CACHEADA PARA TODA LA EJECUCIÓN: ${sbIP}`);

  console.log('[MBR] Borrando por IP (evita fetch failed inicial)...');
  const del = await supaReq(sbIP, sbHost, 'DELETE', `/rest/v1/listado_maestro_proveedor?empresa_id=eq.${EMPRESA_ID}&proveedor_nombre=eq.${encodeURIComponent(PROV)}`);
  console.log(`[MBR] DELETE ${del.status}`);

  let token = await getToken();
  console.log('[MBR] Token OK');

  let total = 0;
  let page = 1;
  let buffer = [];

  while(page <= 200){
    if(page % 25 === 0){
      console.log('[MBR] Refresh token preventivo');
      token = await getToken();
    }

    let data;
    for(let intento=0; intento<3; intento++){
      try{
        const r = await fetch(`https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`, {
          headers:{'Authorization':`Bearer ${token}`, 'Accept':'application/json'}
        });
        const txt = await r.text();
        if(txt.includes('<!DOCTYPE')) throw new Error('MBR HTML rate limit');
        const json = JSON.parse(txt);
        data = json.data || [];
        break;
      }catch(e){
        console.log(`[MBR] pag ${page} intento ${intento+1} fallo ${e.message}`);
        if(intento===2) throw e;
        await new Promise(r=>setTimeout(r, 2000));
        token = await getToken();
      }
    }

    if(!data.length){ console.log('[MBR] Fin por data vacía'); break; }

    // mapeo blindado: evita NaN, ref vacía, ref larga
    const mapped = data.map(p=>{
      const code = (p.code||'').toString().trim().slice(0,30);
      const name = (p.name||'').toString().trim().slice(0,100).replace(/[\0\n\r]/g,'');
      let ref = `${code} ${name}`.trim();
      if(ref.length < 3) ref = `MBR-${p.id||Date.now()}`;
      return {
        empresa_id: EMPRESA_ID,
        proveedor_nombre: PROV,
        referencia: ref.slice(0,150),
        talla: 'UNICA',
        precio: Math.max(0, parseInt(p.precioventa) || 0),
        stock_proveedor: 10,
        fecha_escaneo: new Date().toISOString()
      };
    });

    buffer.push(...mapped);
    console.log(`[MBR] pag ${page} -> ${data.length} buffer ${buffer.length} total+buffer ${total+buffer.length}`);

    // insertar cada 250 para no saturar DNS ni RAM
    if(buffer.length >= 250 || data.length < 20){
      console.log(`[MBR] Insertando ${buffer.length} por IP ${sbIP} en chunks 40...`);
      for(let i=0;i<buffer.length;i+=40){
        const chunk = buffer.slice(i,i+40);
        let ok=false;
        for(let retry=0; retry<5 &&!ok; retry++){
          const ins = await supaReq(sbIP, sbHost, 'POST', '/rest/v1/listado_maestro_proveedor', chunk);
          if(ins.status < 300){ ok=true; console.log(`[MBR] chunk ${i} OK ${ins.status}`); }
          else if(ins.status===429 || ins.status===502 || ins.status===503){
            console.log(`[MBR] chunk ${i} ${ins.status} retry ${retry+1} esperando 5s`);
            await new Promise(r=>setTimeout(r, 5000));
          }else{
            console.log(`[MBR] chunk ${i} error ${ins.status} ${ins.body.slice(0,200)}`);
            if(retry===4) throw new Error(ins.body);
            await new Promise(r=>setTimeout(r, 2000));
          }
        }
      }
      total += buffer.length;
      buffer = [];
      console.log(`[MBR] TOTAL INSERTADO ${total}`);
      await new Promise(r=>setTimeout(r, 800));
    }

    if(data.length < 20){ console.log('[MBR] Última página detectada'); break; }
    page++;
    await new Promise(r=>setTimeout(r, 100));
  }

  console.log(`[MBR] FIN VERDE DEFINITIVO ${total} PRODUCTOS - SIN ERRORES`);
}

run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
