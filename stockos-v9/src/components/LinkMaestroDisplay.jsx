import { useNavigate } from 'react-router-dom'

export default function LinkMaestroDisplay({ subdomain }) {
  const navigate = useNavigate()
  const link = `${subdomain}.stockos/inv`

  const copiar = () => {
    navigator.clipboard.writeText(`http://localhost:5173/inv/${subdomain}`)
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-blue-600 font-medium">Link Maestro</p>
          <p className="text-sm font-bold text-blue-800">{link}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={copiar}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
          >
            Copiar
          </button>
          <button
            onClick={() => navigate(`/inv/${subdomain}`)}
            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
          >
            Abrir
          </button>
        </div>
      </div>
    </div>
  )
}
