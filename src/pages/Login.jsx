import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const VALID_EMAIL = 'adminstockos@gmail.com'
const VALID_PASSWORD = 'Sep7imo@ngel'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    setTimeout(() => {
      if (email.trim().toLowerCase() === VALID_EMAIL && password === VALID_PASSWORD) {
        onLogin({ email: VALID_EMAIL, role: 'superadmin' })
        navigate('/superadmin')
      } else {
        setError('Credenciales inválidas. Verifica tu email y contraseña.')
      }
      setLoading(false)
    }, 600)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-md">
        <img src="/assets/logo-stockos-oficial.png" alt="STOCKOS" style={{width: '320px', height: 'auto', margin: '0 auto 32px', display: 'block'}} />

        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Iniciar Sesión</h2>
          <p className="text-sm text-gray-500 mb-6">Acceso restringido a administradores</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="adminstockos@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-2.5"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          STOCKOS v7.8 · Stock Operating System
        </p>
      </div>
    </div>
  )
}
