// V9.12 DEFINITIVO - REST DIRECTO SIN SUPABASE-JS
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

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
  console.log('[MBR] V9.12 REST DEFINITIVO');
  const token = await getToken();
  console.log('[MBR] Token OK');

  let all=[];
  for(let p=1;p<=3;p++){
    const res = await fetch(`https://mbr.demachine.co/api/products?page=${p}&maxPerPage=500`,{
      headers:{'Authorization':`Bearer ${token}`,'Accept':'application/json'}
    });
    const txt = await res.text();
    if(txt.startsWith('<!DOCTYPE')) break;
    const j = JSON.parse(txt);
    const data = j.data || [];
    console.log(`[MBR] pag ${p}: ${data.length}`);
    all.push(...data);
    if(data.length<500) break;
  }
  console.log(`[MBR] TOTAL ${all.length}`);

  // BORRAR VIEJO via REST
  console.log('[MBR] Borrando viejo...');
  await fetch(`${URL}/rest/v1/listado_maestro_proveedor?empresa_id=eq.${EMPRESA_ID}&proveedor_nombre=eq.${encodeURIComponent(PROV)}`,{
    method:'DELETE',
    headers:{'apikey':KEY,'Authorization':`Bearer ${KEY}`}
  });

  const toInsert = all.map(pr=>({
    empresa_id: EMPRESA_ID,
    proveedor_nombre: PROV,
    referencia: `${pr.code||''} ${pr.name}`.trim().slice(0,150),
    talla: 'UNICA',
    precio: Number(pr.precioventa)||0,
    stock_proveedor: 10,
    fecha_escaneo: new Date().toISOString()
  }));

  console.log(`[MBR] Insertando ${toInsert.length}...`);
  const ins = await fetch(`${URL}/rest/v1/listado_maestro_proveedor`,{
    method:'POST',
    headers:{'apikey':KEY,'Authorization':`Bearer ${KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},
    body: JSON.stringify(toInsert)
  });
  const txt = await ins.text();
  console.log('[MBR] INSERT RESP', ins.status, txt.slice(0,200));
  if(!ins.ok) throw new Error('Insert fail '+txt);
  console.log(`[MBR] FIN OK ${toInsert.length}`);
}
run().catch(e=>{ console.error('[MBR] FATAL', e.message); process.exit(1); });
