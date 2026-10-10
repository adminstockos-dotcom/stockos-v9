process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const BASES=['https://ddevs.demachine.co/api','https://mbr.demachine.co/api'];
for(let b of BASES){
  for(let p of ['/users/token','/products/search','/products/getProductList']){
    try{
      let r=await fetch(b+p,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({})
      });
      console.log(b+p,'->',r.status,(await r.text()).slice(0,400));
    }catch(e){
      console.log(b+p,'ERR',e.message)
    }
  }
}
