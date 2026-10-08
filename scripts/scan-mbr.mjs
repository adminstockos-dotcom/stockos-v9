// V9.6 - NAVEGACION REAL + API SNIFF
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MBR_PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';
async function run(){
  console.log('[MBR] V9.6');
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage();
  page.on('response', async r=>{
    const u=r.url(); if(u.includes('api')||u.includes('stock')||u.includes('exist')){
      try{ const j=await r.json(); if(Array.isArray(j)&&j.length>5) console.log(`[API] ${u} -> ${j.length}`); }catch{}
    }
  });
  try{
    await page.goto('https://estock-mobile.demachine.co/',{waitUntil:'networkidle'});
    await page.locator('input').nth(0).fill('MBR');
    await page.locator('input').nth(1).fill('CARLSO ROJAS');
    await page.locator('input').nth(2).fill(MBR_PASS);
    await page.locator('input').nth(2).press('Enter');
    await page.waitForTimeout(2000);
    const btn=page.locator('button').filter({hasText:/ingresar|entrar/i}).first();
    if(await btn.count()>0) await btn.click({force:true}).catch(()=>{});
    await page.waitForFunction(()=>!location.href.includes('/login'),{timeout:30000});
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(5000);
    console.log('[MBR] HOME URL:',page.url());
    const textos=await page.evaluate(()=>document.body.innerText.slice(0,3000));
    console.log('[MBR] TEXTO HOME:',textos);
    const clicks=await page.evaluate(()=>Array.from(document.querySelectorAll('button,a,[role="button"],.q-item')).map(e=>e.innerText?.trim()).filter(t=>t&&t.length<30).slice(0,50));
    console.log('[MBR] BOTONES:',clicks);

    // Probar rutas conocidas
    for(const p of ['/consulta','/existencias','/stock','/inventario','/productos']){
      console.log(`[MBR] probando ${p}`);
      await page.goto(`https://estock-mobile.demachine.co${p}`,{waitUntil:'networkidle'}).catch(()=>{});
      await page.waitForTimeout(3000);
      const c=await page.locator('tbody tr').count().catch(()=>0);
      console.log(`[MBR] ${p} rows=${c}`);
      if(c>0) break;
    }

    await page.waitForSelector('tbody tr',{timeout:60000});
    const rows=await page.evaluate(()=>Array.from(document.querySelectorAll('tbody tr')).map(tr=>Array.from(tr.querySelectorAll('td')).map(td=>td.innerText.trim())).filter(r=>r[0]));
    console.log(`[MBR] totalRows: ${rows.length}`, rows.slice(0,2));
    const toInsert=rows.map(r=>({empresa_id:EMPRESA_ID,proveedor_nombre:PROV,referencia:r[0],talla:r[1]||'UNICA',precio:parseInt((r[2]||'0').replace(/\D/g,''))||0,stock_proveedor:parseInt((r[3]||r[2]||'0').replace(/\D/g,''))||0,fecha_escaneo:new Date().toISOString()}));
    await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id',EMPRESA_ID).eq('proveedor_nombre',PROV);
    const {error}=await supabase.from('listado_maestro_proveedor').insert(toInsert); if(error) throw error;
    console.log(`[MBR] OK ${toInsert.length}`);
  }finally{await browser.close();}
}
run().catch(e=>{console.error('[MBR] FATAL',e.message); process.exit(1);});
