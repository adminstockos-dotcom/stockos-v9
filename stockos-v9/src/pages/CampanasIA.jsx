import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const safeParse = (k, fb) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : fb
  } catch {
    return fb
  }
}

// BLINDAJE: safeGet que nunca rompe la app
const safeGet = (k, def) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : def
  } catch {
    return def
  }
}

// Genérico: usa empresaId de URL
export default function CampanasIA() {
  const { empresaId = 'default' } = useParams()
  const KEY = `${empresaId}_campanas_ia`
  const [campanas, setCampanas] = useState(() => safeParse(KEY, []))
  const [showModal, setShowModal] = useState(false)
  const [showPresupuesto, setShowPresupuesto] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [form, setForm] = useState({ etapa: 'Atracción', objetivo: 'alcance', producto: '', tono: 'juvenil', origen: 'meta' })
  const [resultado, setResultado] = useState(null)

  // LOOP 1: Conectores (3 unificados)
  const [conectores, setConectores] = useState(() => safeParse(`${empresaId}_conectores`, {}))
  const [showModalConector, setShowModalConector] = useState(null)
  const [formConector, setFormConector] = useState({ token: '', cuentaId: '' })

  // LOOP 2: Grupos
  const [gruposConfirmacion, setGruposConfirmacion] = useState(() => safeParse(`${empresaId}_grupos_confirmacion`, []))
  const [misGrupos, setMisGrupos] = useState(() => safeParse(`${empresaId}_mis_grupos`, []))
  const [showModalGrupo, setShowModalGrupo] = useState(false)
  const [showModalComunidad, setShowModalComunidad] = useState(false)
  const [formGrupo, setFormGrupo] = useState({ nombre: '', link: '', frecuencia: '10', antibanMin: '20', antibanMax: '90' })
  const [formComunidad, setFormComunidad] = useState({ nombre: '', link: '', miembros: '' })

  // Presupuesto
  const [presupuestoDiario, setPresupuestoDiario] = useState(8000)

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(campanas)) }, [campanas])
  useEffect(() => { localStorage.setItem(`${empresaId}_conectores`, JSON.stringify(conectores)) }, [conectores])

  const TIPOS_CONECTOR = [
    { id: 'meta', nombre: 'Meta Ads', texto: 'Facebook + Instagram', icono: '📘' },
    { id: 'tiktok', nombre: 'TikTok Ads', texto: 'TikTok', icono: '🎵' },
    { id: 'whatsapp', nombre: 'WhatsApp Difusión', texto: 'Grupos + Comunidades + Base 7.000', icono: '💬' },
  ]

  // LEGACY: Instagram separado (oculto temporalmente, no borrado)
  const TIPOS_CONECTOR_LEGACY = [
    { id: 'instagram', nombre: 'Instagram Reels', icono: '📸' },
    { id: 'facebook', nombre: 'Facebook Ads', icono: '📘' },
    { id: 'whatsapp', nombre: 'WhatsApp Difusión', icono: '💬' },
    { id: 'tiktok', nombre: 'TikTok', icono: '🎵' },
  ]

  const CAMPOS_CONECTOR = {
    meta: { token: 'Token Meta', cuentaId: 'ID Cuenta Publicitaria' },
    tiktok: { token: 'Token TikTok', cuentaId: 'ID Advertiser' },
    whatsapp: { token: 'Token WhatsApp Business', cuentaId: 'Phone ID' },
  }

  const conectar = (plataforma) => {
    try {
      if (!formConector.token || !formConector.cuentaId) return alert('Token y Cuenta requeridos')
      // Guardar token en localStorage primero
      localStorage.setItem(`${empresaId}_${plataforma}_token`, formConector.token)
      localStorage.setItem(`${empresaId}_${plataforma}_cuenta`, formConector.cuentaId)
      setConectores((p) => ({ ...p, [plataforma]: { ...formConector, estadoConectado: true, fecha: new Date().toISOString() } }))
      setShowModalConector(null)
      setFormConector({ token: '', cuentaId: '' })
    } catch (err) {
      console.error('Error conectar:', err)
      alert('Error al conectar. Intenta de nuevo.')
    }
  }

  const desconectar = (plataforma) => {
    try {
      localStorage.removeItem(`${empresaId}_${plataforma}_token`)
      localStorage.removeItem(`${empresaId}_${plataforma}_cuenta`)
      setConectores((p) => { const n = { ...p }; delete n[plataforma]; return n })
    } catch (err) {
      console.error('Error desconectar:', err)
    }
  }

  // CONFIGURACIÓN FIJA POR ETAPA
  const ETAPAS_CONFIG = {
    'Atracción': { default: 'alcance', opciones: ['Alcance', 'Seguidores', 'Reproducciones', 'Viralizar'], cta: ['Ver más', 'Seguir'], mes: 1 },
    'Interés': { default: 'engagement', opciones: ['Engagement', 'Guardados', 'Comentarios', 'Tráfico web'], cta: ['Comentar', 'Guardar', 'Visitar web'], mes: 2 },
    'Deseo': { default: 'mensajes_whatsapp', opciones: ['Mensajes WhatsApp', 'Leads', 'Agregado al carrito', 'Lista de deseos'], cta: ['Escribir WhatsApp', 'Pedir catálogo', 'Agregar carrito'], mes: 3 },
    'Cierre': { default: 'ventas', opciones: ['Ventas', 'Conversiones', 'Recuperar carrito'], cta: ['Comprar ahora', 'Pagar contraentrega'], mes: 4 },
  }

  const TONOS = ['juvenil', 'profesional', 'agresivo', 'premium']
  const FORMATOS = ['Video UGC 9:16', 'Carrusel', 'Imagen']
  const ORIGENES = [
    { id: 'meta', nombre: 'Meta (Facebook/Instagram)' },
    { id: 'tiktok', nombre: 'TikTok' },
    { id: 'grupos_casa', nombre: 'Grupos Casa' },
    { id: 'centro_cali', nombre: 'Centro Cali' },
    { id: 'comunidades_wa', nombre: 'Comunidades WhatsApp' },
  ]

  const getCTA = (etapa, origen) => {
    if (etapa === 'Cierre') {
      if (origen === 'grupos_casa' || origen === 'centro_cali' || origen === 'comunidades_wa') {
        return ['Comprar ahora'] // SOLO Comprar ahora
      }
      return ['Comprar ahora', 'Pagar contraentrega'] // Meta/TikTok
    }
    return ETAPAS_CONFIG[etapa]?.cta || ['Ver más']
  }

  const generarCampana = () => {
    if (!form.producto) return alert('Selecciona un producto')
    setGenerando(true)
    setTimeout(() => {
      const ctas = getCTA(form.etapa, form.origen)
      const copys = [
        `¡Contenido ${form.tono} que engancha! 🚀 ${form.producto}`,
        `Descubre ${form.producto} - ${ctas[0]}`,
        `¡No te pierdas ${form.producto}! ${ctas[0]}`,
      ]
      const formatos = FORMATOS.map(f => ({
        formato: f,
        copy: copys[Math.floor(Math.random() * copys.length)],
        cta: ctas[Math.floor(Math.random() * ctas.length)],
      }))
      setResultado({ copys, formatos, ctas, ...form })
      setGenerando(false)
    }, 1200)
  }

  const guardarCampana = (formato, copy, cta) => {
    const config = ETAPAS_CONFIG[form.etapa]
    const presupuestoTotalMes = presupuestoDiario * 8 + presupuestoDiario * 22
    const nueva = {
      id: `camp_${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      empresaId,
      etapa: form.etapa,
      objetivo: form.objetivo,
      formato,
      copy,
      cta,
      presupuesto: presupuestoDiario * 8,
      presupuestoTotalMes,
      estadoAB: 'En Prueba AB - Día 1/8',
      diaActual: 1,
      esGanadora: false,
      origenCliente: form.origen,
      estado: 'Borrador',
      alcance: 0,
    }
    setCampanas((p) => [...p, nueva])
    setResultado(null)
    setShowModal(false)
  }

  const evaluarDia8 = async () => {
    try {
      const enPrueba = campanas.filter(c => c.estadoAB === 'En Prueba AB - Día 1/8')
      if (enPrueba.length === 0) return alert('No hay campañas en Prueba AB')

      // Intentar webhook n8n (modo test: si falla, usa random)
      let ganadora = null
      try {
        const res = await fetch(`/webhook/${empresaId}/evaluarDia8`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empresaId, etapa: form.etapa }),
        })
        const data = await res.json()
        if (data.ganadoraId) {
          ganadora = enPrueba.find(c => c.id === data.ganadoraId)
        }
      } catch (e) {
        console.log('Webhook no disponible, usando selección aleatoria')
      }

      // Fallback: aleatorio o manual
      if (!ganadora) {
        ganadora = enPrueba[Math.floor(Math.random() * enPrueba.length)]
      }

      setCampanas((p) => p.map(c => {
        if (c.id === ganadora.id) return { ...c, estadoAB: 'Ganadora - Día 1/22 rotando', esGanadora: true, estado: 'Activa', fechaInicioGanadora: new Date().toISOString() }
        if (c.estadoAB === 'En Prueba AB - Día 1/8') return { ...c, estadoAB: 'Pausada - AB Perdió', estado: 'Pausada' }
        return c
      }))

      // Log
      const log = { fecha: new Date().toISOString(), accion: 'evaluarDia8', ganadoraId: ganadora.id, etapa: form.etapa }
      const logs = safeParse(`${empresaId}_logs_n8n`, [])
      logs.push(log)
      localStorage.setItem(`${empresaId}_logs_n8n`, JSON.stringify(logs))

      alert(`Ganadora seleccionada: ${ganadora.copy?.substring(0, 30)}...`)
    } catch (err) {
      console.error('Error evaluar Día 8:', err)
      alert('Error al evaluar. Intenta de nuevo.')
    }
  }

  const cerrarMes = () => {
    try {
      const etapas = ['Atracción', 'Interés', 'Deseo', 'Cierre']
      const actual = etapas.findIndex(e => campanas.some(c => c.etapa === e && c.estadoAB !== 'Archivada'))
      if (actual === -1) return alert('Todas las etapas completadas')

      const ganadora = campanas.find(c => c.etapa === etapas[actual] && c.esGanadora)

      // Archivar ganadora en historial
      if (ganadora) {
        const historial = safeParse(`${empresaId}_historial_ganadoras`, [])
        historial.push({
          ...ganadora,
          fechaArchivo: new Date().toISOString(),
          mes: actual + 1,
          presupuestoTotalMes: 432000,
        })
        localStorage.setItem(`${empresaId}_historial_ganadoras`, JSON.stringify(historial))
      }

      // Archivar etapa actual
      setCampanas((p) => p.map(c => c.etapa === etapas[actual] ? { ...c, estadoAB: 'Archivada Mes ' + (actual + 1) } : c))

      // Log
      const log = { fecha: new Date().toISOString(), accion: 'cerrarMes', etapa: etapas[actual], ganadoraId: ganadora?.id }
      const logs = safeParse(`${empresaId}_logs_n8n`, [])
      logs.push(log)
      localStorage.setItem(`${empresaId}_logs_n8n`, JSON.stringify(logs))

      const siguiente = etapas[(actual + 1) % etapas.length]
      alert(`Etapa ${etapas[actual]} archivada. Siguiente: ${siguiente}`)
    } catch (err) {
      console.error('Error cerrar mes:', err)
      alert('Error al cerrar mes')
    }
  }

  // Contador 22 días
  const getDiasGanadora = (c) => {
    if (!c.fechaInicioGanadora) return 0
    const diff = Math.floor((new Date() - new Date(c.fechaInicioGanadora)) / (1000 * 60 * 60 * 24)) + 1
    return Math.min(diff, 22)
  }

  const addGrupo = () => {
    if (!formGrupo.nombre) return alert('Nombre requerido')
    setGruposConfirmacion((p) => [...p, { id: `g_${Date.now()}`, ...formGrupo, estado: 'Activo' }])
    setShowModalGrupo(false)
  }

  const addComunidad = () => {
    if (!formComunidad.nombre) return alert('Nombre requerido')
    setMisGrupos((p) => [...p, { id: `c_${Date.now()}`, ...formComunidad }])
    setShowModalComunidad(false)
  }

  // N8N: Publicar AB
  const [publicandoAB, setPublicandoAB] = useState(false)

  const publicarAB = async () => {
    try {
      setPublicandoAB(true)
      const conector = conectores[form.origen]?.estadoConectado ? form.origen : 'meta'
      const payload = {
        empresaId,
        etapa: form.etapa,
        objetivo: form.objetivo,
        presupuestoDiario,
        conector,
      }
      const res = await fetch(`/webhook/${empresaId}/publicarAB`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.ok) {
        // Actualizar estado local
        setCampanas((p) => p.map((c) =>
          c.etapa === form.etapa && c.estado === 'Borrador'
            ? { ...c, estadoAB: 'En Prueba AB - Día 1/8', diaActual: 1, estado: 'Activa' }
            : c
        ))
        alert('4 campañas publicadas - En Prueba AB Día 1/8')
      } else {
        alert(data.error || 'Error al publicar')
      }
    } catch (err) {
      console.error('Error publicar AB:', err)
      alert('Revisa conector o webhook n8n')
    } finally {
      setPublicandoAB(false)
    }
  }

  const productos = safeParse(`${empresaId}_detector_abc`, [])

  return (
    <div className="w-full min-h-screen p-2 md:p-4 lg:p-6 space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Campañas IA - {empresaId}</h2>
        <p className="text-xs md:text-sm text-gray-500">Túnel 4 Etapas x 4 Objetivos | AB 8 días + Ganadora 22 días</p>
      </div>

      {/* 3 Cards Conectores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TIPOS_CONECTOR.map((tipo) => {
          const conectado = conectores[tipo.id]?.estadoConectado
          return (
            <div key={tipo.id} className="border rounded-xl p-4 text-center">
              <p className="text-3xl mb-2">{tipo.icono}</p>
              <h4 className="font-semibold text-gray-900 text-sm">{tipo.nombre}</h4>
              <p className="text-xs text-gray-500 mt-1">{tipo.texto}</p>
              {conectado ? (
                <div className="mt-3 space-y-1">
                  <span className="badge bg-green-100 text-green-700 text-xs">Conectado</span>
                  <button onClick={() => desconectar(tipo.id)} className="block w-full text-xs text-red-600">Desconectar</button>
                </div>
              ) : (
                <button onClick={() => { setShowModalConector(tipo.id); setFormConector({ token: '', cuentaId: '' }) }} className="btn-secondary text-xs mt-3 w-full justify-center">Conectar</button>
              )}
            </div>
          )
        })}
      </div>

      {/* Botones */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => setShowModal(true)} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg">
          ✨ Generar Campaña con IA
        </button>
        <button
          onClick={publicarAB}
          disabled={publicandoAB}
          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg disabled:opacity-50"
        >
          {publicandoAB ? 'Publicando...' : '🚀 Publicar AB (4 campañas)'}
        </button>
      </div>

      {/* MODAL GENERAR */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Generar Campaña</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Etapa</label>
                <select className="input" value={form.etapa} onChange={(e) => {
                  const cfg = ETAPAS_CONFIG[e.target.value]
                  setForm({ ...form, etapa: e.target.value, objetivo: cfg?.default || '' })
                }}>
                  {Object.keys(ETAPAS_CONFIG).map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              {form.etapa !== 'Túnel Completo' && (
                <div>
                  <label className="label">Objetivo</label>
                  <select className="input" value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })}>
                    {(ETAPAS_CONFIG[form.etapa]?.opciones || []).map(o => <option key={o} value={o.toLowerCase().replace(/\s/g, '_')}>{o}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Producto</label>
                <select className="input" value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })}>
                  <option value="">Selecciona</option>
                  {productos.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Origen</label>
                <select className="input" value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })}>
                  {ORIGENES.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tono</label>
                <select className="input" value={form.tono} onChange={(e) => setForm({ ...form, tono: e.target.value })}>
                  {TONOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={() => setShowPresupuesto(true)} className="btn-secondary w-full justify-center">💰 Ver Presupuesto</button>
            </div>
            <button onClick={generarCampana} disabled={generando} className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold mt-4 disabled:opacity-50">
              {generando ? 'Generando...' : 'Generar'}
            </button>
            {resultado && (
              <div className="mt-4 space-y-2">
                {resultado.formatos.map((f, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-bold">{f.formato} | CTA: {f.cta}</p>
                    <p className="text-sm">{f.copy}</p>
                    <button onClick={() => guardarCampana(f.formato, f.copy, f.cta)} className="text-xs text-blue-600 mt-1">Guardar</button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowModal(false)} className="w-full bg-gray-200 py-2 rounded-lg mt-4">Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL PRESUPUESTO */}
      {showPresupuesto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Presupuesto Mensual</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Presupuesto diario (COP)</label>
                <input type="number" className="input" value={presupuestoDiario} onChange={(e) => setPresupuestoDiario(parseInt(e.target.value) || 8000)} />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                <p>AB 8 días: 4 publ × ${presupuestoDiario.toLocaleString()} × 8 = <b>${(presupuestoDiario * 8).toLocaleString()}</b></p>
                <p>Ganadora 22 días: 1 publ × ${presupuestoDiario.toLocaleString()} × 22 = <b>${(presupuestoDiario * 22).toLocaleString()}</b></p>
                <p className="font-bold">TOTAL MES: ${(presupuestoDiario * 30).toLocaleString()}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPresupuesto(false)} className="btn-primary flex-1 justify-center">Aceptar</button>
                <button onClick={() => setShowPresupuesto(false)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Historial con AB */}
      <div className="card overflow-x-auto -mx-2 md:mx-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h3 className="font-semibold text-gray-900">Campañas {empresaId}</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={evaluarDia8} className="btn-secondary text-xs flex-1 sm:flex-none">Evaluar Día 8</button>
            <button onClick={cerrarMes} className="btn-secondary text-xs flex-1 sm:flex-none">Cerrar Mes</button>
          </div>
        </div>
        <table className="w-full">
          <thead><tr className="border-b"><th className="th">Fecha</th><th className="th">Etapa</th><th className="th">Objetivo</th><th className="th">Formato</th><th className="th">CTA</th><th className="th">Estado AB</th><th className="th">Presupuesto</th></tr></thead>
          <tbody>
            {campanas.map(c => (
              <tr key={c.id} className={`border-b ${c.esGanadora ? 'bg-green-50' : ''}`}>
                <td className="td">{c.fecha}</td>
                <td className="td">{c.etapa}</td>
                <td className="td text-xs">{c.objetivo}</td>
                <td className="td text-xs">{c.formato}</td>
                <td className="td text-xs">{c.cta}</td>
                <td className="td">
                  {c.esGanadora ? (
                    <div>
                      <span className="badge bg-green-100 text-green-700">Ganadora - Día {getDiasGanadora(c)}/22</span>
                      {getDiasGanadora(c) >= 22 && <p className="text-xs text-green-600 mt-1">Completó 22 días - Lista para cerrar mes</p>}
                    </div>
                  ) : (
                    <span className={`badge ${c.estadoAB === 'Pausada - AB Perdió' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>{c.estadoAB}</span>
                  )}
                </td>
                <td className="td text-xs">${c.presupuestoTotalMes?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {campanas.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Sin campañas</p>}
      </div>

      {/* Grupos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Grupos Confirmación Externos</h3>
          <button onClick={() => setShowModalGrupo(true)} className="btn-primary text-sm">+ Nuevo Grupo</button>
        </div>
        <p className="text-xs text-gray-400">300 msg/hora antiban</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Mis Comunidades</h3>
          <button onClick={() => setShowModalComunidad(true)} className="btn-primary text-sm">+ Nueva</button>
        </div>
      </div>

      {/* Modales */}
      {showModalGrupo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-3">
            <h3 className="font-bold">+ Nuevo Grupo</h3>
            <input placeholder="Nombre*" className="input" value={formGrupo.nombre} onChange={e => setFormGrupo({ ...formGrupo, nombre: e.target.value })} />
            <input placeholder="Link WA" className="input" value={formGrupo.link} onChange={e => setFormGrupo({ ...formGrupo, link: e.target.value })} />
            <select className="input" value={formGrupo.frecuencia} onChange={e => setFormGrupo({ ...formGrupo, frecuencia: e.target.value })}>
              <option value="5">5 min</option><option value="10">10 min</option><option value="15">15 min</option><option value="30">30 min</option>
            </select>
            <div className="flex gap-3">
              <button onClick={addGrupo} className="btn-primary flex-1 justify-center">Crear</button>
              <button onClick={() => setShowModalGrupo(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showModalComunidad && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-3">
            <h3 className="font-bold">+ Nueva Comunidad</h3>
            <input placeholder="Nombre*" className="input" value={formComunidad.nombre} onChange={e => setFormComunidad({ ...formComunidad, nombre: e.target.value })} />
            <input placeholder="Link" className="input" value={formComunidad.link} onChange={e => setFormComunidad({ ...formComunidad, link: e.target.value })} />
            <input type="number" placeholder="Miembros" className="input" value={formComunidad.miembros} onChange={e => setFormComunidad({ ...formComunidad, miembros: e.target.value })} />
            <div className="flex gap-3">
              <button onClick={addComunidad} className="btn-primary flex-1 justify-center">Crear</button>
              <button onClick={() => setShowModalComunidad(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conector */}
      {showModalConector && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Conectar {TIPOS_CONECTOR.find(t => t.id === showModalConector)?.nombre}</h3>
            <div className="space-y-4">
              <div>
                <label className="label">{CAMPOS_CONECTOR[showModalConector]?.token}</label>
                <input className="input" value={formConector.token} onChange={(e) => setFormConector({ ...formConector, token: e.target.value })} />
              </div>
              <div>
                <label className="label">{CAMPOS_CONECTOR[showModalConector]?.cuentaId}</label>
                <input className="input" value={formConector.cuentaId} onChange={(e) => setFormConector({ ...formConector, cuentaId: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => conectar(showModalConector)} className="btn-primary flex-1 justify-center">Conectar</button>
                <button onClick={() => setShowModalConector(null)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
