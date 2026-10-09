// V9.35 RAPIDO 3MIN - BATCH 100 - 10^18 BLINDADO
console.log('[MBR] V9.35 RAPIDO');

const SB_URL = (process.env.SUPABASE_URL||'').trim().replace(/\/+$/,'');
const SB_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
const MBR_PASS = (process.env.MBR_PASSWORD||'').trim();
if(!SB_URL||!SB_KEY||!MBR_PASS){ console.error('FATAL ENV'); process.exit(1); }

const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';
const safeSlice = (s,m) => Array.from((s||'').toString().normalize('NFC').replace(/[\0\n\r]/g,' ').trim()).slice(0,m).join('').trim();

const fetchSafe = async (url,opts={},tMs=15000)=>{
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),tMs);
  try{ return await fetch(url,{...opts,signal:c.signal,headers:{'User-Agent':'MBR-V9.35','Accept':'application/json',...(opts.headers||{})}}); }
  finally{ clearTimeout(t); }
};

async function sbDelete(){
  const r=await fetchSafe(`${SB_URL}/rest/v1/listado_maestro_proveedor?empresa_id=eq.${EMPRESA_ID}&proveedor_nombre=eq.${encodeURIComponent(PROV)}`,{method:'DELETE',headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}});
  console.log('[MBR] Delete',r.status);
}
async function sbBatch(rows){
  if(!rows.length) return 0;
  const r=await fetchSafe(`${SB_URL}/rest/v1/listado_maestro_proveedor`,{method:'POST',headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
  if(!r.ok){ console.log(`[SB] Batch fail ${r.status} ${await r.text()}`.slice(0,200)); return 0; }
  return rows.length;
}
async function getToken(){
  for(const comp of ['MBR','MBR SAS']){
    try{
      const r=await fetchSafe('https://mbr.demachine.co/api/users/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company:comp,name:'CARLSO ROJAS',password:MBR_PASS})});
      const txt=(await r.text()).replace(/^\uFEFF/,''); if(txt.startsWith('<')) continue;
      const j=JSON.parse(txt); if(j.success&&j.data?.token) return j.data.token;
    }catch{}
  }
  throw new Error('TOKEN_FAIL');
}

await sbDelete();
let token=await getToken();
console.log('[MBR] Token OK');

let total=0,page=1,seen=new Set();
while(page<=100){
  let data=[];
  try{
    const r=await fetchSafe(`https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`,{headers:{Authorization:`Bearer ${token}`}},20000);
    const txt=(await r.text()).replace(/^\uFEFF/,''); if(txt.startsWith('<')) throw new Error('WAF');
    const j=JSON.parse(txt); data=j.data||j.items||[];
  }catch(e){ console.log(`[MBR] page ${page} err ${e.message}`); page++; continue; }

  if(!data.length) break;
  console.log(`[MBR] Page ${page} MBR devolvió ${data.length}`);

  // Si MBR devuelve siempre 500 duplicados, cortamos
  let newInPage=0;
  const batch=[];
  for(const p of data){
    const key=`${p.id||p.code}`; if(seen.has(key)) continue; seen.add(key); newInPage++;
    const pr=parseInt(String(p.precioventa||'').replace(/[^0-9]/g,'')); if(!pr||pr<100||pr>99999999) continue;
    batch.push({empresa_id:EMPRESA_ID,proveedor_nombre:PROV,referencia:safeSlice(`${p.code||''} ${p.name||''}`.trim()||`MBR-${p.id}`,150),talla:safeSlice((p.talla||'UNICA').toUpperCase(),20)||'UNICA',precio:pr,stock_proveedor:Math.max(0,parseInt(p.stock||0)||0),fecha_escaneo:new Date().toISOString()});
    if(batch.length>=100){ total+=await sbBatch(batch); batch.length=0; }
  }
  if(batch.length) total+=await sbBatch(batch);
  
  console.log(`[MBR] Page ${page} nuevos ${newInPage} total ${total}`);
  if(newInPage===0 || data.length<100) { console.log('[MBR] Fin por duplicados o page incompleta'); break; }
  page++;
}
console.log(`[MBR] FIN V9.35 ${total}`);
