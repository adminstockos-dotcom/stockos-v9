// V9.18 VERDE 2000 + FIX DNS ENOTFOUND - BASE V9.8
import { createClient } from '@supabase/supabase-js';
import https from 'https';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

const supabase = createClient(SB_URL, SB_KEY);

function supaDeleteInsertIPv4(method, path, body){
  return new Promise((resolve,reject)=>{
    const u = new URL(SB_URL);
    const opts={
      hostname: u.hostname,
      path: path,
      method: method,
      family: 4,
      headers:{
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
  if (!j.success) throw new Error('Token fail: ' + JSON.stringify(j));
  return j.data.token;
}

async function run() {
  console.log('[MBR] V9.18 BASE V9.8 + DNS FIX');
  const token = await getToken();
  console.log('[MBR] Token OK');

  let all = [];
  let page = 1;
  while (true) {
    const url = `https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`;
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
    const json = JSON.parse(await r.text());
    const data = json.data || [];
    if (data.length === 0) break;
    all.push(...data);
    console.log(`[MBR] pag ${page} -> ${data.length} total ${all.length}`);
    if (data.length < 20 || page >= 100) break;
    page++;
  }
  console.log(`[MBR] TOTAL ${all.length} - esperando 15s para recuperar DNS...`);
  await new Promise(r=>setTimeout(r, 15000));

  console.log('[MBR] Borrando...');
  try{
    const del = await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);
    if(del.error) throw del.error;
    console.log('[MBR] Borrado OK via supabase-js');
  }catch(e){
    console.log('[MBR] Borrado via js fallo, intentando IPv4 directo:', e.message);
    const res = await supaDeleteInsertIPv4('DELETE', `/rest/v1/listado_maestro_proveedor?empresa_id=eq.${EMPRESA_ID}&proveedor_nombre=eq.${encodeURIComponent(PROV)}`);
    console.log('[MBR] Borrado IPv4', res.status);
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

  console.log(`[MBR] Insertando ${toInsert.length} con fallback IPv4...`);
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    try{
      const { error } = await supabase.from('listado_maestro_proveedor').insert(chunk);
      if(error) throw error;
      console.log(`[MBR] chunk ${i} OK js`);
    }catch(e){
      console.log(`[MBR] chunk ${i} js fallo ${e.message}, probando IPv4...`);
      const res = await supaDeleteInsertIPv4('POST', '/rest/v1/listado_maestro_proveedor', chunk);
      console.log(`[MBR] chunk ${i} IPv4 ${res.status}`);
      if(res.status>=400) throw new Error(res.txt);
    }
    await new Promise(r=>setTimeout(r, 300));
  }
  console.log(`[MBR] FIN VERDE ${toInsert.length}`);
}

run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
