process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const BASE='https://estock-mobile.demachine.co';
const USER='CARLOS ROJAS'; const PASS='CARLOS2026';
for(const path of ['/api/auth/login','/api/login','/auth/login','/api/usuarios/login','/api/session','/api/auth','/api/v1/login','/login']){
 for(const body of [{usuario:USER,password:PASS},{username:USER,password:PASS},{user:USER,pass:PASS},{Usuario:USER,Clave:PASS}]){
  try{
   const r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const t=await r.text();
   console.log(`${path} ${JSON.stringify(body)} -> ${r.status} ${t.slice(0,300)}`);
   if(t.toLowerCase().includes('token')) console.log('>>> ENCONTRADO <<<');
  }catch(e){}
 }
}
