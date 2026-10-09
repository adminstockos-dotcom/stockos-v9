// V9.13 FIX RED - https nativo IPv4 para Supabase
import https from 'https';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

function supaRequest(method, path, body=null){
  return new Promise((resolve,reject)=>{
    const u = new URL(URL);
    const opts = {
      hostname: u.hostname,
      path: path,
      method: method,
      family: 4, // fuerza IPv4 - FIX fetch failed
      headers:{
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      }
    };
    const req = https.request(opts, res=>{
      let data='';
      res.on('data', c=>data+=c);
      res.on('end', ()=> resolve({status:res.statusCode, txt:data}));
    });
    req.on('error', reject);
    if(body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken(){
  const r = await fetch('https://mbr.demachine.co/api/users/token',{
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body: JSON.stringify({company:'MBR', name:'CARLSO ROJAS', password:PASS})
  });
  const j = await r.json();
  if(!j.success) throw new Error('Token '+JSON.stringify(j));
  return j.data.token;
}

async function run(){
  console.log('[MBR] V9.13 FIX RED IPv4');
  const token = await getToken();
  console.log('[MBR] Token OK');

  let all=[];
  const res = await fetch(`https://mbr.demachine.co/api/products?page=1&maxPerPage=500`,{
    headers:{'Authorization':`Bearer ${token}`,'Accept':'application/json'}
  });
  const j = JSON.parse(await res.text());
  all = j.data || [];
  console.log(`[MBR] TOTAL ${all.length}`);

  console.log('[MBR] Borrando viejo IPv4...');
  const del = await supaRequest('DELETE', `/rest/v1/listado_maestro_proveedor?empresa_id=eq.${EMPRESA_ID}&proveedor_nombre=eq.${encodeURIComponent(PROV)}`);
  console.log('[MBR] DEL', del.status, del.txt.slice(0,100));

  const toInsert = all.map(pr=>({
    empresa_id: EMPRESA_ID,
    proveedor_nombre: PROV,
    referencia: `${pr.code||''} ${pr.name}`.trim().slice(0,150),
    talla: 'UNICA',
    precio: Number(pr.precioventa)||0,
    stock_proveedor: 10,
    fecha_escaneo: new Date().toISOString()
  }));

  console.log(`[MBR] Insertando ${toInsert.length} IPv4...`);
  // chunk de 50 para no saturar
  for(let i=0;i<toInsert.length;i+=50){
    const chunk = toInsert.slice(i,i+50);
    const ins = await supaRequest('POST', '/rest/v1/listado_maestro_proveedor', chunk);
    console.log(`[MBR] chunk ${i} -> ${ins.status} ${ins.txt.slice(0,100)}`);
    if(ins.status>=400) throw new Error('Insert fail '+ins.txt);
  }
  console.log(`[MBR] FIN OK ${toInsert.length}`);
}
run().catch(e=>{ console.error('[MBR] FATAL', e.message); process.exit(1); });
