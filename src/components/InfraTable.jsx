import { useState } from 'react'

const DEFAULT_INFRA = [
  { id: 1, nombre: 'EC2 — Servidor Principal', tipo: 'Compute', region: 'us-east-1', estado: 'Activo', uptime: '99.97%', cpu: '34%', memoria: '62%' },
  { id: 2, nombre: 'RDS — PostgreSQL', tipo: 'Database', region: 'us-east-1', estado: 'Activo', uptime: '99.99%', cpu: '22%', memoria: '45%' },
  { id: 3, nombre: 'ElastiCache — Redis', tipo: 'Cache', region: 'us-east-1', estado: 'Activo', uptime: '99.95%', cpu: '12%', memoria: '38%' },
  { id: 4, nombre: 'CloudFront — CDN', tipo: 'CDN', region: 'Global', estado: 'Activo', uptime: '100%', cpu: '8%', memoria: '15%' },
  { id: 5, nombre: 'ALB — Load Balancer', tipo: 'Network', region: 'us-east-1', estado: 'Activo', uptime: '99.98%', cpu: '18%', memoria: '28%' },
  { id: 6, nombre: 'S3 — Backups', tipo: 'Storage', region: 'us-east-1', estado: 'Activo', uptime: '100%', cpu: '5%', memoria: '72%' },
]

export default function InfraTable() {
  const [servicios, setServicios] = useState(DEFAULT_INFRA)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', tipo: '', region: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    const newId = Math.max(...servicios.map(s => s.id), 0) + 1
    setServicios(prev => [...prev, {
      id: newId,
      nombre: form.nombre,
      tipo: form.tipo,
      region: form.region,
      estado: 'Activo',
      uptime: '100%',
      cpu: '0%',
      memoria: '0%',
    }])
    setForm({ nombre: '', tipo: '', region: '' })
    setShowModal(false)
  }

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Infra Sistema</h2>
          <p className="text-xs text-gray-500 mt-0.5">{servicios.length} servicios AWS monitoreados en tiempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-600 font-medium">Todos operativos</span>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary !px-3 !py-1.5 text-xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Servicio
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Servicio</th>
              <th className="th">Tipo</th>
              <th className="th">Región</th>
              <th className="th">Estado</th>
              <th className="th">Uptime</th>
              <th className="th">CPU</th>
              <th className="th">Memoria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {servicios.map((srv) => (
              <tr key={srv.id} className="hover:bg-gray-50 transition">
                <td className="td font-medium text-gray-900">{srv.nombre}</td>
                <td className="td"><span className="badge-blue">{srv.tipo}</span></td>
                <td className="td font-mono text-xs">{srv.region}</td>
                <td className="td">
                  <span className="badge-green flex items-center gap-1 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {srv.estado}
                  </span>
                </td>
                <td className="td font-mono text-xs">{srv.uptime}</td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: srv.cpu }} />
                    </div>
                    <span className="text-xs text-gray-500">{srv.cpu}</span>
                  </div>
                </td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: srv.memoria }} />
                    </div>
                    <span className="text-xs text-gray-500">{srv.memoria}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Servicio */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Servicio</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Servicio</label>
                <input
                  className="input"
                  placeholder="Ej: EC2 — Servidor Secundario"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select
                  className="input"
                  value={form.tipo}
                  onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value }))}
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option>Compute</option>
                  <option>Database</option>
                  <option>Cache</option>
                  <option>CDN</option>
                  <option>Network</option>
                  <option>Storage</option>
                </select>
              </div>
              <div>
                <label className="label">Región</label>
                <select
                  className="input"
                  value={form.region}
                  onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option>us-east-1</option>
                  <option>us-west-2</option>
                  <option>eu-west-1</option>
                  <option>southamerica-east-1</option>
                  <option>Global</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Agregar Servicio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
