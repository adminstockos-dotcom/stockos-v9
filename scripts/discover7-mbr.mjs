process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const BASE = 'https://estock-mobile.demachine.co/api';
const body = {
  name: process.env.MBR_USER,
  password: process.env.MBR_PASS,
  instance: process.env.MBR_INSTANCE
};
console.log('Probando', body, 'en', BASE);
const r = await fetch(BASE+'/users/token', {
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify(body)
});
const txt = await r.text();
console.log('STATUS', r.status);
console.log(txt.slice(0, 2000));
if(r.ok){
  const j = JSON.parse(txt);
  console.log('TOKEN OK:', j.token?.slice(0,20));
  // probamos listado
  const r2 = await fetch(BASE+'/items?limit=5', {headers:{Authorization:`Bearer ${j.token}`}});
  console.log('ITEMS', r2.status, (await r2.text()).slice(0,3000));
}
