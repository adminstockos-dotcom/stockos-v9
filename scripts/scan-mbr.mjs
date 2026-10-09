// V9.20 VERDE 2000 - Resuelve Supabase ANTES de MBR
import { createClient } from '@supabase/supabase-js';
import https from 'https';
import dns from 'dns/promises';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

const supabase = createClient(SB_URL, SB_KEY);

function supaViaIP(ip, host, method, path, body){
  return new Promise((res,rej)=>{
    const opts={
      hostname: ip,
      path: path,
      method: method,
      servername: host,
      headers:{
        'Host': host,
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      }
    };
    const req = https.request(opts, r=>{
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode, txt:d}));
    });
    req.on('error', rej);
    if(body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken() {
  const r = await fetch('https://mbr.demachine.co/api/users/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company: 'MBR', name: 'CARLSO ROJAS', password: PASS })
  });
  const j = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j));
  return j.data.token;
}

async function run() {
  console.log('[MBR] V9.20 IP antes de MBR');
  const sbHost = new URL(SB_URL).hostname;
  
  // 1. RESOLVER SUPABASE PRIMERO cuando DNS está limpio
  let sbIP;
  try{
    const ips = await dns.resolve4(sbHost);
    sbIP = ips[0];
    console.log(`[MBR] Supabase IP resuelta: ${sbHost} -> ${sbIP}`);
  }catch(e){
    console.log('[MBR] resolve4 fallo, probando google DoH');
    const gh = await fetch(`https://dns.google/resolve?name=${sbHost}`);
    const gj = await gh.json();
    sbIP = gj.Answer?.find(a=>a.type===1)?.data;
    console.log(`[MBR] Google DoH IP -> ${sbIP}`);
  }

  const token = await getToken();
  console.log('[MBR] Token OK');

  let all = [];
  for(let page=1; page<=100; page++){
    const r = await fetch(`https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept':'application/json' }
    });
    const json = JSON.parse(await r.text());
    const data = json.data || [];
    if(!data.length) break;
    all.push(...data);
    console.log(`[MBR] pag ${page} -> total ${all.length}`);
    if(data.length < 20) break;
  }
  console.log(`[MBR] TOTAL ${all.length}`);

  console.log('[MBR] Borrando...');
  try{
    await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);
  }catch{
    console.log('[MBR] Borrado fallback IP');
    await supaViaIP(sbIP, sbHost, 'DELETE', `/rest/v1/listado_maestro_proveedor?empresa_id=eq.${EMPRESA_ID}&proveedor_nombre=eq.${encodeURIComponent(PROV)}`);
  }

  const toInsert = all.map(p => ({
    empresa_id: EMPRESA_ID,
    proveedor_nombre: PROV,
    referencia: `${p.code || ''} ${p.name}`.trim().slice(0,150),
    talla: 'UNICA',
    precio: parseInt(p.precioventa) || 0,
    stock_proveedor: 10,
    fecha_escaneo: new Date().toISOString()
  }));

  for(let i=0;i<toInsert.length;i+=50){
    const chunk = toInsert.slice(i,i+50);
    try{
      const { error } = await supabase.from('listado_maestro_proveedor').insert(chunk);
      if(error) throw error;
      console.log(`[MBR] chunk ${i} OK`);
    }catch(e){
      console.log(`[MBR] chunk ${i} fallback IP: ${e.message}`);
      const r = await supaViaIP(sbIP, sbHost, 'POST', '/rest/v1/listado_maestro_proveedor', chunk);
      console.log(`[MBR] chunk ${i} IP status ${r.status}`);
      if(r.status>=400) throw new Error(r.txt);
    }
  }
  console.log(`[MBR] FIN VERDE ${toInsert.length}`);
}
run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
