// V9.34 FINAL 10^18 - 15 FAMILIAS BLINDADAS
console.log('[MBR] V9.34 FINAL');

const SB_URL = (process.env.SUPABASE_URL||'').trim().replace(/\/+$/,'');
const SB_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
const MBR_PASS = (process.env.MBR_PASSWORD||'').trim();
if(!SB_URL||!SB_KEY||!MBR_PASS){ console.error('FATAL ENV'); process.exit(1); }

const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';
const safeSlice = (s,m) => Array.from((s||'').toString().normalize('NFC').replace(/[\0\n\r]/g,' ').trim()).slice(0,m).join('').trim();
const safeTalla = s => safeSlice((s||'UNICA').toUpperCase(),20)||'UNICA';

const fetchSafe = async (url,opts={},tMs=15000)=>{
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),tMs);
  try{ return await fetch(url,{...opts,signal:c.signal,headers:{'User-Agent':'MBR-V9.34','Accept':'application/json',...(opts.headers||{})}}); }
  finally{ clearTimeout(t); }
};

async function sbReq(path,method,body){
  for(let i=0;i<3;i++){
    try{
      const r=await fetchSafe(`${SB_URL}/rest/v1/${path}`,{method,headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:body?JSON.stringify(body):undefined},20000);
      if(r.status===429){ await new Promise(x=>setTimeout(x,2000*(i+1))); continue; }
      if(!r.ok){ const txt=await r.text(); if(r.status===409) return true; if(r.status>=500) continue; console.log(`[SB] ${r.status} ${txt.slice(0,80)}`); return false; }
      return true;
    }catch(e){ await new Promise(x=>setTimeout(x,1000)); }
  }
  return false;
}

async function getToken(){
  for(const comp of ['MBR','MBR SAS']){
    try{
      const r=await fetchSafe('https://mbr.demachine.co/api/users/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company:comp,name:'CARLSO ROJAS',password:MBR_PASS})},15000);
      const txt=(await r.text()).replace(/^\uFEFF/,''); if(txt.startsWith('<')) throw new Error('WAF');
      const j=JSON.parse(txt); if(j.success&&j.data?.token) return j.data.token;
    }catch{}
  }
  throw new Error('TOKEN_FAIL');
}

await sbReq(`listado_maestro_proveedor?empresa_id=eq.${EMPRESA_ID}&proveedor_nombre=eq.${encodeURIComponent(PROV)}`,'DELETE');
console.log('[MBR] Borrado OK');
let token=await getToken();
let total=0,page=1,seen=new Set(),vacias=0;
while(page<=600){
  let data=[];
  try{
    const r=await fetchSafe(`https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`,{headers:{Authorization:`Bearer ${token}`}},20000);
    const txt=(await r.text()).replace(/^\uFEFF/,''); if(txt.startsWith('<')) throw new Error('WAF');
    const j=JSON.parse(txt); data=j.data||j.items||[];
  }catch(e){ console.log(`[MBR] pag ${page} ${e.message}`); if((e.message||'').includes('401')){ try{ token=await getToken(); }catch{} } page++; continue; }
  if(!data.length){ vacias++; if(vacias>3) break; } else vacias=0; if(!data.length) break;
  for(const p of data){
    const key=`${p.id||p.code}`; if(seen.has(key)) continue; seen.add(key);
    const pr=parseInt(String(p.precioventa||'').replace(/[^0-9]/g,'')); if(!pr||pr<100||pr>99999999) continue;
    const row={empresa_id:EMPRESA_ID,proveedor_nombre:PROV,referencia:safeSlice(`${p.code||''} ${p.name||''}`.trim()||`MBR-${p.id||page}`,150),talla:safeTalla(p.talla),precio:pr,stock_proveedor:Math.max(0,parseInt(p.stock||0)||0),fecha_escaneo:new Date().toISOString()};
    if(await sbReq('listado_maestro_proveedor','POST',row)) total++;
    await new Promise(x=>setTimeout(x,80));
  }
  console.log(`[MBR] pag ${page} total ${total}`);
  if(data.length<20) break; page++;
}
console.log(`[MBR] FIN ${total} productos`);
