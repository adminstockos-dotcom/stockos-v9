// V9.19 BASE V9.8 + DoH bypass ENOTFOUND - 2000 productos
import { createClient } from '@supabase/supabase-js';
import https from 'https';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

const supabase = createClient(SB_URL, SB_KEY);

// Resuelve IP por DoH de Cloudflare, no usa DNS del runner
async function resolveIP(host){
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${host}&type=A`, {
    headers:{ 'Accept':'application/dns-json' }
  });
  const j = await r.json();
  return j.Answer?.[0]?.data;
}

function supaRequestIP(ip, host, method, path, body){
  return new Promise((resolve,reject)=>{
    const opts={
      hostname: ip,
      path: path,
      method: method,
      servername: host, // SNI
      family: 4,
      headers:{
        'Host': host,
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      }
    };
    const req = https.request(opts, res=>{
      let d=''; res.on('data', c=>d+=c); res.on('end', ()=>resolve({status:res.statusCode, txt:d}));
    });
    req.on('error', reject);
    if(body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken() {
  const res = await fetch('https://mbr.demachine.co/api/users/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company: 'MBR', name: 'CARLSO ROJAS', password: PASS })
  });
  const j = await res.json();
  if (!j.success) throw new Error(JSON.stringify(j));
  return j.data.token;
}

async function run() {
  console.log('[MBR] V9.19 VERDE 2000 DoH');
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
    console.log(`[MBR] pag ${page} -> ${data.length} total ${all.length}`);
    if(data.length < 20) break;
  }
  console.log(`[MBR] TOTAL ${all.length}`);

  const sbHost = new URL(SB_URL).hostname;
  console.log(`[MBR] Resolviendo ${sbHost} por DoH...`);
  const sbIP = await resolveIP(sbHost);
  console.log(`[MBR] IP ${sbHost} -> ${sbIP}`);

  console.log('[MBR] Borrando via IP...');
  const del = await supaRequestIP(sbIP, sbHost, 'DELETE', `/rest/v1/listado_maestro_proveedor?empresa_id=eq.${EMPRESA_ID}&proveedor_nombre=eq.${encodeURIComponent(PROV)}`);
  console.log('[MBR] DEL', del.status);

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
    const ins = await supaRequestIP(sbIP, sbHost, 'POST', '/rest/v1/listado_maestro_proveedor', chunk);
    console.log(`[MBR] chunk ${i} -> ${ins.status}`);
    if(ins.status>=400) throw new Error(ins.txt);
  }
  console.log(`[MBR] FIN VERDE ${toInsert.length}`);
}
run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
