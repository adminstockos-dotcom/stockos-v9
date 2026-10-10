process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const BASE='https://estock-mobile.demachine.co';
async function getText(url){ const r=await fetch(url); return await r.text(); }
console.log('Bajando index...');
let html = await getText(BASE+'/');
console.log(html.slice(0,1000));
const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m=>m[1]);
console.log('Scripts:', scripts);
for(let src of scripts.slice(0,5)){
  let url = src.startsWith('http')?src: BASE + (src.startsWith('/')?'':'/') + src;
  console.log(`\n--- ${url} ---`);
  try{
    let js = await getText(url);
    const matches = js.match(/https?:\/\/[^"'\s]+/g) || [];
    const apis = matches.filter(u=>u.includes('api')||u.includes('demachine')||u.includes('supabase')||u.includes('login'));
    console.log('APIs:', [...new Set(apis)].slice(0,100));
  }catch(e){ console.log('err', e.message); }
}
