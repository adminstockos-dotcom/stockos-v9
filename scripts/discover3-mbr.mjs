process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const B='https://ddevs.demachine.co';
const probes=['/api/auth/login','/api/login','/auth/login','/api','/','/docs','/swagger','/api-docs'];
for(let p of probes){
  try{
    let r=await fetch(B+p,{method:'GET'});
    let t=await r.text();
    console.log(p,'->',r.status,t.slice(0,500));
  }catch(e){console.log(p,'ERR',e.message)}
}
