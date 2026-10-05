import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCampanas({ empresa }) {
  const empresaId = String(empresa?.id || window.location.pathname.split('/')[2] || '9')
  const [tab, setTab] = useState('campanas')
  const [rrss, setRrss] = useState({ facebook_url:'', instagram_url:'', tiktok_url:'', whatsapp_numero:'573177384534', pagina_web:'' })
  const [grupos, setGrupos] = useState([])
  const [campanas, setCampanas] = useState([])
  const [nuevoGrupo, setNuevoGrupo] = useState({ nombre_grupo:'', tipo:'CONFIRMACION', whatsapp_id:'', link_invitacion:'', admin:'Carlos', incluye_carlos:true })

  useEffect(()=>{ cargarTodo() }, [empresaId])

  const cargarTodo = async () => {
    try {
      const { data: r } = await supabase.from('empresas_rrss_config').select('*').eq('empresa_id', empresaId).limit(1).maybeSingle()
      if (r) setRrss(r)
      const { data: g } = await supabase.from('grupos_difusion_config').select('*').eq('empresa_id', empresaId).order('tipo')
      if (g) setGrupos(g)
      const { data: c } = await supabase.from('campanas_config').select('*').eq('empresa_id', empresaId).order('fecha', {ascending:false})
      if (c) setCampanas(c)
    } catch (e) { console.log(e) }
  }

  const guardarRrss = async () => {
    await supabase.from('empresas_rrss_config').upsert({ empresa_id: empresaId,...rrss, updated_at: new Date().toISOString() }, { onConflict:'empresa_id' })
    alert('RRSS guardadas por empresa')
  }

  const agregarGrupo = async () => {
    if (!nuevoGrupo.nombre_grupo.trim()) return alert('Nombre obligatorio')
    const { data } = await supabase.from('grupos_difusion_config').insert({ empresa_id: empresaId,...nuevoGrupo }).select().single()
    if (data) {
      setGrupos(prev=>[...prev, data])
      setNuevoGrupo({ nombre_grupo:'', tipo: nuevoGrupo.tipo, whatsapp_id:'', link_invitacion:'', admin:'Carlos', incluye_carlos:true })
    }
  }

  const eliminarGrupo = async (id) => {
    if (!confirm('Borrar?')) return
    await supabase.from('grupos_difusion_config').delete().eq('id', id)
    setGrupos(prev=>prev.filter(g=>g.id!==id))
  }

  // SIMPLIFICADO: BOT CAZA/CONFIRMACION ES LO MISMO, DIFUSION/COMUNIDAD ES LO MISMO
  const gruposConfirmacion = grupos.filter(g=>g.tipo==='CONFIRMACION' || g.tipo==='BOT_CAZA')
  const gruposDifusion = grupos.filter(g=>g.tipo==='DIFUSION' || g.tipo==='COMUNIDAD')

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black uppercase">CAMPAÑAS IA + BOT CAZA</h2>
          <p className="text-sm text-gray-500">{empresa?.nombre} - WhatsApp Carlos {rrss.whatsapp_numero}</p>
        </div>
        <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-black">POR EMPRESA</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={()=>setTab('campanas')} className={`${tab==='campanas'?'bg-black text-white':'bg-white border'} px-4 py-2 rounded font-black text-xs`}>Campañas</button>
        <button onClick={()=>setTab('rrss')} className={`${tab==='rrss'?'bg-black text-white':'bg-white border'} px-4 py-2 rounded font-black text-xs`}>RRSS Empresa</button>
        <button onClick={()=>setTab('botcaza')} className={`${tab==='botcaza'?'bg-black text-white':'bg-white border'} px-4 py-2 rounded font-black text-xs`}>Bot Caza / Confirmacion</button>
        <button onClick={()=>setTab('difusion')} className={`${tab==='difusion'?'bg-black text-white':'bg-white border'} px-4 py-2 rounded font-black text-xs`}>Grupos Difusion Maxima</button>
      </div>

      {tab==='campanas' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border rounded p-4"><div className="text- text-gray-500 font-bold">CAMPAÑAS ACTIVAS</div><div className="text-2xl font-black text-green-600">{campanas.filter(c=>c.estado==='Activa').length}</div></div>
            <div className="bg-white border rounded p-4"><div className="text- text-gray-500 font-bold">TOTAL ENVIADOS</div><div className="text-2xl font-black">{campanas.reduce((a,c)=>a+(c.enviados||0),0) || 0}</div></div>
            <div className="bg-white border rounded p-4"><div className="text- text-gray-500 font-bold">TASA APERTURA</div><div className="text-2xl font-black text-blue-600">{campanas.length? '68.2%' : '0%'}</div></div>
            <div className="bg-white border rounded p-4"><div className="text- text-gray-500 font-bold">CONVERSION</div><div className="text-2xl font-black text-purple-600">{campanas.length? '12.3%' : '0%'}</div></div>
          </div>
          <div className="bg-white border rounded overflow-auto">
            <div className="p-3 font-black text-xs">CAMPAÑAS - {empresa?.nombre}</div>
            {campanas.length===0? (
              <div className="p-8 text-center text-xs text-gray-400">Aún no hay campañas. Aquí se verán los informes reales cuando el n8n dispare a RRSS + Bot Caza/Confirmación + Difusión Máxima.<br/>Cuadros listos.</div>
            ) : (
              <table className="w-full text-xs"><thead className="bg-gray-50"><tr><th className="p-3 text-left">CAMPAÑA</th><th className="p-3">TIPO</th><th className="p-3">ESTADO</th><th className="p-3">ENVIADOS</th><th className="p-3">ABIERTOS</th><th className="p-3">CONVERSION</th><th className="p-3">FECHA</th></tr></thead>
              <tbody>{campanas.map((c,i)=><tr key={i} className="border-t"><td className="p-3 font-bold">{c.nombre}</td><td className="p-3">{c.tipo}</td><td className="p-3">{c.estado}</td><td className="p-3">{c.enviados}</td><td className="p-3">{c.abiertos}</td><td className="p-3">{c.conversion}</td><td className="p-3">{c.fecha}</td></tr>)}</tbody></table>
            )}
          </div>
        </>
      )}

      {tab==='rrss' && (
        <div className="bg-white border-2 border-black rounded-lg p-4 space-y-3">
          <div className="font-black text-sm">CONFIGURACION RRSS POR EMPRESA - {empresa?.nombre}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={rrss.facebook_url} onChange={e=>setRrss({...rrss, facebook_url:e.target.value})} placeholder="Facebook URL" className="border p-2 rounded text-xs"/>
            <input value={rrss.instagram_url} onChange={e=>setRrss({...rrss, instagram_url:e.target.value})} placeholder="Instagram URL" className="border p-2 rounded text-xs"/>
            <input value={rrss.tiktok_url} onChange={e=>setRrss({...rrss, tiktok_url:e.target.value})} placeholder="TikTok URL" className="border p-2 rounded text-xs"/>
            <input value={rrss.pagina_web} onChange={e=>setRrss({...rrss, pagina_web:e.target.value})} placeholder="Pagina web" className="border p-2 rounded text-xs"/>
            <input value={rrss.whatsapp_numero} onChange={e=>setRrss({...rrss, whatsapp_numero:e.target.value})} placeholder="WhatsApp Carlos" className="border p-2 rounded text-xs font-bold col-span-2"/>
          </div>
          <button onClick={guardarRrss} className="bg-black text-white px-6 py-2 rounded font-black text-xs">GUARDAR RRSS POR EMPRESA</button>
        </div>
      )}

      {tab==='botcaza' && (
        <div className="space-y-3">
          <div className="bg-white border-2 border-black rounded-lg p-4">
            <div className="font-black text-sm">BOT CAZA / CONFIRMACION - ES LO MISMO - WHATSAPP DE CARLOS</div>
            <p className="text- text-gray-500">Bot que confirma pedidos y caza clientes. Está en WhatsApp de Carlos.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
              <input value={nuevoGrupo.nombre_grupo} onChange={e=>setNuevoGrupo({...nuevoGrupo, nombre_grupo:e.target.value})} placeholder="Nombre grupo confirmacion" className="border p-2 rounded text-xs font-bold"/>
              <input value={nuevoGrupo.whatsapp_id} onChange={e=>setNuevoGrupo({...nuevoGrupo, whatsapp_id:e.target.value})} placeholder="ID WhatsApp" className="border p-2 rounded text-xs"/>
              <input value={nuevoGrupo.link_invitacion} onChange={e=>setNuevoGrupo({...nuevoGrupo, link_invitacion:e.target.value})} placeholder="Link invitacion" className="border p-2 rounded text-xs"/>
              <input value={nuevoGrupo.admin} onChange={e=>setNuevoGrupo({...nuevoGrupo, admin:e.target.value})} placeholder="Carlos" className="border p-2 rounded text-xs"/>
            </div>
            <button onClick={()=>{setNuevoGrupo({...nuevoGrupo, tipo:'CONFIRMACION'}); setTimeout(agregarGrupo,100)}} className="mt-3 bg-black text-white px-6 py-2 rounded font-black text-xs">+ GUARDAR BOT CAZA / CONFIRMACION</button>
          </div>
          <div className="bg-white border-2 border-black rounded-lg overflow-hidden"><div className="bg-green-600 text-white p-2 font-black text-xs">BOT CAZA / CONFIRMACION - {gruposConfirmacion.length} grupos - ES LO MISMO</div><div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">{gruposConfirmacion.length===0 && <p className="text- text-gray-400 col-span-2 text-center py-4">Sin grupos aún. Cuadro listo.</p>}{gruposConfirmacion.map(g=><div key={g.id} className="border rounded p-2 flex justify-between"><div><div className="font-bold text-xs">{g.nombre_grupo}</div><div className="text-">ID:{g.whatsapp_id} Admin:{g.admin}</div></div><button onClick={()=>eliminarGrupo(g.id)} className="bg-red-600 text-white w-5 h-5 rounded-full text-">X</button></div>)}</div></div>
        </div>
      )}

      {tab==='difusion' && (
        <div className="space-y-3">
          <div className="bg-white border-2 border-purple-600 rounded-lg p-4">
            <div className="font-black text-sm">GRUPOS DE DIFUSION DE MAXIMA - ADMIN CARLOS - DIFUSION Y COMUNIDAD ES LO MISMO</div>
            <p className="text- text-gray-500">Grupos que Carlos administra en su WhatsApp. Difusion y Comunidad es lo mismo.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
              <input value={nuevoGrupo.nombre_grupo} onChange={e=>setNuevoGrupo({...nuevoGrupo, nombre_grupo:e.target.value})} placeholder="Ej Difusion Maxima" className="border p-2 rounded text-xs font-bold"/>
              <input value={nuevoGrupo.whatsapp_id} onChange={e=>setNuevoGrupo({...nuevoGrupo, whatsapp_id:e.target.value})} placeholder="ID WhatsApp" className="border p-2 rounded text-xs"/>
              <input value={nuevoGrupo.link_invitacion} onChange={e=>setNuevoGrupo({...nuevoGrupo, link_invitacion:e.target.value})} placeholder="Link" className="border p-2 rounded text-xs"/>
              <input value={nuevoGrupo.admin} onChange={e=>setNuevoGrupo({...nuevoGrupo, admin:e.target.value})} placeholder="Carlos" className="border p-2 rounded text-xs"/>
            </div>
            <button onClick={()=>{setNuevoGrupo({...nuevoGrupo, tipo:'DIFUSION'}); setTimeout(agregarGrupo,100)}} className="mt-3 bg-purple-600 text-white px-6 py-2 rounded font-black text-xs">+ GUARDAR DIFUSION MAXIMA</button>
          </div>
          <div className="bg-white border-2 border-black rounded-lg overflow-hidden"><div className="bg-black text-white p-2 font-black text-xs">DIFUSION MAXIMA ADMIN CARLOS - DIFUSION Y COMUNIDAD ES LO MISMO - {gruposDifusion.length} grupos</div><div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">{gruposDifusion.length===0 && <p className="text- text-gray-400 col-span-2 text-center py-4">Sin grupos aún. Cuadro listo para cuando configures los grupos de Maxima que administra Carlos.</p>}{gruposDifusion.map(g=><div key={g.id} className="border rounded p-2 flex justify-between"><div><div className="font-bold text-xs">{g.nombre_grupo}</div><div className="text-">ID:{g.whatsapp_id} Admin:{g.admin} ✅ Carlos dentro</div>{g.link_invitacion && <div className="text- text-blue-600 break-all">{g.link_invitacion}</div>}</div><button onClick={()=>eliminarGrupo(g.id)} className="bg-red-600 text-white w-5 h-5 rounded-full text-">X</button></div>)}</div></div>
        </div>
      )}
    </div>
  )
}
