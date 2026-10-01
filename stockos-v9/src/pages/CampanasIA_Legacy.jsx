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

// Genérico: usa empresaId de URL
export default function CampanasIA() {
  const { empresaId = 'vc512' } = useParams()
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

  const CAMPOS_CONECTOR = {
    meta: { token: 'Token Meta', cuentaId: 'ID Cuenta Publicitaria' },
    tiktok: { token: 'Token TikTok', cuentaId: 'ID Advertiser' },
    whatsapp: { token: 'Token WhatsApp Business', cuentaId: 'Phone ID' },
  }

  const conectar = (plataforma) => {
    if (!formConector.token || !formConector.cuentaId) return alert('Token y Cuenta requeridos')
    setConectores((p) => ({ ...p, [plataforma]: { ...formConector, estadoConectado: true, fecha: new Date().toISOString() } }))
    setShowModalConector(null)
    setFormConector({ token: '', cuentaId: '' })
  }

  const desconectar = (plataforma) => {
    setConectores((p) => { const n = { ...p }; delete n[plataforma]; return n })
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

  const evaluarDia8 = () => {
    setCampanas((p) => {
      const enPrueba = p.filter(c => c.estadoAB === 'En Prueba AB - Día 1/8')
      if (enPrueba.length === 0) return p
      const ganadora = enPrueba.reduce((max, c) => c.alcance > max.alcance ? c : max, enPrueba[0])
      return p.map(c => {
        if (c.id === ganadora.id) return { ...c, estadoAB: 'Ganadora - Rotando 22 días', esGanadora: true, estado: 'Activa' }
        if (c.estadoAB === 'En Prueba AB - Día 1/8') return { ...c, estadoAB: 'Pausada', estado: 'Pausada' }
        return c
      })
    })
    alert('Día 8 evaluado: Ganadora seleccionada, perdedoras pausadas')
  }

  const cerrarMes = () => {
    const etapas = ['Atracción', 'Interés', 'Deseo', 'Cierre']
    const actual = etapas.findIndex(e => campanas.some(c => c.etapa === e && c.estadoAB !== 'Archivada'))
    if (actual === -1) return alert('Todas las etapas completadas')
    setCampanas((p) => p.map(c => c.etapa === etapas[actual] ? { ...c, estadoAB: 'Archivada' } : c))
    alert(`Etapa ${etapas[actual]} archivada. Siguiente: ${etapas[actual + 1] || 'Mes completo'}`)
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

  const productos = safeParse(`${empresaId}_detector_abc`, [])

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Campañas IA - {empresaId}</h2>
        <p className="text-sm text-gray-500">Túnel 4 Etapas x 4 Objetivos | AB 8 días + Ganadora 22 días</p>
      </div>

      {/* 3 Cards Conectores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Botón Generar */}
      <button onClick={() => setShowModal(true)} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg">
        ✨ Generar Campaña con IA
      </button>

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
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Campañas {empresaId}</h3>
          <div className="flex gap-2">
            <button onClick={evaluarDia8} className="btn-secondary text-xs">Evaluar Día 8</button>
            <button onClick={cerrarMes} className="btn-secondary text-xs">Cerrar Mes</button>
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
                <td className="td"><span className={`badge ${c.esGanadora ? 'bg-green-100 text-green-700' : c.estadoAB === 'Pausada' ? 'bg-gray-100' : 'bg-yellow-100 text-yellow-700'}`}>{c.estadoAB}</span></td>
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
