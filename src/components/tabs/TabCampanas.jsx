import { useState } from 'react'

const CAMPANAS = [
  { id: 1, nombre: 'Venta Flash Herramientas', tipo: 'IA', estado: 'Activa', enviados: 12450, abiertos: 8934, conversion: '12.4%', fecha: '2026-09-25' },
  { id: 2, nombre: 'Bot Caza — Clientes Inactivos', tipo: 'BOT CAZA', estado: 'Activa', enviados: 5670, abiertos: 3210, conversion: '8.7%', fecha: '2026-09-20' },
  { id: 3, nombre: 'Promo Fin de Semana', tipo: 'IA', estado: 'Pausada', enviados: 8900, abiertos: 5400, conversion: '15.2%', fecha: '2026-09-15' },
  { id: 4, nombre: 'Reactivación Septiembre', tipo: 'BOT CAZA', estado: 'Activa', enviados: 3200, abiertos: 1890, conversion: '6.3%', fecha: '2026-09-01' },
  { id: 5, nombre: 'Lanzamiento Nuevo Catalogo', tipo: 'IA', estado: 'Finalizada', enviados: 15000, abiertos: 11200, conversion: '18.9%', fecha: '2026-08-28' },
]

const BOT_LOGS = [
  { id: 1, bot: 'BOT CAZA', accion: 'Mensaje enviado', detalle: 'cliente@empresa.cl — Oferta especial herramientas', fecha: '2026-09-28 14:30', estado: 'Exitoso' },
  { id: 2, bot: 'BOT CAZA', accion: 'Respuesta recibida', detalle: 'cliente2@empresa.cl — Solicitó más info', fecha: '2026-09-28 14:25', estado: 'Exitoso' },
  { id: 3, bot: 'IA', accion: 'Campaña generada', detalle: 'Venta Flash Herramientas — 12,450 destinatarios', fecha: '2026-09-28 14:20', estado: 'Exitoso' },
  { id: 4, bot: 'BOT CAZA', accion: 'Mensaje enviado', detalle: 'cliente3@empresa.cl — Reactivación', fecha: '2026-09-28 14:15', estado: 'Exitoso' },
  { id: 5, bot: 'IA', accion: 'Optimización', detalle: 'Segmentación actualizada — +15% apertura', fecha: '2026-09-28 14:10', estado: 'Exitoso' },
  { id: 6, bot: 'BOT CAZA', accion: 'Error de envío', detalle: 'cliente4@empresa.cl — Email inválido', fecha: '2026-09-28 14:05', estado: 'Fallido' },
]

export default function TabCampanas({ empresa }) {
  const [view, setView] = useState('campanas')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campañas IA + BOT CAZA</h2>
          <p className="text-sm text-gray-500 mt-1">
            {empresa ? `Automatización de marketing de ${empresa.nombre}` : 'Automatización de marketing y captación de clientes'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('campanas')}
            className={view === 'campanas' ? 'btn-primary' : 'btn-secondary'}
          >
            Campañas
          </button>
          <button
            onClick={() => setView('bot')}
            className={view === 'bot' ? 'btn-primary' : 'btn-secondary'}
          >
            Bot Caza
          </button>
        </div>
      </div>

      {view === 'campanas' ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Campañas Activas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{CAMPANAS.filter(c => c.estado === 'Activa').length}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Total Enviados</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{CAMPANAS.reduce((a, c) => a + c.enviados, 0).toLocaleString()}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Tasa Apertura Promedio</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">68.2%</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Conversión Promedio</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">12.3%</p>
            </div>
          </div>

          {/* Table */}
          <div className="card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="th">Campaña</th>
                    <th className="th">Tipo</th>
                    <th className="th">Estado</th>
                    <th className="th">Enviados</th>
                    <th className="th">Abiertos</th>
                    <th className="th">Conversión</th>
                    <th className="th">Fecha</th>
                    <th className="th text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {CAMPANAS.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="td font-medium text-gray-900">{c.nombre}</td>
                      <td className="td">
                        <span className={c.tipo === 'IA' ? 'badge-purple badge' : 'badge-blue'}>{c.tipo}</span>
                      </td>
                      <td className="td">
                        <span className={c.estado === 'Activa' ? 'badge-green' : c.estado === 'Pausada' ? 'badge-yellow' : 'badge-gray'}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="td">{c.enviados.toLocaleString()}</td>
                      <td className="td">{c.abiertos.toLocaleString()}</td>
                      <td className="td font-medium text-green-600">{c.conversion}</td>
                      <td className="td text-gray-500 text-xs">{c.fecha}</td>
                      <td className="td text-center">
                        <button className="text-brand-600 hover:text-brand-700 text-xs font-medium">Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Bot Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Mensajes Hoy</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">1,247</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Tasa Respuesta</p>
              <p className="text-2xl font-bold text-green-600 mt-1">34.5%</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Clientes Recuperados</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">89</p>
            </div>
          </div>

          {/* Bot Logs */}
          <div className="card !p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Actividad del Bot</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {BOT_LOGS.map((log) => (
                <div key={log.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${log.estado === 'Exitoso' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {log.estado === 'Exitoso' ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="badge-blue">{log.bot}</span>
                      <span className="font-medium text-gray-900 text-sm">{log.accion}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{log.detalle}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{log.fecha}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
