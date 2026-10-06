import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function CatalogoPublico(){
  const { slug } = useParams()
  const [empresa,setEmpresa]=useState(null)
  const [productos,setProductos]=useState([])
  const [filtro,setFiltro]=useState('')
  const [carrito,setCarrito]=useState([])
  const [loading,setLoading]=useState(true)
  const [showCarrito,setShowCarrito]=useState(false)
  const [pago,setPago]=useState('NEQUI')

  useEffect(()=>{
    const load=async()=>{
      const s=(slug||'maxima').toLowerCase().trim()
      let {data:emp}=await supabase.from('empresas').select('*').ilike('slug',s).maybeSingle()
      if(!emp){ const {data}=await supabase.from('empresas').select('*').ilike('slug',`%${s}%`).limit(1).maybeSingle(); emp=data }
      if(emp){
        setEmpresa(emp)
        const {data:prods}=await supabase.from('productos').select('*').eq('empresa_id',emp.id).eq('activo',true).order('referencia')
        setProductos(prods||[])
      }
      setLoading(false)
    }
    load()
  },[slug])

  const add=(p)=>setCarrito(prev=>{
    const ex=prev.find(x=>x.id===p.id)
    return ex? prev.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x) : [...prev,{...p,qty:1}]
  })
  const menos=(id)=>setCarrito(prev=>prev.flatMap(x=>x.id===id? (x.qty>1? [{...x,qty:x.qty-1}]:[]) : [x]))
  const mas=(id)=>add(productos.find(p=>p.id===id)||carrito.find(c=>c.id===id))

  const filtrados=productos.length? productos.filter(p=>p.referencia.toLowerCase().includes(filtro.toLowerCase())) : [
    {id:'1',referencia:'MAX-101 NEGRO',precio:48500,talla:'35-40'},{id:'2',referencia:'MAX-102 BEIGE',precio:48500,talla:'35-40'},
    {id:'3',referencia:'MAX-103 BLANCO',precio:52000,talla:'35-40'},{id:'4',referencia:'MAX-104 CAFÉ',precio:48500,talla:'35-40'},
    {id:'5',referencia:'MAX-105 NEGRO CHAROL',precio:55000,talla:'35-40'},{id:'6',referencia:'MAX-106',precio:48500,talla:'35-40'},
    {id:'7',referencia:'MAX-201',precio:48500,talla:'35-40'},{id:'8',referencia:'MAX-202',precio:52000,talla:'35-40'},
  ]

  const total=carrito.reduce((a,b)=>a+b.qty,0)
  const totalPrecio=carrito.reduce((a,b)=>a+(b.precio||0)*b.qty,0)
  const copy=(e,t)=>{e.stopPropagation(); navigator.clipboard.writeText(t); alert('Copiado: '+t)}

  if(loading) return <div className="p-8 text-center text-xs">Cargando...</div>

  return(
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="h-14 bg-[#0E2A4D] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {empresa?.logo_url? <img src={empresa.logo_url} className="h-7 w-7 bg-white rounded-full p-1 object-contain"/> : <div className="h-7 w-7 bg-white text-black rounded-full flex items-center justify-center font-black text-xs">S</div>}
          <span className="text-white font-black text-xs tracking-widest">STOCKOS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[#2A3F5F] rounded-full flex items-center px-3 py-1.5">
            <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Buscar ref..." className="bg-transparent text-xs text-white placeholder-gray-400 outline-none w-28"/>
            <span className="text-gray-400 text-xs">🔍</span>
          </div>
          <button onClick={()=>setShowCarrito(true)} className="bg-white rounded-full px-3 py-1.5 text-xs font-black">🛒 CARRITO {total}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4">
        {filtrados.map(p=>{
          const enCarrito=carrito.find(c=>c.id===p.id)
          return(
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden relative">
              <div className="absolute top-2 left-2 bg-black text-white text- font-black px-2 py-0.5 rounded-full z-10">{p.referencia.split(' ')[0]}</div>
              <div className="h-44 bg-[#f2f2f2] flex items-center justify-center relative">
                <span className="border border-dashed border-gray-300 px-3 py-1 text- text-gray-400 bg-white">IMAGEN</span>
                {p.imagen_url && <img src={p.imagen_url} className="absolute inset-0 w-full h-full object-cover"/>}
              </div>
              <div className="p-3">
                <div className="font-black text-xs uppercase">{p.referencia}</div>
                <div className="font-black text-xs mt-1">${p.precio.toLocaleString()}</div>
                {enCarrito? (<div className="flex items-center justify-between mt-2 bg-black text-white rounded-full px-2 py-1"><button onClick={()=>menos(p.id)} className="w-6 h-6 bg-white text-black rounded-full font-black">-</button><span className="text-xs font-black">{enCarrito.qty}</span><button onClick={()=>mas(p.id)} className="w-6 h-6 bg-white text-black rounded-full font-black">+</button></div>):(<button onClick={()=>add(p)} className="w-full mt-2 bg-black text-white text- font-black py-2 rounded-full">AÑADIR AL CARRITO</button>)}
              </div>
            </div>
          )
        })}
      </div>

      {total>0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#0f2d52] text-white rounded-full px-4 py-2 text-xs font-black flex gap-3 items-center shadow-xl">
          <span>{total} pares | ${totalPrecio.toLocaleString()}</span>
          <button onClick={()=>setShowCarrito(true)} className="bg-white text-black px-4 py-1 rounded-full">VER CARRITO</button>
        </div>
      )}

      {showCarrito && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={()=>setShowCarrito(false)}>
          <div className="bg-white w- h-full p-4 overflow-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h2 className="font-black text-sm">CARRITO ({total}) - ${totalPrecio.toLocaleString()}</h2><button onClick={()=>setShowCarrito(false)} className="font-black">X</button></div>
            <div className="space-y-2 text-xs">{carrito.map(c=><div key={c.id} className="flex justify-between py-1 border-b"><span>{c.referencia} x{c.qty}</span><span>${(c.precio*c.qty).toLocaleString()}</span></div>)}</div>

            <div className="mt-4 space-y-2">
              <h3 className="font-black text-xs">DATOS DE ENVÍO</h3>
              <input id="cli_nombre" placeholder="Nombre completo" className="w-full border p-2 rounded text-xs"/>
              <input id="cli_tel" placeholder="WhatsApp" className="w-full border p-2 rounded text-xs"/>
              <input id="cli_ciudad" placeholder="Ciudad" className="w-full border p-2 rounded text-xs"/>
              <input id="cli_dir" placeholder="Dirección + Barrio" className="w-full border p-2 rounded text-xs"/>
            </div>

            <div className="mt-4">
              <h3 className="font-black text-xs mb-2">MÉTODO DE PAGO</h3>
              <div className="space-y-2 text-xs">
                <label className="flex justify-between items-center border p-2 rounded cursor-pointer hover:bg-gray-50">
                  <span className="flex items-center gap-2"><input type="radio" name="pago" checked={pago==='【entity-NEQUI¦canonical_name=NEQUI】'} onChange={()=>setPago('【entity-NEQUI¦canonical_name=NEQUI】')}/><span className="bg-[#FF0A54] text-white font-black px-1.5 py-0.5 rounded text-">【entity-NEQUI¦canonical_name=NEQUI】</span> 3186411851</span>
                  <button type="button" onClick={(e)=>copy(e,'3186411851')} className="bg-black text-white px-2 py-1 rounded text-">COPIAR</button>
                </label>
                <label className="flex justify-between items-center border p-2 rounded cursor-pointer hover:bg-gray-50">
                  <span className="flex items-center gap-2"><input type="radio" name="pago" checked={pago==='【entity-BANCOLOMBIA¦canonical_name=BANCOLOMBIA】'} onChange={()=>setPago('【entity-BANCOLOMBIA¦canonical_name=BANCOLOMBIA】')}/><span className="bg-[#F8C200] text-black font-black px-1.5 py-0.5 rounded text-">BANCOLOMBIA</span> 9127560414</span>
                  <button type="button" onClick={(e)=>copy(e,'9127560414')} className="bg-black text-white px-2 py-1 rounded text-">COPIAR</button>
                </label>
                <label className="flex justify-between items-center border p-2 rounded cursor-pointer hover:bg-gray-50">
                  <span className="flex items-center gap-2"><input type="radio" name="pago" checked={pago==='BRE-B'} onChange={()=>setPago('BRE-B')}/> <span className="bg-black text-white font-black px-1.5 py-0.5 rounded text-">BRE-B</span> 83615157565</span>
                  <button type="button" onClick={(e)=>copy(e,'83615157565')} className="bg-black text-white px-2 py-1 rounded text-">COPIAR</button>
                </label>
                <label className={`flex flex-col border p-2 rounded cursor-pointer hover:bg-gray-50 ${total>2?'opacity-50':''}`}>
                  <span className="flex items-center gap-2"><input type="radio" name="pago" checked={pago==='CONTRAENTREGA'} disabled={total>2} onChange={()=>setPago('CONTRAENTREGA')}/> <span className="bg-green-600 text-white font-black px-1.5 py-0.5 rounded text-">CONTRAENTREGA</span> Bogotá</span>
                  {pago==='CONTRAENTREGA' && <div className="mt-2 bg-green-50 border border-green-200 p-2 rounded text-"><b>Automático por API Nequi.</b> Solo primer pedido, max 2 pares, solo Bogotá. Pagas al recibir con Nequi. El API lo aprueba solo.</div>}
                </label>
              </div>
            </div>

            <button onClick={async()=>{
              const nombre=document.getElementById('cli_nombre').value.trim()
              const tel=document.getElementById('cli_tel').value.trim()
              const ciudad=document.getElementById('cli_ciudad').value.trim()
              const dir=document.getElementById('cli_dir').value.trim()
              if(!nombre||!tel||!ciudad||!dir){alert('Completa datos de envío');return}
              if(pago==='CONTRAENTREGA' && total>2){alert('Contraentrega max 2 pares primer pedido');return}
              if(!empresa?.id){alert('Empresa no cargada');return}
              const esAutomatico = pago==='NEQUI' || pago==='CONTRAENTREGA'
              const {error}=await supabase.from('pedidos').insert({
                empresa_id: empresa.id,
                cliente: {nombre, telefono:tel, ciudad, direccion:dir},
                carrito: carrito,
                total_pares: total,
                total_precio: totalPrecio,
                metodo_pago: pago,
                estado: esAutomatico? 'PENDIENTE_NEQUI' : 'PENDIENTE',
                numero_guia: 'GUIA-'+Date.now().toString().slice(-6)
              })
              if(error){alert('Error: '+error.message);return}
              window.open(`https://wa.me/573008901150?text=${encodeURIComponent(`Hola MAXIMA soy ${nombre} ${ciudad} pedido ${total} pares $${totalPrecio} pago ${pago} dir ${dir}`)}`,'_blank')
              alert(esAutomatico? 'Pedido creado. API Nequi lo aprobará automático y pasa a Despachos' : 'Pedido creado. Carlos lo aprobará manual en App MÁXIMA')
              setCarrito([]); setShowCarrito(false)
            }} className="w-full bg-[#0E2A4D] text-white py-3 rounded-full font-black mt-4 text-xs">ENVIAR PEDIDO</button>
            <p className="text- text-gray-400 mt-2 text-center">NEQUI y CONTRAENTREGA = Automático API | BANCOLOMBIA y BRE-B = Manual Carlos en App MÁXIMA</p>
          </div>
        </div>
      )}
    </div>
  )
}
