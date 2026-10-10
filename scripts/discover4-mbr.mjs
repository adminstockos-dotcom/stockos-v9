process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const base='https://estock-mobile.demachine.co';
const jsUrl=base+'/assets/index-26eee134.js';
let js=await fetch(jsUrl).then(r=>r.text());
console.log('JS len',js.length);
// busca rutas
let matches=js.match(/["']\/(api\/[^"']+|v1\/[^"']+|auth\/[^"']+|login[^"']*|users\/[^"']*)["']/gi);
console.log('Rutas encontradas:',[...new Set(matches||[])].slice(0,100));
let full=js.match(/https:\/\/ddevs\.demachine\.co[^"'\s]+/gi);
console.log('Full URLs:',[...new Set(full||[])]);
let paths=js.match(/\/[a-z0-9\/_-]{3,}/gi);
console.log('Todos paths sample:',[...new Set(paths||[])].filter(p=>p.length<40).slice(0,200));
