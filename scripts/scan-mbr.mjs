// V9.22 DEFINITIVO BLINDADO - BASE V9.8 VERDE - 2000 productos
import { createClient } from '@supabase/supabase-js';
import https from 'https';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

const supabase = createClient(SB_URL, SB_KEY, { auth:{ persistSession:false } });

async function dohIP(host, depth=0){
  if(depth>6) return null;
  try{
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${host}&type=A`, {
      headers:{'Accept':'application/dns-json'}
    });
    const j = await r.json();
    const a = j.Answer?.find(x=>x.type===1);
    if(a) return a.data;
    const cname = j.Answer?.find(x=>x.type===5);
    if(cname) return dohIP(cname.data.replace(/\.$/,''), depth+1);
  }catch{}
  return null;
}

function reqIP(ip, host, method, path, body){
  return new Promise((resolve,reject)=>{
    const opts={
      hostname: ip,
      path: path,
      method: method,
      servername: host,
      timeout: 20000,
      headers:{
        'Host': host,
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      }
    };
    const req = https.request(opts, r=>{
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve({status:r.statusCode, txt:d}));
    });
    req.on('error', reject);
    req.on('timeout', ()=>{ req.destroy(new Error('timeout')); });
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
  const txt = await r.text();
  const j = JSON.parse(txt);
  if (!j.success) throw new Error('Token fail: '+txt.slice(0,200));
  return j.data.token;
}

async function run() {
  console.log('[MBR] V9.22 DEFINITIVO');
  const sbHost = new URL(SB_URL).hostname;
  let sbIP = await dohIP(sbHost);
  console.log(`[MBR] Supabase ${sbHost} -> ${sbIP || 'DoH fallo, usará supabase-js'}`);

  let token = await getToken();
  console.log('[MBR] Token OK');

  let all = [];
  for(let page=1; page<=150; page++){
    // refresh token cada 30 páginas para evitar expiración
    if(page % 30 === 0){
      console.log('[MBR] Refresh token...');
      token = await getToken();
    }
    try{
      const r = await fetch(`https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept':'application/json' }
      });
      const txt = await r.text();
      if(txt.startsWith('<!DOCTYPE')){ console.log('[MBR] HTML, fin'); break; }
      const json = JSON.parse(txt);
      const data = json.data || [];
      if(!data.length) break;
      all.push(...data);
      console.log(`[MBR] pag ${page} -> ${data.length} total ${all.length}`);
      if(data.length < 20) break;
      await new Promise(r=>setTimeout(r, 150)); // evita rate limit MBR
    }catch(e){
      console.log(`[MBR] pag ${page} error ${e.message} reintentando...`);
      await new Promise(r=>setTimeout(r, 2000));
      page--; // reintenta misma página
    }
  }
  console.log(`[MBR] TOTAL REAL ${all.length}`);

  // BORRADO con doble método
  console.log('[MBR] Borrando...');
  for(let i=0;i<3;i++){
    try{
      const { error } = await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);
      if(error) throw error;
      console.log('[MBR] Borrado OK js'); break;
    }catch(e){
      console.log(`[MBR] Borrado js intento ${i+1} fallo: ${e.message}`);
      if(sbIP){
        try{
          const del = await reqIP(sbIP, sbHost, 'DELETE', `/rest/v1/listado_maestro_proveedor?empresa_id=eq.${EMPRESA_ID}&proveedor_nombre=eq.${encodeURIComponent(PROV)}`);
          console.log('[MBR] Borrado IP', del.status); break;
        }catch(e2){ console.log('[MBR] Borrado IP fallo', e2.message); }
      }
      await new Promise(r=>setTimeout(r, 3000));
    }
  }

  const toInsert = all.map(p=>({
    empresa_id: EMPRESA_ID,
    proveedor_nombre: PROV,
    referencia: `${(p.code||'').toString().slice(0,30)} ${(p.name||'').toString().slice(0,100)}`.trim() || 'SIN_REF',
    talla: 'UNICA',
    precio: Math.max(0, parseInt(p.precioventa) || 0),
    stock_proveedor: 10,
    fecha_escaneo: new Date().toISOString()
  })).filter(x=>x.referencia.length>2);

  console.log(`[MBR] A insertar ${toInsert.length}`);

  for(let i=0;i<toInsert.length;i+=40){
    const chunk = toInsert.slice(i,i+40);
    let ok=false;
    for(let retry=0; retry<4 && !ok; retry++){
      try{
        const { error } = await supabase.from('listado_maestro_proveedor').insert(chunk);
        if(error) throw error;
        console.log(`[MBR] chunk ${i}-${i+chunk.length} OK js`);
        ok=true;
      }catch(e){
        const msg = e.message || '';
        if(msg.includes('429') || msg.includes('fetch failed') || msg.includes('ENOTFOUND')){
          console.log(`[MBR] chunk ${i} retry ${retry+1} por ${msg.slice(0,80)}`);
          if(sbIP){
            try{
              const ins = await reqIP(sbIP, sbHost, 'POST', '/rest/v1/listado_maestro_proveedor', chunk);
              if(ins.status<300){ console.log(`[MBR] chunk ${i} OK IP ${ins.status}`); ok=true; break; }
              if(ins.status===429){ await new Promise(r=>setTimeout(r, 5000)); continue; }
              throw new Error(ins.txt);
            }catch(e2){ console.log(`[MBR] IP fallo ${e2.message}`); }
          }
          await new Promise(r=>setTimeout(r, 2000 + retry*2000));
        }else{
          throw e;
        }
      }
    }
    if(!ok) throw new Error(`Chunk ${i} fallo tras reintentos`);
    await new Promise(r=>setTimeout(r, 400));
  }

  console.log(`[MBR] FIN VERDE DEFINITIVO ${toInsert.length} PRODUCTOS`);
}
run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
