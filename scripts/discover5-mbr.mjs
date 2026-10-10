process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const BASE='https://ddevs.demachine.co';
const jsUrl='https://estock-mobile.demachine.co/assets/index-26eee134.js';
let js=await fetch(jsUrl).then(r=>r.text());
function ctx(s,l=400){
  let i=0,n=0;
  while((i=js.indexOf(s,i))!=-1 && n<3){
    console.log(`\n[${s} @ ${i}]`, js.slice(Math.max(0,i-l), i+l).replace(/\n/g,' ').slice(0,800));
    i+=s.length; n++;
  }
}
ctx('ddevs');
ctx('/users/token');
ctx('demachine.co');
ctx('paymaster2');

// test endpoints
for(let p of ['/users/token','/users/me','/login','/products/search']){
  try{
    let r=await fetch(BASE+p,{method:'GET'});
    console.log(p,'GET',r.status,(await r.text()).slice(0,200));
  }catch(e){console.log(p,e.message)}
}
