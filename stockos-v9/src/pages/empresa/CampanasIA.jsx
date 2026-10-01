import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function CampanasIA() {
  const [searchParams] = useSearchParams()
  const subdomain = searchParams.get('subdomain') || localStorage.getItem('subdomain_actual') || 'virtualclass512'
  const [prompt, setPrompt] = useState('')
  const [generando, setGenerando] = useState(false)
  const [resultado, setResultado] = useState('')
  const [costo, setCosto] = useState(0)
  const [publicacionIG, setPublicacionIG] = useState(true)
  const [publicacionFB, setPublicacionFB] = useState(true)
  const [presupuestoPauta, setPresupuestoPauta] = useState(0)

  const generar = () => {
    setGenerando(true)
    setTimeout(() => {
      setResultado(`Campaña generada para ${subdomain}:\n\n"${prompt}"\n\n• Título: Oferta especial de la semana\n• Audiencia: Clientes frecuentes\n• Canal: WhatsApp + Facebook\n• Presupuesto sugerido: $50.000 CLP/día`)
      setGenerando(false)
    }, 1500)
  }

  const detal = costo * 1.4
  const mayorista = costo * 1.85

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Campañas IA + BOT CAZA</h2>
        <p className="text-sm text-gray-500">Genera campañas con IA — {subdomain}</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Fotos Optimizadas IA</h3>
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">📷</div>
          <div>
            <label className="btn-secondary cursor-pointer">
              Subir Foto
              <input type="file" accept="image/*" className="hidden" />
            </label>
            <button className="btn-primary ml-2">Optimizar con IA</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Precios 40% / 85%</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Costo</label>
            <input type="number" className="input" value={costo} onChange={(e) => setCosto(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Detal (+40%)</label>
            <input className="input bg-gray-50" value={detal.toFixed(0)} disabled />
          </div>
          <div>
            <label className="label">Mayorista (+85%)</label>
            <input className="input bg-gray-50" value={mayorista.toFixed(0)} disabled />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Copy + Hashtags</h3>
        <textarea
          className="input"
          rows="4"
          placeholder="Escribe tu prompt para generar copy..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button onClick={generar} disabled={generando || !prompt} className="btn-primary mt-3">
          {generando ? 'Generando...' : 'Generar with IA'}
        </button>
        {resultado && (
          <div className="mt-4 p-4 bg-brand-50 rounded-lg">
            <pre className="text-sm text-brand-800 whitespace-pre-wrap">{resultado}</pre>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Publicaciones Automáticas RRSS</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Instagram</span>
            <button
              onClick={() => setPublicacionIG(!publicacionIG)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${publicacionIG ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${publicacionIG ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Facebook</span>
            <button
              onClick={() => setPublicacionFB(!publicacionFB)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${publicacionFB ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${publicacionFB ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Pauta Pagada</h3>
        <div>
          <label className="label">Presupuesto aparte (CLP)</label>
          <input type="number" className="input" value={presupuestoPauta} onChange={(e) => setPresupuestoPauta(parseFloat(e.target.value) || 0)} />
        </div>
      </div>
    </div>
  )
}
