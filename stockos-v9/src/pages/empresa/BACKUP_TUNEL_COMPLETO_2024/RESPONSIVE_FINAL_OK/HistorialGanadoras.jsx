import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import LogoStockOS from '../../components/LogoStockOS'

const safeParse = (k, fb) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : fb
  } catch {
    return fb
  }
}

export default function HistorialGanadoras() {
  const { empresaId: paramId } = useParams()
  const empresaId = paramId || window.location.pathname.split('/')[2] || 'default'
  console.log('Historial empresaId:', empresaId)
  const navigate = useNavigate()
  const [historial, setHistorial] = useState([])
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [filtroObjetivo, setFiltroObjetivo] = useState('')

  useEffect(() => {
    const data = safeParse(`${empresaId}_historial_ganadoras`, [])
    if (Array.isArray(data) && data.length > 0) {
      setHistorial(data)
    } else if (empresaId === 'vc512') {
      // Datos de prueba para vc512
      setHistorial([
        { id: 'h1', mes: 'Septiembre 2024', etapa: 'Atracción', objetivo: 'Alcance', copy: 'Campaña A - Video Viral', alcance: 45200, clicks: 1200, costo: 98000, presupuestoTotalMes: 432000, fechaCierre: '2024-09-29' },
        { id: 'h2', mes: 'Agosto 2024', etapa: 'Interés', objetivo: 'Engagement', copy: 'Campaña C - Carrusel', alcance: 38500, clicks: 2100, costo: 110000, presupuestoTotalMes: 432000, fechaCierre: '2024-08-30' },
      ])
    } else {
      setHistorial([])
    }
  }, [empresaId])

  const filtradas = historial.filter((h) => {
    const matchEtapa = !filtroEtapa || h.etapa === filtroEtapa
    const matchObjetivo = !filtroObjetivo || h.objetivo === filtroObjetivo
    return matchEtapa && matchObjetivo
  })

  const totalMeses = historial.length
  const totalInvertido = historial.reduce((acc, h) => acc + (h.presupuestoTotalMes || 432000), 0)
  const etapas = [...new Set(historial.map((h) => h.etapa))]
  const objetivos = [...new Set(historial.map((h) => h.objetivo))]
  const mejorGanadora = historial.length > 0
    ? historial.reduce((max, h) => (h.alcance || 0) > (max.alcance || 0) ? h : max, historial[0])
    : null

  const exportarCSV = () => {
    try {
      const headers = ['Mes', 'Etapa', 'Objetivo', 'Ganadora', 'Impresiones', 'Clicks', 'Costo', 'Presupuesto']
      const rows = filtradas.map((h) => [
        h.mes || '',
        h.etapa || '',
        h.objetivo || '',
        (h.copy || '').replace(/,/g, ';'),
        h.alcance || 0,
        h.clicks || 0,
        h.costo || 0,
        h.presupuestoTotalMes || 432000,
      ])
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${empresaId}_historial_ganadoras.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      alert('CSV exportado correctamente')
    } catch (err) {
      console.error('Error exportar CSV:', err)
      alert('Error al exportar CSV')
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <LogoStockOS height={48} />
          <h1 className="text-lg font-bold text-gray-900">Historial Ganadoras - {empresaId}</h1>
        </div>
        <button
          onClick={() => navigate(`/empresa/${empresaId}`)}
          className="btn-primary text-sm"
        >
          🎯 Ir a Campañas IA
        </button>
      </header>

      <div className="p-2 md:p-6 max-w-7xl mx-auto">
        {/* Header Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">{totalMeses}</p>
            <p className="text-xs text-gray-500">Meses cerrados</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">${totalInvertido.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total invertido</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-purple-600">{etapas.length}</p>
            <p className="text-xs text-gray-500">Etapas completadas</p>
          </div>
          <div className="card text-center">
            <p className="text-lg font-bold text-amber-600 truncate">
              {mejorGanadora ? mejorGanadora.copy?.substring(0, 20) + '...' : '—'}
            </p>
            <p className="text-xs text-gray-500">Mejor ganadora</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-2 mb-4">
          <select value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)} className="input">
            <option value="">Todas las etapas</option>
            {etapas.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filtroObjetivo} onChange={(e) => setFiltroObjetivo(e.target.value)} className="input">
            <option value="">Todos los objetivos</option>
            {objetivos.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <button onClick={exportarCSV} className="btn-secondary text-sm w-full sm:w-auto">
            📥 Exportar CSV
          </button>
        </div>

        {/* Tabla */}
        {historial.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">📊</p>
            <h3 className="font-semibold text-gray-900 mb-2">Aún no hay meses cerrados</h3>
            <p className="text-sm text-gray-500 mb-4">Cierra tu primer mes en Campañas IA para ver el historial</p>
            <button
              onClick={() => navigate(`/empresa/${empresaId}`)}
              className="btn-primary"
            >
              Ir a Campañas IA
            </button>
          </div>
        ) : (
          <div className="card overflow-x-auto -mx-2 md:mx-0">
            <table className="min-w-[600px] w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="th">Mes</th>
                  <th className="th">Etapa</th>
                  <th className="th">Objetivo</th>
                  <th className="th">Ganadora</th>
                  <th className="th">Impresiones</th>
                  <th className="th">Clicks</th>
                  <th className="th">Costo</th>
                  <th className="th">Presupuesto</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((h) => (
                  <tr key={h.id} className="border-b border-gray-50">
                    <td className="td">Mes {h.mes}</td>
                    <td className="td"><span className="badge bg-blue-100 text-blue-700">{h.etapa}</span></td>
                    <td className="td text-xs">{h.objetivo}</td>
                    <td className="td text-xs max-w-[200px] truncate">{h.copy}</td>
                    <td className="td">{h.alcance || 0}</td>
                    <td className="td">{h.clicks || 0}</td>
                    <td className="td">${(h.costo || 0).toLocaleString()}</td>
                    <td className="td">${(h.presupuestoTotalMes || 432000).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
