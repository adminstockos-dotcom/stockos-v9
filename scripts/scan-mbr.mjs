// V9.26 FINAL - Fuerza DNS + 5 DoH + fallback supabase-js
import https from 'https';
import dns from 'dns';
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

dns.setServers(['1.1.1.1','8.8.8.8','1.0.0.1']);
const supabase = createClient(SB_URL, SB_KEY);

async function resolveDoH(host){
  const endpoints = [
    `https://dns.google/resolve?name=${host}&type=A`,
    `https://cloudflare-dns.com/dns-query?name=${host}&type=A`,
    `https://dns.quad9.net:5053/dns-query?name=${host}&type=A`
  ];
  for(const url of endpoints){
    try{
      const r = await fetch(url, { headers:{'Accept':'application/dns-json'} });
      const j = await r.json();
      console.log(`[DoH] ${url} ->`, JSON.stringify(j.Answer||j.answer||[]).slice(0,300));
      const ans = j.Answer || j.answer || [];
      let a = ans.find(x=>x.type===1 || x.type==='A');
      if(a) return a.data || a.address;
      let cname = ans.find(x=>x.type===5);
      if(cname){
        const next = (cname.data||'').replace(/\.$/,'');
        if(next) return resolveDoH(next);
      }
    }catch(e){ console.log(`[DoH] ${url} fallo ${e.message}`); }
  }
  return null;
}

function reqIP(ip, host, method, path, body){
  return new Promise((res,rej)=>{
    const opts={ hostname:ip, path:path, method:method, servername:host, timeout:20000,
      headers:{'Host':host,'apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'} };
    const req = https.request(opts, r=>{ let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode, txt:d})); });
    req.on('error', rej); req.on('timeout', ()=>req.destroy(new Error('timeout')));
    if(body) req.write(JSON.stringify(body)); req.end();
  });
}

async function getToken(){
  const r = await fetch('https://mbr.demachine.co/api/users/token', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ company:'MBR', name:'CARLSO ROJAS', password:PASS }) });
  const j = await r.json(); if(!j.success) throw new Error(JSON.stringify(j)); return j.data.token;
}

async function run(){
  console.log('[MBR] V9.26 FORZANDO DNS 1.1.1.1');
  const sbHost = new URL(SB_URL).hostname;
  let sbIP = null;
  try{ const ips = await dns.promises.resolve4(sbHost); sbIP = ips[0]; console.log(`[DNS] sistema OK -> ${sbIP}`); }catch(e){ console.log('[DNS] sistema fallo, probando DoH...'); sbIP = await resolveDoH(sbHost); }
  console.log(`[MBR] IP final: ${sbIP || 'null - usará supabase-js'}`);

  console.log('[MBR] Borrando con supabase-js (funciona al inicio)...');
  try{ await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV); console.log('[MBR] Borrado OK js'); }
  catch(e){
    console.log('[MBR] Borrado js fallo, probando IP', e.message);
    if(sbIP){ const d = await reqIP(sbIP, sbHost, 'DELETE', `/rest/v1/listado_maestro_proveedor?empresa_id=eq.${EMPRESA_ID}&proveedor_nombre=eq.${encodeURIComponent(PROV)}`); console.log(`[MBR] DEL IP ${d.status}`); }
  }

  let token = await getToken(); console.log('[MBR] Token OK');
  let total=0, page=1, buffer=[];

  while(page<=200){
    if(page%25===0) token = await getToken();
    let data;
    try{
      const r = await fetch(`https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`, { headers:{'Authorization':`Bearer ${token}`,'Accept':'application/json'} });
      const txt = await r.text();
      if(txt.includes('<!DOCTYPE')) throw new Error('HTML');
      data = JSON.parse(txt).data || [];
    }catch(e){ console.log(`[MBR] pag ${page} error ${e.message} retry`); await new Promise(r=>setTimeout(r,2000)); continue; }
    if(!data.length) break;

    buffer.push(...data.map(p=>({
      empresa_id: EMPRESA_ID, proveedor_nombre: PROV,
      referencia: `${(p.code||'').toString().slice(0,30)} ${(p.name||'').toString().slice(0,100)}`.trim().slice(0,150) || `MBR-${p.id}`,
      talla:'UNICA', precio:Math.max(0, parseInt(p.precioventa)||0), stock_proveedor:10, fecha_escaneo:new Date().toISOString()
    })));

    console.log(`[MBR] pag ${page} buffer ${buffer.length} total ${total+buffer.length}`);

    if(buffer.length>=200 || data.length<20){
      console.log(`[MBR] Insertando ${buffer.length}...`);
      for(let i=0;i<buffer.length;i+=40){
        const chunk = buffer.slice(i,i+40);
        let ok=false;
        for(let retry=0; retry<5 &&!ok; retry++){
          try{
            if(sbIP){
              const ins = await reqIP(sbIP, sbHost, 'POST', '/rest/v1/listado_maestro_proveedor', chunk);
              if(ins.status<300) ok=true; else if(ins.status===429){ await new Promise(r=>setTimeout(r,4000)); }
              else throw new Error(ins.txt);
            }else{
              const {error} = await supabase.from('listado_maestro_proveedor').insert(chunk);
              if(error) throw error; ok=true;
            }
          }catch(e){
            console.log(`[MBR] chunk ${i} retry ${retry+1} ${e.message.slice(0,100)}`);
            await new Promise(r=>setTimeout(r, 2000));
            if(!sbIP && retry===2){ sbIP = await resolveDoH(sbHost); console.log(`[MBR] re-resolviendo IP -> ${sbIP}`); }
          }
        }
        if(!ok) throw new Error(`Chunk ${i} fallo`);
        console.log(`[MBR] chunk ${i} OK`);
      }
      total+=buffer.length; buffer=[]; console.log(`[MBR] TOTAL ${total}`);
      await new Promise(r=>setTimeout(r, 800));
    }
    if(data.length<20) break;
    page++; await new Promise(r=>setTimeout(r, 100));
  }
  console.log(`[MBR] FIN VERDE ${total} PRODUCTOS`);
}
run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
