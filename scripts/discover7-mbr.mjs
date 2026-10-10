process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const BASES=['https://ddevs.demachine.co/api','https://mbr.demachine.co/api'];
const user=process.env.MBR_USER, pass=process.env.MBR_PASS, inst=process.env.MBR_INSTANCE||'mbr';
console.log('Probando con',user,'/',inst);
for(let base of BASES){
  console.log(`\n--- BASE ${base} ---`);
  let r=await fetch(base+'/users/token',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:user,password:pass,instance:inst})
  });
  let txt=await r.text();
  console.log('login',r.status,txt.slice(0,1500));
  if(r.status===200){
    try{
      let j=JSON.parse(txt);
      let token=j.token||j.data?.token;
      console.log('TOKEN OK',token?.slice(0,20));
      for(let ep of ['/products/search','/products/getProductList']){
        let r2=await fetch(base+ep,{
          method:'POST',
          headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
          body:JSON.stringify({limit:2})
        });
        console.log(ep,r2.status,(await r2.text()).slice(0,1500));
      }
    }catch(e){console.log('parse err',e.message)}
  }
}
