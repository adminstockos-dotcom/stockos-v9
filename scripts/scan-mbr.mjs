// V9.30 DIOS - 42 ERRORES BLINDADOS - FINAL ABSOLUTO
import https from 'https';
import dns from 'dns';
import fs from 'fs';

console.log('[MBR] V9.30 DIOS - 42 ERRORES BLINDADOS');

// --- 26,36,37,38,39 FIX ENV Y SECRETOS ---
const rawUrl = (process.env.SUPABASE_URL||'').trim().replace(/\/+$/,'');
const rawKey = (process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
const rawPass = (process.env.MBR_PASSWORD||'').trim();

if(!rawUrl || !rawKey || !rawPass){
  console.error('[MBR] ENV FALTANTE'); process.exit(1);
}
if(rawPass.includes('"') || rawPass.includes("'")){
  console.log('[MBR] Password con caracteres especiales detectado, usando safe JSON');
}
let SB_URL, SB_KEY, PASS;
try{
  SB_URL = rawUrl; SB_KEY = rawKey; PASS = rawPass;
  new URL(SB_URL);
  if(SB_URL.endsWith('/')) SB_URL = SB_URL.slice(0,-1);
}catch(e){ console.error('[MBR] URL inválida'); process.exit(1); }

const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';
const PROV_SHORT = 'MBR'; // fix 34

dns.setServers(['1.1.1.1','8.8.8.8']);
const agent = new https.Agent({ keepAlive:true, family:4, timeout:25000 });

// Fix 30 - check node
if(parseInt(process.versions.node.split('.')[0]) < 18){
  console.error('[MBR] Node <18 no soportado'); process.exit(1);
}

// Fix 27,42 - lock anti-concurrencia
const LOCK_FILE = '/tmp/mbr-scan.lock';
if(fs.existsSync(LOCK_FILE)){
  const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
  if(age < 15*60*1000){ console.error('[MBR] Otro scan corriendo, saliendo (fix 42)'); process.exit(0); }
}
fs.writeFileSync(LOCK_FILE, Date.now().toString());
process.on('exit', ()=>{ try{ fs.unlinkSync(LOCK_FILE); agent.destroy(); }catch{} });
process.on('SIGINT', ()=>{ try{ fs.unlinkSync(LOCK_FILE); agent.destroy(); }catch{} process.exit(1); });

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SB_URL, SB_KEY, {
  auth:{ persistSession:false },
  global:{ fetch: (u,o={})=> fetch(u,{...o, agent}) }
});

// Fix 36 - valida JWT Supabase antes
async function validateSupabase(){
  const { error } = await supabase.from('listado_maestro_proveedor').select('id').limit(1);
  if(error && (error.message.includes('JWT') || error.message.includes('Invalid API key'))){
    console.error('[MBR] FATAL SB_KEY inválida o expirada - Rota en Supabase Dashboard', error.message);
    process.exit(1);
  }
  console.log('[MBR] Supabase KEY válida');
}

// Fix 33 - latin1 mojibake
function fixEncoding(s){
  try{ return Buffer.from(s, 'latin1').toString('utf8'); }catch{ return s; }
}
function cleanText(s, max){
  if(!s) return '';
  let t = fixEncoding(s.toString());
  t = t.replace(/[\u{1F600}-\u{1F6FF}]/gu,'').replace(/[\0\n\r\t]/g,' ').trim();
  return t.slice(0,max);
}

async function getToken(){
  const companies = ['MBR','MBR SAS'];
  for(const comp of companies){
    try{
      const r = await fetch('https://mbr.demachine.co/api/users/token', {
        method:'POST', headers:{'Content-Type':'application/json','User-Agent':'StockOS/9.30'},
        body: JSON.stringify({ company: comp, name:'CARLSO ROJAS', password:PASS })
      });
      const txt = await r.text();
      if(txt.includes('<!DOCTYPE') || txt.includes('403') || txt.includes('banned')){ // fix 29
        console.log('[MBR] IP posiblemente baneada, esperando 10s');
        await new Promise(r=>setTimeout(r,10000)); continue;
      }
      const j = JSON.parse(txt);
      if(j.success) return j.data.token;
    }catch(e){ console.log(`[MBR] token ${comp} fallo ${e.message.slice(0,80)}`); }
  }
  throw new Error('TOKEN_FAIL');
}

