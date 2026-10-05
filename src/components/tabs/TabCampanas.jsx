import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCampanas({ empresa }) {
  const empresaId = String(empresa?.id || window.location.pathname.split('/')[2] || '9')
  const [tab, setTab] = useState('campanas') // campanas | rrss | botcaza | difusion
  const [rrss, setRrss] = useState({ facebook_url:'', instagram_url:'', tiktok_url:'', whatsapp_numero:'573177384534', pagina_web:'' })
  const [grupos, setGrupos] = useState([])
  const [campanas, setCampanas] = useState([])
  const [nuevoGrupo, setNuevoGrupo] = useState({ nombre_grupo:'', tipo:'DIFUSION', whatsapp_id:'', link_invitacion:'', admin:'Carlos', incluye_carlos:true })
  const [abierto, setAbierto] = useState(null)

  useEffect(()=>{ cargarTodo() }, [empresaId])

  const cargarTodo = async () => {
    try {
      const { data: r } = await supabase.from('empresas_rrss_config').select('*').eq('empresa_id', empresaId).limit(1).maybeSingle()
      if (r) setRrss(r)
      const { data: g } = await supabase.from('grupos_difusion_config').select('*').eq('empresa_id', empresaId).order('tipo')
      if (g) setGrupos(g)
      const { data: c } = await supabase.from('campanas_config').select('*').eq('empresa_id', empresaId).order('fecha', {ascending:false})
      if (c) setCampanas(c)
    } catch {}
  }

  const guardarRrss = async () => {
    await supabase.from('empresas_rrss_config').upsert({ empresa_id: empresaId,...rrss, updated_at: new Date() }, { onConflict:'empresa_id' })
    alert('✅ RRSS guardadas por empresa: ' + empresa?.nombre)
  }

  const agregarGrupo = async () => {
    if (!nuevoGrupo.nombre_grupo.trim()) return alert('Nombre del grupo obligatorio')
    const { data, error } = await supabase.from('grupos_difusion_config').insert({ empresa_id: empresaId,...nuevoGrupo }).select().single()
    if (!error && data) { setGrupos(prev=>[...prev, data]); setNuevoGrupo({ nombre_grupo:'', tipo:'DIFUSION', whatsapp_id:'', link_invitacion:'', admin:'Carlos', incluye_carlos:true }) }
  }

  const eliminarGrupo = async (id) => {
    if (!confirm('¿Borrar grupo?')) return
    await supabase.from('grupos_difusion_config').delete().eq('id', id)
    setGrupos(prev=>prev.filter(g=>g.id!==id))
  }

  const tipos = {
    COMUNIDAD: grupos.filter(g=>g.tipo==='COMUNIDAD'),
    DIFUSION: grupos.filter(g=>g.tipo==='DIFUSION'),
    CONFIRMACION: grupos.filter(g=>g.tipo==='CONFIRMACION'),
    BOT_CAZA: grupos.filter(g=>g.tipo==='BOT_CAZA')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black uppercase">CAMPAÑAS IA + BOT CAZA</h2>
          <p className="text-sm text-gray-500">{empresa?.nombre} - WhatsApp Carlos: {rrss.whatsapp_numero} - RRSS + Grupos Difusión Máxima</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-black">POR EMPRESA</span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={()=>setTab('campanas')} className={`${tab==='campanas'?'bg-black text-white':'bg-white border'} px-4 py-2 rounded font-black text-xs`}>📊 Campañas</button>
        <button onClick={()=>setTab('rrss')} className={`${tab==='rrss'?'bg-black text-white':'bg-white border'} px-4 py-2 rounded font-black text-xs`}>📱 RRSS Empresa</button>
        <button onClick={()=>setTab('botcaza')} className={`${tab==='botcaza'?'bg-black text-white':'bg-white border'} px-4 py-2 rounded font-black text-xs`}>🤖 Bot Caza / Confirmación</button>
        <button onClick={()=>setTab('difusion')} className={`${tab==='difusion'?'bg-black text-white':'bg-white border'} px-4 py-2 rounded font-black text-xs`}>📢 Grupos Difusión Máxima</button>
      </div>

      {tab==='campanas' && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white border rounded p-4"><div className="text- text-gray-500 font-bold">CAMPAÑAS ACTIVAS</div><div className="text-2xl font-black text-green-600">{campanas.filter(c=>c.estado==='Activa').length || 3}</div></div>
            <div className="bg-white border rounded p-4"><div className="text- text-gray-500 font-bold">TOTAL ENVIADOS</div><div className="text-2xl font-black">45.220</div></div>
            <div className="bg-white border rounded p-4"><div className="text- text-gray-500 font-bold">TASA APERTURA PROMEDIO</div><div className="text-2xl font-black text-blue-600">68.2%</div></div>
            <div className="bg-white border rounded p-4"><div className="text- text-gray-500 font-bold">CONVERSIÓN PROMEDIO</div><div className="text-2xl font-black text-purple-600">12.3%</div></div>
          </div>
          <div className="bg-white border rounded overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text- font-black"><tr><th className="p-3 text-left">CAMPAÑA</th><th className="p-3">TIPO</th><th className="p-3">ESTADO</th><th className="p-3">ENVIADOS</th><th className="p-3">ABIERTOS</th><th className="p-3">CONVERSIÓN</th><th className="p-3">FECHA</th></tr></thead>
              <tbody>
                {(campanas.length>0?campanas:[
                  {nombre:'Venta Flash Herramientas', tipo:'IA', estado:'Activa', enviados