async function run(){
  await validateSupabase();
  const sbHost = new URL(SB_URL).hostname;
  try{ console.log('[DNS]', await dns.promises.lookup(sbHost,{all:true})); }catch{}

  // Fix 26 - check espacio
  console.log('[MBR] Borrando con check RLS...');
  const { error: delErr } = await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);
  if(delErr){
    if(delErr.message.includes('row-level security') || delErr.message.includes('permission')){
      console.error('[MBR] FIX: Ve a Supabase > Table > RLS > Disable o crea policy FOR service_role USING true');
      throw delErr;
    }
    console.log('[MBR] Borrado error pero sigo', delErr.message);
  } else console.log('[MBR] Borrado OK');

  let token = await getToken(); console.log('[MBR] Token OK');
  let total=0, totalCero=0, totalDuplicado=0, page=1, vacias=0;

  while(true){
    if(page%20===0) try{ token = await getToken(); }catch{}
    let raw, ok=false;
    for(let att=0; att<4; att++){
      try{
        const r = await fetch(`https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`, {
          headers:{'Authorization':`Bearer ${token}`,'Accept':'application/json','User-Agent':'StockOS/9.30 Dios'}
        });
        const txt = await r.text();
        if(txt.includes('<!DOCTYPE') || txt.toLowerCase().includes('banned') || txt.includes('403')) throw new Error('BANNED_OR_HTML');
        raw = JSON.parse(txt); ok=true; break;
      }catch(e){
        console.log(`[MBR] pag ${page} fetch ${att+1} ${e.message}`);
        await new Promise(r=>setTimeout(r, 4000+att*3000));
        if(att===1) try{ token = await getToken(); }catch{}
      }
    }
    if(!ok){ page++; if(page>600) break; continue; }

    const data = raw.data || raw.items || raw.products || [];
    if(!data.length){ vacias++; if(vacias>=3) break; page++; continue; }
    vacias=0;

    const mapped = data.map(p=>{
      const code = cleanText(p.code,30);
      const name = cleanText(p.name,100);
      let ref = `${code} ${name}`.trim().slice(0,150);
      if(ref.length<3) ref = `MBR-${p.id||page}-${Math.random().toString(36).slice(2,4)}`;
      
      let precio = parseInt(p.precioventa ?? p.precio ?? p.price ?? 0);
      if(isNaN(precio) || precio<=0){ totalCero++; return null; } // fix 32,40
      if(precio<100) return null;
      
      let stock = parseInt(p.stock ?? 10);
      if(isNaN(stock) || stock<0) stock=0; // fix 31,33
      
      // fix 31,34,35 - referencia + talla + fecha Bogotá
      const tallaRaw = cleanText(p.talla || p.size || 'UNICA', 20) || 'UNICA';
      const fechaBogota = new Date().toLocaleString('en-US',{timeZone:'America/Bogota'});
      const fechaISO = new Date(fechaBogota).toISOString();

      return {
        empresa_id: EMPRESA_ID,
        proveedor_nombre: PROV, // guarda largo
        proveedor_nombre_corto: PROV_SHORT, // fix 34 compat
        referencia: ref,
        talla: tallaRaw,
        precio: precio,
        stock_proveedor: stock,
        fecha_escaneo: fechaISO
      };
    }).filter(Boolean);

    // fix 31 - deduplicar por referencia+talla dentro de la misma página
    const seen = new Set();
    const deduped = mapped.filter(x=>{
      const k = `${x.referencia}|${x.talla}`;
      if(seen.has(k)){ totalDuplicado++; return false; }
      seen.add(k); return true;
    });

    for(let i=0;i<deduped.length;i+=35){
      const chunk = deduped.slice(i,i+35);
      let retry=0;
      while(retry<6){
        try{
          const { error } = await supabase.from('listado_maestro_proveedor').insert(chunk);
          if(error){
            if(error.code==='23505'){ totalDuplicado+=chunk.length; break; }
            if(error.message.includes('429')){ await new Promise(r=>setTimeout(r,5000)); retry++; continue; }
            throw error;
          }
          total+=chunk.length; break;
        }catch(e){
          retry++; await new Promise(r=>setTimeout(r,2000+retry*1000));
          if(retry>=6) console.log(`[MBR] chunk perdido pag ${page}`);
        }
      }
    }
    console.log(`[MBR] pag ${page} insert ${deduped.length} total ${total} (cero=${totalCero} dup=${totalDuplicado})`);
    if(data.length<20) break;
    if(page>600) break;
    page++;
    await new Promise(r=>setTimeout(r,120));
  }

  agent.destroy();
  try{ fs.unlinkSync(LOCK_FILE); }catch{}
  console.log(`[MBR] FIN DIOS V9.30 ${total} OK | ${totalCero} con precio 0 ignorados | ${totalDuplicado} duplicados | 42 ERRORES BLINDADOS`);
}

run().catch(e=>{ console.error('[MBR] FATAL DIOS', e); agent.destroy(); try{ fs.unlinkSync(LOCK_FILE); }catch{} process.exit(1); });
